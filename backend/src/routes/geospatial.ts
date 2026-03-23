import { Router, Request, Response } from 'express';
import { query } from '../db/connection.js';

const router = Router();

// ============================================================================
// GEOSPATIAL API ROUTES
// Location-based data discovery for interactive maps
// ============================================================================

// Indian Ocean bounding box
const INDIAN_OCEAN_BOUNDS = {
  minLat: 5.0,
  maxLat: 25.0,
  minLng: 66.0,
  maxLng: 97.0
};

// GET /api/geo/stations - Get all monitoring stations/locations
router.get('/stations', async (req: Request, res: Response) => {
  try {
    const { type = 'all' } = req.query;

    let result: any[] = [];

    if (type === 'ocean' || type === 'all') {
      const oceanStations = await query(`
        SELECT DISTINCT ON (location)
          location as station_id,
          latitude as lat,
          longitude as lng,
          region,
          'ocean' as type,
          AVG(temperature) as avg_temp,
          AVG(salinity) as avg_salinity,
          AVG(oxygen) as avg_oxygen,
          COUNT(*) as observation_count
        FROM ocean_data
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        GROUP BY location, latitude, longitude, region
        ORDER BY location, observation_count DESC
      `);

      result = oceanStations.rows;
    }

    if (type === 'fisheries' || type === 'all') {
      const fishStations = await query(`
        SELECT
          'fish_' || ROW_NUMBER() OVER() as station_id,
          latitude as lat,
          longitude as lng,
          region,
          'fisheries' as type,
          COUNT(DISTINCT species) as species_count,
          SUM(abundance) as total_abundance,
          SUM(biomass) as total_biomass
        FROM fisheries_data
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        GROUP BY latitude, longitude, region
      `);

      if (type === 'all') {
        result = [...result, ...fishStations.rows];
      } else {
        result = fishStations.rows;
      }
    }

    if (type === 'edna' || type === 'all') {
      const ednaStations = await query(`
        SELECT
          'edna_' || ROW_NUMBER() OVER() as station_id,
          latitude as lat,
          longitude as lng,
          region,
          'edna' as type,
          COUNT(DISTINCT species) as detected_species,
          AVG(concentration) as avg_concentration,
          AVG(confidence) as avg_confidence
        FROM edna_data
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        GROUP BY latitude, longitude, region
      `);

      if (type === 'all') {
        result = [...result, ...ednaStations.rows];
      } else {
        result = ednaStations.rows;
      }
    }

    res.json({
      success: true,
      data: result.map((r: any) => ({
        ...r,
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lng)
      })),
      count: result.length,
      bounds: INDIAN_OCEAN_BOUNDS
    });

  } catch (error) {
    console.error('Stations error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stations' });
  }
});

