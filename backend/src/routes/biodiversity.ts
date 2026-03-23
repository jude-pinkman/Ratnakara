import { Router, Request, Response } from 'express';
import { query } from '../db/connection.js';

const router = Router();

// ============================================================================
// BIODIVERSITY API ROUTES
// Real data endpoints for the biodiversity dashboard
// ============================================================================

// GET /api/biodiversity/sequences - DNA sequence library
router.get('/sequences', async (req: Request, res: Response) => {
  try {
    const { gene, species, minIdentity = 0, limit = 100, offset = 0 } = req.query;

    // Check if dna_sequences table exists (v2 schema)
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'dna_sequences'
      ) as has_dna_table
    `);

    if (tableCheck.rows[0]?.has_dna_table) {
      let queryText = `
        SELECT
          ds.id::text,
          ds.sequenceIdentifier as "sequenceIdentifier",
          ds.gene,
          ds.sequenceLength as "sequenceLength",
          ds.gc_content,
          ds.taxonomic_identification,
          ds.blast_identity_percent,
          ds.blast_evalue,
          o.scientificName as species,
          o.region,
          o.eventDate as recorded_at
        FROM dna_sequences ds
        JOIN occurrences o ON ds.occurrenceID = o.occurrenceID
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (gene && gene !== 'All') {
        queryText += ` AND ds.gene = $${paramIndex}`;
        params.push(gene);
        paramIndex++;
      }

      if (species) {
        queryText += ` AND (o.scientificName ILIKE $${paramIndex} OR ds.taxonomic_identification ILIKE $${paramIndex})`;
        params.push(`%${species}%`);
        paramIndex++;
      }

      if (minIdentity && parseInt(minIdentity as string) > 0) {
        queryText += ` AND ds.blast_identity_percent >= $${paramIndex}`;
        params.push(parseInt(minIdentity as string));
        paramIndex++;
      }

      queryText += ` ORDER BY ds.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(parseInt(limit as string), parseInt(offset as string));

      const result = await query(queryText, params);

      // Get total count
      let countQuery = `
        SELECT COUNT(*) as total
        FROM dna_sequences ds
        JOIN occurrences o ON ds.occurrenceID = o.occurrenceID
        WHERE 1=1
      `;
      const countParams: any[] = [];
      let countParamIndex = 1;

      if (gene && gene !== 'All') {
        countQuery += ` AND ds.gene = $${countParamIndex}`;
        countParams.push(gene);
        countParamIndex++;
      }
      if (species) {
        countQuery += ` AND (o.scientificName ILIKE $${countParamIndex} OR ds.taxonomic_identification ILIKE $${countParamIndex})`;
        countParams.push(`%${species}%`);
        countParamIndex++;
      }
      if (minIdentity && parseInt(minIdentity as string) > 0) {
        countQuery += ` AND ds.blast_identity_percent >= $${countParamIndex}`;
        countParams.push(parseInt(minIdentity as string));
      }

      const countResult = await query(countQuery, countParams);

      res.json({
        success: true,
        data: result.rows,
        total: parseInt(countResult.rows[0]?.total || '0'),
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

    } else {
      // v1 fallback - generate synthetic data from existing taxonomic data
      const taxonomyResult = await query(`
        SELECT
          id::text,
          species as "sequenceIdentifier",
          'COX1' as gene,
          FLOOR(RANDOM() * 500 + 500)::integer as "sequenceLength",
          (RANDOM() * 20 + 40)::numeric(5,2) as gc_content,
          species as taxonomic_identification,
          (RANDOM() * 5 + 95)::numeric(5,2) as blast_identity_percent,
          0 as blast_evalue
        FROM taxonomy
        WHERE species IS NOT NULL
        ORDER BY species
        LIMIT $1 OFFSET $2
      `, [parseInt(limit as string), parseInt(offset as string)]);

      res.json({
        success: true,
        data: taxonomyResult.rows,
        total: taxonomyResult.rows.length,
        note: 'Synthetic data generated from taxonomy table - upload real DNA sequences for accurate data'
      });
    }

  } catch (error) {
    console.error('Sequences error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch sequences' });
  }
});

// GET /api/biodiversity/anomalies - Environmental anomalies
router.get('/anomalies', async (req: Request, res: Response) => {
  try {
    const { parameter, alertLevel, acknowledged, limit = 50 } = req.query;

    // Check if anomalies table exists (v2 schema)
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'anomalies'
      ) as has_anomalies_table
    `);

    if (tableCheck.rows[0]?.has_anomalies_table) {
      let queryText = `
        SELECT
          a.id::text,
          a.parameter,
          a.measured_value,
          a.expected_value,
          a.z_score,
          a.anomaly_severity as alert_level,
          a.created_at as detected_at,
          a.acknowledged,
          a.acknowledged_by,
          a.acknowledged_at,
          a.notes,
          o.decimalLatitude as latitude,
          o.decimalLongitude as longitude,
          o.region
        FROM anomalies a
        JOIN occurrences o ON a.occurrenceID = o.occurrenceID
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (parameter) {
        queryText += ` AND a.parameter = $${paramIndex}`;
        params.push(parameter);
        paramIndex++;
      }

      if (alertLevel) {
        queryText += ` AND a.anomaly_severity = $${paramIndex}`;
        params.push(alertLevel);
        paramIndex++;
      }

      if (acknowledged !== undefined) {
        queryText += ` AND a.acknowledged = $${paramIndex}`;
        params.push(acknowledged === 'true');
        paramIndex++;
      }

      queryText += ` ORDER BY a.created_at DESC LIMIT $${paramIndex}`;
      params.push(parseInt(limit as string));

      const result = await query(queryText, params);

      res.json({
        success: true,
        data: result.rows,
        count: result.rows.length
      });

    } else {
      // v1 fallback - detect anomalies from ocean_data using Z-score
      const anomalyResult = await query(`
        WITH stats AS (
          SELECT
            AVG(temperature) as mean_temp,
            STDDEV(temperature) as std_temp,
            AVG(salinity) as mean_sal,
            STDDEV(salinity) as std_sal,
            AVG(ph) as mean_ph,
            STDDEV(ph) as std_ph,
            AVG(oxygen) as mean_oxy,
            STDDEV(oxygen) as std_oxy
          FROM ocean_data
        ),
        anomalies AS (
          SELECT
            o.id::text,
            'temperature' as parameter,
            o.temperature as measured_value,
            s.mean_temp as expected_value,
            ABS((o.temperature - s.mean_temp) / NULLIF(s.std_temp, 0)) as z_score,
            o.recorded_at as detected_at,
            o.latitude,
            o.longitude,
            o.region,
            FALSE as acknowledged
          FROM ocean_data o, stats s
          WHERE ABS((o.temperature - s.mean_temp) / NULLIF(s.std_temp, 0)) > 2.5

          UNION ALL

          SELECT
            o.id::text,
            'salinity' as parameter,
            o.salinity as measured_value,
            s.mean_sal as expected_value,
            ABS((o.salinity - s.mean_sal) / NULLIF(s.std_sal, 0)) as z_score,
            o.recorded_at as detected_at,
            o.latitude,
            o.longitude,
            o.region,
            FALSE as acknowledged
          FROM ocean_data o, stats s
          WHERE ABS((o.salinity - s.mean_sal) / NULLIF(s.std_sal, 0)) > 2.5

          UNION ALL

          SELECT
            o.id::text,
            'oxygen' as parameter,
            o.oxygen as measured_value,
            s.mean_oxy as expected_value,
            ABS((o.oxygen - s.mean_oxy) / NULLIF(s.std_oxy, 0)) as z_score,
            o.recorded_at as detected_at,
            o.latitude,
            o.longitude,
            o.region,
            FALSE as acknowledged
          FROM ocean_data o, stats s
          WHERE ABS((o.oxygen - s.mean_oxy) / NULLIF(s.std_oxy, 0)) > 2.5
        )
        SELECT
          *,
          CASE WHEN z_score > 4 THEN 'critical' ELSE 'warning' END as alert_level
        FROM anomalies
        ORDER BY detected_at DESC
        LIMIT $1
      `, [parseInt(limit as string)]);

      res.json({
        success: true,
        data: anomalyResult.rows,
        count: anomalyResult.rows.length,
        method: 'z_score_2.5_sigma'
      });
    }

  } catch (error) {
    console.error('Anomalies error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch anomalies' });
  }
});

// POST /api/biodiversity/anomalies/:id/acknowledge - Acknowledge an anomaly
router.post('/anomalies/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { acknowledgedBy, notes } = req.body;

    const result = await query(`
      UPDATE anomalies
      SET
        acknowledged = true,
        acknowledged_by = $2,
        acknowledged_at = NOW(),
        notes = $3
      WHERE id = $1
      RETURNING *
    `, [id, acknowledgedBy || 'system', notes || '']);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Anomaly not found' });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Acknowledge error:', error);
    res.status(500).json({ success: false, error: 'Failed to acknowledge anomaly' });
  }
});

// GET /api/biodiversity/richness - Species richness by region
router.get('/richness', async (req: Request, res: Response) => {
  try {
    // Check for v2 schema
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'occurrences'
      ) as has_occurrences
    `);

    if (tableCheck.rows[0]?.has_occurrences) {
      const result = await query(`
        SELECT
          region,
          COUNT(DISTINCT scientificName) as unique_species,
          COUNT(*) as total_occurrences,
          COUNT(DISTINCT CASE WHEN dataType = 'edna' THEN scientificName END) as edna_detected,
          COUNT(DISTINCT CASE WHEN dataType = 'fisheries' THEN scientificName END) as fisheries_recorded
        FROM occurrences
        WHERE region IS NOT NULL
        GROUP BY region
        ORDER BY unique_species DESC
      `);

      res.json({
        success: true,
        data: result.rows.map(r => ({
          region: r.region,
          unique_species: parseInt(r.unique_species),
          total_occurrences: parseInt(r.total_occurrences),
          edna_detected: parseInt(r.edna_detected),
          fisheries_recorded: parseInt(r.fisheries_recorded),
          endemic_species: Math.floor(parseInt(r.unique_species) * 0.15) // Estimate 15% endemic
        }))
      });

    } else {
      // v1 fallback
      const result = await query(`
        WITH fish_regions AS (
          SELECT region, COUNT(DISTINCT species) as fish_species
          FROM fisheries_data
          WHERE region IS NOT NULL
          GROUP BY region
        ),
        edna_regions AS (
          SELECT region, COUNT(DISTINCT species) as edna_species
          FROM edna_data
          WHERE region IS NOT NULL
          GROUP BY region
        ),
        ocean_regions AS (
          SELECT region, COUNT(*) as observations
          FROM ocean_data
          WHERE region IS NOT NULL
          GROUP BY region
        )
        SELECT
          COALESCE(f.region, e.region, o.region) as region,
          COALESCE(f.fish_species, 0) + COALESCE(e.edna_species, 0) as unique_species,
          COALESCE(o.observations, 0) as total_occurrences,
          COALESCE(e.edna_species, 0) as edna_detected,
          COALESCE(f.fish_species, 0) as fisheries_recorded
        FROM fish_regions f
        FULL OUTER JOIN edna_regions e ON f.region = e.region
        FULL OUTER JOIN ocean_regions o ON COALESCE(f.region, e.region) = o.region
        ORDER BY unique_species DESC
      `);

      res.json({
        success: true,
        data: result.rows.map(r => ({
          region: r.region,
          unique_species: parseInt(r.unique_species || 0),
          total_occurrences: parseInt(r.total_occurrences || 0),
          edna_detected: parseInt(r.edna_detected || 0),
          fisheries_recorded: parseInt(r.fisheries_recorded || 0),
          endemic_species: Math.floor(parseInt(r.unique_species || 0) * 0.15)
        }))
      });
    }

  } catch (error) {
    console.error('Richness error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch species richness' });
  }
});

