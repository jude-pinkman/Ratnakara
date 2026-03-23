import { Router, Request, Response } from 'express';
import { query } from '../db/connection.js';

const router = Router();

// ============================================================================
// ALERTING SYSTEM API ROUTES
// Real-time monitoring and notification endpoints
// ============================================================================

interface AlertConfig {
  parameter: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'eq';
  severity: 'warning' | 'critical';
  enabled: boolean;
}

// Default alert configurations
const DEFAULT_ALERT_CONFIGS: AlertConfig[] = [
  { parameter: 'temperature', threshold: 32, operator: 'gt', severity: 'warning', enabled: true },
  { parameter: 'temperature', threshold: 35, operator: 'gt', severity: 'critical', enabled: true },
  { parameter: 'oxygen', threshold: 4, operator: 'lt', severity: 'warning', enabled: true },
  { parameter: 'oxygen', threshold: 2, operator: 'lt', severity: 'critical', enabled: true },
  { parameter: 'ph', threshold: 7.5, operator: 'lt', severity: 'warning', enabled: true },
  { parameter: 'salinity', threshold: 40, operator: 'gt', severity: 'warning', enabled: true }
];

// GET /api/alerts/active - Get all active alerts
router.get('/active', async (req: Request, res: Response) => {
  try {
    const { severity, parameter, acknowledged = 'false' } = req.query;

    // Check if anomalies table exists
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'anomalies'
      ) as has_anomalies
    `);

    if (tableCheck.rows[0]?.has_anomalies) {
      let queryText = `
        SELECT
          a.id::text,
          a.parameter,
          a.measured_value,
          a.expected_value,
          a.z_score,
          a.anomaly_severity as severity,
          a.alert_level,
          a.created_at,
          a.acknowledged,
          a.notes,
          o.decimalLatitude as latitude,
          o.decimalLongitude as longitude,
          o.region,
          o.scientificName as species
        FROM anomalies a
        LEFT JOIN occurrences o ON a.occurrenceID = o.occurrenceID
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (severity) {
        queryText += ` AND a.anomaly_severity = $${paramIndex}`;
        params.push(severity);
        paramIndex++;
      }

      if (parameter) {
        queryText += ` AND a.parameter = $${paramIndex}`;
        params.push(parameter);
        paramIndex++;
      }

      if (acknowledged === 'false') {
        queryText += ` AND a.acknowledged = false`;
      }

      queryText += ` ORDER BY a.created_at DESC LIMIT 100`;

      const result = await query(queryText, params);

      res.json({
        success: true,
        data: result.rows,
        count: result.rows.length
      });

    } else {
      // Fallback: Generate alerts from current data
      const alerts = await generateAlertsFromData();
      res.json({
        success: true,
        data: alerts,
        count: alerts.length,
        source: 'generated'
      });
    }

  } catch (error) {
    console.error('Active alerts error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch active alerts' });
  }
});

// GET /api/alerts/summary - Get alert summary statistics
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'anomalies'
      ) as has_anomalies
    `);

    if (tableCheck.rows[0]?.has_anomalies) {
      const result = await query(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN anomaly_severity = 'critical' THEN 1 END) as critical,
          COUNT(CASE WHEN anomaly_severity = 'warning' THEN 1 END) as warning,
          COUNT(CASE WHEN acknowledged = false THEN 1 END) as unacknowledged,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as last_7d
        FROM anomalies
      `);

      res.json({
        success: true,
        data: {
          total: parseInt(result.rows[0].total),
          critical: parseInt(result.rows[0].critical),
          warning: parseInt(result.rows[0].warning),
          unacknowledged: parseInt(result.rows[0].unacknowledged),
          last24Hours: parseInt(result.rows[0].last_24h),
          last7Days: parseInt(result.rows[0].last_7d)
        }
      });

    } else {
      // Fallback stats
      const alerts = await generateAlertsFromData();
      res.json({
        success: true,
        data: {
          total: alerts.length,
          critical: alerts.filter((a: any) => a.severity === 'critical').length,
          warning: alerts.filter((a: any) => a.severity === 'warning').length,
          unacknowledged: alerts.filter((a: any) => !a.acknowledged).length,
          last24Hours: alerts.length,
          last7Days: alerts.length
        }
      });
    }

  } catch (error) {
    console.error('Alert summary error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch alert summary' });
  }
});

