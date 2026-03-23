import { Router, Request, Response } from 'express';
import { query } from '../db/connection.js';

const router = Router();

// ============================================================================
// UNIFIED DATA INTEGRATION ENGINE
// Connects Ocean + Fish + eDNA by Location + Time
// ============================================================================

interface UnifiedDataPoint {
  id: string;
  latitude: number;
  longitude: number;
  region: string;
  date: string;
  dataType: string;
  // Ocean parameters
  temperature?: number;
  salinity?: number;
  ph?: number;
  oxygen?: number;
  depth?: number;
  // Fisheries parameters
  species?: string;
  abundance?: number;
  biomass?: number;
  diversityIndex?: number;
  // eDNA parameters
  eDnaConcentration?: number;
  eDnaConfidence?: number;
  season?: string;
}

interface InsightResult {
  insight: string;
  type: 'correlation' | 'trend' | 'anomaly' | 'prediction';
  confidence: number;
  relatedFactors: string[];
  recommendation?: string;
}

// GET /api/insights/unified - Get unified data by location + time
router.get('/unified', async (req: Request, res: Response) => {
  try {
    const {
      lat,
      lng,
      radius = 50, // km
      startDate,
      endDate,
      region,
      limit = 500
    } = req.query;

    // Build dynamic query based on presence of v2 schema tables
    // First check if occurrences table exists
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'occurrences'
      ) as has_v2_schema
    `);

    const hasV2Schema = tableCheck.rows[0]?.has_v2_schema;

    if (hasV2Schema) {
      // Use Darwin Core v2 schema
      let queryText = `
        WITH unified_data AS (
          SELECT
            o.id::text,
            o.decimalLatitude as latitude,
            o.decimalLongitude as longitude,
            o.region,
            o.eventDate as date,
            o.dataType,
            o.scientificName as species,
            em.temperature_celsius as temperature,
            em.salinity_psu as salinity,
            em.ph,
            em.dissolved_oxygen_mg_per_l as oxygen,
            em.depth_metres as depth,
            fo.catch_abundance as abundance,
            fo.catch_weight_kg as biomass,
            fo.species_diversity_index as diversity_index,
            eo.edna_concentration_per_litre as edna_concentration,
            eo.detection_confidence as edna_confidence,
            eo.season
          FROM occurrences o
          LEFT JOIN environmental_measurements em ON o.occurrenceID = em.occurrenceID
          LEFT JOIN fisher_observations fo ON o.occurrenceID = fo.occurrenceID
          LEFT JOIN edna_observations eo ON o.occurrenceID = eo.occurrenceID
          WHERE 1=1
      `;

      const params: any[] = [];
      let paramIndex = 1;

      // Geospatial filter using Haversine approximation
      if (lat && lng) {
        queryText += `
          AND (
            6371 * acos(
              cos(radians($${paramIndex})) * cos(radians(o.decimalLatitude)) *
              cos(radians(o.decimalLongitude) - radians($${paramIndex + 1})) +
              sin(radians($${paramIndex})) * sin(radians(o.decimalLatitude))
            )
          ) < $${paramIndex + 2}
        `;
        params.push(parseFloat(lat as string), parseFloat(lng as string), parseFloat(radius as string));
        paramIndex += 3;
      }

      // Date range filter
      if (startDate) {
        queryText += ` AND o.eventDate >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }
      if (endDate) {
        queryText += ` AND o.eventDate <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      // Region filter
      if (region && region !== 'all') {
        queryText += ` AND o.region = $${paramIndex}`;
        params.push(region);
        paramIndex++;
      }

      queryText += `
        )
        SELECT * FROM unified_data
        ORDER BY date DESC
        LIMIT $${paramIndex}
      `;
      params.push(parseInt(limit as string));

      const result = await query(queryText, params);
      res.json({
        success: true,
        data: result.rows,
        count: result.rows.length,
        schema: 'darwin_core_v2'
      });

    } else {
      // Fallback to v1 schema with separate tables
      let queryText = `
        WITH ocean AS (
          SELECT
            id::text,
            latitude,
            longitude,
            region,
            recorded_at as date,
            'ocean' as data_type,
            NULL as species,
            temperature,
            salinity,
            ph,
            oxygen,
            depth,
            NULL::numeric as abundance,
            NULL::numeric as biomass,
            NULL::numeric as diversity_index,
            NULL::numeric as edna_concentration,
            NULL::numeric as edna_confidence,
            NULL as season
          FROM ocean_data
          WHERE 1=1
      `;

      const params: any[] = [];
      let paramIndex = 1;

      // Add filters for ocean data
      if (lat && lng) {
        queryText += `
          AND (
            6371 * acos(
              cos(radians($${paramIndex})) * cos(radians(latitude)) *
              cos(radians(longitude) - radians($${paramIndex + 1})) +
              sin(radians($${paramIndex})) * sin(radians(latitude))
            )
          ) < $${paramIndex + 2}
        `;
        params.push(parseFloat(lat as string), parseFloat(lng as string), parseFloat(radius as string));
        paramIndex += 3;
      }

      if (startDate) {
        queryText += ` AND recorded_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }
      if (endDate) {
        queryText += ` AND recorded_at <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      if (region && region !== 'all') {
        queryText += ` AND region = $${paramIndex}`;
        params.push(region);
        paramIndex++;
      }

      queryText += `
        ),
        fisheries AS (
          SELECT
            id::text,
            latitude,
            longitude,
            region,
            recorded_at as date,
            'fisheries' as data_type,
            species,
            NULL::numeric as temperature,
            NULL::numeric as salinity,
            NULL::numeric as ph,
            NULL::numeric as oxygen,
            NULL::integer as depth,
            abundance,
            biomass,
            diversity_index,
            NULL::numeric as edna_concentration,
            NULL::numeric as edna_confidence,
            NULL as season
          FROM fisheries_data
          WHERE 1=1
      `;

      // Re-apply filters for fisheries (reuse same param values)
      paramIndex = 1;
      if (lat && lng) {
        queryText += `
          AND (
            6371 * acos(
              cos(radians($${paramIndex})) * cos(radians(latitude)) *
              cos(radians(longitude) - radians($${paramIndex + 1})) +
              sin(radians($${paramIndex})) * sin(radians(latitude))
            )
          ) < $${paramIndex + 2}
        `;
        paramIndex += 3;
      }
      if (startDate) {
        queryText += ` AND recorded_at >= $${paramIndex}`;
        paramIndex++;
      }
      if (endDate) {
        queryText += ` AND recorded_at <= $${paramIndex}`;
        paramIndex++;
      }
      if (region && region !== 'all') {
        queryText += ` AND region = $${paramIndex}`;
        paramIndex++;
      }

      queryText += `
        ),
        edna AS (
          SELECT
            id::text,
            latitude,
            longitude,
            region,
            recorded_at as date,
            'edna' as data_type,
            species,
            NULL::numeric as temperature,
            NULL::numeric as salinity,
            NULL::numeric as ph,
            NULL::numeric as oxygen,
            depth,
            NULL::numeric as abundance,
            NULL::numeric as biomass,
            NULL::numeric as diversity_index,
            concentration as edna_concentration,
            confidence as edna_confidence,
            season
          FROM edna_data
          WHERE 1=1
      `;

      // Re-apply filters for edna
      paramIndex = 1;
      if (lat && lng) {
        queryText += `
          AND (
            6371 * acos(
              cos(radians($${paramIndex})) * cos(radians(latitude)) *
              cos(radians(longitude) - radians($${paramIndex + 1})) +
              sin(radians($${paramIndex})) * sin(radians(latitude))
            )
          ) < $${paramIndex + 2}
        `;
        paramIndex += 3;
      }
      if (startDate) {
        queryText += ` AND recorded_at >= $${paramIndex}`;
        paramIndex++;
      }
      if (endDate) {
        queryText += ` AND recorded_at <= $${paramIndex}`;
        paramIndex++;
      }
      if (region && region !== 'all') {
        queryText += ` AND region = $${paramIndex}`;
        paramIndex++;
      }

      queryText += `
        )
        SELECT * FROM (
          SELECT * FROM ocean
          UNION ALL
          SELECT * FROM fisheries
          UNION ALL
          SELECT * FROM edna
        ) combined
        ORDER BY date DESC
        LIMIT $${params.length + 1}
      `;

      params.push(parseInt(limit as string));

      const result = await query(queryText, params);
      res.json({
        success: true,
        data: result.rows,
        count: result.rows.length,
        schema: 'v1_unified'
      });
    }

  } catch (error) {
    console.error('Unified data error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch unified data' });
  }
});

// GET /api/insights/location/:lat/:lng - Get all data for a specific location
router.get('/location/:lat/:lng', async (req: Request, res: Response) => {
  try {
    const { lat, lng } = req.params;
    const { radius = 25 } = req.query; // Default 25km radius

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusKm = parseFloat(radius as string);

    // Aggregate data from all sources near this location
    const oceanData = await query(`
      SELECT
        AVG(temperature) as avg_temp,
        AVG(salinity) as avg_salinity,
        AVG(ph) as avg_ph,
        AVG(oxygen) as avg_oxygen,
        COUNT(*) as ocean_records
      FROM ocean_data
      WHERE (
        6371 * acos(
          cos(radians($1)) * cos(radians(latitude)) *
          cos(radians(longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(latitude))
        )
      ) < $3
    `, [latitude, longitude, radiusKm]);

    const fisheriesData = await query(`
      SELECT
        COUNT(DISTINCT species) as species_count,
        SUM(abundance) as total_abundance,
        SUM(biomass) as total_biomass,
        AVG(diversity_index) as avg_diversity,
        COUNT(*) as fisheries_records
      FROM fisheries_data
      WHERE (
        6371 * acos(
          cos(radians($1)) * cos(radians(latitude)) *
          cos(radians(longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(latitude))
        )
      ) < $3
    `, [latitude, longitude, radiusKm]);

    const ednaData = await query(`
      SELECT
        COUNT(DISTINCT species) as detected_species,
        AVG(concentration) as avg_concentration,
        AVG(confidence) as avg_confidence,
        COUNT(*) as edna_records
      FROM edna_data
      WHERE (
        6371 * acos(
          cos(radians($1)) * cos(radians(latitude)) *
          cos(radians(longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(latitude))
        )
      ) < $3
    `, [latitude, longitude, radiusKm]);

    // Get top species at this location
    const topSpecies = await query(`
      SELECT species, SUM(abundance) as total_abundance
      FROM fisheries_data
      WHERE (
        6371 * acos(
          cos(radians($1)) * cos(radians(latitude)) *
          cos(radians(longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(latitude))
        )
      ) < $3
      GROUP BY species
      ORDER BY total_abundance DESC
      LIMIT 10
    `, [latitude, longitude, radiusKm]);

    res.json({
      success: true,
      location: { latitude, longitude, radiusKm },
      data: {
        ocean: oceanData.rows[0],
        fisheries: fisheriesData.rows[0],
        edna: ednaData.rows[0],
        topSpecies: topSpecies.rows
      }
    });

  } catch (error) {
    console.error('Location data error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch location data' });
  }
});

// GET /api/insights/generate - Generate automatic insights from data
router.get('/generate', async (req: Request, res: Response) => {
  try {
    const { region, species } = req.query;
    const insights: InsightResult[] = [];

    // 1. Temperature-Abundance Correlation Analysis
    const tempCorrelation = await query(`
      SELECT
        CORR(c.temperature, c.abundance) as correlation,
        AVG(c.temperature) as avg_temp,
        AVG(c.abundance) as avg_abundance,
        COUNT(*) as sample_size
      FROM correlations c
      ${species ? 'WHERE species = $1' : ''}
    `, species ? [species] : []);

    if (tempCorrelation.rows[0]?.correlation) {
      const corr = parseFloat(tempCorrelation.rows[0].correlation);
      const direction = corr > 0 ? 'positive' : 'negative';
      const strength = Math.abs(corr) > 0.7 ? 'strong' : Math.abs(corr) > 0.4 ? 'moderate' : 'weak';

      insights.push({
        insight: `${strength.charAt(0).toUpperCase() + strength.slice(1)} ${direction} correlation (r=${corr.toFixed(3)}) between temperature and fish abundance${species ? ` for ${species}` : ''}. ${corr > 0.5 ? 'Higher temperatures are associated with increased fish populations.' : corr < -0.5 ? 'Lower temperatures correlate with higher fish populations.' : 'Temperature has limited impact on abundance.'}`,
        type: 'correlation',
        confidence: Math.min(95, Math.abs(corr) * 100 + 20),
        relatedFactors: ['temperature', 'abundance', 'seasonal_variation'],
        recommendation: corr > 0.5
          ? 'Monitor temperature changes closely during fishing seasons for optimal catch predictions.'
          : 'Consider other environmental factors for abundance prediction.'
      });
    }

    // 2. Oxygen Level Analysis (Hypoxia Risk)
    const oxygenAnalysis = await query(`
      SELECT
        AVG(oxygen) as avg_oxygen,
        MIN(oxygen) as min_oxygen,
        COUNT(CASE WHEN oxygen < 4 THEN 1 END) as hypoxia_events,
        COUNT(*) as total_records
      FROM ocean_data
      ${region && region !== 'all' ? 'WHERE region = $1' : ''}
    `, region && region !== 'all' ? [region] : []);

    if (oxygenAnalysis.rows[0]) {
      const { avg_oxygen, min_oxygen, hypoxia_events, total_records } = oxygenAnalysis.rows[0];
      const hypoxiaRate = (hypoxia_events / total_records) * 100;

      if (hypoxiaRate > 5) {
        insights.push({
          insight: `Warning: ${hypoxiaRate.toFixed(1)}% of oxygen readings indicate potential hypoxia (< 4 mg/L)${region ? ` in ${region}` : ''}. Minimum recorded: ${parseFloat(min_oxygen).toFixed(2)} mg/L. This can cause fish stress, migration, or mass mortality events.`,
          type: 'anomaly',
          confidence: 90,
          relatedFactors: ['dissolved_oxygen', 'fish_mortality', 'water_quality'],
          recommendation: 'Implement continuous oxygen monitoring. Consider early warning systems for coastal fishing communities.'
        });
      } else {
        insights.push({
          insight: `Oxygen levels are healthy with average ${parseFloat(avg_oxygen || 0).toFixed(2)} mg/L${region ? ` in ${region}` : ''}. Only ${hypoxiaRate.toFixed(1)}% of readings show concerning levels.`,
          type: 'trend',
          confidence: 85,
          relatedFactors: ['dissolved_oxygen', 'ecosystem_health'],
          recommendation: 'Continue regular monitoring to maintain early detection capabilities.'
        });
      }
    }

    // 3. Species Diversity Trend
    const diversityTrend = await query(`
      SELECT
        DATE_TRUNC('month', recorded_at) as month,
        AVG(diversity_index) as avg_diversity,
        COUNT(DISTINCT species) as unique_species
      FROM fisheries_data
      ${region && region !== 'all' ? 'WHERE region = $1' : ''}
      GROUP BY DATE_TRUNC('month', recorded_at)
      ORDER BY month DESC
      LIMIT 12
    `, region && region !== 'all' ? [region] : []);

    if (diversityTrend.rows.length >= 3) {
      const recent = diversityTrend.rows.slice(0, 3);
      const older = diversityTrend.rows.slice(-3);
      const recentAvg = recent.reduce((sum, r) => sum + parseFloat(r.avg_diversity || 0), 0) / recent.length;
      const olderAvg = older.reduce((sum, r) => sum + parseFloat(r.avg_diversity || 0), 0) / older.length;
      const change = ((recentAvg - olderAvg) / olderAvg) * 100;

      insights.push({
        insight: `Species diversity has ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(1)}% over the past year${region ? ` in ${region}` : ''}. Current average diversity index: ${recentAvg.toFixed(3)}. ${change > 0 ? 'This indicates improving ecosystem health.' : 'This may indicate environmental stress or overfishing pressure.'}`,
        type: 'trend',
        confidence: 80,
        relatedFactors: ['biodiversity', 'ecosystem_health', 'fishing_pressure'],
        recommendation: change < 0
          ? 'Consider implementing fishing quotas or seasonal closures to allow population recovery.'
          : 'Continue sustainable fishing practices to maintain positive trend.'
      });
    }

    // 4. eDNA Detection Effectiveness
    const ednaEffectiveness = await query(`
      SELECT
        species,
        AVG(confidence) as avg_confidence,
        COUNT(*) as detections
      FROM edna_data
      GROUP BY species
      HAVING COUNT(*) >= 5
      ORDER BY avg_confidence DESC
      LIMIT 10
    `);

    if (ednaEffectiveness.rows.length > 0) {
      const highConfidence = ednaEffectiveness.rows.filter(r => parseFloat(r.avg_confidence) >= 90);
      insights.push({
        insight: `eDNA analysis shows high confidence detection (≥90%) for ${highConfidence.length} species including ${highConfidence.slice(0, 3).map(r => r.species).join(', ')}. This non-invasive method effectively monitors ${ednaEffectiveness.rows.length} species.`,
        type: 'trend',
        confidence: 88,
        relatedFactors: ['edna', 'species_detection', 'monitoring_methodology'],
        recommendation: 'Expand eDNA sampling to cover more locations for comprehensive biodiversity monitoring.'
      });
    }

    // 5. Seasonal Pattern Analysis
    const seasonalPattern = await query(`
      SELECT
        season,
        AVG(concentration) as avg_concentration,
        COUNT(DISTINCT species) as species_detected
      FROM edna_data
      GROUP BY season
      ORDER BY
        CASE season
          WHEN 'Winter' THEN 1
          WHEN 'Spring' THEN 2
          WHEN 'Summer' THEN 3
          WHEN 'Monsoon' THEN 4
        END
    `);

    if (seasonalPattern.rows.length >= 2) {
      const maxSeason = seasonalPattern.rows.reduce((max, s) =>
        parseFloat(s.avg_concentration || 0) > parseFloat(max.avg_concentration || 0) ? s : max
      );

      insights.push({
        insight: `Highest eDNA concentrations detected during ${maxSeason.season} season (avg: ${parseFloat(maxSeason.avg_concentration).toFixed(2)} per litre) with ${maxSeason.species_detected} unique species. This indicates peak biodiversity activity during this period.`,
        type: 'trend',
        confidence: 85,
        relatedFactors: ['seasonality', 'breeding_cycles', 'migration_patterns'],
        recommendation: `Focus conservation and monitoring efforts during ${maxSeason.season} for maximum coverage.`
      });
    }

    // 6. Regional Comparison
    const regionalComparison = await query(`
      SELECT
        region,
        AVG(temperature) as avg_temp,
        AVG(oxygen) as avg_oxygen,
        (SELECT COUNT(DISTINCT species) FROM fisheries_data WHERE fisheries_data.region = ocean_data.region) as species_count
      FROM ocean_data
      GROUP BY region
      ORDER BY species_count DESC
    `);

    if (regionalComparison.rows.length >= 2) {
      const topRegion = regionalComparison.rows[0];
      insights.push({
        insight: `${topRegion.region} shows highest species diversity (${topRegion.species_count} species) with optimal conditions: ${parseFloat(topRegion.avg_temp).toFixed(1)}°C temperature, ${parseFloat(topRegion.avg_oxygen).toFixed(1)} mg/L oxygen of ${regionalComparison.rows.length} monitored regions.`,
        type: 'correlation',
        confidence: 82,
        relatedFactors: ['regional_biodiversity', 'habitat_quality', 'environmental_conditions'],
        recommendation: `Prioritize ${topRegion.region} for marine protected area consideration due to high biodiversity.`
      });
    }

    res.json({
      success: true,
      insights,
      generatedAt: new Date().toISOString(),
      totalInsights: insights.length
    });

  } catch (error) {
    console.error('Insight generation error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate insights' });
  }
});

// GET /api/insights/heatmap - Get data for geospatial heatmap
router.get('/heatmap', async (req: Request, res: Response) => {
  try {
    const { parameter = 'temperature', gridSize = 0.5 } = req.query;

    const allowedParams = ['temperature', 'salinity', 'ph', 'oxygen', 'abundance', 'biodiversity'];
    const param = allowedParams.includes(parameter as string) ? parameter : 'temperature';

    let queryText: string;

    if (param === 'abundance' || param === 'biodiversity') {
      queryText = `
        SELECT
          ROUND(latitude::numeric / $1) * $1 as grid_lat,
          ROUND(longitude::numeric / $1) * $1 as grid_lng,
          ${param === 'abundance' ? 'SUM(abundance)' : 'AVG(diversity_index)'} as value,
          COUNT(*) as sample_count
        FROM fisheries_data
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        GROUP BY grid_lat, grid_lng
        HAVING COUNT(*) >= 3
      `;
    } else {
      queryText = `
        SELECT
          ROUND(latitude::numeric / $1) * $1 as grid_lat,
          ROUND(longitude::numeric / $1) * $1 as grid_lng,
          AVG(${param}) as value,
          COUNT(*) as sample_count
        FROM ocean_data
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
          AND ${param} IS NOT NULL
        GROUP BY grid_lat, grid_lng
        HAVING COUNT(*) >= 3
      `;
    }

    const result = await query(queryText, [parseFloat(gridSize as string)]);

    res.json({
      success: true,
      parameter: param,
      gridSize: parseFloat(gridSize as string),
      data: result.rows.map(r => ({
        lat: parseFloat(r.grid_lat),
        lng: parseFloat(r.grid_lng),
        value: parseFloat(r.value),
        samples: parseInt(r.sample_count)
      }))
    });

  } catch (error) {
    console.error('Heatmap data error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch heatmap data' });
  }
});

// GET /api/insights/timeline - Get temporal data for trends
router.get('/timeline', async (req: Request, res: Response) => {
  try {
    const { parameter = 'temperature', resolution = 'month', region } = req.query;

    const allowedParams = ['temperature', 'salinity', 'ph', 'oxygen', 'abundance'];
    const param = allowedParams.includes(parameter as string) ? parameter : 'temperature';

    let dateFormat: string;
    switch (resolution) {
      case 'day': dateFormat = 'YYYY-MM-DD'; break;
      case 'week': dateFormat = 'YYYY-WW'; break;
      case 'year': dateFormat = 'YYYY'; break;
      default: dateFormat = 'YYYY-MM';
    }

    let queryText: string;
    const params: any[] = [];

    if (param === 'abundance') {
      queryText = `
        SELECT
          TO_CHAR(recorded_at, '${dateFormat}') as period,
          SUM(abundance) as total,
          AVG(abundance) as average,
          MIN(abundance) as minimum,
          MAX(abundance) as maximum,
          COUNT(*) as sample_count
        FROM fisheries_data
        WHERE recorded_at IS NOT NULL
      `;
      if (region && region !== 'all') {
        queryText += ` AND region = $1`;
        params.push(region);
      }
    } else {
      queryText = `
        SELECT
          TO_CHAR(recorded_at, '${dateFormat}') as period,
          AVG(${param}) as average,
          MIN(${param}) as minimum,
          MAX(${param}) as maximum,
          STDDEV(${param}) as std_dev,
          COUNT(*) as sample_count
        FROM ocean_data
        WHERE recorded_at IS NOT NULL AND ${param} IS NOT NULL
      `;
      if (region && region !== 'all') {
        queryText += ` AND region = $1`;
        params.push(region);
      }
    }

    queryText += `
      GROUP BY TO_CHAR(recorded_at, '${dateFormat}')
      ORDER BY period ASC
    `;

    const result = await query(queryText, params);

    res.json({
      success: true,
      parameter: param,
      resolution,
      region: region || 'all',
      data: result.rows.map(r => ({
        period: r.period,
        average: parseFloat(r.average),
        minimum: parseFloat(r.minimum),
        maximum: parseFloat(r.maximum),
        stdDev: r.std_dev ? parseFloat(r.std_dev) : null,
        total: r.total ? parseInt(r.total) : null,
        samples: parseInt(r.sample_count)
      }))
    });

  } catch (error) {
    console.error('Timeline data error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch timeline data' });
  }
});

// GET /api/insights/regions - Get summary stats by region
router.get('/regions', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      WITH ocean_stats AS (
        SELECT
          region,
          AVG(temperature) as avg_temp,
          AVG(salinity) as avg_salinity,
          AVG(ph) as avg_ph,
          AVG(oxygen) as avg_oxygen,
          COUNT(*) as ocean_records
        FROM ocean_data
        GROUP BY region
      ),
      fisheries_stats AS (
        SELECT
          region,
          COUNT(DISTINCT species) as species_count,
          SUM(abundance) as total_abundance,
          SUM(biomass) as total_biomass,
          AVG(diversity_index) as avg_diversity,
          COUNT(*) as fisheries_records
        FROM fisheries_data
        GROUP BY region
      ),
      edna_stats AS (
        SELECT
          region,
          COUNT(DISTINCT species) as detected_species,
          AVG(concentration) as avg_concentration,
          COUNT(*) as edna_records
        FROM edna_data
        GROUP BY region
      )
      SELECT
        COALESCE(o.region, f.region, e.region) as region,
        o.avg_temp,
        o.avg_salinity,
        o.avg_ph,
        o.avg_oxygen,
        o.ocean_records,
        f.species_count,
        f.total_abundance,
        f.total_biomass,
        f.avg_diversity,
        f.fisheries_records,
        e.detected_species,
        e.avg_concentration,
        e.edna_records
      FROM ocean_stats o
      FULL OUTER JOIN fisheries_stats f ON o.region = f.region
      FULL OUTER JOIN edna_stats e ON COALESCE(o.region, f.region) = e.region
      ORDER BY COALESCE(f.total_abundance, 0) DESC
    `);

    res.json({
      success: true,
      data: result.rows.map(r => ({
        region: r.region,
        ocean: {
          avgTemp: r.avg_temp ? parseFloat(r.avg_temp) : null,
          avgSalinity: r.avg_salinity ? parseFloat(r.avg_salinity) : null,
          avgPh: r.avg_ph ? parseFloat(r.avg_ph) : null,
          avgOxygen: r.avg_oxygen ? parseFloat(r.avg_oxygen) : null,
          records: parseInt(r.ocean_records || 0)
        },
        fisheries: {
          speciesCount: parseInt(r.species_count || 0),
          totalAbundance: parseInt(r.total_abundance || 0),
          totalBiomass: r.total_biomass ? parseFloat(r.total_biomass) : 0,
          avgDiversity: r.avg_diversity ? parseFloat(r.avg_diversity) : 0,
          records: parseInt(r.fisheries_records || 0)
        },
        edna: {
          detectedSpecies: parseInt(r.detected_species || 0),
          avgConcentration: r.avg_concentration ? parseFloat(r.avg_concentration) : 0,
          records: parseInt(r.edna_records || 0)
        }
      }))
    });

  } catch (error) {
    console.error('Region stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch region stats' });
  }
});

