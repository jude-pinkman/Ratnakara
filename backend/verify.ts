import { query } from './src/db/connection.js';

async function verify() {
  try {
    const taxonomy = await query('SELECT COUNT(*) FROM taxonomy');
    const fisheries = await query('SELECT COUNT(*) FROM fisheries_data');
    const ocean = await query('SELECT COUNT(*) FROM ocean_data');

    console.log('\n📊 Database Import Verification');
    console.log('================================');
    console.log(`✅ Taxonomy records: ${taxonomy.rows[0].count}`);
    console.log(`✅ Fisheries records: ${fisheries.rows[0].count}`);
    console.log(`✅ Ocean records: ${ocean.rows[0].count}\n`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

verify();
