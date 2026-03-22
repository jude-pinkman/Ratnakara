import { Router, Request, Response } from 'express';
import { query } from '../db/connection.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { species, region, startDate, endDate } = req.query;

    let queryText = `
      SELECT * FROM fisheries_data
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (species) {
      queryText += ` AND species = $${paramCount}`;
      params.push(species);
      paramCount++;
    }

    if (region) {
      queryText += ` AND region = $${paramCount}`;
      params.push(region);
      paramCount++;
    }

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

    queryText += ` ORDER BY recorded_at DESC LIMIT 1000`;

    const result = await query(queryText, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Fisheries data error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch fisheries data' });
  }
});

router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT
        SUM(abundance) as total_abundance,
        SUM(biomass) as total_biomass,
        AVG(diversity_index) as avg_diversity,
        COUNT(DISTINCT species) as species_count
      FROM fisheries_data
      WHERE recorded_at >= NOW() - INTERVAL '30 days'
    `);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Fisheries metrics error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch metrics' });
  }
});

router.get('/species-distribution', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT
        species,
        common_name,
        SUM(abundance) as total_abundance,
        SUM(biomass) as total_biomass,
        COUNT(*) as observation_count
      FROM fisheries_data
      WHERE recorded_at >= NOW() - INTERVAL '90 days'
      GROUP BY species, common_name
      ORDER BY total_abundance DESC
      LIMIT 20
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Species distribution error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch species distribution' });
  }
});

router.get('/temporal', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT
        DATE_TRUNC('month', recorded_at) as month,
        species,
        SUM(abundance) as total_abundance,
        SUM(biomass) as total_biomass
      FROM fisheries_data
      WHERE recorded_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', recorded_at), species
      ORDER BY month ASC, total_abundance DESC
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Temporal data error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch temporal data' });
  }
});

router.get('/geospatial', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT
        location,
        latitude,
        longitude,
        region,
        species,
        abundance,
        biomass,
        recorded_at
      FROM fisheries_data
      WHERE recorded_at >= NOW() - INTERVAL '30 days'
      ORDER BY recorded_at DESC
      LIMIT 200
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Geospatial data error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch geospatial data' });
  }
});

export default router;
