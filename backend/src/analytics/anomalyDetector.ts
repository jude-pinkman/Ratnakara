import { query } from '../db/connection.js';
import { ImportLogger } from '../data/utils/logger.js';
import { AnomalyRecord } from '../data/importers/types.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Anomaly Detection System
 * Identifies statistical outliers and unusual patterns in environmental data
 */
export class AnomalyDetector {
  /**
   * Detect anomalies in oceanographic parameters
   * Uses Z-score method: flag values > 2.5 std dev from mean (99.4% confidence)
   */
  static async detectAnomalies(
    parameter: 'temperature' | 'salinity' | 'ph' | 'oxygen' | 'edna',
    lookbackDays: number = 365,
    logger?: ImportLogger
  ): Promise<number> {
    try {
      if (logger)
        logger.logInfo(
          `Detecting ${parameter} anomalies (lookback: ${lookbackDays} days)`
        );

      // Get historical data
      const historicalData = await this.getHistoricalData(
        parameter,
        lookbackDays
      );

      if (!historicalData || historicalData.length === 0) {
        if (logger)
          logger.logWarning(
            `No historical data available for ${parameter} anomaly detection`
          );
        return 0;
      }

      // Calculate baseline statistics
      const { mean, stdDev } = this.calculateBaseline(historicalData);

      // Get recent data to check for anomalies
      const recentData = await this.getRecentData(parameter, 7); // Last 7 days

      if (!recentData || recentData.length === 0) {
        if (logger) logger.logInfo(`No recent data to check for ${parameter} anomalies`);
        return 0;
      }

      // Detect anomalies
      let anomalyCount = 0;
      const anomalies: any[] = [];

      for (const record of recentData) {
        const value = record.value;
        const zScore = Math.abs((value - mean) / stdDev);

        // Z-score > 2.5 = 99.4% confidence it's an outlier
        const isAnomalous = zScore > 2.5;

        if (isAnomalous) {
          const severity = zScore > 4 ? 'critical' : 'warning';

          anomalies.push({
            occurrenceID: record.occurrenceID,
            parameter,
            measured_value: value,
            expected_value: mean,
            z_score: zScore,
            percentile_rank: this.calculatePercentileRank(value, historicalData),
            anomaly_type: zScore > 4 ? 'outlier' : 'temporal_spike',
            anomaly_severity: severity,
            alert_level: severity,
            lookback_period_days: lookbackDays,
            baseline_mean: mean,
            baseline_std_dev: stdDev,
          });

          anomalyCount++;
        }
      }

      // Store anomalies in database
      if (anomalies.length > 0) {
        await this.storeAnomalies(anomalies);

        if (logger)
          logger.logInfo(`Detected ${anomalies.length} ${parameter} anomalies`);
      }

      return anomalyCount;
    } catch (error) {
      if (logger) logger.logError(`Anomaly detection failed: ${error}`);
      throw error;
    }
  }

  /**
   * Get historical data for baseline calculation
   */
  private static async getHistoricalData(
    parameter: string,
    lookbackDays: number
  ): Promise<number[]> {
    let result;

    switch (parameter) {
      case 'temperature':
        result = await query(`
          SELECT temperature_celsius as value
          FROM environmental_measurements
          WHERE temperature_celsius IS NOT NULL
            AND created_at >= NOW() - INTERVAL '${lookbackDays} days'
          ORDER BY created_at DESC
          LIMIT 1000
        `);
        break;

      case 'salinity':
        result = await query(`
          SELECT salinity_psu as value
          FROM environmental_measurements
          WHERE salinity_psu IS NOT NULL
            AND created_at >= NOW() - INTERVAL '${lookbackDays} days'
          ORDER BY created_at DESC
          LIMIT 1000
        `);
        break;

      case 'ph':
        result = await query(`
          SELECT ph as value
          FROM environmental_measurements
          WHERE ph IS NOT NULL
            AND created_at >= NOW() - INTERVAL '${lookbackDays} days'
          ORDER BY created_at DESC
          LIMIT 1000
        `);
        break;

      case 'oxygen':
        result = await query(`
          SELECT dissolved_oxygen_mg_per_l as value
          FROM environmental_measurements
          WHERE dissolved_oxygen_mg_per_l IS NOT NULL
            AND created_at >= NOW() - INTERVAL '${lookbackDays} days'
          ORDER BY created_at DESC
          LIMIT 1000
        `);
        break;

      case 'edna':
        result = await query(`
          SELECT edna_concentration_per_litre as value
          FROM edna_observations
          WHERE edna_concentration_per_litre IS NOT NULL
            AND created_at >= NOW() - INTERVAL '${lookbackDays} days'
          ORDER BY created_at DESC
          LIMIT 1000
        `);
        break;

      default:
        return [];
    }

    return (result?.rows || []).map((r: any) => parseFloat(r.value));
  }

