import { query } from '../../db/connection.js';
import { ImportLogger } from '../utils/logger.js';
import { DataValidator } from '../utils/validator.js';
import { DarwinCoreOccurrence, EnvironmentalMeasurement } from './types.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * JSON Importer for Darwin Core formatted records
 * Supports importing biodiversity data in Darwin Core standard format
 */
export class JsonImporter {
  /**
   * Import JSON records to database
   * Supports both array format and {records: []} format
   */
  static async importJsonRecords(
    jsonData: string,
    logger: ImportLogger,
    dryRun: boolean = false
  ): Promise<number> {
    try {
      const parsed = JSON.parse(jsonData);

      // Handle both array format and {records: []} format
      let records: any[] = Array.isArray(parsed) ? parsed : parsed.records || [];

      if (!Array.isArray(records)) {
        throw new Error('JSON must contain an array of records');
      }

      logger.logInfo(`Starting JSON import with ${records.length} records`);

      let inserted = 0;
      const batchSize = 100;

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);

        try {
          const result = await this.processBatch(batch, logger, dryRun);
          inserted += result;

          logger.logProgress();
        } catch (batchError) {
          logger.logError(
            `Batch ${Math.floor(i / batchSize) + 1} failed: ${batchError}`
          );
          if (!dryRun) throw batchError;
        }
      }

