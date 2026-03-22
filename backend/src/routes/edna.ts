import { Router, Request, Response } from 'express';
import { query } from '../db/connection.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { species, season, minConfidence, region } = req.query;

    let queryText = `
      SELECT * FROM edna_data
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (species) {
      queryText += ` AND species = $${paramCount}`;
      params.push(species);
      paramCount++;
    }

    if (season) {
      queryText += ` AND season = $${paramCount}`;
      params.push(season);
      paramCount++;
    }

    if (minConfidence) {
      queryText += ` AND confidence >= $${paramCount}`;
      params.push(minConfidence);
      paramCount++;
    }

    if (region) {
      queryText += ` AND region = $${paramCount}`;
      params.push(region);
      paramCount++;
    }

    queryText += ` ORDER BY recorded_at DESC LIMIT 1000`;

    const result = await query(queryText, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('eDNA data error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch eDNA data' });
  }
});

router.get('/concentration-trends', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT
        species,
        AVG(concentration) as avg_concentration,
        COUNT(*) as sample_count
      FROM edna_data
      WHERE recorded_at >= NOW() - INTERVAL '90 days'
      GROUP BY species
      ORDER BY avg_concentration DESC
      LIMIT 30
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Concentration trends error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch concentration trends' });
  }
});

router.get('/depth-analysis', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT
        depth,
        AVG(concentration) as avg_concentration,
        AVG(confidence) as avg_confidence,
        COUNT(*) as sample_count
      FROM edna_data
      WHERE depth IS NOT NULL
      GROUP BY depth
      ORDER BY depth ASC
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Depth analysis error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch depth analysis' });
  }
});

router.get('/seasonal', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT
        season,
        species,
        AVG(concentration) as avg_concentration,
        COUNT(*) as sample_count
      FROM edna_data
      WHERE season IS NOT NULL
      GROUP BY season, species
      ORDER BY season, avg_concentration DESC
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Seasonal data error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch seasonal data' });
  }
});

router.get('/confidence-distribution', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT
        CASE
          WHEN confidence >= 90 THEN 'High (90-100%)'
          WHEN confidence >= 70 THEN 'Medium (70-89%)'
          WHEN confidence >= 50 THEN 'Low (50-69%)'
          ELSE 'Very Low (<50%)'
        END as confidence_range,
        COUNT(*) as count
      FROM edna_data
      GROUP BY confidence_range
      ORDER BY MIN(confidence) DESC
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Confidence distribution error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch confidence distribution' });
  }
});

router.get('/species-list', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT DISTINCT species
      FROM edna_data
      ORDER BY species ASC
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Species list error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch species list' });
  }
});

export default router;