  /**
   * Get recent data to check for anomalies
   */
  private static async getRecentData(parameter: string, lastNDays: number) {
    let result;

    switch (parameter) {
      case 'temperature':
        result = await query(`
          SELECT o.occurrenceID, em.temperature_celsius as value
          FROM environmental_measurements em
          JOIN occurrences o ON em.occurrenceID = o.occurrenceID
          WHERE em.temperature_celsius IS NOT NULL
            AND em.created_at >= NOW() - INTERVAL '${lastNDays} days'
          ORDER BY em.created_at DESC
          LIMIT 500
        `);
        break;

      case 'salinity':
        result = await query(`
          SELECT o.occurrenceID, em.salinity_psu as value
          FROM environmental_measurements em
          JOIN occurrences o ON em.occurrenceID = o.occurrenceID
          WHERE em.salinity_psu IS NOT NULL
            AND em.created_at >= NOW() - INTERVAL '${lastNDays} days'
          ORDER BY em.created_at DESC
          LIMIT 500
        `);
        break;

      case 'ph':
        result = await query(`
          SELECT o.occurrenceID, em.ph as value
          FROM environmental_measurements em
          JOIN occurrences o ON em.occurrenceID = o.occurrenceID
          WHERE em.ph IS NOT NULL
            AND em.created_at >= NOW() - INTERVAL '${lastNDays} days'
          ORDER BY em.created_at DESC
          LIMIT 500
        `);
        break;

      case 'oxygen':
        result = await query(`
          SELECT o.occurrenceID, em.dissolved_oxygen_mg_per_l as value
          FROM environmental_measurements em
          JOIN occurrences o ON em.occurrenceID = o.occurrenceID
          WHERE em.dissolved_oxygen_mg_per_l IS NOT NULL
            AND em.created_at >= NOW() - INTERVAL '${lastNDays} days'
          ORDER BY em.created_at DESC
          LIMIT 500
        `);
        break;

      case 'edna':
        result = await query(`
          SELECT o.occurrenceID, eo.edna_concentration_per_litre as value
          FROM edna_observations eo
          JOIN occurrences o ON eo.occurrenceID = o.occurrenceID
          WHERE eo.edna_concentration_per_litre IS NOT NULL
            AND eo.created_at >= NOW() - INTERVAL '${lastNDays} days'
          ORDER BY eo.created_at DESC
          LIMIT 500
        `);
        break;

      default:
        return [];
    }

    return (result?.rows || []).map((r: any) => ({
      occurrenceID: r.occurrenceID,
      value: parseFloat(r.value),
    }));
  }

  /**
   * Calculate baseline mean and standard deviation
   */
  private static calculateBaseline(
    data: number[]
  ): { mean: number; stdDev: number } {
    const n = data.length;
    const mean = data.reduce((a, b) => a + b, 0) / n;

    const variance =
      data.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    return { mean, stdDev };
  }

  /**
   * Calculate percentile rank of a value in a dataset
   */
  private static calculatePercentileRank(
    value: number,
    data: number[]
  ): number {
    const sorted = [...data].sort((a, b) => a - b);
    const count = sorted.filter((v) => v <= value).length;
    return (count / sorted.length) * 100;
  }

