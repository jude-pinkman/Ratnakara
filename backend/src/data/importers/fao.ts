import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { ImportLogger } from '../utils/logger.js';
import { BatchInsert } from '../utils/batchInsert.js';
import { DataTransformer } from '../utils/dataTransformer.js';
import { DataValidator } from '../utils/validator.js';
import { query } from '../../db/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function importFAOData(csvPath: string, dryRun: boolean = false): Promise<any> {
  const logger = new ImportLogger('FAO Fisheries');
  let finalPath = csvPath || process.env.FAO_CSV_PATH || 'data/samples/fao_sample.csv';

  // Resolve path relative to project root if not absolute
  if (!path.isAbsolute(finalPath)) {
    const projectRoot = path.resolve(__dirname, '../../../../');
    finalPath = path.resolve(projectRoot, finalPath);
  }

  logger.start(`Importing fisheries data from ${finalPath}`);

  // Check file exists
  if (!fs.existsSync(finalPath)) {
    logger.logError(`CSV file not found: ${finalPath}`);
    throw new Error(`CSV file not found: ${finalPath}`);
  }

  // Read and parse CSV
  let records: any[];
  try {
    const fileContent = fs.readFileSync(finalPath, 'utf-8');
    records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    logger.logInfo(`Parsed ${records.length} records from CSV`);
  } catch (error: any) {
    logger.logError('Failed to parse CSV', error);
    throw error;
  }

  // Transform and validate records
  const validRecords: any[] = [];

  for (const record of records) {
    logger.record('inserted'); // Count all processed

    try {
      // Check if species exists in taxonomy
      if (record.species || record.scientific_name) {
        const speciesName = record.species || record.scientific_name;
        const checkResult = await query(
          'SELECT id FROM taxonomy WHERE species = $1 LIMIT 1',
          [speciesName]
        );

        if (checkResult.rows.length === 0 && process.env.STRICT_TAXONOMY !== 'false') {
          logger.logWarning(`Species not found in taxonomy: ${speciesName}, skipping`);
          logger.record('skipped');
          continue;
        }
      }

      const transformed = DataTransformer.transformFisheriesData(record);

      if (!transformed) {
        logger.record('skipped');
        continue;
      }

      // Validate Indian waters
      if (!DataValidator.isIndianWaters(transformed.latitude, transformed.longitude)) {
        logger.logWarning(`Record outside Indian waters: ${transformed.latitude}, ${transformed.longitude}`);
        logger.record('skipped');
        continue;
      }

      validRecords.push(transformed);
    } catch (error: any) {
      logger.logError(`Transform/validation error`, error);
      logger.record('errored');
    }
  }

  logger.logInfo(`Transformed ${validRecords.length} valid records`);

  // Batch insert
  try {
    if (validRecords.length > 0) {
      logger.logInfo(`Batch inserting ${validRecords.length} fisheries records...`);

      if (!dryRun) {
        const inserted = await BatchInsert.insertFisheriesData(validRecords, logger, false);
        logger.logInfo(`Successfully inserted ${inserted} fisheries records`);

        // Also insert to Darwin Core occurrences table
        logger.logInfo('Inserting to Darwin Core occurrences table...');
        const occurrencesInserted = await insertFAODarwinCoreOccurrences(validRecords, logger, dryRun);
        logger.logInfo(`Inserted ${occurrencesInserted} records to occurrences table`);
      } else {
        logger.logInfo(`[DRY RUN] Would insert ${validRecords.length} fisheries records`);
        logger.logInfo(`[DRY RUN] Would insert ${validRecords.length} Darwin Core occurrences`);
      }
    }
  } catch (error: any) {
    logger.logError('Failed to insert fisheries records', error);
    throw error;
  }

  return logger.complete();
}

/**
 * Insert FAO records to Darwin Core occurrences table
 * Transforms existing FAO fisheries data to Darwin Core format
 */