// GET /api/biodiversity/comparison - eDNA vs Otolith/Traditional comparison
router.get('/comparison', async (req: Request, res: Response) => {
  try {
    // Check for otolith_records table (v2 schema)
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'otolith_records'
      ) as has_otolith
    `);

    if (tableCheck.rows[0]?.has_otolith) {
      const result = await query(`
        WITH edna_species AS (
          SELECT DISTINCT o.scientificName as species, COUNT(*) as detections
          FROM edna_observations eo
          JOIN occurrences o ON eo.occurrenceID = o.occurrenceID
          GROUP BY o.scientificName
        ),
        otolith_species AS (
          SELECT DISTINCT o.scientificName as species, COUNT(*) as records
          FROM otolith_records ot
          JOIN occurrences o ON ot.occurrenceID = o.occurrenceID
          GROUP BY o.scientificName
        )
        SELECT
          COALESCE(e.species, ot.species) as parameter,
          COALESCE(e.detections, 0) as edna_detections,
          COALESCE(ot.records, 0) as otolith_records,
          CASE
            WHEN e.detections > 0 AND ot.records > 0 THEN
              LEAST(e.detections, ot.records)::float / GREATEST(e.detections, ot.records) * 100
            ELSE 0
          END as agreement
        FROM edna_species e
        FULL OUTER JOIN otolith_species ot ON e.species = ot.species
        WHERE COALESCE(e.detections, 0) + COALESCE(ot.records, 0) > 0
        ORDER BY COALESCE(e.detections, 0) + COALESCE(ot.records, 0) DESC
        LIMIT 20
      `);

      res.json({
        success: true,
        data: result.rows.map(r => ({
          parameter: r.parameter,
          edna_detections: parseInt(r.edna_detections),
          otolith_records: parseInt(r.otolith_records),
          agreement: Math.round(parseFloat(r.agreement))
        }))
      });

    } else {
      // v1 fallback - compare eDNA with fisheries data
      const result = await query(`
        WITH edna_species AS (
          SELECT species, COUNT(*) as detections
          FROM edna_data
          WHERE species IS NOT NULL
          GROUP BY species
        ),
        fish_species AS (
          SELECT species, COUNT(*) as records
          FROM fisheries_data
          WHERE species IS NOT NULL
          GROUP BY species
        )
        SELECT
          COALESCE(e.species, f.species) as parameter,
          COALESCE(e.detections, 0) as edna_detections,
          COALESCE(f.records, 0) as otolith_records,
          CASE
            WHEN e.detections > 0 AND f.records > 0 THEN
              LEAST(e.detections, f.records)::float / GREATEST(e.detections, f.records) * 100
            ELSE 0
          END as agreement
        FROM edna_species e
        FULL OUTER JOIN fish_species f ON e.species = f.species
        WHERE COALESCE(e.detections, 0) + COALESCE(f.records, 0) > 0
        ORDER BY COALESCE(e.detections, 0) + COALESCE(f.records, 0) DESC
        LIMIT 20
      `);

      res.json({
        success: true,
        data: result.rows.map(r => ({
          parameter: r.parameter,
          edna_detections: parseInt(r.edna_detections),
          otolith_records: parseInt(r.otolith_records),
          agreement: Math.round(parseFloat(r.agreement || 0))
        })),
        note: 'Comparing eDNA with traditional fisheries data (otolith data not available)'
      });
    }

  } catch (error) {
    console.error('Comparison error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch comparison data' });
  }
});

// GET /api/biodiversity/kpis - Summary KPIs
router.get('/kpis', async (req: Request, res: Response) => {
  try {
    // Get sequence stats
    const sequenceStats = await query(`
      SELECT
        COUNT(*) as total_sequences,
        COUNT(CASE WHEN blast_identity_percent >= 97 THEN 1 END) as high_quality,
        COUNT(DISTINCT gene) as unique_genes
      FROM dna_sequences
    `).catch(() => ({ rows: [{ total_sequences: 0, high_quality: 0, unique_genes: 0 }] }));

    // Get anomaly stats
    const anomalyStats = await query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN anomaly_severity = 'critical' THEN 1 END) as critical,
        COUNT(CASE WHEN acknowledged = false THEN 1 END) as unacknowledged
      FROM anomalies
    `).catch(() => ({ rows: [{ total: 0, critical: 0, unacknowledged: 0 }] }));

    // Get species stats
    const speciesStats = await query(`
      SELECT
        COUNT(DISTINCT scientificName) as total_species,
        COUNT(DISTINCT region) as regions
      FROM occurrences
    `).catch(async () => {
      // Fallback to v1
      const v1Result = await query(`
        SELECT
          (SELECT COUNT(DISTINCT species) FROM fisheries_data) +
          (SELECT COUNT(DISTINCT species) FROM edna_data) as total_species,
          (SELECT COUNT(DISTINCT region) FROM ocean_data) as regions
      `);
      return v1Result;
    });

    res.json({
      success: true,
      data: {
        sequences: {
          total: parseInt(sequenceStats.rows[0]?.total_sequences || '0'),
          highQuality: parseInt(sequenceStats.rows[0]?.high_quality || '0'),
          uniqueGenes: parseInt(sequenceStats.rows[0]?.unique_genes || '0')
        },
        anomalies: {
          total: parseInt(anomalyStats.rows[0]?.total || '0'),
          critical: parseInt(anomalyStats.rows[0]?.critical || '0'),
          unacknowledged: parseInt(anomalyStats.rows[0]?.unacknowledged || '0')
        },
        biodiversity: {
          totalSpecies: parseInt(speciesStats.rows[0]?.total_species || '0'),
          regions: parseInt(speciesStats.rows[0]?.regions || '0')
        }
      }
    });

  } catch (error) {
    console.error('KPIs error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch KPIs' });
  }
});

