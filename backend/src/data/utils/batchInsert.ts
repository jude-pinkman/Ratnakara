import { query } from '../../db/connection.js';
import { ImportLogger } from './logger.js';
import { v4 as uuidv4 } from 'uuid';

// Classify region based on coordinates (Indian waters)
function classifyRegion(lat: number, lon: number): string {
  if (lat >= 6 && lat <= 22 && lon >= 80 && lon <= 95) return 'Bay of Bengal';
  if (lat >= 8 && lat <= 24 && lon >= 65 && lon <= 77) return 'Arabian Sea';
  if (lat >= 5 && lat <= 14 && lon >= 92 && lon <= 98) return 'Andaman Sea';
  if (lat >= 8 && lat <= 12 && lon >= 71 && lon <= 74) return 'Lakshadweep Sea';
  if (lat >= 6 && lat <= 10 && lon >= 77 && lon <= 80) return 'Gulf of Mannar';
  return 'Indian Ocean';
}

// Validate Indian waters coordinates
function isInIndianWaters(lat: number, lon: number): boolean {
  return lat >= 5 && lat <= 35 && lon >= 65 && lon <= 98;
}

// Generate a unique occurrence ID
function generateOccurrenceId(prefix: string): string {
  return `${prefix}-${Date.now()}-${uuidv4().slice(0, 8)}`;
}

export class BatchInsert {
  static async insertOceanData(records: any[], logger: ImportLogger, dryRun: boolean = false): Promise<number> {
    if (records.length === 0) return 0;

    const batchSize = parseInt(process.env.IMPORT_BATCH_SIZE || '100', 10);
    let inserted = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const values: any[] = [];
      let paramIndex = 1;
      let queryStr = `INSERT INTO ocean_data
        (location, latitude, longitude, temperature, salinity, ph, oxygen, depth, recorded_at, region)
        VALUES `;

      const valueClauses = batch.map((record) => {
        const clause = `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9})`;
        values.push(
          record.location,
          record.latitude,
          record.longitude,
          record.temperature,
          record.salinity || null,
          record.ph || null,
          record.oxygen || null,
          record.depth || null,
          record.recorded_at,
          record.region
        );
        paramIndex += 10;
        return clause;
      });

      queryStr += valueClauses.join(', ');

      if (!dryRun) {
        try {
          await query(queryStr, values);
          inserted += batch.length;
        } catch (error) {
          logger.logError(`Batch insert failed for ocean data (batch ${i / batchSize + 1})`);
          throw error;
        }
      } else {
        inserted += batch.length;
      }
    }

