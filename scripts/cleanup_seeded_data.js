const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function getDatabaseUrl() {
  const envPath = path.join(__dirname, '..', 'backend', '.env');
  const txt = fs.readFileSync(envPath, 'utf8');
  const m = txt.match(/^DATABASE_URL=(.*)$/m);
  if (!m) {
    throw new Error('DATABASE_URL missing in backend/.env');
  }
  return m[1].trim();
}

async function main() {
  const cs = getDatabaseUrl();
  const client = new Client({ connectionString: cs });
  const tag = '20260323';

  await client.connect();

  const before = await client.query(`
    SELECT
      (SELECT COUNT(*) FROM ocean_data WHERE source IS NULL AND location LIKE 'Station-%')::int AS ocean,
      (SELECT COUNT(*) FROM fisheries_data WHERE source IS NULL AND location LIKE 'Fishing-Zone-%')::int AS fisheries,
      (SELECT COUNT(*) FROM edna_data WHERE source IS NULL AND location LIKE 'eDNA-Site-%')::int AS edna
  `);
  console.log('before', before.rows[0]);

  await client.query(`DROP TABLE IF EXISTS ocean_data_seed_backup_${tag}`);
  await client.query(`DROP TABLE IF EXISTS fisheries_data_seed_backup_${tag}`);
  await client.query(`DROP TABLE IF EXISTS edna_data_seed_backup_${tag}`);

  await client.query(`
    CREATE TABLE ocean_data_seed_backup_${tag} AS
    SELECT * FROM ocean_data
    WHERE source IS NULL AND location LIKE 'Station-%'
  `);
  await client.query(`
    CREATE TABLE fisheries_data_seed_backup_${tag} AS
    SELECT * FROM fisheries_data
    WHERE source IS NULL AND location LIKE 'Fishing-Zone-%'
  `);
  await client.query(`
    CREATE TABLE edna_data_seed_backup_${tag} AS
    SELECT * FROM edna_data
    WHERE source IS NULL AND location LIKE 'eDNA-Site-%'
  `);

  const backupCounts = await client.query(`
    SELECT
      (SELECT COUNT(*) FROM ocean_data_seed_backup_${tag})::int AS ocean,
      (SELECT COUNT(*) FROM fisheries_data_seed_backup_${tag})::int AS fisheries,
      (SELECT COUNT(*) FROM edna_data_seed_backup_${tag})::int AS edna
  `);
  console.log('backup_counts', backupCounts.rows[0]);

  const d1 = await client.query(`DELETE FROM ocean_data WHERE source IS NULL AND location LIKE 'Station-%'`);
  const d2 = await client.query(`DELETE FROM fisheries_data WHERE source IS NULL AND location LIKE 'Fishing-Zone-%'`);
  const d3 = await client.query(`DELETE FROM edna_data WHERE source IS NULL AND location LIKE 'eDNA-Site-%'`);
  console.log('deleted', { ocean: d1.rowCount, fisheries: d2.rowCount, edna: d3.rowCount });

  const after = await client.query(`
    SELECT
      (SELECT COUNT(*) FROM ocean_data WHERE source IS NULL AND location LIKE 'Station-%')::int AS ocean,
      (SELECT COUNT(*) FROM fisheries_data WHERE source IS NULL AND location LIKE 'Fishing-Zone-%')::int AS fisheries,
      (SELECT COUNT(*) FROM edna_data WHERE source IS NULL AND location LIKE 'eDNA-Site-%')::int AS edna
  `);
  console.log('after', after.rows[0]);

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