// GET /api/geo/clusters - Get clustered data points for map
router.get('/clusters', async (req: Request, res: Response) => {
  try {
    const {
      zoom = 6,
      bounds, // format: minLat,minLng,maxLat,maxLng
      type = 'all'
    } = req.query;

    // Calculate grid size based on zoom level
    const zoomLevel = parseInt(zoom as string);
    const gridSize = Math.max(0.1, 5 / Math.pow(2, zoomLevel - 4));

    let boundsFilter = '';
    const params: any[] = [gridSize];
    let paramIndex = 2;

    if (bounds) {
      const [minLat, minLng, maxLat, maxLng] = (bounds as string).split(',').map(parseFloat);
      boundsFilter = `
        AND latitude >= $${paramIndex}
        AND latitude <= $${paramIndex + 1}
        AND longitude >= $${paramIndex + 2}
        AND longitude <= $${paramIndex + 3}
      `;
      params.push(minLat, maxLat, minLng, maxLng);
      paramIndex += 4;
    }

    const clusters: any[] = [];

    if (type === 'ocean' || type === 'all') {
      const oceanClusters = await query(`
        SELECT
          ROUND(latitude::numeric / $1) * $1 as cluster_lat,
          ROUND(longitude::numeric / $1) * $1 as cluster_lng,
          'ocean' as type,
          COUNT(*) as point_count,
          AVG(temperature) as avg_temp,
          AVG(salinity) as avg_salinity,
          AVG(oxygen) as avg_oxygen,
          AVG(ph) as avg_ph
        FROM ocean_data
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        ${boundsFilter}
        GROUP BY cluster_lat, cluster_lng
        HAVING COUNT(*) >= 1
      `, params);

      clusters.push(...oceanClusters.rows.map(r => ({
        lat: parseFloat(r.cluster_lat),
        lng: parseFloat(r.cluster_lng),
        type: 'ocean',
        count: parseInt(r.point_count),
        data: {
          avgTemp: parseFloat(r.avg_temp),
          avgSalinity: parseFloat(r.avg_salinity),
          avgOxygen: parseFloat(r.avg_oxygen),
          avgPh: parseFloat(r.avg_ph)
        }
      })));
    }

    if (type === 'fisheries' || type === 'all') {
      const fishClusters = await query(`
        SELECT
          ROUND(latitude::numeric / $1) * $1 as cluster_lat,
          ROUND(longitude::numeric / $1) * $1 as cluster_lng,
          'fisheries' as type,
          COUNT(*) as point_count,
          COUNT(DISTINCT species) as species_count,
          SUM(abundance) as total_abundance,
          SUM(biomass) as total_biomass,
          AVG(diversity_index) as avg_diversity
        FROM fisheries_data
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        ${boundsFilter}
        GROUP BY cluster_lat, cluster_lng
        HAVING COUNT(*) >= 1
      `, params);

      clusters.push(...fishClusters.rows.map(r => ({
        lat: parseFloat(r.cluster_lat),
        lng: parseFloat(r.cluster_lng),
        type: 'fisheries',
        count: parseInt(r.point_count),
        data: {
          speciesCount: parseInt(r.species_count),
          totalAbundance: parseInt(r.total_abundance),
          totalBiomass: parseFloat(r.total_biomass),
          avgDiversity: parseFloat(r.avg_diversity)
        }
      })));
    }

    if (type === 'edna' || type === 'all') {
      const ednaClusters = await query(`
        SELECT
          ROUND(latitude::numeric / $1) * $1 as cluster_lat,
          ROUND(longitude::numeric / $1) * $1 as cluster_lng,
          'edna' as type,
          COUNT(*) as point_count,
          COUNT(DISTINCT species) as detected_species,
          AVG(concentration) as avg_concentration,
          AVG(confidence) as avg_confidence
        FROM edna_data
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        ${boundsFilter}
        GROUP BY cluster_lat, cluster_lng
        HAVING COUNT(*) >= 1
      `, params);

      clusters.push(...ednaClusters.rows.map(r => ({
        lat: parseFloat(r.cluster_lat),
        lng: parseFloat(r.cluster_lng),
        type: 'edna',
        count: parseInt(r.point_count),
        data: {
          detectedSpecies: parseInt(r.detected_species),
          avgConcentration: parseFloat(r.avg_concentration),
          avgConfidence: parseFloat(r.avg_confidence)
        }
      })));
    }

    res.json({
      success: true,
      data: clusters,
      gridSize,
      zoomLevel,
      count: clusters.length
    });

  } catch (error) {
    console.error('Clusters error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch clusters' });
  }
});

