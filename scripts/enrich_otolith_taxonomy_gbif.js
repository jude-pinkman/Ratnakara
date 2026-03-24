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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchGbifMatch(speciesId) {
  const speciesName = speciesId.replace(/_/g, ' ');
  const url = `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(speciesName)}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'ratnakara-taxonomy-enricher/1.0',
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`GBIF HTTP ${response.status}`);
  }

  return response.json();
}

async function run() {
  const client = new Client({ connectionString: getDatabaseUrl() });
  await client.connect();

  const pending = await client.query(`
    SELECT DISTINCT t.species
    FROM taxonomy t
    JOIN otolith_records r ON r.species = t.species
    WHERE t.kingdom IS NULL
       OR t.phylum IS NULL
       OR t.class IS NULL
       OR t.order_name IS NULL
       OR t.family IS NULL
       OR t.genus IS NULL
    ORDER BY t.species
  `);

  console.log(`pending_species=${pending.rowCount}`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of pending.rows) {
    const speciesId = row.species;

    try {
      const match = await fetchGbifMatch(speciesId);
      const confidence = Number(match.confidence || 0);
      const goodMatch = ['EXACT', 'HIGHERRANK', 'FUZZY'].includes(String(match.matchType || '').toUpperCase());

      if (!goodMatch || confidence < 70) {
        skipped += 1;
        console.log(`skip ${speciesId} matchType=${match.matchType || 'NONE'} confidence=${confidence}`);
        await sleep(120);
        continue;
      }

      const description = `taxonomy source=gbif, matchType=${match.matchType || 'UNKNOWN'}, confidence=${confidence}`;

      const result = await client.query(
        `
          UPDATE taxonomy
          SET
            kingdom = COALESCE(kingdom, $2),
            phylum = COALESCE(phylum, $3),
            class = COALESCE(class, $4),
            order_name = COALESCE(order_name, $5),
            family = COALESCE(family, $6),
            genus = COALESCE(genus, $7),
            description = COALESCE(description, $8)
          WHERE species = $1
        `,
        [
          speciesId,
          match.kingdom || null,
          match.phylum || null,
          match.class || null,
          match.order || null,
          match.family || null,
          match.genus ? String(match.genus).toLowerCase() : null,
          description,
        ]
      );

      if (result.rowCount > 0) {
        updated += 1;
      }

      console.log(`updated ${speciesId} -> ${match.scientificName || 'unknown'}`);
      await sleep(120);
    } catch (error) {
      failed += 1;
      console.log(`error ${speciesId}: ${error.message}`);
      await sleep(150);
    }
  }

  // GBIF omits class for some matches; apply conservative fallback for otolith fish records.
  await client.query(`
    UPDATE taxonomy t
    SET class = 'Actinopteri'
    WHERE t.class IS NULL
      AND t.kingdom = 'Animalia'
      AND t.phylum = 'Chordata'
      AND EXISTS (
        SELECT 1
        FROM otolith_records r
        WHERE r.species = t.species
      )
  `);

  const summary = await client.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(kingdom)::int AS kingdom_filled,
      COUNT(phylum)::int AS phylum_filled,
      COUNT(class)::int AS class_filled,
      COUNT(order_name)::int AS order_filled,
      COUNT(family)::int AS family_filled,
      COUNT(genus)::int AS genus_filled
    FROM taxonomy
  `);

  console.log(`updated=${updated} skipped=${skipped} failed=${failed}`);
  console.log('completeness', summary.rows[0]);

  await client.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
