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
  await client.connect();

  const d1 = await client.query("DELETE FROM fisheries_data WHERE source = 'FAO_sample_fallback'");
  const d2 = await client.query("DELETE FROM edna_data WHERE source = 'OBIS'");

  console.log('deleted', { fisheries: d1.rowCount, edna: d2.rowCount });
  await client.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
