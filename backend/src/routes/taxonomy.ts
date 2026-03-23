import { Router, Request, Response } from 'express';
import db from '../db/database.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { limit = '50' } = req.query;

    const query = `
      SELECT
        id, species, kingdom, phylum, class_name, order_name, family, genus, gbif_species_key
      FROM taxonomy
      ORDER BY species
      LIMIT $1
    `;

    const result = await db.query(query, [parseInt(limit as string)]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Taxonomy data error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch taxonomy data' });
  }
});

router.get('/tree', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT
        kingdom, phylum, class_name, order_name, family, genus, species
      FROM taxonomy
      ORDER BY kingdom, phylum, class_name, order_name, family, genus, species
    `;

    const result = await db.query(query);

    const tree: any = {};
    for (const row of result.rows) {
      if (!tree[row.kingdom]) tree[row.kingdom] = {};
      if (!tree[row.kingdom][row.phylum]) tree[row.kingdom][row.phylum] = {};
      if (!tree[row.kingdom][row.phylum][row.class_name]) tree[row.kingdom][row.phylum][row.class_name] = {};
    }

    res.json({ success: true, data: tree });
  } catch (error) {
    console.error('Taxonomy tree error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch taxonomy tree' });
  }
});

router.get('/species/:species', async (req: Request, res: Response) => {
  try {
    const { species } = req.params;

    const query = `
      SELECT
        id, species, kingdom, phylum, class_name, order_name, family, genus, gbif_species_key
      FROM taxonomy
      WHERE species = $1
    `;

    const result = await db.query(query, [species]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: `Species not found: ${species}` });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Species detail error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch species details' });
  }
});

router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, error: 'Query parameter required' });
    }

    const query = `
      SELECT
        id, species, kingdom, phylum, class_name, order_name, family, genus
      FROM taxonomy
      WHERE species ILIKE $1
         OR genus ILIKE $1
         OR family ILIKE $1
      ORDER BY species
      LIMIT 20
    `;

    const result = await db.query(query, [`%${q}%`]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Taxonomy search error:', error);
    res.status(500).json({ success: false, error: 'Failed to search taxonomy' });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT
        COUNT(DISTINCT kingdom) as kingdoms,
        COUNT(DISTINCT phylum) as phylums,
        COUNT(DISTINCT class_name) as classes,
        COUNT(DISTINCT order_name) as orders,
        COUNT(DISTINCT family) as families,
        COUNT(DISTINCT genus) as genera,
        COUNT(DISTINCT species) as species
      FROM taxonomy
    `;

    const result = await db.query(query);
    const row = result.rows[0];

    res.json({
      success: true,
      data: {
        kingdoms: parseInt(row.kingdoms),
        phylums: parseInt(row.phylums),
        classes: parseInt(row.classes),
        orders: parseInt(row.orders),
        families: parseInt(row.families),
        genera: parseInt(row.genera),
        species: parseInt(row.species)
      }
    });
  } catch (error) {
    console.error('Taxonomy stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch taxonomy stats' });
  }
});

export default router;
