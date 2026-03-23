import { Router, Request, Response } from 'express';
import db from '../db/database.js';

const router = Router();

const INDIAN_OCEAN_BOUNDS = {
  minLat: 5.0,
  maxLat: 25.0,
  minLng: 66.0,
  maxLng: 97.0
};

const isWithinIndianMarineBounds = (lat: number, lng: number): boolean => {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= INDIAN_OCEAN_BOUNDS.minLat &&
    lat <= INDIAN_OCEAN_BOUNDS.maxLat &&
    lng >= INDIAN_OCEAN_BOUNDS.minLng &&
    lng <= INDIAN_OCEAN_BOUNDS.maxLng
  );
};

router.get('/stations', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT DISTINCT station_id,
        ROUND(AVG(latitude)::numeric, 4) as lat,
        ROUND(AVG(longitude)::numeric, 4) as lng,
        COUNT(*) as data_points
      FROM ocean_data
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      GROUP BY station_id
      ORDER BY data_points DESC
    `;
    const result = await db.query(query);
    res.json({ success: true, data: result.rows, count: result.rows.length, bounds: INDIAN_OCEAN_BOUNDS });
  } catch (error) {
    console.error('Stations error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stations' });
  }
});

router.get('/clusters', async (req: Request, res: Response) => {
  try {
    const { zoom = 6, type = 'all' } = req.query;
    const zoomLevel = parseInt(zoom as string);
    const gridSize = Math.max(0.1, 5 / Math.pow(2, zoomLevel - 4));

    const typeValue = type === 'all' ? 'mixed' : (type as string);

    let query = `
      SELECT
        ROUND((latitude / $1)::numeric, 4) * $1 as lat,
        ROUND((longitude / $1)::numeric, 4) * $1 as lng,
        COUNT(*) as count,
        $2 as type,
        ROUND(AVG(CASE WHEN data_type='ocean' THEN value ELSE NULL END)::numeric, 2) as data
      FROM (
        SELECT latitude, longitude, 'ocean' as data_type, temperature as value FROM ocean_data WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        UNION ALL
        SELECT latitude, longitude, 'fisheries' as data_type, abundance as value FROM fisheries_data WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        UNION ALL
        SELECT latitude, longitude, 'edna' as data_type, concentration as value FROM edna_data WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      ) combined
    `;

    const params = [gridSize, typeValue];

    if (type !== 'all') {
      query += ` WHERE data_type = $3`;
      params.push(type as string);
    }

    query += `
      GROUP BY ROUND((latitude / $1)::numeric, 4) * $1, ROUND((longitude / $1)::numeric, 4) * $1
      HAVING COUNT(*) > 0
      LIMIT 500
    `;

    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows, gridSize, zoomLevel, count: result.rows.length });
  } catch (error) {
    console.error('Clusters error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch clusters' });
  }
});

router.get('/point/:lat/:lng', async (req: Request, res: Response) => {
  try {
    const { lat, lng } = req.params;
    const radius = parseFloat(req.query.radius as string) || 25;
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (!isWithinIndianMarineBounds(latitude, longitude)) {
      return res.status(400).json({ success: false, error: 'Point is outside configured Indian marine bounds' });
    }

    // Convert radius (km) to degrees (approximate: 1 degree ≈ 111 km)
    const radiusDegrees = radius / 111;

    // Simple query without aggregations first
    const oceanQuery = `
      SELECT COUNT(*) as count
      FROM ocean_data
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        AND ABS(latitude - $1) < $3
        AND ABS(longitude - $2) < $3
      LIMIT 1
    `;

    const result = await db.query(oceanQuery, [latitude, longitude, radiusDegrees]);

    res.json({
      success: true,
      location: { latitude, longitude, radiusKm: radius },
      stats: {
        ocean: { count: 0, avgTemp: null, avgSalinity: null, avgOxygen: null },
        fisheries: { count: 0, uniqueSpecies: 0, totalAbundance: 0, totalBiomass: 0 },
        edna: { count: 0, detectedSpecies: 0, avgConcentration: null }
      },
      speciesSummary: [],
      recentData: { ocean: [], fisheries: [], edna: [] }
    });
  } catch (error) {
    console.error('Point data error:', error);
    res.status(500).json({ success: false, error:  `Failed to fetch point data: ${error}` });
  }
});

router.get('/heatmap/:parameter', async (req: Request, res: Response) => {
  try {
    const { parameter } = req.params;
    const { gridSize = 0.5 } = req.query;
    const grid = parseFloat(gridSize as string);

    let query = '';
    let table = 'ocean_data';
    let valueColumn = 'temperature';

    if (parameter === 'temperature' || parameter === 'altitud_temp' || parameter === 'wind_speed' || parameter === 'wave_height') {
      valueColumn = parameter;
      table = 'ocean_data';
    } else if (parameter === 'abundance' || parameter === 'biomass') {
      valueColumn = parameter;
      table = 'fisheries_data';
    } else if (parameter === 'edna_concentration') {
      valueColumn = 'concentration';
      table = 'edna_data';
    }

    query = `
      SELECT
        ROUND((latitude / $1)::numeric, 4) * $1 as lat,
        ROUND((longitude / $1)::numeric, 4) * $1 as lng,
        ROUND(AVG(${valueColumn})::numeric, 2) as value,
        COUNT(*) as count
      FROM ${table}
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        AND ${valueColumn} IS NOT NULL
      GROUP BY ROUND((latitude / $1)::numeric, 4) * $1, ROUND((longitude / $1)::numeric, 4) * $1
      ORDER BY value DESC
      LIMIT 500
    `;

    const result = await db.query(query, [grid]);
    const stats = {
      min: result.rows.length > 0 ? Math.min(...result.rows.map(r => r.value)) : null,
      max: result.rows.length > 0 ? Math.max(...result.rows.map(r => r.value)) : null,
      mean: result.rows.length > 0 ? result.rows.reduce((sum, r) => sum + parseFloat(r.value), 0) / result.rows.length : null,
      count: result.rows.length
    };

    res.json({
      success: true,
      parameter,
      gridSize: grid,
      stats,
      data: result.rows.map(r => ({
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lng),
        value: parseFloat(r.value),
        intensity: Math.min(1, parseFloat(r.value) / (stats.max || 1))
      }))
    });
  } catch (error) {
    console.error('Heatmap error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch heatmap data' });
  }
});

router.get('/regions', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT
        CASE
          WHEN latitude BETWEEN 10 AND 20 AND longitude BETWEEN 70 AND 80 THEN 'Arabian Sea'
          WHEN latitude BETWEEN 10 AND 20 AND longitude BETWEEN 80 AND 95 THEN 'Bay of Bengal'
          WHEN latitude BETWEEN 5 AND 12 AND longitude BETWEEN 93 AND 97 THEN 'Andaman Sea'
          ELSE 'Indian Ocean'
        END as name,
        ROUND(AVG(latitude)::numeric, 4) as lat,
        ROUND(AVG(longitude)::numeric, 4) as lng,
        ROUND(AVG(temperature)::numeric, 2) as avgTemp,
        COUNT(DISTINCT CASE WHEN species IS NOT NULL THEN species END) as speciesCount,
        COUNT(*) as recordCount
      FROM (
        SELECT latitude, longitude, temperature, NULL as species FROM ocean_data
        UNION ALL
        SELECT latitude, longitude, NULL as temperature, species FROM fisheries_data
      ) combined
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      GROUP BY name
      HAVING COUNT(*) > 0
    `;

    const result = await db.query(query);
    const regions = result.rows.map(r => ({
      name: r.name,
      center: { lat: parseFloat(r.lat), lng: parseFloat(r.lng) },
      stats: {
        avgTemp: r.avgtemp ? parseFloat(r.avgtemp) : 0,
        avgSalinity: 0,
        avgOxygen: 0,
        observationCount: parseInt(r.recordcount),
        speciesCount: parseInt(r.speciescount),
        totalAbundance: 0
      }
    }));

    res.json({ success: true, data: regions });
  } catch (error) {
    console.error('Regions error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch regions' });
  }
});

router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, error: 'Search query required' });
    }

    const searchTerm = `%${q}%`;
    const query = `
      SELECT DISTINCT species as name, 'species' as type,
        ROUND(AVG(latitude)::numeric, 4) as lat,
        ROUND(AVG(longitude)::numeric, 4) as lng
      FROM fisheries_data
      WHERE species ILIKE $1
      GROUP BY species
      UNION ALL
      SELECT DISTINCT species as name, 'species' as type,
        ROUND(AVG(latitude)::numeric, 4) as lat,
        ROUND(AVG(longitude)::numeric, 4) as lng
      FROM edna_data
      WHERE species ILIKE $1
      GROUP BY species
      LIMIT 20
    `;

    const result = await db.query(query, [searchTerm]);
    const results = result.rows.map(r => ({
      name: r.name,
      type: r.type,
      region: 'Marine Region',
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lng)
    }));

    res.json({ success: true, query: q, results });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, error: 'Search failed' });
  }
});

export default router;
