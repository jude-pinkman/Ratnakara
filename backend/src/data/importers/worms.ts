import { query } from '../../db/connection.js';
import { ImportLogger } from '../utils/logger.js';
import { BatchInsert } from '../utils/batchInsert.js';
import { DataTransformer } from '../utils/dataTransformer.js';
import { DataValidator } from '../utils/validator.js';

// Species to import with their common names
const SPECIES_LIST = [
  { scientific: 'Sardinella longiceps', common: 'Indian Oil Sardine' },
  { scientific: 'Rastrelliger kanagurta', common: 'Indian Mackerel' },
  { scientific: 'Thunnus albacares', common: 'Yellowfin Tuna' },
  { scientific: 'Katsuwonus pelamis', common: 'Skipjack Tuna' },
  { scientific: 'Scomberomorus guttatus', common: 'Indo-Pacific King Mackerel' },
  { scientific: 'Penaeus monodon', common: 'Giant Tiger Prawn' },
  { scientific: 'Metapenaeus dobsoni', common: 'Kadal Shrimp' },
  { scientific: 'Lates calcarifer', common: 'Barramundi' },
  { scientific: 'Epinephelus malabaricus', common: 'Malabar Grouper' },
  { scientific: 'Lutjanus argentimaculatus', common: 'Mangrove Red Snapper' },
  { scientific: 'Sillago sihama', common: 'Silver Sillago' },
  { scientific: 'Tachysurus thalassinus', common: 'Giant Catfish' },
  { scientific: 'Scylla serrata', common: 'Mud Crab' },
  { scientific: 'Portunus pelagicus', common: 'Blue Swimming Crab' },
  { scientific: 'Sepia pharaonis', common: 'Pharaoh Cuttlefish' },
];

const WORMS_API_BASE = process.env.WORMS_API_BASE || 'https://www.marinespecies.org/rest';

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWormsData(scientificName: string, retries: number = 3): Promise<any | null> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const url = `${WORMS_API_BASE}/AphiaNameByName/${encodeURIComponent(scientificName)}`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'RatnakaraImporter/1.0' },
      });

      if (response.status === 404) {
        return null; // Species not found
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (attempt === retries - 1) {
        throw error;
      }
      // Exponential backoff
      await sleep(Math.pow(2, attempt) * 1000);
    }
  }
  return null;
}

export async function importWormsData(dryRun: boolean = false): Promise<any> {
  const logger = new ImportLogger('WoRMS Taxonomy');
  logger.start('Importing taxonomy from World Register of Marine Species...');

  const recordsToInsert: any[] = [];
  let failedSpecies: string[] = [];

  // Fetch data from WoRMS API
  for (const species of SPECIES_LIST) {
    logger.record('inserted'); // Count processing

    try {
      const wormsData = await fetchWormsData(species.scientific);

      if (!wormsData) {
        logger.logWarning(`Species not found in WoRMS: ${species.scientific}`);
        logger.record('skipped');
        failedSpecies.push(species.scientific);
        continue;
      }

      const record = DataTransformer.transformWormsTaxonomy(wormsData, species.common);

      if (!record) {
        logger.logWarning(`Failed to transform WoRMS data for ${species.scientific}`);
        logger.record('skipped');
        continue;
      }

      recordsToInsert.push(record);
      logger.logInfo(`✓ ${record.common_name} (${record.species})`);

      // Rate limiting (100ms between requests to respect API)
      await sleep(100);
    } catch (error: any) {
      logger.logError(`Failed to fetch ${species.scientific}`, error);
      logger.record('errored');
      failedSpecies.push(species.scientific);
    }
  }

  // Batch insert all records
  try {
    if (recordsToInsert.length > 0) {
      logger.logInfo(`\nBatch inserting ${recordsToInsert.length} taxonomy records...`);

      if (!dryRun) {
        const inserted = await BatchInsert.insertTaxonomy(recordsToInsert, logger, false);
        logger.logInfo(`Successfully inserted ${inserted} taxonomy records`);
      } else {
        logger.logInfo(`[DRY RUN] Would insert ${recordsToInsert.length} taxonomy records`);
      }
    }
  } catch (error: any) {
    logger.logError('Failed to insert taxonomy records', error);
    throw error;
  }

  if (failedSpecies.length > 0) {
    logger.logWarning(`${failedSpecies.length} species failed to import: ${failedSpecies.join(', ')}`);
  }

  return logger.complete();
}

export default importWormsData;