    return inserted;
  }

  static async insertFisheriesData(records: any[], logger: ImportLogger, dryRun: boolean = false): Promise<number> {
    if (records.length === 0) return 0;

    const batchSize = parseInt(process.env.IMPORT_BATCH_SIZE || '100', 10);
    let inserted = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const values: any[] = [];
      let paramIndex = 1;
      let queryStr = `INSERT INTO fisheries_data
        (species, common_name, abundance, biomass, location, latitude, longitude, region, recorded_at, diversity_index)
        VALUES `;

      const valueClauses = batch.map((record) => {
        const clause = `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9})`;
        values.push(
          record.species,
          record.common_name || null,
          record.abundance,
          record.biomass,
          record.location,
          record.latitude,
          record.longitude,
          record.region,
          record.recorded_at,
          record.diversity_index || null
        );
        paramIndex += 10;
        return clause;
      });

      queryStr += valueClauses.join(', ');

      if (!dryRun) {
        try {
          await query(queryStr, values);
          inserted += batch.length;
        } catch (error) {
          logger.logError(`Batch insert failed for fisheries data (batch ${i / batchSize + 1})`);
          throw error;
        }
      } else {
        inserted += batch.length;
      }
    }

    return inserted;
  }

  static async insertEdnaData(records: any[], logger: ImportLogger, dryRun: boolean = false): Promise<number> {
    if (records.length === 0) return 0;

    const batchSize = parseInt(process.env.IMPORT_BATCH_SIZE || '100', 10);
    let inserted = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const values: any[] = [];
      let paramIndex = 1;
      let queryStr = `INSERT INTO edna_data
        (species, concentration, depth, location, latitude, longitude, confidence, season, recorded_at, region)
        VALUES `;

      const valueClauses = batch.map((record) => {
        const clause = `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9})`;
        values.push(
          record.species,
          record.concentration,
          record.depth,
          record.location,
          record.latitude,
          record.longitude,
          record.confidence,
          record.season,
          record.recorded_at,
          record.region
        );
        paramIndex += 10;
        return clause;
      });

      queryStr += valueClauses.join(', ');

      if (!dryRun) {
        try {
          await query(queryStr, values);
          inserted += batch.length;
        } catch (error) {
          logger.logError(`Batch insert failed for eDNA data (batch ${i / batchSize + 1})`);
          throw error;
        }
      } else {
        inserted += batch.length;
      }
    }

    return inserted;
  }

  static async insertTaxonomy(records: any[], logger: ImportLogger, dryRun: boolean = false): Promise<number> {
    if (records.length === 0) return 0;

    const batchSize = parseInt(process.env.IMPORT_BATCH_SIZE || '100', 10);
    let inserted = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const values: any[] = [];
      let paramIndex = 1;
      let queryStr = `INSERT INTO taxonomy
        (kingdom, phylum, class, order_name, family, genus, species, common_name, description)
        VALUES `;

      const valueClauses = batch.map((record) => {
        const clause = `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8})`;
        values.push(
          record.kingdom,
          record.phylum,
          record.class,
          record.order_name,
          record.family,
          record.genus,
          record.species,
          record.common_name,
          record.description || null
        );
        paramIndex += 9;
        return clause;
      });

      queryStr += valueClauses.join(', ');
      queryStr += ` ON CONFLICT (species) DO NOTHING`;

      if (!dryRun) {
        try {
          await query(queryStr, values);
          inserted += batch.length;
        } catch (error) {
          logger.logError(`Batch insert failed for taxonomy (batch ${i / batchSize + 1})`);
          throw error;
        }
      } else {
        inserted += batch.length;
      }
    }

    return inserted;
  }

  // ============================================================================
  // DARWIN CORE STANDARDIZED INSERTS
  // ============================================================================

  /**
   * Insert ocean data into both legacy table AND Darwin Core occurrences + environmental_measurements
   */
  static async insertOceanDataWithDarwinCore(
    records: any[],
    logger: ImportLogger,
    dryRun: boolean = false,
    dataSource: string = 'upload'
  ): Promise<{ legacy: number; darwinCore: number }> {
    if (records.length === 0) return { legacy: 0, darwinCore: 0 };

    // Insert into legacy table first
    const legacyInserted = await this.insertOceanData(records, logger, dryRun);

    // Now insert into Darwin Core tables
    const batchSize = parseInt(process.env.IMPORT_BATCH_SIZE || '50', 10);
    let darwinCoreInserted = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      for (const record of batch) {
        const lat = parseFloat(record.latitude) || 0;
        const lon = parseFloat(record.longitude) || 0;

        // Skip invalid coordinates
        if (!isInIndianWaters(lat, lon)) continue;

        const occurrenceId = generateOccurrenceId('OCEAN');
        const region = record.region || classifyRegion(lat, lon);
        const eventDate = record.recorded_at ? new Date(record.recorded_at) : new Date();

        if (!dryRun) {
          try {
            // Insert into occurrences table
            await query(`
              INSERT INTO occurrences (
                occurrenceID, scientificName, eventDate, decimalLatitude, decimalLongitude,
                region, locality, waterBody, dataType, dataSource, basisOfRecord,
                samplingProtocol, stationId
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
              ON CONFLICT (occurrenceID) DO NOTHING
            `, [
              occurrenceId,
              'Environmental Measurement',
              eventDate,
              lat,
              lon,
              region,
              record.location || 'Unknown Station',
              region,
              'ocean',
              dataSource,
              'MachineObservation',
              'automated sensor',
              record.location
            ]);

            // Insert into environmental_measurements table
            await query(`
              INSERT INTO environmental_measurements (
                occurrenceID, temperature_celsius, salinity_psu, ph,
                dissolved_oxygen_mg_per_l, depth_metres
              ) VALUES ($1, $2, $3, $4, $5, $6)
            `, [
              occurrenceId,
              record.temperature || null,
              record.salinity || null,
              record.ph || null,
              record.oxygen || null,
              record.depth || null
            ]);

            darwinCoreInserted++;
          } catch (error: any) {
            logger.logError(`Darwin Core insert failed for ocean record: ${error.message}`);
          }
        } else {
          darwinCoreInserted++;
        }
      }
    }

    return { legacy: legacyInserted, darwinCore: darwinCoreInserted };
  }

  /**
   * Insert fisheries data into both legacy table AND Darwin Core occurrences + fisher_observations
   */
  static async insertFisheriesDataWithDarwinCore(
    records: any[],
    logger: ImportLogger,
    dryRun: boolean = false,
    dataSource: string = 'upload'
  ): Promise<{ legacy: number; darwinCore: number }> {
    if (records.length === 0) return { legacy: 0, darwinCore: 0 };

    // Insert into legacy table first
    const legacyInserted = await this.insertFisheriesData(records, logger, dryRun);

    // Now insert into Darwin Core tables
    const batchSize = parseInt(process.env.IMPORT_BATCH_SIZE || '50', 10);
    let darwinCoreInserted = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      for (const record of batch) {
        const lat = parseFloat(record.latitude) || 0;
        const lon = parseFloat(record.longitude) || 0;

        // Skip invalid coordinates
        if (!isInIndianWaters(lat, lon)) continue;

        const occurrenceId = generateOccurrenceId('FISH');
        const region = record.region || classifyRegion(lat, lon);
        const eventDate = record.recorded_at ? new Date(record.recorded_at) : new Date();

        if (!dryRun) {
          try {
            // Insert into occurrences table
            await query(`
              INSERT INTO occurrences (
                occurrenceID, scientificName, eventDate, decimalLatitude, decimalLongitude,
                region, locality, waterBody, dataType, dataSource, basisOfRecord,
                individualCount, samplingProtocol
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
              ON CONFLICT (occurrenceID) DO NOTHING
            `, [
              occurrenceId,
              record.species || 'Unknown Species',
              eventDate,
              lat,
              lon,
              region,
              record.location || 'Unknown Zone',
              region,
              'fisheries',
              dataSource,
              'HumanObservation',
              record.abundance || null,
              'fisheries survey'
            ]);

            // Insert into fisher_observations table
            await query(`
              INSERT INTO fisher_observations (
                occurrenceID, catch_weight_kg, catch_abundance,
                species_diversity_index, fishing_zone
              ) VALUES ($1, $2, $3, $4, $5)
            `, [
              occurrenceId,
              record.biomass || 0,
              record.abundance || null,
              record.diversity_index || null,
              record.location || 'Unknown'
            ]);

            darwinCoreInserted++;
          } catch (error: any) {
            logger.logError(`Darwin Core insert failed for fisheries record: ${error.message}`);
          }
        } else {
          darwinCoreInserted++;
        }
      }
    }

    return { legacy: legacyInserted, darwinCore: darwinCoreInserted };
  }

  /**
   * Insert eDNA data into both legacy table AND Darwin Core occurrences + edna_observations
   */
  static async insertEdnaDataWithDarwinCore(
    records: any[],
    logger: ImportLogger,
    dryRun: boolean = false,
    dataSource: string = 'upload'
  ): Promise<{ legacy: number; darwinCore: number }> {
    if (records.length === 0) return { legacy: 0, darwinCore: 0 };

    // Insert into legacy table first
    const legacyInserted = await this.insertEdnaData(records, logger, dryRun);

    // Now insert into Darwin Core tables
    const batchSize = parseInt(process.env.IMPORT_BATCH_SIZE || '50', 10);
    let darwinCoreInserted = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      for (const record of batch) {
        const lat = parseFloat(record.latitude) || 0;
        const lon = parseFloat(record.longitude) || 0;

        // Skip invalid coordinates
        if (!isInIndianWaters(lat, lon)) continue;

        const occurrenceId = generateOccurrenceId('EDNA');
        const region = record.region || classifyRegion(lat, lon);
        const eventDate = record.recorded_at ? new Date(record.recorded_at) : new Date();

        if (!dryRun) {
          try {
            // Insert into occurrences table
            await query(`
              INSERT INTO occurrences (
                occurrenceID, scientificName, eventDate, decimalLatitude, decimalLongitude,
                region, locality, waterBody, dataType, dataSource, basisOfRecord,
                samplingProtocol
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
              ON CONFLICT (occurrenceID) DO NOTHING
            `, [
              occurrenceId,
              record.species || 'Unknown Species',
              eventDate,
              lat,
              lon,
              region,
              record.location || 'Unknown Site',
              region,
              'edna',
              dataSource,
              'MaterialSample',
              'eDNA water sampling'
            ]);

            // Insert into edna_observations table
            await query(`
              INSERT INTO edna_observations (
                occurrenceID, edna_concentration_per_litre, detection_confidence,
                depth_metres, season
              ) VALUES ($1, $2, $3, $4, $5)
            `, [
              occurrenceId,
              record.concentration || null,
              record.confidence || 95,
              record.depth || null,
              record.season || 'Unknown'
            ]);

            darwinCoreInserted++;
          } catch (error: any) {
            logger.logError(`Darwin Core insert failed for eDNA record: ${error.message}`);
          }
        } else {
          darwinCoreInserted++;
        }
      }
    }

    return { legacy: legacyInserted, darwinCore: darwinCoreInserted };
  }
}
