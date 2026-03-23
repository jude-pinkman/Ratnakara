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

  const ddl = [
    'CREATE EXTENSION IF NOT EXISTS postgis',
    `
      CREATE TABLE IF NOT EXISTS marine_ocean_mask (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        source VARCHAR(255) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        geom geometry(MULTIPOLYGON, 4326) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `,
    'CREATE INDEX IF NOT EXISTS idx_marine_ocean_mask_geom ON marine_ocean_mask USING GIST (geom)',
    `
      CREATE TABLE IF NOT EXISTS marine_land_mask (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        source VARCHAR(255) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        geom geometry(MULTIPOLYGON, 4326) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `,
    'CREATE INDEX IF NOT EXISTS idx_marine_land_mask_geom ON marine_land_mask USING GIST (geom)'
  ];

  for (const stmt of ddl) {
    await client.query(stmt);
  }

  await client.query(`
    INSERT INTO marine_ocean_mask (name, source, is_active, geom)
    SELECT
      'Indian marine water mask (simplified)',
      'bootstrap-simplified-v1',
      true,
      ST_GeomFromText(
        'MULTIPOLYGON(
          ((66 5, 77 5, 77 24, 66 24, 66 5)),
          ((80 5, 97 5, 97 24, 80 24, 80 5)),
          ((66 -10, 98 -10, 98 8, 66 8, 66 -10)),
          ((92 6, 98 6, 98 15, 92 15, 92 6))
        )',
        4326
      )::geometry(MULTIPOLYGON, 4326)
    WHERE NOT EXISTS (SELECT 1 FROM marine_ocean_mask)
  `);

  await client.query(`
    INSERT INTO marine_land_mask (name, source, is_active, geom)
    SELECT
      'India+Sri Lanka land exclusion (simplified)',
      'bootstrap-simplified-v1',
      true,
      ST_GeomFromText(
        'MULTIPOLYGON(
          ((68 7, 69 20, 72 24, 77 28, 82 27, 88 25, 91 22, 92 20, 88 20, 85 18, 82 15, 80 12, 78 10, 75 8, 72 7, 68 7)),
          ((79.5 5.5, 81.9 5.5, 81.9 9.9, 79.5 9.9, 79.5 5.5))
        )',
        4326
      )::geometry(MULTIPOLYGON, 4326)
    WHERE NOT EXISTS (SELECT 1 FROM marine_land_mask)
  `);

  const counts = await client.query(`
    SELECT
      (SELECT COUNT(*)::int FROM marine_ocean_mask WHERE is_active = true) AS ocean_masks,
      (SELECT COUNT(*)::int FROM marine_land_mask WHERE is_active = true) AS land_masks
  `);

  console.log(counts.rows[0]);
  await client.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