// GET /api/geo/point/:lat/:lng - Get data for a specific point
router.get('/point/:lat/:lng', async (req: Request, res: Response) => {
  try {
    const { lat, lng } = req.params;
    const { radius = 10 } = req.query;

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusKm = parseFloat(radius as string);

    // Get nearby ocean data
    const oceanData = await query(`
      SELECT
        id,
        location,
        latitude,
        longitude,
        region,
        temperature,
        salinity,
        ph,
        oxygen,
        depth,
        recorded_at,
        (
          6371 * acos(
            cos(radians($1)) * cos(radians(latitude)) *
            cos(radians(longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(latitude))
          )
        ) as distance_km
      FROM ocean_data
      WHERE (
        6371 * acos(
          cos(radians($1)) * cos(radians(latitude)) *
          cos(radians(longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(latitude))
        )
      ) < $3
      ORDER BY distance_km ASC
      LIMIT 20
    `, [latitude, longitude, radiusKm]);

    // Get nearby fisheries data
    const fisheriesData = await query(`
      SELECT
        id,
        species,
        common_name,
        abundance,
        biomass,
        diversity_index,
        latitude,
        longitude,
        region,
        recorded_at,
        (
          6371 * acos(
            cos(radians($1)) * cos(radians(latitude)) *
            cos(radians(longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(latitude))
          )
        ) as distance_km
      FROM fisheries_data
      WHERE (
        6371 * acos(
          cos(radians($1)) * cos(radians(latitude)) *
          cos(radians(longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(latitude))
        )
      ) < $3
      ORDER BY distance_km ASC
      LIMIT 50
    `, [latitude, longitude, radiusKm]);

    // Get nearby eDNA data
    const ednaData = await query(`
      SELECT
        id,
        species,
        concentration,
        depth,
        confidence,
        season,
        latitude,
        longitude,
        region,
        recorded_at,
        (
          6371 * acos(
            cos(radians($1)) * cos(radians(latitude)) *
            cos(radians(longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(latitude))
          )
        ) as distance_km
      FROM edna_data
      WHERE (
        6371 * acos(
          cos(radians($1)) * cos(radians(latitude)) *
          cos(radians(longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(latitude))
        )
      ) < $3
      ORDER BY distance_km ASC
      LIMIT 30
    `, [latitude, longitude, radiusKm]);

    // Aggregate statistics
    const stats = {
      ocean: {
        count: oceanData.rows.length,
        avgTemp: oceanData.rows.length > 0
          ? oceanData.rows.reduce((sum, r) => sum + parseFloat(r.temperature || 0), 0) / oceanData.rows.length
          : null,
        avgSalinity: oceanData.rows.length > 0
          ? oceanData.rows.reduce((sum, r) => sum + parseFloat(r.salinity || 0), 0) / oceanData.rows.length
          : null,
        avgOxygen: oceanData.rows.length > 0
          ? oceanData.rows.reduce((sum, r) => sum + parseFloat(r.oxygen || 0), 0) / oceanData.rows.length
          : null
      },
      fisheries: {
        count: fisheriesData.rows.length,
        uniqueSpecies: new Set(fisheriesData.rows.map(r => r.species)).size,
        totalAbundance: fisheriesData.rows.reduce((sum, r) => sum + parseInt(r.abundance || 0), 0),
        totalBiomass: fisheriesData.rows.reduce((sum, r) => sum + parseFloat(r.biomass || 0), 0)
      },
      edna: {
        count: ednaData.rows.length,
        detectedSpecies: new Set(ednaData.rows.map(r => r.species)).size,
        avgConcentration: ednaData.rows.length > 0
          ? ednaData.rows.reduce((sum, r) => sum + parseFloat(r.concentration || 0), 0) / ednaData.rows.length
          : null
      }
    };

    // Get unique species list
    const allSpecies: Array<{ species: string; source: string; abundance?: string; concentration?: string }> = [
      ...fisheriesData.rows.map(r => ({ species: r.species, source: 'fisheries', abundance: r.abundance })),
      ...ednaData.rows.map(r => ({ species: r.species, source: 'edna', concentration: r.concentration }))
    ];

    const speciesSummary = Object.values(
      allSpecies.reduce((acc: Record<string, any>, curr) => {
        if (!acc[curr.species]) {
          acc[curr.species] = { species: curr.species, sources: [], totalAbundance: 0, avgConcentration: 0, count: 0 };
        }
        if (!acc[curr.species].sources.includes(curr.source)) {
          acc[curr.species].sources.push(curr.source);
        }
        if (curr.abundance) acc[curr.species].totalAbundance += parseInt(curr.abundance);
        if (curr.concentration) {
          acc[curr.species].avgConcentration += parseFloat(curr.concentration);
          acc[curr.species].count++;
        }
        return acc;
      }, {})
    ).map((s: any) => ({
      ...s,
      avgConcentration: s.count > 0 ? s.avgConcentration / s.count : 0
    }));

    res.json({
      success: true,
      location: { latitude, longitude, radiusKm },
      stats,
      speciesSummary,
      recentData: {
        ocean: oceanData.rows.slice(0, 5),
        fisheries: fisheriesData.rows.slice(0, 10),
        edna: ednaData.rows.slice(0, 10)
      }
    });

  } catch (error) {
    console.error('Point data error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch point data' });
  }
});