async function insertFAODarwinCoreOccurrences(
  records: any[],
  logger: ImportLogger,
  dryRun: boolean = false
): Promise<number> {
  if (records.length === 0) return 0;

  logger.logInfo(`Converting ${records.length} FAO records to Darwin Core format...`);

  const values: any[] = [];
  const clauses: string[] = [];
  let inserted = 0;

  for (const record of records) {
    try {
      const occurrenceID = `FAO-${uuidv4()}`;
      const region = DataValidator.getIndianRegion(record.latitude, record.longitude);

      // Transform to Darwin Core occurrence format
      values.push(
        occurrenceID,
        'Dr. FAO Importer', // recordedBy
        new Date().toISOString(), // recordedDate
        record.recorded_at || new Date().toISOString(), // eventDate
        null, // eventTime
        null, // eventID
        record.species || record.common_name, // scientificName
        null, // scientificNameAuthority
        'species', // taxonRank
        null, // taxonID
        record.abundance || 1, // individualCount
        null, // sex
        null, // lifeStage
        null, // reproductiveCondition
        record.latitude, // decimalLatitude
        record.longitude, // decimalLongitude
        null, // coordinateUncertaintyInMeters
        'WGS84', // geodeticDatum
        null, // locationID
        record.location || 'Fishing Zone', // locality
        'Indian Ocean', // waterBody
        'IN', // countryCode
        'Asia', // continent
        region, // region
        null, // stationId
        'Commercial Fishing', // samplingProtocol
        `Catch: ${record.abundance} individuals, Biomass: ${record.biomass} kg`, // samplingEffort
        null, // fieldNumber
        'HumanObservation', // basisOfRecord
        'present', // occurrenceStatus
        'FAO Fisheries Data', // datasetName
        null, // datasetID
        'FAO', // institutionCode
        null, // collectionCode
        'fisheries', // dataType
        'FAO', // dataSource
        false, // isHarvestedByGBIF
        null, // gbifDatasetKey
        `Biomass: ${record.biomass} kg, Diversity Index: ${record.diversity_index || 'N/A'}` // remarks
      );

      const paramStart = inserted * 35 + 1;
      clauses.push(
        `($${paramStart}, $${paramStart + 1}, $${paramStart + 2}, $${paramStart + 3}, $${paramStart + 4}, $${paramStart + 5}, $${paramStart + 6}, $${paramStart + 7}, $${paramStart + 8}, $${paramStart + 9}, $${paramStart + 10}, $${paramStart + 11}, $${paramStart + 12}, $${paramStart + 13}, $${paramStart + 14}, $${paramStart + 15}, $${paramStart + 16}, $${paramStart + 17}, $${paramStart + 18}, $${paramStart + 19}, $${paramStart + 20}, $${paramStart + 21}, $${paramStart + 22}, $${paramStart + 23}, $${paramStart + 24}, $${paramStart + 25}, $${paramStart + 26}, $${paramStart + 27}, $${paramStart + 28}, $${paramStart + 29}, $${paramStart + 30}, $${paramStart + 31}, $${paramStart + 32}, $${paramStart + 33}, $${paramStart + 34})`
      );
      inserted++;
    } catch (error) {
      logger.logError(`Failed to transform FAO record: ${error}`);
    }
  }

  if (clauses.length === 0) return 0;

  try {
    if (!dryRun) {
      const insertQuery = `
        INSERT INTO occurrences
        (occurrenceID, recordedBy, recordedDate, eventDate, eventTime, eventID, scientificName, scientificNameAuthority, taxonRank, taxonID, individualCount, sex, lifeStage, reproductiveCondition, decimalLatitude, decimalLongitude, coordinateUncertaintyInMeters, geodeticDatum, locationID, locality, waterBody, countryCode, continent, region, stationId, samplingProtocol, samplingEffort, fieldNumber, basisOfRecord, occurrenceStatus, datasetName, datasetID, institutionCode, collectionCode, dataType, dataSource, isHarvestedByGBIF, gbifDatasetKey, remarks)
        VALUES
        ${clauses.join(', ')}
        ON CONFLICT (occurrenceID) DO NOTHING
      `;
      await query(insertQuery, values);
      logger.logInfo(`Inserted ${clauses.length} FAO records to Darwin Core occurrences table`);
    } else {
      logger.logInfo(`[DRY RUN] Would insert ${clauses.length} FAO records to Darwin Core occurrences`);
    }
    return clauses.length;
  } catch (error: any) {
    logger.logError(`Failed to insert Darwin Core occurrences: ${error}`);
    throw error;
  }
}

export default importFAOData;
