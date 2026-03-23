import { query } from '../../db/connection.js';
import { ImportLogger } from '../utils/logger.js';
import { OtolithRecord } from './types.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Otolith Data Importer
 * Handles biogeochemistry measurements, age/growth analysis, and isotope composition
 */
export class OtolithImporter {
  /**
   * Import otolith records (typically from CSV)
   */
  static async importOtolithRecords(
    records: any[],
    logger: ImportLogger,
    dryRun: boolean = false
  ): Promise<number> {
    try {
      logger.logInfo(`Starting otolith import with ${records.length} records`);

      if (dryRun) {
        logger.logInfo(`DRY RUN: Would insert ${records.length} otolith records`);
        return records.length;
      }

      let inserted = 0;
      const batchSize = 50;

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);

        try {
          const result = await this.insertOtolithBatch(batch, logger);
          inserted += result;

          logger.logProgress();
        } catch (batchError) {
          logger.logError(
            `Otolith batch ${Math.floor(i / batchSize) + 1} failed: ${batchError}`
          );
        }
      }

      logger.logInfo(`Otolith import complete: ${inserted} records inserted`);
      return inserted;
    } catch (error) {
      logger.logError(`Otolith import failed: ${error}`);
      throw error;
    }
  }

  /**
   * Insert otolith records into database
   */
  private static async insertOtolithBatch(
    records: any[],
    logger: ImportLogger
  ): Promise<number> {
    if (records.length === 0) return 0;

    const values: any[] = [];
    const clauses: string[] = [];
    let inserted = 0;

    for (let i = 0; i < records.length; i++) {
      const record = records[i];

      try {
        // Validate required fields
        if (!record.occurrenceID || record.age_years === undefined) {
          logger.logWarning(
            `Skipping otolith record: missing occurrenceID or age_years`
          );
          continue;
        }

        // Validate biogeochemical ranges
        if (record.sr_ca_ratio && !this.validateChemicalRanges(record)) {
          logger.logWarning(
            `Skipping otolith record: biogeochemistry out of valid ranges`
          );
          continue;
        }

        // Infer temperature from oxygen isotopes if available
        let temperatureInferred = record.temperature_inferred_celsius;
        if (
          record.delta_18_o_permil !== undefined &&
          !temperatureInferred
        ) {
          temperatureInferred = this.inferTemperatureFromIsotopes(
            record.delta_18_o_permil
          );
        }

        values.push(
          uuidv4(), // id
          record.occurrenceID,
          record.fish_id || null,
          parseFloat(record.fish_total_length_cm) || null,
          parseFloat(record.fish_weight_g) || null,
          parseInt(record.age_years),
          record.age_confidence || 'medium',
          parseInt(record.growth_ring_count) || null,
          record.increment_widths_micrometers || null,
          record.back_calculated_lengths_cm || null,
          parseFloat(record.sr_ca_ratio) || null,
          parseFloat(record.pb_concentration_ppb) || null,
          parseFloat(record.ba_concentration_ppb) || null,
          parseFloat(record.zn_concentration_ppb) || null,
          parseFloat(record.mg_concentration_ppb) || null,
          parseFloat(record.mn_concentration_ppb) || null,
          parseFloat(record.fe_concentration_ppb) || null,
          parseFloat(record.delta_18_o_permil) || null,
          parseFloat(record.delta_13_c_permil) || null,
          parseFloat(record.delta_d_permil) || null,
          temperatureInferred,
          parseFloat(record.salinity_inferred_psu) || null,
          parseFloat(record.otolith_width_mm) || null,
          parseFloat(record.otolith_height_mm) || null,
          parseFloat(record.otolith_thickness_mm) || null,
          parseFloat(record.otolith_weight_mg) || null,
          record.otolith_preservation || 'clear',
          record.microstructure_clarity || 'good',
          record.resorption_present || false,
          record.collection_location || null,
          record.collection_method || null,
          record.analyst_name || null,
          record.analysis_laboratory || null,
          record.standard_reference_material_analyzed || false,
          parseInt(record.duplicates_analyzed) || 0
        );

        const paramStart = inserted * 35 + 1;
        clauses.push(
          `($${paramStart}, $${paramStart + 1}, $${paramStart + 2}, $${paramStart + 3}, $${paramStart + 4}, $${paramStart + 5}, $${paramStart + 6}, $${paramStart + 7}, $${paramStart + 8}, $${paramStart + 9}, $${paramStart + 10}, $${paramStart + 11}, $${paramStart + 12}, $${paramStart + 13}, $${paramStart + 14}, $${paramStart + 15}, $${paramStart + 16}, $${paramStart + 17}, $${paramStart + 18}, $${paramStart + 19}, $${paramStart + 20}, $${paramStart + 21}, $${paramStart + 22}, $${paramStart + 23}, $${paramStart + 24}, $${paramStart + 25}, $${paramStart + 26}, $${paramStart + 27}, $${paramStart + 28}, $${paramStart + 29}, $${paramStart + 30}, $${paramStart + 31}, $${paramStart + 32}, $${paramStart + 33}, $${paramStart + 34})`
        );

        inserted++;
      } catch (error) {
        logger.logError(`Failed to process otolith record: ${error}`);
      }
    }

    if (clauses.length === 0) return 0;

    const insertQuery = `
      INSERT INTO otolith_records
      (id, occurrenceID, fish_id, fish_total_length_cm, fish_weight_g, age_years, age_confidence, growth_ring_count, increment_widths_micrometers, back_calculated_lengths_cm, sr_ca_ratio, pb_concentration_ppb, ba_concentration_ppb, zn_concentration_ppb, mg_concentration_ppb, mn_concentration_ppb, fe_concentration_ppb, delta_18_o_permil, delta_13_c_permil, delta_d_permil, temperature_inferred_celsius, salinity_inferred_psu, otolith_width_mm, otolith_height_mm, otolith_thickness_mm, otolith_weight_mg, otolith_preservation, microstructure_clarity, resorption_present, collection_location, collection_method, analyst_name, analysis_laboratory, standard_reference_material_analyzed, duplicates_analyzed)
      VALUES
      ${clauses.join(', ')}
      ON CONFLICT DO NOTHING
    `;

    try {
      await query(insertQuery, values);
      return clauses.length;
    } catch (error) {
      logger.logError(`Failed to insert otolith records: ${error}`);
      throw error;
    }
  }

  /**
   * Validate biogeochemical values are within reasonable ranges
   */
  private static validateChemicalRanges(record: any): boolean {
    // Sr/Ca ratio: typically 0.001-0.01
    if (record.sr_ca_ratio && (record.sr_ca_ratio < 0.0001 || record.sr_ca_ratio > 0.1)) {
      return false;
    }

    // Pb concentration: typically 0-2 ppb in clean marine waters
    if (record.pb_concentration_ppb && record.pb_concentration_ppb < 0) {
      return false;
    }

    // Barium: typically 0-20 ppb
    if (record.ba_concentration_ppb && (record.ba_concentration_ppb < 0 || record.ba_concentration_ppb > 100)) {
      return false;
    }

    // Zinc: typically 0-50 ppb
    if (record.zn_concentration_ppb && (record.zn_concentration_ppb < 0 || record.zn_concentration_ppb > 200)) {
      return false;
    }

    // Isotope ratios: δ values typically -50 to +50 per mil
    if (record.delta_18_o_permil && (record.delta_18_o_permil < -100 || record.delta_18_o_permil > 100)) {
      return false;
    }

    if (record.delta_13_c_permil && (record.delta_13_c_permil < -100 || record.delta_13_c_permil > 100)) {
      return false;
    }

    if (record.delta_d_permil && (record.delta_d_permil < -500 || record.delta_d_permil > 500)) {
      return false;
    }

    return true;
  }

  /**
   * Infer temperature from oxygen isotopes (δ18O)
   * Using simplified Epstein & Mayeda (1953) equation for fish otoliths
   * Temperature (°C) ≈ 16.4 - 4.3 * (δ18O_otolith - δ18O_water)
   * Assuming δ18O_water = 0 for simplicity
   */
  private static inferTemperatureFromIsotopes(delta18O: number): number {
    // Simplified calculation assuming δ18O_water = 0
    const temperature = 16.4 - 4.3 * delta18O;

    // Reasonable temperature range for fish: -2 to 50°C
    return Math.max(-2, Math.min(50, temperature));
  }

  /**
   * Get otolith record statistics
   */
  static async getOtolithStats(logger: ImportLogger): Promise<any> {
    try {
      const result = await query(`
        SELECT
          COUNT(*) as total_records,
          AVG(age_years) as avg_age,
          MIN(age_years) as min_age,
          MAX(age_years) as max_age,
          COUNT(DISTINCT occurrenceID) as unique_fish,
          AVG(sr_ca_ratio) as avg_sr_ca_ratio,
          AVG(pb_concentration_ppb) as avg_pb_concentration,
          AVG(temperature_inferred_celsius) as avg_water_temperature
        FROM otolith_records
      `);

      return result.rows[0];
    } catch (error) {
      logger.logError(`Failed to get otolith stats: ${error}`);
      throw error;
    }
  }

  /**
   * Example CSV format
   */
  static getExampleCsv(): string {
    return `occurrenceID,age_years,sr_ca_ratio,pb_concentration_ppb,delta_18_o_permil,delta_13_c_permil,temperature_inferred_celsius,otolith_preservation,analyst_name
OTOLITH-001,5,0.0025,0.5,1.2,-0.5,26.3,clear,Dr. Jane Smith
OTOLITH-002,8,0.0023,0.7,0.9,-0.3,25.8,moderate,Dr. Jane Smith
OTOLITH-003,3,0.0027,0.3,1.5,-0.6,27.1,clear,Dr. John Doe
OTOLITH-004,12,0.0021,0.9,0.6,-0.4,24.9,good,Dr. John Doe`;
  }
}
