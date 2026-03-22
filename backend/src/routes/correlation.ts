import { Router, Request, Response } from 'express';
import { query } from '../db/connection.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { species } = req.query;

    let queryText = `
      SELECT * FROM correlations
      WHERE 1=1
    `;
    const params: any[] = [];

    if (species) {
      queryText += ` AND species = $1`;
      params.push(species);
    }

    queryText += ` ORDER BY recorded_at DESC LIMIT 500`;

    const result = await query(queryText, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Correlations error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch correlations' });
  }
});

router.get('/environmental-impact', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT
        c.species,
        AVG(c.temperature) as avg_temp,
        AVG(c.abundance) as avg_abundance,
        CORR(c.temperature, c.abundance) as temp_correlation,
        CORR(c.salinity, c.abundance) as salinity_correlation,
        CORR(c.ph, c.abundance) as ph_correlation,
        CORR(c.oxygen, c.abundance) as oxygen_correlation
      FROM correlations c
      GROUP BY c.species
      HAVING COUNT(*) >= 10
      ORDER BY temp_correlation DESC
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Environmental impact error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch environmental impact' });
  }
});

router.get('/scatter/:variable', async (req: Request, res: Response) => {
  try {
    const { variable } = req.params;
    const { species } = req.query;

    const allowedVariables = ['temperature', 'salinity', 'ph', 'oxygen'];
    if (!allowedVariables.includes(variable)) {
      return res.status(400).json({ success: false, error: 'Invalid variable' });
    }

    let queryText = `
      SELECT ${variable}, abundance, species
      FROM correlations
      WHERE ${variable} IS NOT NULL AND abundance IS NOT NULL
    `;
    const params: any[] = [];

    if (species) {
      queryText += ` AND species = $1`;
      params.push(species);
    }

    queryText += ` ORDER BY ${variable} ASC LIMIT 500`;

    const result = await query(queryText, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Scatter data error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch scatter data' });
  }
});

router.get('/species-list', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT DISTINCT species
      FROM correlations
      ORDER BY species ASC
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Species list error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch species list' });
  }
});

export default router;