// GET /api/insights/species-environment - Species-environment relationship
router.get('/species-environment', async (req: Request, res: Response) => {
  try {
    const { species } = req.query;

    let queryText = `
      SELECT
        c.species,
        AVG(c.temperature) as optimal_temp,
        STDDEV(c.temperature) as temp_range,
        AVG(c.salinity) as optimal_salinity,
        STDDEV(c.salinity) as salinity_range,
        AVG(c.ph) as optimal_ph,
        AVG(c.oxygen) as optimal_oxygen,
        AVG(c.abundance) as avg_abundance,
        MAX(c.abundance) as max_abundance,
        COUNT(*) as observations
      FROM correlations c
    `;

    const params: any[] = [];
    if (species) {
      queryText += ' WHERE c.species = $1';
      params.push(species);
    }

    queryText += `
      GROUP BY c.species
      HAVING COUNT(*) >= 5
      ORDER BY avg_abundance DESC
      LIMIT 50
    `;

    const result = await query(queryText, params);

    res.json({
      success: true,
      data: result.rows.map(r => ({
        species: r.species,
        optimalConditions: {
          temperature: {
            optimal: parseFloat(r.optimal_temp),
            range: parseFloat(r.temp_range || 0)
          },
          salinity: {
            optimal: parseFloat(r.optimal_salinity),
            range: parseFloat(r.salinity_range || 0)
          },
          ph: parseFloat(r.optimal_ph),
          oxygen: parseFloat(r.optimal_oxygen)
        },
        abundance: {
          average: parseFloat(r.avg_abundance),
          maximum: parseInt(r.max_abundance)
        },
        observations: parseInt(r.observations)
      }))
    });

  } catch (error) {
    console.error('Species environment error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch species environment data' });
  }
});

export default router;
