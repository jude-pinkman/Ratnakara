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

  const oceanSources = await client.query(
    "SELECT COALESCE(source, 'NULL') AS source, COUNT(*)::int AS c FROM ocean_data GROUP BY 1 ORDER BY c DESC LIMIT 10"
  );
  const fisheriesSources = await client.query(
    "SELECT COALESCE(source, 'NULL') AS source, COUNT(*)::int AS c FROM fisheries_data GROUP BY 1 ORDER BY c DESC LIMIT 10"
  );
  const ednaSources = await client.query(
    "SELECT COALESCE(source, 'NULL') AS source, COUNT(*)::int AS c FROM edna_data GROUP BY 1 ORDER BY c DESC LIMIT 10"
  );

  const seededRemain = await client.query(
    "SELECT " +
      "(SELECT COUNT(*) FROM ocean_data WHERE location LIKE 'Station-%' AND source IS NULL)::int AS ocean, " +
      "(SELECT COUNT(*) FROM fisheries_data WHERE location LIKE 'Fishing-Zone-%' AND source IS NULL)::int AS fisheries, " +
      "(SELECT COUNT(*) FROM edna_data WHERE location LIKE 'eDNA-Site-%' AND source IS NULL)::int AS edna"
  );

  console.log('ocean_sources', oceanSources.rows);
  console.log('fisheries_sources', fisheriesSources.rows);
  console.log('edna_sources', ednaSources.rows);
  console.log('seeded_remain', seededRemain.rows[0]);

  await client.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
