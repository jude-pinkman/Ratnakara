import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

(async () => {
  try {
    // List tables
    const tables = await db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema='public'
      ORDER BY table_name
    `);

    console.log('\n=== Tables in Database ===');
    tables.rows.forEach(row => console.log('  -', row.table_name));

    // Check if data exists
    console.log('\n=== Record Counts ===');
    for (const table of tables.rows) {
      const count = await db.query(`SELECT COUNT(*) as count FROM ${table.table_name}`);
      console.log(`  ${table.table_name}: ${count.rows[0].count}`);
    }

    // Sample data
    console.log('\n=== Sample Ocean Data ===');
    const ocean = await db.query('SELECT * FROM ocean_data LIMIT 1');
    if (ocean.rows.length > 0) {
      console.log(JSON.stringify(ocean.rows[0], null, 2));
    } else {
      console.log('No ocean data found');
    }

    await db.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
