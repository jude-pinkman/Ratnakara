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

async function run() {
  const client = new Client({ connectionString: getDatabaseUrl() });
  const tag = '20260323';
  await client.connect();

  const before = await client.query(
    "SELECT " +
      "(SELECT COUNT(*) FROM fisheries_data WHERE source IS NULL)::int AS fisheries_null_source, " +
      "(SELECT COUNT(*) FROM edna_data WHERE source IS NULL)::int AS edna_null_source"
  );
  console.log('before', before.rows[0]);

  await client.query(`DROP TABLE IF EXISTS fisheries_data_null_source_backup_${tag}`);
  await client.query(`DROP TABLE IF EXISTS edna_data_null_source_backup_${tag}`);

  await client.query(
    `CREATE TABLE fisheries_data_null_source_backup_${tag} AS SELECT * FROM fisheries_data WHERE source IS NULL`
  );
  await client.query(
    `CREATE TABLE edna_data_null_source_backup_${tag} AS SELECT * FROM edna_data WHERE source IS NULL`
  );

  const b = await client.query(
    `SELECT ` +
      `(SELECT COUNT(*) FROM fisheries_data_null_source_backup_${tag})::int AS fisheries_backup, ` +
      `(SELECT COUNT(*) FROM edna_data_null_source_backup_${tag})::int AS edna_backup`
  );
  console.log('backup_counts', b.rows[0]);

  const d1 = await client.query(`DELETE FROM fisheries_data WHERE source IS NULL`);
  const d2 = await client.query(`DELETE FROM edna_data WHERE source IS NULL`);
  console.log('deleted', { fisheries: d1.rowCount, edna: d2.rowCount });

  const after = await client.query(
    "SELECT " +
      "(SELECT COUNT(*) FROM fisheries_data WHERE source IS NULL)::int AS fisheries_null_source, " +
      "(SELECT COUNT(*) FROM edna_data WHERE source IS NULL)::int AS edna_null_source"
  );
  console.log('after', after.rows[0]);

  await client.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