// GET /api/alerts/by-region - Get alerts grouped by region
router.get('/by-region', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT
        COALESCE(o.region, 'Unknown') as region,
        COUNT(*) as alert_count,
        COUNT(CASE WHEN a.anomaly_severity = 'critical' THEN 1 END) as critical_count,
        COUNT(CASE WHEN a.acknowledged = false THEN 1 END) as unacknowledged_count,
        array_agg(DISTINCT a.parameter) as parameters
      FROM anomalies a
      LEFT JOIN occurrences o ON a.occurrenceID = o.occurrenceID
      GROUP BY o.region
      ORDER BY alert_count DESC
    `).catch(() => ({ rows: [] }));

    res.json({
      success: true,
      data: result.rows.map(r => ({
        region: r.region,
        alertCount: parseInt(r.alert_count || 0),
        criticalCount: parseInt(r.critical_count || 0),
        unacknowledgedCount: parseInt(r.unacknowledged_count || 0),
        parameters: r.parameters || []
      }))
    });

  } catch (error) {
    console.error('Alerts by region error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch alerts by region' });
  }
});

// GET /api/alerts/by-parameter - Get alerts grouped by parameter
router.get('/by-parameter', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT
        parameter,
        COUNT(*) as alert_count,
        COUNT(CASE WHEN anomaly_severity = 'critical' THEN 1 END) as critical_count,
        AVG(z_score) as avg_z_score,
        MIN(measured_value) as min_value,
        MAX(measured_value) as max_value
      FROM anomalies
      GROUP BY parameter
      ORDER BY alert_count DESC
    `).catch(() => ({ rows: [] }));

    res.json({
      success: true,
      data: result.rows.map(r => ({
        parameter: r.parameter,
        alertCount: parseInt(r.alert_count || 0),
        criticalCount: parseInt(r.critical_count || 0),
        avgZScore: parseFloat(r.avg_z_score || 0),
        valueRange: {
          min: parseFloat(r.min_value || 0),
          max: parseFloat(r.max_value || 0)
        }
      }))
    });

  } catch (error) {
    console.error('Alerts by parameter error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch alerts by parameter' });
  }
});

// POST /api/alerts/:id/acknowledge - Acknowledge an alert
router.post('/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { acknowledgedBy = 'system', notes = '' } = req.body;

    const result = await query(`
      UPDATE anomalies
      SET
        acknowledged = true,
        acknowledged_by = $2,
        acknowledged_at = NOW(),
        notes = $3
      WHERE id = $1
      RETURNING *
    `, [id, acknowledgedBy, notes]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Alert acknowledged successfully'
    });

  } catch (error) {
    console.error('Acknowledge alert error:', error);
    res.status(500).json({ success: false, error: 'Failed to acknowledge alert' });
  }
});

// POST /api/alerts/acknowledge-batch - Acknowledge multiple alerts
router.post('/acknowledge-batch', async (req: Request, res: Response) => {
  try {
    const { ids, acknowledgedBy = 'system', notes = '' } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'Alert IDs array required' });
    }

    const result = await query(`
      UPDATE anomalies
      SET
        acknowledged = true,
        acknowledged_by = $1,
        acknowledged_at = NOW(),
        notes = $2
      WHERE id = ANY($3::uuid[])
      RETURNING id
    `, [acknowledgedBy, notes, ids]);

    res.json({
      success: true,
      acknowledged: result.rows.length,
      message: `${result.rows.length} alerts acknowledged`
    });

  } catch (error) {
    console.error('Batch acknowledge error:', error);
    res.status(500).json({ success: false, error: 'Failed to acknowledge alerts' });
  }
});