// GET /api/geo/heatmap/:parameter - Get heatmap data for a parameter
router.get('/heatmap/:parameter', async (req: Request, res: Response) => {
  try {
    const { parameter } = req.params;
    const { gridSize = 0.5, bounds } = req.query;

    const allowedParams: Record<string, { table: string; column: string }> = {
      temperature: { table: 'ocean_data', column: 'temperature' },
      salinity: { table: 'ocean_data', column: 'salinity' },
      ph: { table: 'ocean_data', column: 'ph' },
      oxygen: { table: 'ocean_data', column: 'oxygen' },
      abundance: { table: 'fisheries_data', column: 'abundance' },
      biomass: { table: 'fisheries_data', column: 'biomass' },
      diversity: { table: 'fisheries_data', column: 'diversity_index' },
      edna_concentration: { table: 'edna_data', column: 'concentration' },
      edna_confidence: { table: 'edna_data', column: 'confidence' }
    };

    if (!allowedParams[parameter]) {
      return res.status(400).json({
        success: false,
        error: `Invalid parameter. Allowed: ${Object.keys(allowedParams).join(', ')}`
      });
    }

    const { table, column } = allowedParams[parameter];
    const params: any[] = [parseFloat(gridSize as string)];
    let boundsFilter = '';

    if (bounds) {
      const [minLat, minLng, maxLat, maxLng] = (bounds as string).split(',').map(parseFloat);
      boundsFilter = `
        AND latitude >= $2
        AND latitude <= $3
        AND longitude >= $4
        AND longitude <= $5
      `;
      params.push(minLat, maxLat, minLng, maxLng);
    }

    const aggregation = parameter === 'abundance' || parameter === 'biomass' ? 'SUM' : 'AVG';

    const result = await query(`
      SELECT
        ROUND(latitude::numeric / $1) * $1 as lat,
        ROUND(longitude::numeric / $1) * $1 as lng,
        ${aggregation}(${column}) as value,
        COUNT(*) as samples,
        MIN(${column}) as min_value,
        MAX(${column}) as max_value
      FROM ${table}
      WHERE latitude IS NOT NULL
        AND longitude IS NOT NULL
        AND ${column} IS NOT NULL
        ${boundsFilter}
      GROUP BY lat, lng
      HAVING COUNT(*) >= 2
      ORDER BY value DESC
    `, params);

    // Calculate global stats for color scaling
    const values = result.rows.map(r => parseFloat(r.value));
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);

    res.json({
      success: true,
      parameter,
      gridSize: parseFloat(gridSize as string),
      stats: {
        min: minVal,
        max: maxVal,
        mean: values.reduce((a, b) => a + b, 0) / values.length,
        count: values.length
      },
      data: result.rows.map(r => ({
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lng),
        value: parseFloat(r.value),
        samples: parseInt(r.samples),
        intensity: (parseFloat(r.value) - minVal) / (maxVal - minVal || 1)
      }))
    });

  } catch (error) {
    console.error('Heatmap error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch heatmap data' });
  }
});