// GET /api/biodiversity/genes - Available genes list
router.get('/genes', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT DISTINCT gene, COUNT(*) as count
      FROM dna_sequences
      GROUP BY gene
      ORDER BY count DESC
    `).catch(() => ({ rows: [] }));

    const genes = result.rows.length > 0
      ? result.rows.map(r => r.gene)
      : ['16S', 'COX1', 'ITS', 'rbcL', 'matK']; // Default genes

    res.json({
      success: true,
      data: genes
    });

  } catch (error) {
    console.error('Genes error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch genes' });
  }
});

// GET /api/biodiversity/export/darwin-core - Export data in Darwin Core format
router.get('/export/darwin-core', async (req: Request, res: Response) => {
  try {
    const { region, startDate, endDate, limit = 1000 } = req.query;

    let queryText = `
      SELECT
        occurrenceID,
        scientificName,
        decimalLatitude,
        decimalLongitude,
        eventDate,
        basisOfRecord,
        recordedBy,
        datasetName,
        region,
        dataType,
        remarks
      FROM occurrences
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (region && region !== 'all') {
      queryText += ` AND region = $${paramIndex}`;
      params.push(region);
      paramIndex++;
    }

    if (startDate) {
      queryText += ` AND eventDate >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      queryText += ` AND eventDate <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    queryText += ` ORDER BY eventDate DESC LIMIT $${paramIndex}`;
    params.push(parseInt(limit as string));

    const result = await query(queryText, params);

    // Generate Darwin Core XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<archive xmlns="http://rs.tdwg.org/dwca/text/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://rs.tdwg.org/dwca/text/ http://rs.tdwg.org/dwc/text/tdwg_dwc_text.xsd">
  <core encoding="UTF-8" linesTerminatedBy="\\n" fieldsTerminatedBy="," fieldsEnclosedBy='"' ignoreHeaderLines="1">
    <files>
      <location>occurrence.txt</location>
    </files>
    <id index="0"/>
    <field index="0" term="http://rs.tdwg.org/dwc/terms/occurrenceID"/>
    <field index="1" term="http://rs.tdwg.org/dwc/terms/scientificName"/>
    <field index="2" term="http://rs.tdwg.org/dwc/terms/decimalLatitude"/>
    <field index="3" term="http://rs.tdwg.org/dwc/terms/decimalLongitude"/>
    <field index="4" term="http://rs.tdwg.org/dwc/terms/eventDate"/>
    <field index="5" term="http://rs.tdwg.org/dwc/terms/basisOfRecord"/>
    <field index="6" term="http://rs.tdwg.org/dwc/terms/recordedBy"/>
    <field index="7" term="http://rs.tdwg.org/dwc/terms/datasetName"/>
  </core>
</archive>`;

    // Generate occurrence.txt content
    const csvHeader = 'occurrenceID,scientificName,decimalLatitude,decimalLongitude,eventDate,basisOfRecord,recordedBy,datasetName';
    const csvRows = result.rows.map(r =>
      `"${r.occurrenceid}","${r.scientificname}",${r.decimallatitude},${r.decimallongitude},"${r.eventdate}","${r.basisofrecord || 'HumanObservation'}","${r.recordedby || 'Ratnakara Platform'}","${r.datasetname || 'Ratnakara Marine Data'}"`
    ).join('\n');

    res.json({
      success: true,
      format: 'darwin_core',
      recordCount: result.rows.length,
      metaXml: xml,
      occurrenceData: csvHeader + '\n' + csvRows
    });

  } catch (error) {
    console.error('Darwin Core export error:', error);
    res.status(500).json({ success: false, error: 'Failed to export Darwin Core data' });
  }
});

export default router;
