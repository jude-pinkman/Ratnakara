require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    const tax = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'taxonomy'
      ORDER BY ordinal_position
    `);
    console.log('Taxonomy columns:');
    tax.rows.forEach(r => console.log('  -', r.column_name, ':', r.data_type));

    const corr = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'correlations'
      ORDER BY ordinal_position
    `);
    console.log('\nCorrelations columns:');
    corr.rows.forEach(r => console.log('  -', r.column_name, ':', r.data_type));

    const edna = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'edna_data'
      ORDER BY ordinal_position
    `);
    console.log('\neDNA columns:');
    edna.rows.forEach(r => console.log('  -', r.column_name, ':', r.data_type));

    await pool.end();
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