// GET /api/alerts/configs - Get alert configurations
router.get('/configs', async (req: Request, res: Response) => {
  try {
    // In a real system, this would come from a database table
    res.json({
      success: true,
      data: DEFAULT_ALERT_CONFIGS
    });

  } catch (error) {
    console.error('Alert configs error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch alert configs' });
  }
});

// POST /api/alerts/check - Manually trigger alert check
router.post('/check', async (req: Request, res: Response) => {
  try {
    const alerts = await generateAlertsFromData();

    // In production, this would:
    // 1. Check against thresholds
    // 2. Insert new anomalies into database
    // 3. Send notifications (email, SMS, webhook)

    res.json({
      success: true,
      alertsGenerated: alerts.length,
      alerts: alerts.slice(0, 10), // Return first 10
      message: 'Alert check completed'
    });

  } catch (error) {
    console.error('Alert check error:', error);
    res.status(500).json({ success: false, error: 'Failed to check alerts' });
  }
});

// GET /api/alerts/trends - Get alert trends over time
router.get('/trends', async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query;

    const result = await query(`
      SELECT
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as total,
        COUNT(CASE WHEN anomaly_severity = 'critical' THEN 1 END) as critical,
        COUNT(CASE WHEN anomaly_severity = 'warning' THEN 1 END) as warning
      FROM anomalies
      WHERE created_at > NOW() - ($1 || ' days')::INTERVAL
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date ASC
    `, [parseInt(days as string)]).catch(() => ({ rows: [] }));

    res.json({
      success: true,
      data: result.rows.map(r => ({
        date: r.date,
        total: parseInt(r.total || 0),
        critical: parseInt(r.critical || 0),
        warning: parseInt(r.warning || 0)
      }))
    });

  } catch (error) {
    console.error('Alert trends error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch alert trends' });
  }
});

// Helper function to generate alerts from current data
async function generateAlertsFromData(): Promise<any[]> {
  const alerts: any[] = [];

  try {
    // Check for temperature anomalies
    const tempResult = await query(`
      SELECT id, location, latitude, longitude, region, temperature, recorded_at
      FROM ocean_data
      WHERE temperature > 32 OR temperature < 20
      ORDER BY recorded_at DESC
      LIMIT 20
    `);

    for (const row of tempResult.rows) {
      alerts.push({
        id: row.id,
        parameter: 'temperature',
        measured_value: parseFloat(row.temperature),
        threshold: row.temperature > 32 ? 32 : 20,
        severity: row.temperature > 35 ? 'critical' : 'warning',
        location: row.location,
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        region: row.region,
        detected_at: row.recorded_at,
        acknowledged: false,
        message: row.temperature > 32
          ? `High temperature (${row.temperature}°C) detected`
          : `Low temperature (${row.temperature}°C) detected`
      });
    }

    // Check for oxygen anomalies
    const oxyResult = await query(`
      SELECT id, location, latitude, longitude, region, oxygen, recorded_at
      FROM ocean_data
      WHERE oxygen < 4
      ORDER BY recorded_at DESC
      LIMIT 20
    `);

    for (const row of oxyResult.rows) {
      alerts.push({
        id: row.id,
        parameter: 'oxygen',
        measured_value: parseFloat(row.oxygen),
        threshold: 4,
        severity: row.oxygen < 2 ? 'critical' : 'warning',
        location: row.location,
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        region: row.region,
        detected_at: row.recorded_at,
        acknowledged: false,
        message: `Low oxygen (${row.oxygen} mg/L) - potential hypoxia`
      });
    }

  } catch (error) {
    console.error('Error generating alerts:', error);
  }

  return alerts;
}

export default router;
