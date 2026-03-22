import { Router, Request, Response } from 'express';
import { query } from '../db/connection.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT * FROM taxonomy
      ORDER BY kingdom, phylum, class, order_name, family, genus, species
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Taxonomy data error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch taxonomy data' });
  }
});

router.get('/tree', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT
        kingdom,
        phylum,
        class,
        order_name,
        family,
        genus,
        species,
        common_name
      FROM taxonomy
      ORDER BY kingdom, phylum, class, order_name, family, genus, species
    `);

    const tree: any = {};

    result.rows.forEach(row => {
      const { kingdom, phylum, class: cls, order_name, family, genus, species, common_name } = row;

      if (!tree[kingdom]) tree[kingdom] = {};
      if (!tree[kingdom][phylum]) tree[kingdom][phylum] = {};
      if (!tree[kingdom][phylum][cls]) tree[kingdom][phylum][cls] = {};
      if (!tree[kingdom][phylum][cls][order_name]) tree[kingdom][phylum][cls][order_name] = {};
      if (!tree[kingdom][phylum][cls][order_name][family]) tree[kingdom][phylum][cls][order_name][family] = {};
      if (!tree[kingdom][phylum][cls][order_name][family][genus]) tree[kingdom][phylum][cls][order_name][family][genus] = [];

      tree[kingdom][phylum][cls][order_name][family][genus].push({
        species,
        common_name
      });
    });

    res.json({ success: true, data: tree });
  } catch (error) {
    console.error('Taxonomy tree error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch taxonomy tree' });
  }
});

router.get('/species/:species', async (req: Request, res: Response) => {
  try {
    const { species } = req.params;
    const result = await query(
      'SELECT * FROM taxonomy WHERE species = $1',
      [species]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Species not found' });
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

    const result = await query(
      `SELECT * FROM taxonomy
       WHERE species ILIKE $1 OR common_name ILIKE $1
       LIMIT 50`,
      [`%${q}%`]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Taxonomy search error:', error);
    res.status(500).json({ success: false, error: 'Failed to search taxonomy' });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT
        COUNT(DISTINCT kingdom) as kingdoms,
        COUNT(DISTINCT phylum) as phylums,
        COUNT(DISTINCT class) as classes,
        COUNT(DISTINCT order_name) as orders,
        COUNT(DISTINCT family) as families,
        COUNT(DISTINCT genus) as genera,
        COUNT(DISTINCT species) as species
      FROM taxonomy
    `);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Taxonomy stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch taxonomy stats' });
  }
});

export default router;
