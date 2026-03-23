import { query } from '../db/connection.js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Initialize database with Darwin Core schema
 * Safely checks for existing tables before creating
 */
async function initializeDatabase(): Promise<void> {
  console.log('\n🗄️  Ratnakara Database Initialization');
  console.log('=' .repeat(60));

  try {
    // Test connection
    console.log('\n📡 Testing database connection...');
    await query('SELECT 1');
    console.log('✅ Database connection successful\n');

    // Check if Darwin Core tables exist
    console.log('🔍 Checking for Darwin Core tables...');
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'occurrences'
      ) as has_occurrences
    `);

    if (tableCheck.rows[0]?.has_occurrences) {
      console.log('✅ Darwin Core tables already exist\n');

      // Show table counts
      const counts = await query(`
        SELECT
          (SELECT COUNT(*) FROM occurrences) as occurrences,
          (SELECT COUNT(*) FROM environmental_measurements) as env_measurements,
          (SELECT COUNT(*) FROM edna_observations) as edna_obs,
          (SELECT COUNT(*) FROM fisher_observations) as fisher_obs,
          (SELECT COUNT(*) FROM dna_sequences) as dna_seq,
          (SELECT COUNT(*) FROM otolith_records) as otolith,
          (SELECT COUNT(*) FROM anomalies) as anomalies
      `);

      console.log('📊 Current Darwin Core record counts:');
      console.log(`   Occurrences:              ${counts.rows[0].occurrences}`);
      console.log(`   Environmental Measurements: ${counts.rows[0].env_measurements}`);
      console.log(`   eDNA Observations:        ${counts.rows[0].edna_obs}`);
      console.log(`   Fisher Observations:      ${counts.rows[0].fisher_obs}`);
      console.log(`   DNA Sequences:            ${counts.rows[0].dna_seq}`);
      console.log(`   Otolith Records:          ${counts.rows[0].otolith}`);
      console.log(`   Anomalies:                ${counts.rows[0].anomalies}`);

    } else {
      console.log('⚠️  Darwin Core tables not found. Creating...\n');

      // Read and execute schema-v2.sql
      const schemaPath = join(__dirname, '../db/schema-v2.sql');

      try {
        const schemaSql = readFileSync(schemaPath, 'utf-8');

        // Split into individual statements (PostgreSQL can handle multi-statement)
        // But we need to handle CREATE FUNCTION which contains semicolons
        const statements = schemaSql
          .split(/;\s*$/m)
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));

        console.log(`📜 Executing ${statements.length} SQL statements...`);

        for (let i = 0; i < statements.length; i++) {
          const statement = statements[i];
          if (statement.length > 0) {
            try {
              await query(statement);
              process.stdout.write('.');
            } catch (err: any) {
              // Ignore "already exists" errors
              if (!err.message.includes('already exists') &&
                  !err.message.includes('duplicate key')) {
                console.error(`\n⚠️  Statement ${i + 1} warning: ${err.message}`);
              }
            }
          }
        }

        console.log('\n\n✅ Darwin Core schema created successfully!');

      } catch (readError: any) {
        if (readError.code === 'ENOENT') {
          console.error('❌ schema-v2.sql not found at:', schemaPath);
          console.log('\nPlease ensure the schema file exists or create tables manually.');
          console.log('Run: psql -f backend/src/db/schema-v2.sql');
        } else {
          throw readError;
        }
      }
    }

    // Also check legacy tables
    console.log('\n🔍 Checking legacy tables...');
    const legacyCheck = await query(`
      SELECT
        (SELECT COUNT(*) FROM ocean_data) as ocean,
        (SELECT COUNT(*) FROM fisheries_data) as fisheries,
        (SELECT COUNT(*) FROM edna_data) as edna,
        (SELECT COUNT(*) FROM taxonomy) as taxonomy
    `);

    console.log('📊 Legacy table record counts:');
    console.log(`   Ocean Data:     ${legacyCheck.rows[0].ocean}`);
    console.log(`   Fisheries Data: ${legacyCheck.rows[0].fisheries}`);
    console.log(`   eDNA Data:      ${legacyCheck.rows[0].edna}`);
    console.log(`   Taxonomy:       ${legacyCheck.rows[0].taxonomy}`);

    console.log('\n' + '=' .repeat(60));
    console.log('✨ Database initialization complete!');
    console.log('\nNext steps:');
    console.log('  1. Run: npm run import:full    # Import all data sources');
    console.log('  2. Run: npm run dev            # Start the server');
    console.log('=' .repeat(60) + '\n');

  } catch (error: any) {
    console.error('\n❌ Database initialization failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Check DATABASE_URL in .env');
    console.error('  2. Ensure PostgreSQL is running');
    console.error('  3. Verify database credentials');
    process.exit(1);
  }

  process.exit(0);
}

// CLI help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🗄️  Ratnakara Database Initialization

Usage:
  npm run db:init
  npx tsx src/data/initDatabase.ts

What it does:
  1. Tests database connection
  2. Checks for Darwin Core tables (occurrences, etc.)
  3. Creates tables from schema-v2.sql if not present
  4. Shows current record counts

This is safe to run multiple times - it won't overwrite existing data.
  `);
  process.exit(0);
}

initializeDatabase();
