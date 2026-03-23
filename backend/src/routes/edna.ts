import { Router, Request, Response } from 'express';
import db from '../db/database.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { species, minConfidence = '0', limit = '100' } = req.query;

    let query = `
      SELECT
        id, species, latitude, longitude, recorded_at,
        concentration, confidence, depth, source
      FROM edna_data
      WHERE confidence >= $1
    `;
    const params: any[] = [parseFloat(minConfidence as string)];
    let paramCount = 2;

    if (species) {
      query += ` AND species ILIKE $${paramCount}`;
      params.push(`%${species}%`);
      paramCount++;
    }

    query += ` ORDER BY recorded_at DESC LIMIT $${paramCount}`;
    params.push(parseInt(limit as string));

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('eDNA data error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch eDNA data' });
  }
});

router.get('/concentration-trends', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT
        DATE_TRUNC('day', recorded_at) as date,
        species,
        ROUND(AVG(concentration)::numeric, 3) as avg_concentration,
        COUNT(*) as sample_count
      FROM edna_data
      WHERE recorded_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', recorded_at), species
      ORDER BY date
    `;

    const result = await db.query(query);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Concentration trends error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch concentration trends' });
  }
});

router.get('/depth-analysis', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT
        depth,
        COUNT(*) as sample_count,
        ROUND(AVG(concentration)::numeric, 3) as avg_concentration,
        ROUND(AVG(confidence)::numeric, 2) as avg_confidence
      FROM edna_data
      WHERE recorded_at >= NOW() - INTERVAL '30 days'
      GROUP BY depth
      ORDER BY depth
    `;

    const result = await db.query(query);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Depth analysis error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch depth analysis' });
  }
});

router.get('/seasonal', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT
        CASE
          WHEN EXTRACT(MONTH FROM recorded_at) IN (3, 4, 5) THEN 'Spring'
          WHEN EXTRACT(MONTH FROM recorded_at) IN (6, 7, 8) THEN 'Summer'
          WHEN EXTRACT(MONTH FROM recorded_at) IN (9, 10, 11) THEN 'Fall'
          ELSE 'Winter'
        END as season,
        species,
        ROUND(AVG(concentration)::numeric, 3) as avg_concentration,
        COUNT(*) as sample_count
      FROM edna_data
      GROUP BY
        CASE
          WHEN EXTRACT(MONTH FROM recorded_at) IN (3, 4, 5) THEN 'Spring'
          WHEN EXTRACT(MONTH FROM recorded_at) IN (6, 7, 8) THEN 'Summer'
          WHEN EXTRACT(MONTH FROM recorded_at) IN (9, 10, 11) THEN 'Fall'
          ELSE 'Winter'
        END,
        species
      ORDER BY season, species
    `;

    const result = await db.query(query);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Seasonal data error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch seasonal data' });
  }
});

router.get('/confidence-distribution', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT
        CASE
          WHEN confidence < 0.6 THEN 'Low (< 0.6)'
          WHEN confidence < 0.8 THEN 'Medium (0.6-0.8)'
          ELSE 'High (>= 0.8)'
        END as confidence_range,
        COUNT(*) as count
      FROM edna_data
      GROUP BY confidence_range
      ORDER BY confidence_range
    `;

    const result = await db.query(query);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Confidence distribution error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch confidence distribution' });
  }
});

router.get('/species-list', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT DISTINCT species
      FROM edna_data
      ORDER BY species
    `;

    const result = await db.query(query);

    res.json({ success: true, data: result.rows.map(r => r.species) });
  } catch (error) {
    console.error('Species list error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch species list' });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT
        COUNT(*) as total_samples,
        ROUND(AVG(concentration)::numeric, 2) as avg_concentration,
        COUNT(DISTINCT species) as species_detected,
        ROUND(AVG(confidence)::numeric * 100, 0) as avg_confidence_pct
      FROM edna_data
    `;

    const result = await db.query(query);
    const stats = result.rows[0];

    res.json({
      success: true,
      data: {
        totalSamples: parseInt(stats.total_samples) || 0,
        avgConcentration: parseFloat(stats.avg_concentration) || 0,
        speciesDetected: parseInt(stats.species_detected) || 0,
        avgConfidencePct: parseInt(stats.avg_confidence_pct) || 0
      }
    });
  } catch (error) {
    console.error('eDNA stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch eDNA stats' });
  }
});

export default router;
