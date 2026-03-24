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

async function getCompleteness(client) {
  const q = await client.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(kingdom)::int AS kingdom_filled,
      COUNT(phylum)::int AS phylum_filled,
      COUNT("class")::int AS class_filled,
      COUNT(order_name)::int AS order_filled,
      COUNT(family)::int AS family_filled,
      COUNT(genus)::int AS genus_filled
    FROM taxonomy
  `);
  return q.rows[0];
}

async function run() {
  const client = new Client({ connectionString: getDatabaseUrl() });
  await client.connect();

  const before = await getCompleteness(client);
  console.log('before', before);

  await client.query('BEGIN');
  try {
    // Step 1: Derive genus directly from species identifier when missing.
    await client.query(`
      UPDATE taxonomy
      SET genus = split_part(species, '_', 1)
      WHERE genus IS NULL
        AND species LIKE '%_%'
        AND split_part(species, '_', 1) <> ''
    `);

    // Step 2: Fill by genus where at least one row for that genus has values.
    await client.query(`
      WITH genus_ref AS (
        SELECT
          genus,
          MAX(kingdom) FILTER (WHERE kingdom IS NOT NULL) AS kingdom,
          MAX(phylum) FILTER (WHERE phylum IS NOT NULL) AS phylum,
          MAX("class") FILTER (WHERE "class" IS NOT NULL) AS class_name,
          MAX(order_name) FILTER (WHERE order_name IS NOT NULL) AS order_name,
          MAX(family) FILTER (WHERE family IS NOT NULL) AS family
        FROM taxonomy
        WHERE genus IS NOT NULL
        GROUP BY genus
      )
      UPDATE taxonomy t
      SET
        kingdom = COALESCE(t.kingdom, g.kingdom),
        phylum = COALESCE(t.phylum, g.phylum),
        "class" = COALESCE(t."class", g.class_name),
        order_name = COALESCE(t.order_name, g.order_name),
        family = COALESCE(t.family, g.family)
      FROM genus_ref g
      WHERE t.genus = g.genus
        AND (
          t.kingdom IS NULL OR
          t.phylum IS NULL OR
          t."class" IS NULL OR
          t.order_name IS NULL OR
          t.family IS NULL
        )
    `);

    // Step 3: Cascade from family -> order/class/phylum/kingdom.
    await client.query(`
      WITH family_ref AS (
        SELECT
          family,
          MAX(order_name) FILTER (WHERE order_name IS NOT NULL) AS order_name,
          MAX("class") FILTER (WHERE "class" IS NOT NULL) AS class_name,
          MAX(phylum) FILTER (WHERE phylum IS NOT NULL) AS phylum,
          MAX(kingdom) FILTER (WHERE kingdom IS NOT NULL) AS kingdom
        FROM taxonomy
        WHERE family IS NOT NULL
        GROUP BY family
      )
      UPDATE taxonomy t
      SET
        order_name = COALESCE(t.order_name, f.order_name),
        "class" = COALESCE(t."class", f.class_name),
        phylum = COALESCE(t.phylum, f.phylum),
        kingdom = COALESCE(t.kingdom, f.kingdom)
      FROM family_ref f
      WHERE t.family = f.family
        AND (
          t.order_name IS NULL OR
          t."class" IS NULL OR
          t.phylum IS NULL OR
          t.kingdom IS NULL
        )
    `);

    // Step 4: Cascade from order -> class/phylum/kingdom.
    await client.query(`
      WITH order_ref AS (
        SELECT
          order_name,
          MAX("class") FILTER (WHERE "class" IS NOT NULL) AS class_name,
          MAX(phylum) FILTER (WHERE phylum IS NOT NULL) AS phylum,
          MAX(kingdom) FILTER (WHERE kingdom IS NOT NULL) AS kingdom
        FROM taxonomy
        WHERE order_name IS NOT NULL
        GROUP BY order_name
      )
      UPDATE taxonomy t
      SET
        "class" = COALESCE(t."class", o.class_name),
        phylum = COALESCE(t.phylum, o.phylum),
        kingdom = COALESCE(t.kingdom, o.kingdom)
      FROM order_ref o
      WHERE t.order_name = o.order_name
        AND (
          t."class" IS NULL OR
          t.phylum IS NULL OR
          t.kingdom IS NULL
        )
    `);

    // Step 5: Cascade from class -> phylum/kingdom.
    await client.query(`
      WITH class_ref AS (
        SELECT
          "class",
          MAX(phylum) FILTER (WHERE phylum IS NOT NULL) AS phylum,
          MAX(kingdom) FILTER (WHERE kingdom IS NOT NULL) AS kingdom
        FROM taxonomy
        WHERE "class" IS NOT NULL
        GROUP BY "class"
      )
      UPDATE taxonomy t
      SET
        phylum = COALESCE(t.phylum, c.phylum),
        kingdom = COALESCE(t.kingdom, c.kingdom)
      FROM class_ref c
      WHERE t."class" = c."class"
        AND (
          t.phylum IS NULL OR
          t.kingdom IS NULL
        )
    `);

    // Step 6: Cascade from phylum -> kingdom.
    await client.query(`
      WITH phylum_ref AS (
        SELECT
          phylum,
          MAX(kingdom) FILTER (WHERE kingdom IS NOT NULL) AS kingdom
        FROM taxonomy
        WHERE phylum IS NOT NULL
        GROUP BY phylum
      )
      UPDATE taxonomy t
      SET kingdom = COALESCE(t.kingdom, p.kingdom)
      FROM phylum_ref p
      WHERE t.phylum = p.phylum
        AND t.kingdom IS NULL
    `);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }

  const after = await getCompleteness(client);
  console.log('after', after);

  await client.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