  /**
   * Store detected anomalies in database
   */
  private static async storeAnomalies(anomalies: any[]): Promise<void> {
    if (anomalies.length === 0) return;

    const values: any[] = [];
    const clauses: string[] = [];

    for (let i = 0; i < anomalies.length; i++) {
      const anom = anomalies[i];

      values.push(
        uuidv4(),
        anom.occurrenceID,
        anom.parameter,
        anom.measured_value,
        anom.expected_value,
        anom.z_score,
        anom.percentile_rank,
        anom.anomaly_type,
        anom.anomaly_severity,
        anom.alert_level,
        anom.lookback_period_days,
        anom.baseline_mean,
        anom.baseline_std_dev,
        false, // acknowledged
        null, // acknowledged_by
        null, // acknowledged_at
        null // notes
      );

      const paramStart = i * 17 + 1;
      clauses.push(
        `($${paramStart}, $${paramStart + 1}, $${paramStart + 2}, $${paramStart + 3}, $${paramStart + 4}, $${paramStart + 5}, $${paramStart + 6}, $${paramStart + 7}, $${paramStart + 8}, $${paramStart + 9}, $${paramStart + 10}, $${paramStart + 11}, $${paramStart + 12}, $${paramStart + 13}, $${paramStart + 14}, $${paramStart + 15}, $${paramStart + 16})`
      );
    }

    const insertQuery = `
      INSERT INTO anomalies
      (id, occurrenceID, parameter, measured_value, expected_value, z_score, percentile_rank, anomaly_type, anomaly_severity, alert_level, lookback_period_days, baseline_mean, baseline_std_dev, acknowledged, acknowledged_by, acknowledged_at, notes)
      VALUES
      ${clauses.join(', ')}
    `;

    await query(insertQuery, values);
  }

  /**
   * Get anomaly statistics
   */
  static async getAnomalyStats(logger?: ImportLogger): Promise<any> {
    try {
      const result = await query(`
        SELECT
          COUNT(*) as total_anomalies,
          COUNT(DISTINCT parameter) as parameters_with_anomalies,
          COUNT(CASE WHEN alert_level = 'critical' THEN 1 END) as critical_count,
          COUNT(CASE WHEN alert_level = 'warning' THEN 1 END) as warning_count,
          MAX(created_at) as last_anomaly_detected,
          ARRAY_AGG(DISTINCT parameter) as parameter_list
        FROM anomalies
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `);

      return result.rows[0];
    } catch (error) {
      if (logger) logger.logError(`Failed to get anomaly stats: ${error}`);
      throw error;
    }
  }

  /**
   * Get critical anomalies
   */
  static async getCriticalAnomalies(
    logger?: ImportLogger
  ): Promise<AnomalyRecord[]> {
    try {
      const result = await query(`
        SELECT
          a.*,
          o.scientificName,
          o.region
        FROM anomalies a
        JOIN occurrences o ON a.occurrenceID = o.occurrenceID
        WHERE a.alert_level = 'critical'
          AND a.acknowledged = FALSE
          AND a.created_at >= NOW() - INTERVAL '7 days'
        ORDER BY a.created_at DESC
        LIMIT 100
      `);

      return result.rows || [];
    } catch (error) {
      if (logger) logger.logError(`Failed to get critical anomalies: ${error}`);
      throw error;
    }
  }

  /**
   * Acknowledge an anomaly
   */
  static async acknowledgeAnomaly(
    anomalyId: string,
    acknowledgedBy: string,
    notes: string = ''
  ): Promise<void> {
    try {
      await query(
        `
        UPDATE anomalies
        SET
          acknowledged = TRUE,
          acknowledged_by = $1,
          acknowledged_at = NOW(),
          notes = $2
        WHERE id = $3
      `,
        [acknowledgedBy, notes, anomalyId]
      );
    } catch (error) {
      throw error;
    }
  }
}