      logger.logInfo(`JSON import complete: ${inserted} records inserted`);
      return inserted;
    } catch (error) {
      logger.logError(`JSON import failed: ${error}`);
      throw error;
    }
  }

  private static async processBatch(
    records: any[],
    logger: ImportLogger,
    dryRun: boolean = false
  ): Promise<number> {
    const occurrenceValues: any[] = [];
    const envMeasurementValues: any[] = [];

    let occurrenceIndex = 1;
    let envIndex = 1;

    for (const record of records) {
      try {
        // Validate required Darwin Core fields
        if (
          !record.scientificName ||
          record.decimalLatitude === undefined ||
          record.decimalLongitude === undefined ||
          !record.eventDate
        ) {
          logger.logWarning(
            `Skipping record: missing required Darwin Core fields (scientificName, coordinates, eventDate)`
          );
          continue;
        }

        // Validate coordinate bounds (Indian waters)
        if (
          !DataValidator.isIndianWaters(
            record.decimalLatitude,
            record.decimalLongitude
          )
        ) {
          logger.logWarning(
            `Skipping record outside Indian waters: ${record.decimalLatitude}, ${record.decimalLongitude}`
          );
          continue;
        }

        // Auto-classify region
        const region = DataValidator.getIndianRegion(
          record.decimalLatitude,
          record.decimalLongitude
        );

        // Generate occurrenceID if not provided
        const occurrenceID = record.occurrenceID || `JSON-${uuidv4()}`;

        // Build occurrence record
        occurrenceValues.push(
          occurrenceID,
          record.recordedBy || null,
          record.recordedDate || new Date().toISOString(),
          record.eventDate,
          record.eventTime || null,
          record.eventID || null,
          record.scientificName,
          record.scientificNameAuthority || null,
          record.taxonRank || 'species',
          record.taxonID || null,
          record.individualCount || 1,
          record.sex || null,
          record.lifeStage || null,
          record.reproductiveCondition || null,
          parseFloat(record.decimalLatitude),
          parseFloat(record.decimalLongitude),
          record.coordinateUncertaintyInMeters || null,
          record.geodeticDatum || 'WGS84',
          record.locationID || null,
          record.locality || 'Unknown',
          record.waterBody || null,
          record.countryCode || 'IN',
          record.continent || 'Asia',
          region,
          record.stationId || null,
          record.samplingProtocol || null,
          record.samplingEffort || null,
          record.fieldNumber || null,
          record.basisOfRecord || 'HumanObservation',
          record.occurrenceStatus || 'present',
          record.datasetName || 'JSON Import',
          record.datasetID || null,
          record.institutionCode || null,
          record.collectionCode || null,
          record.dataType || 'ocean',
          record.dataSource || 'upload',
          false, // isHarvestedByGBIF
          null, // gbifDatasetKey
          record.remarks || null
        );

        // Add environmental measurements if provided
        if (record.temperature_celsius !== undefined) {
          envMeasurementValues.push(
            occurrenceID,
            record.temperature_celsius || null,
            record.salinity_psu || null,
            record.ph || null,
            record.dissolved_oxygen_mg_per_l || null,
            record.dissolved_oxygen_percent || null,
            record.depth_metres || null,
            record.pressure_decibars || null,
            record.chlorophyll_a_mg_m3 || null,
            record.turbidity_ntu || null,
            record.conductivity_ms_cm || null,
            record.measurement_quality || 'good'
          );

          envIndex += 12;
        }

        occurrenceIndex += 35;
      } catch (error) {
        logger.logError(`Failed to process record: ${error}`);
      }
    }

    if (dryRun) {
      // In dry-run mode, just validate without inserting
      logger.logInfo(`DRY RUN: Would insert ${occurrenceValues.length / 35} occurrences`);
      return occurrenceValues.length / 35;
    }

    let inserted = 0;

    // Insert occurrences
    if (occurrenceValues.length > 0) {
      const occurrenceParams = [];
      const occurrenceClauses = [];

      for (let i = 0; i < occurrenceValues.length; i += 35) {
        occurrenceParams.push(...occurrenceValues.slice(i, i + 35));
        const paramStart = (i / 35) * 35 + 1;
        occurrenceClauses.push(
          `($${paramStart}, $${paramStart + 1}, $${paramStart + 2}, $${paramStart + 3}, $${paramStart + 4}, $${paramStart + 5}, $${paramStart + 6}, $${paramStart + 7}, $${paramStart + 8}, $${paramStart + 9}, $${paramStart + 10}, $${paramStart + 11}, $${paramStart + 12}, $${paramStart + 13}, $${paramStart + 14}, $${paramStart + 15}, $${paramStart + 16}, $${paramStart + 17}, $${paramStart + 18}, $${paramStart + 19}, $${paramStart + 20}, $${paramStart + 21}, $${paramStart + 22}, $${paramStart + 23}, $${paramStart + 24}, $${paramStart + 25}, $${paramStart + 26}, $${paramStart + 27}, $${paramStart + 28}, $${paramStart + 29}, $${paramStart + 30}, $${paramStart + 31}, $${paramStart + 32}, $${paramStart + 33}, $${paramStart + 34})`
        );
      }

      const occurrenceInsertQuery = `
        INSERT INTO occurrences
        (occurrenceID, recordedBy, recordedDate, eventDate, eventTime, eventID, scientificName, scientificNameAuthority, taxonRank, taxonID, individualCount, sex, lifeStage, reproductiveCondition, decimalLatitude, decimalLongitude, coordinateUncertaintyInMeters, geodeticDatum, locationID, locality, waterBody, countryCode, continent, region, stationId, samplingProtocol, samplingEffort, fieldNumber, basisOfRecord, occurrenceStatus, datasetName, datasetID, institutionCode, collectionCode, dataType, dataSource, isHarvestedByGBIF, gbifDatasetKey, remarks)
        VALUES
        ${occurrenceClauses.join(', ')}
        ON CONFLICT (occurrenceID) DO NOTHING
      `;

      await query(occurrenceInsertQuery, occurrenceParams);
      inserted = occurrenceClauses.length;
    }

    // Insert environmental measurements
    if (envMeasurementValues.length > 0) {
      const envParams = [];
      const envClauses = [];

      for (let i = 0; i < envMeasurementValues.length; i += 12) {
        envParams.push(...envMeasurementValues.slice(i, i + 12));
        const paramStart = (i / 12) * 12 + 1;
        envClauses.push(
          `($${paramStart}, $${paramStart + 1}, $${paramStart + 2}, $${paramStart + 3}, $${paramStart + 4}, $${paramStart + 5}, $${paramStart + 6}, $${paramStart + 7}, $${paramStart + 8}, $${paramStart + 9}, $${paramStart + 10}, $${paramStart + 11})`
        );
      }

      const envInsertQuery = `
        INSERT INTO environmental_measurements
        (occurrenceID, temperature_celsius, salinity_psu, ph, dissolved_oxygen_mg_per_l, dissolved_oxygen_percent, depth_metres, pressure_decibars, chlorophyll_a_mg_m3, turbidity_ntu, conductivity_ms_cm, measurement_quality)
        VALUES
        ${envClauses.join(', ')}
      `;

      await query(envInsertQuery, envParams);
    }

    return inserted;
  }

  /**
   * Example JSON format that this importer accepts
   */
  static getExampleJson(): string {
    return JSON.stringify(
      {
        records: [
          {
            occurrenceID: 'GBIF-12345',
            scientificName: 'Sardinella longiceps',
            scientificNameAuthority: 'Valenciennes, 1847',
            taxonRank: 'species',
            decimalLatitude: 12.5,
            decimalLongitude: 88.3,
            coordinateUncertaintyInMeters: 100,
            locality: 'Bay of Bengal - Zone 1',
            waterBody: 'Bay of Bengal',
            region: 'Bay of Bengal',
            eventDate: '2024-03-20T10:30:00Z',
            recordedBy: 'Dr. John Smith',
            individualCount: 2500,
            basisOfRecord: 'HumanObservation',
            temperature_celsius: 27.5,
            salinity_psu: 35.2,
            ph: 8.15,
            dissolved_oxygen_mg_per_l: 6.8,
            depth_metres: 45,
            measurement_quality: 'good',
          },
        ],
      },
      null,
      2
    );
  }
}