// GET /api/geo/regions - Get regional boundaries and stats
router.get('/regions', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      WITH region_stats AS (
        SELECT
          region,
          AVG(latitude) as center_lat,
          AVG(longitude) as center_lng,
          MIN(latitude) as min_lat,
          MAX(latitude) as max_lat,
          MIN(longitude) as min_lng,
          MAX(longitude) as max_lng,
          AVG(temperature) as avg_temp,
          AVG(salinity) as avg_salinity,
          AVG(oxygen) as avg_oxygen,
          COUNT(*) as observation_count
        FROM ocean_data
        WHERE region IS NOT NULL
        GROUP BY region
      ),
      fish_stats AS (
        SELECT
          region,
          COUNT(DISTINCT species) as species_count,
          SUM(abundance) as total_abundance
        FROM fisheries_data
        WHERE region IS NOT NULL
        GROUP BY region
      )
      SELECT
        r.*,
        COALESCE(f.species_count, 0) as species_count,
        COALESCE(f.total_abundance, 0) as total_abundance
      FROM region_stats r
      LEFT JOIN fish_stats f ON r.region = f.region
      ORDER BY r.observation_count DESC
    `);

    // Define approximate regional polygons for Indian Ocean regions
    const regionPolygons: Record<string, number[][]> = {
      'Bay of Bengal': [
        [21.5, 80], [21.5, 92], [15, 92], [7, 88], [7, 80], [15, 80]
      ],
      'Arabian Sea': [
        [24, 66], [24, 77], [20, 77], [8, 77], [8, 66], [20, 66]
      ],
      'Andaman Sea': [
        [14, 92], [14, 98], [6, 98], [6, 92]
      ],
      'Lakshadweep Sea': [
        [14, 71], [14, 76], [8, 76], [8, 71]
      ],
      'Gulf of Mannar': [
        [10, 78], [10, 80], [8, 80], [8, 78]
      ]
    };

    res.json({
      success: true,
      data: result.rows.map(r => ({
        name: r.region,
        center: {
          lat: parseFloat(r.center_lat),
          lng: parseFloat(r.center_lng)
        },
        bounds: {
          minLat: parseFloat(r.min_lat),
          maxLat: parseFloat(r.max_lat),
          minLng: parseFloat(r.min_lng),
          maxLng: parseFloat(r.max_lng)
        },
        polygon: regionPolygons[r.region] || null,
        stats: {
          avgTemp: parseFloat(r.avg_temp),
          avgSalinity: parseFloat(r.avg_salinity),
          avgOxygen: parseFloat(r.avg_oxygen),
          observationCount: parseInt(r.observation_count),
          speciesCount: parseInt(r.species_count),
          totalAbundance: parseInt(r.total_abundance)
        }
      }))
    });

  } catch (error) {
    console.error('Regions error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch regions' });
  }
});

// GET /api/geo/search - Search locations by name or coordinates
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q, type = 'all' } = req.query;

    if (!q) {
      return res.status(400).json({ success: false, error: 'Search query required' });
    }

    const searchTerm = `%${q}%`;

    // Search in location names and regions
    const locationResults = await query(`
      SELECT DISTINCT
        location as name,
        latitude as lat,
        longitude as lng,
        region,
        'station' as type
      FROM ocean_data
      WHERE location ILIKE $1 OR region ILIKE $1
      LIMIT 10
    `, [searchTerm]);

    // Search species
    const speciesResults = await query(`
      SELECT DISTINCT
        species as name,
        AVG(latitude) as lat,
        AVG(longitude) as lng,
        MAX(region) as region,
        'species' as type
      FROM fisheries_data
      WHERE species ILIKE $1
      GROUP BY species
      LIMIT 10
    `, [searchTerm]);

    // Check if query looks like coordinates
    const coordMatch = (q as string).match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
    let coordResult: any[] = [];

    if (coordMatch) {
      const [, lat, lng] = coordMatch;
      coordResult = [{
        name: `Location (${lat}, ${lng})`,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        region: 'Custom',
        type: 'coordinate'
      }];
    }

    res.json({
      success: true,
      query: q,
      results: [...coordResult, ...locationResults.rows, ...speciesResults.rows]
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, error: 'Search failed' });
  }
});

export default router;
