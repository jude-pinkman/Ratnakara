import { Router, Request, Response } from 'express';
import { query } from '../db/connection.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, region } = req.query;

    let queryText = `
      SELECT * FROM ocean_data
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (startDate) {
      queryText += ` AND recorded_at >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      queryText += ` AND recorded_at <= $${paramCount}`;
      params.push(endDate);
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
    console.error('Ocean data error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch ocean data' });
  }
});

router.get('/kpis', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT
        AVG(temperature) as avg_temp,
        AVG(salinity) as avg_salinity,
        AVG(ph) as avg_ph,
        AVG(oxygen) as avg_oxygen,
        MIN(temperature) as min_temp,
        MAX(temperature) as max_temp,
        COUNT(*) as total_records
      FROM ocean_data
      WHERE recorded_at >= NOW() - INTERVAL '30 days'
    `);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Ocean KPIs error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch KPIs' });
  }
});

router.get('/trends', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT
        DATE_TRUNC('month', recorded_at) as month,
        AVG(temperature) as avg_temp,
        AVG(salinity) as avg_salinity,
        AVG(ph) as avg_ph,
        AVG(oxygen) as avg_oxygen
      FROM ocean_data
      WHERE recorded_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', recorded_at)
      ORDER BY month ASC
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Ocean trends error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch trends' });
  }
});

router.get('/geospatial', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT DISTINCT ON (location)
        id, location, latitude, longitude, temperature, salinity, ph, oxygen, region
      FROM ocean_data
      ORDER BY location, recorded_at DESC
      LIMIT 200
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Ocean geospatial error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch geospatial data' });
  }
});

export default router;
