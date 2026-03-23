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

export async function importNOAAData(csvPath: string, dryRun: boolean = false): Promise<any> {
  const logger = new ImportLogger('NOAA Ocean Data');
  let finalPath = csvPath || process.env.NOAA_CSV_PATH || 'data/samples/noaa_sample.csv';

  // Resolve path relative to project root if not absolute
  if (!path.isAbsolute(finalPath)) {
    const projectRoot = path.resolve(__dirname, '../../../../');
    finalPath = path.resolve(projectRoot, finalPath);
  }

  logger.start(`Importing ocean data from ${finalPath}`);

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
      const transformed = DataTransformer.transformOceanData(record);

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

  // Cluster nearby records into stations (match 180-station schema)
  logger.logInfo('Clustering nearby coordinates into virtual stations...');
  const clusters = DataTransformer.clusterCoordinates(validRecords, 0.5); // 0.5 degree radius
  const clusteredRecords: any[] = [];

  let stationCount = 0;
  for (const [_key, clusterRecords] of clusters.entries()) {
    const aggregated = DataTransformer.aggregateCluster(clusterRecords);
    aggregated.location = `Station-${stationCount + 1}`;
    clusteredRecords.push(aggregated);
    stationCount++;

    if (stationCount >= 180) break; // Limit to 180 stations like current data
  }

  logger.logInfo(`Aggregated into ${clusteredRecords.length} stations from ${validRecords.length} records`);

  // Batch insert
  try {
    if (clusteredRecords.length > 0) {
      logger.logInfo(`Batch inserting ${clusteredRecords.length} ocean data records...`);

      if (!dryRun) {
        const inserted = await BatchInsert.insertOceanData(clusteredRecords, logger, false);
        logger.logInfo(`Successfully inserted ${inserted} ocean data records`);

        // Also insert to Darwin Core occurrences table
        logger.logInfo('Inserting to Darwin Core occurrences table...');
        const occurrencesInserted = await insertNOAADarwinCoreOccurrences(clusteredRecords, logger, dryRun);
        logger.logInfo(`Inserted ${occurrencesInserted} records to occurrences table`);
      } else {
        logger.logInfo(`[DRY RUN] Would insert ${clusteredRecords.length} ocean data records`);
        logger.logInfo(`[DRY RUN] Would insert ${clusteredRecords.length} Darwin Core occurrences`);
      }
    }
  } catch (error: any) {
    logger.logError('Failed to insert ocean data records', error);
    throw error;
  }

  return logger.complete();
}

/**
 * Insert NOAA records to Darwin Core occurrences table
 * Transforms existing NOAA ocean data to Darwin Core format
 */
async function insertNOAADarwinCoreOccurrences(
  records: any[],
  logger: ImportLogger,
  dryRun: boolean = false
): Promise<number> {
  if (records.length === 0) return 0;

  logger.logInfo(`Converting ${records.length} NOAA records to Darwin Core format...`);

  const values: any[] = [];
  const clauses: string[] = [];
  let inserted = 0;

  for (const record of records) {
    try {
      const occurrenceID = `NOAA-${uuidv4()}`;
      const region = DataValidator.getIndianRegion(record.latitude, record.longitude);

      // Transform to Darwin Core occurrence format
      // For ocean data, use a generic organism name since it's oceanographic monitoring
      values.push(
        occurrenceID,
        'Dr. NOAA Importer', // recordedBy
        new Date().toISOString(), // recordedDate
        record.recorded_at || new Date().toISOString(), // eventDate
        null, // eventTime
        null, // eventID
        'Marine Water Column', // scientificName (generic for oceanographic data)
        null, // scientificNameAuthority
        'environment', // taxonRank
        null, // taxonID
        null, // individualCount
        null, // sex
        null, // lifeStage
        null, // reproductiveCondition
        record.latitude, // decimalLatitude
        record.longitude, // decimalLongitude
        100, // coordinateUncertaintyInMeters
        'WGS84', // geodeticDatum
        null, // locationID
        record.location || 'Ocean Station', // locality
        'Indian Ocean', // waterBody
        'IN', // countryCode
        'Asia', // continent
        region, // region
        record.location || null, // stationId
        'Oceanographic Survey', // samplingProtocol
        `Temperature: ${record.temperature}°C, Salinity: ${record.salinity} PSU, Oxygen: ${record.oxygen} mg/L`, // samplingEffort
        null, // fieldNumber
        'MachineObservation', // basisOfRecord
        'present', // occurrenceStatus
        'NOAA Ocean Data', // datasetName
        null, // datasetID
        'NOAA', // institutionCode
        null, // collectionCode
        'ocean', // dataType
        'NOAA', // dataSource
        false, // isHarvestedByGBIF
        null, // gbifDatasetKey
        `pH: ${record.ph}, Depth: ${record.depth}m` // remarks
      );

      const paramStart = inserted * 35 + 1;
      clauses.push(
        `($${paramStart}, $${paramStart + 1}, $${paramStart + 2}, $${paramStart + 3}, $${paramStart + 4}, $${paramStart + 5}, $${paramStart + 6}, $${paramStart + 7}, $${paramStart + 8}, $${paramStart + 9}, $${paramStart + 10}, $${paramStart + 11}, $${paramStart + 12}, $${paramStart + 13}, $${paramStart + 14}, $${paramStart + 15}, $${paramStart + 16}, $${paramStart + 17}, $${paramStart + 18}, $${paramStart + 19}, $${paramStart + 20}, $${paramStart + 21}, $${paramStart + 22}, $${paramStart + 23}, $${paramStart + 24}, $${paramStart + 25}, $${paramStart + 26}, $${paramStart + 27}, $${paramStart + 28}, $${paramStart + 29}, $${paramStart + 30}, $${paramStart + 31}, $${paramStart + 32}, $${paramStart + 33}, $${paramStart + 34})`
      );
      inserted++;
    } catch (error) {
      logger.logError(`Failed to transform NOAA record: ${error}`);
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
      logger.logInfo(`Inserted ${clauses.length} NOAA records to Darwin Core occurrences table`);
    } else {
      logger.logInfo(`[DRY RUN] Would insert ${clauses.length} NOAA records to Darwin Core occurrences`);
    }
    return clauses.length;
  } catch (error: any) {
    logger.logError(`Failed to insert Darwin Core occurrences: ${error}`);
    throw error;
  }
}

export default importNOAAData;
