import { Router, Request, Response } from 'express';
import db from '../db/database.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, limit = '100' } = req.query;

    let query = `
      SELECT
        id, station_id, latitude, longitude, recorded_at,
        temperature, salinity, ph, oxygen, wave_height, wind_speed, source
      FROM ocean_data
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (startDate) {
      query += ` AND recorded_at >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      query += ` AND recorded_at <= $${paramCount}`;
      params.push(endDate);
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
    console.error('Ocean data error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch ocean data' });
  }
});

router.get('/kpis', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT
        ROUND(AVG(temperature)::numeric, 2) as avg_temperature,
        ROUND(AVG(wave_height)::numeric, 2) as avg_wave_height,
        ROUND(AVG(wind_speed)::numeric, 2) as avg_wind_speed,
        COUNT(DISTINCT station_id) as station_count,
        COUNT(*) as total_records,
        COUNT(CASE WHEN temperature IS NOT NULL THEN 1 END) as records_with_temp,
        COUNT(CASE WHEN wave_height IS NOT NULL THEN 1 END) as records_with_wave,
        COUNT(CASE WHEN wind_speed IS NOT NULL THEN 1 END) as records_with_wind
      FROM ocean_data
      WHERE recorded_at >= NOW() - INTERVAL '90 days'
    `;

    const result = await db.query(query);
    const row = result.rows[0];

    res.json({
      success: true,
      data: {
        avg_temperature: row.avg_temperature || 0,
        avg_wave_height: row.avg_wave_height || 0,
        avg_wind_speed: row.avg_wind_speed || 0,
        total_records: parseInt(row.total_records),
        station_count: parseInt(row.station_count),
        data_coverage: {
          temperature_records: parseInt(row.records_with_temp),
          wave_height_records: parseInt(row.records_with_wave),
          wind_speed_records: parseInt(row.records_with_wind)
        }
      }
    });
  } catch (error) {
    console.error('Ocean KPIs error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch KPIs' });
  }
});

router.get('/trends', async (req: Request, res: Response) => {
  try {
    const { year } = req.query;

    const query = `
      SELECT
        DATE_TRUNC('day', recorded_at) as day,
        ROUND(AVG(temperature)::numeric, 2) as avg_temperature,
        ROUND(AVG(wave_height)::numeric, 2) as avg_wave_height,
        ROUND(AVG(wind_speed)::numeric, 2) as avg_wind_speed
      FROM ocean_data
      WHERE EXTRACT(YEAR FROM recorded_at) = COALESCE($1, EXTRACT(YEAR FROM NOW()))
      GROUP BY DATE_TRUNC('day', recorded_at)
      ORDER BY day DESC
      LIMIT 30
    `;

    const result = await db.query(query, [year || new Date().getFullYear()]);

    res.json({
      success: true,
      data: result.rows,
      year: year || new Date().getFullYear()
    });
  } catch (error) {
    console.error('Ocean trends error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch trends' });
  }
});

router.get('/geospatial', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT
        latitude, longitude, temperature, salinity, ph, oxygen,
        wave_height, wind_speed, recorded_at, station_id,
        station_id AS station_name
      FROM ocean_data
      WHERE latitude IS NOT NULL
        AND longitude IS NOT NULL
      ORDER BY recorded_at DESC
      LIMIT 500
    `;

    const result = await db.query(query);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Ocean geospatial error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch geospatial data' });
  }
});

export default router;
