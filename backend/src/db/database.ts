import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

interface DBConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
}

class Database {
  private pool: Pool;
  private static instance: Database;

  private constructor() {
    const config: DBConfig = {};

    if (process.env.DATABASE_URL) {
      config.connectionString = process.env.DATABASE_URL;
      config.host = undefined;
      config.port = undefined;
      config.database = undefined;
      config.user = undefined;
      config.password = undefined;
    } else {
      config.host = process.env.DB_HOST || 'localhost';
      config.port = parseInt(process.env.DB_PORT || '5432');
      config.database = process.env.DB_NAME || 'marine_data';
      config.user = process.env.DB_USER || 'postgres';
      config.password = process.env.DB_PASSWORD || 'postgres';
    }

    this.pool = new Pool({
      ...config,
      max: 8,
      min: 0,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      keepAlive: true,
    });

    this.pool.on('error', (err) => {
      console.error('Unexpected database error:', err);
    });
  }

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  async query(text: string, params?: any[]) {
    const maxAttempts = 3;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const start = Date.now();
      try {
        const res = await this.pool.query(text, params);
        const duration = Date.now() - start;
        console.log('Executed query', { text, duration, rows: res.rowCount });
        return res;
      } catch (error: any) {
        lastError = error;
        const code = error?.code;
        const shouldRetry = code === 'ETIMEDOUT' || code === 'ECONNRESET' || code === 'EPIPE';

        console.error('Database query error:', { text, attempt, error });

        if (!shouldRetry || attempt === maxAttempts) {
          throw error;
        }

        // Small linear backoff for transient Neon/network timeouts.
        await new Promise((resolve) => setTimeout(resolve, attempt * 300));
      }
    }

    throw lastError;
  }

  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const result = await this.pool.query('SELECT NOW()');
      console.log('Database connection successful:', result.rows[0]);
      return true;
    } catch (error) {
      console.error('Database connection failed:', error);
      return false;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export default Database.getInstance();
