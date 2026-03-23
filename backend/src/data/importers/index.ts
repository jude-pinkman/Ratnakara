import { query } from '../../db/connection.js';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import importWormsData from './worms.js';
import importFAOData from './fao.js';
import importNOAAData from './noaa.js';
import { DnaSequenceImporter } from './dna-sequences.js';
import { JsonImporter } from './json.js';
import { OtolithImporter } from './otolith.js';
import { ImportLogger } from '../utils/logger.js';
import { ImportOptions } from './types.js';

// ============================================================================
// UNIFIED DATA IMPORT CLI
// Supports: worms, fao, noaa, json, dna, otolith
// ============================================================================

// Available importers
const AVAILABLE_IMPORTERS = [
  'worms',     // Taxonomy from WoRMS API
  'fao',       // Fisheries data from FAO CSV
  'noaa',      // Ocean data from NOAA CSV
  'json',      // Darwin Core JSON records
  'dna',       // DNA sequences from FASTA files
  'otolith',   // Otolith biogeochemistry from CSV
];

// Parse command line arguments
function parseArgs(): ImportOptions & { filePath?: string } {
  const args = process.argv.slice(2);
  const options: ImportOptions & { filePath?: string } = {
    reset: false,
    dryRun: false,
    verbose: false,
    batchSize: 1000,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--reset') {
      options.reset = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg === '--importers' && args[i + 1]) {
      options.importers = args[i + 1].split(',').map((s) => s.trim());
      i++;
    } else if (arg === '--batch-size' && args[i + 1]) {
      options.batchSize = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === '--file' && args[i + 1]) {
      options.filePath = args[i + 1];
      i++;
    }
  }

  return options;
}

// Clear data from tables
async function resetDatabase(): Promise<void> {
  console.log('\n🔄 Resetting database tables...');
  try {
    // Reset legacy tables
    await query('TRUNCATE TABLE forecasts CASCADE');
    await query('TRUNCATE TABLE correlations CASCADE');
    await query('TRUNCATE TABLE edna_data CASCADE');
    await query('TRUNCATE TABLE fisheries_data CASCADE');
    await query('TRUNCATE TABLE ocean_data CASCADE');
    await query('TRUNCATE TABLE taxonomy CASCADE');

    // Reset Darwin Core tables (if they exist)
    try {
      await query('TRUNCATE TABLE anomalies CASCADE');
      await query('TRUNCATE TABLE fisher_observations CASCADE');
      await query('TRUNCATE TABLE edna_observations CASCADE');
      await query('TRUNCATE TABLE dna_sequences CASCADE');
      await query('TRUNCATE TABLE otolith_records CASCADE');
      await query('TRUNCATE TABLE environmental_measurements CASCADE');
      await query('TRUNCATE TABLE occurrences CASCADE');
    } catch (e) {
      // Darwin Core tables may not exist yet
      console.log('   (Note: Some Darwin Core tables may not exist yet)');
    }

    console.log('✅ Database tables cleared');
  } catch (error: any) {
    console.error('❌ Failed to reset database:', error.message);
    throw error;
  }
}

// Import DNA sequences from FASTA file
async function importDnaSequences(filePath: string, dryRun: boolean): Promise<any> {
  const logger = new ImportLogger('dna');

  const defaultPath = 'data/samples/dna_sequences.fasta';
  const fileToRead = filePath || defaultPath;

  try {
    const fastaContent = readFileSync(fileToRead, 'utf-8');
    const inserted = await DnaSequenceImporter.importFastaBatch(fastaContent, logger, dryRun);
    return {
      processed: inserted,
      inserted: dryRun ? 0 : inserted,
      skipped: 0,
      errored: 0,
    };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log(`   ⚠️  File not found: ${fileToRead}`);
      console.log(`   ℹ️  Create a FASTA file or use --file to specify path`);
      return { processed: 0, inserted: 0, skipped: 0, errored: 0 };
    }
    throw error;
  }
}

// Import JSON records
async function importJsonRecords(filePath: string, dryRun: boolean): Promise<any> {
  const logger = new ImportLogger('json');

  const defaultPath = 'data/samples/darwin_core.json';
  const fileToRead = filePath || defaultPath;

  try {
    const jsonContent = readFileSync(fileToRead, 'utf-8');
    const inserted = await JsonImporter.importJsonRecords(jsonContent, logger, dryRun);
    return {
      processed: inserted,
      inserted: dryRun ? 0 : inserted,
      skipped: 0,
      errored: 0,
    };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log(`   ⚠️  File not found: ${fileToRead}`);
      console.log(`   ℹ️  Create a Darwin Core JSON file or use --file to specify path`);
      return { processed: 0, inserted: 0, skipped: 0, errored: 0 };
    }
    throw error;
  }
}

// Import otolith data from CSV
async function importOtolithData(filePath: string, dryRun: boolean): Promise<any> {
  const logger = new ImportLogger('otolith');

  const defaultPath = 'data/samples/otolith_data.csv';
  const fileToRead = filePath || defaultPath;

  try {
    const csvContent = readFileSync(fileToRead, 'utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const inserted = await OtolithImporter.importOtolithRecords(records, logger, dryRun);
    return {
      processed: records.length,
      inserted: dryRun ? 0 : inserted,
      skipped: records.length - inserted,
      errored: 0,
    };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log(`   ⚠️  File not found: ${fileToRead}`);
      console.log(`   ℹ️  Create an otolith CSV file or use --file to specify path`);
      return { processed: 0, inserted: 0, skipped: 0, errored: 0 };
    }
    throw error;
  }
}

// Run selected importers
async function runImporters(importerNames: string[], options: ImportOptions & { filePath?: string }): Promise<void> {
  console.log(`\n📦 Running ${importerNames.length} importer(s)...\n`);
  console.log(`   Mode: ${options.dryRun ? '🔒 DRY RUN' : '💾 LIVE INSERT'}`);
  console.log(`   Batch size: ${options.batchSize}`);
  if (options.filePath) {
    console.log(`   File: ${options.filePath}`);
  }
  console.log('');

  const startTime = Date.now();
  const results: any[] = [];

  for (const importerName of importerNames) {
    try {
      let result;

      switch (importerName.toLowerCase()) {
        case 'worms':
        case 'taxonomy':
          console.log('🔬 Importing taxonomy from WoRMS API...');
          result = await importWormsData(options.dryRun);
          results.push({ importer: 'WoRMS (Taxonomy)', result });
          break;

        case 'fao':
        case 'fisheries':
          console.log('🐟 Importing fisheries data from FAO...');
          result = await importFAOData(options.filePath || '', options.dryRun);
          results.push({ importer: 'FAO (Fisheries)', result });
          break;

        case 'noaa':
        case 'ocean':
          console.log('🌊 Importing ocean data from NOAA...');
          result = await importNOAAData(options.filePath || '', options.dryRun);
          results.push({ importer: 'NOAA (Ocean)', result });
          break;

        case 'json':
        case 'darwin':
        case 'darwincore':
          console.log('📋 Importing Darwin Core JSON records...');
          result = await importJsonRecords(options.filePath || '', options.dryRun || false);
          results.push({ importer: 'JSON (Darwin Core)', result });
          break;

        case 'dna':
        case 'fasta':
        case 'sequences':
          console.log('🧬 Importing DNA sequences from FASTA...');
          result = await importDnaSequences(options.filePath || '', options.dryRun || false);
          results.push({ importer: 'DNA Sequences', result });
          break;

        case 'otolith':
        case 'biogeochem':
          console.log('🦴 Importing otolith biogeochemistry data...');
          result = await importOtolithData(options.filePath || '', options.dryRun || false);
          results.push({ importer: 'Otolith', result });
          break;

        default:
          console.warn(`⚠️  Unknown importer: ${importerName}`);
          console.log(`   Available: ${AVAILABLE_IMPORTERS.join(', ')}`);
      }
    } catch (error: any) {
      console.error(`\n❌ Error in ${importerName} importer:`, error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(60));

  let totalProcessed = 0;
  let totalInserted = 0;
  let totalSkipped = 0;
  let totalErrored = 0;

  for (const { importer, result } of results) {
    console.log(`\n${importer}:`);
    console.log(`  Processed: ${result.processed}`);
    console.log(`  Inserted:  ${result.inserted}`);
    console.log(`  Skipped:   ${result.skipped}`);
    console.log(`  Errored:   ${result.errored}`);
    totalProcessed += result.processed;
    totalInserted += result.inserted;
    totalSkipped += result.skipped;
    totalErrored += result.errored;
  }

  console.log('\n' + '-'.repeat(60));
  console.log(`Total: ${totalProcessed} processed | ${totalInserted} inserted | ${totalSkipped} skipped | ${totalErrored} errored`);
  console.log(`Duration: ${totalTime}s`);

  if (options.dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No data was actually inserted');
  }

  console.log('='.repeat(60) + '\n');
}

// Main execution
async function main(): Promise<void> {
  const options = parseArgs();

  // Set environment variables for child processes
  if (options.verbose) {
    process.env.VERBOSE = 'true';
  }
  if (options.batchSize) {
    process.env.IMPORT_BATCH_SIZE = String(options.batchSize);
  }

  console.log('\n🌊 Ratnakara Marine Data Platform - Unified Data Importer');
  console.log('=' .repeat(60));

  try {
    // Test database connection
    console.log('\n📡 Testing database connection...');
    await query('SELECT 1');
    console.log('✅ Database connection successful\n');

    // Reset if requested
    if (options.reset) {
      await resetDatabase();
    }

    // Determine which importers to run
    let importersToRun = options.importers || ['worms', 'fao', 'noaa'];

    // Run importers
    await runImporters(importersToRun, options);

    console.log('✨ Data import complete!');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    console.error(
      '\nFor more details, run with --verbose flag or check database logs.'
    );
    process.exit(1);
  }
}

// Usage help
function showHelp() {
  console.log(`
🌊 Ratnakara Unified Data Importer

Usage:
  npm run import:all [options]
  npx ts-node src/data/importers/index.ts [options]

Available Importers:
  worms, taxonomy      WoRMS API → taxonomy table
  fao, fisheries       FAO CSV → fisheries_data + occurrences
  noaa, ocean          NOAA CSV → ocean_data + occurrences
  json, darwin         Darwin Core JSON → occurrences + measurements
  dna, fasta           FASTA file → dna_sequences
  otolith, biogeochem  CSV → otolith_records

Options:
  --reset              Clear all data tables before importing
  --dry-run            Validate data without inserting (safe preview)
  --verbose            Show detailed error messages and stack traces
  --importers LIST     Comma-separated importers (default: worms,fao,noaa)
  --batch-size NUM     Records per batch (default: 1000)
  --file PATH          Specify input file for data importers
  --help               Show this help message

Examples:
  # Import all default data sources
  npm run import:all

  # Clear DB and re-import everything
  npm run import:all --reset

  # Import only taxonomy and fisheries
  npm run import:all --importers worms,fao

  # Import DNA sequences from custom file
  npm run import:all --importers dna --file data/my_sequences.fasta

  # Import Darwin Core JSON
  npm run import:all --importers json --file data/gbif_export.json

  # Import all data types including new importers
  npm run import:all --importers worms,fao,noaa,json,dna,otolith

  # Dry run to validate without inserting
  npm run import:all --dry-run --verbose

Data File Formats:
  FAO/Fisheries:  CSV with columns: species,latitude,longitude,abundance,biomass...
  NOAA/Ocean:     CSV with columns: latitude,longitude,temperature,salinity,ph,oxygen...
  Darwin Core:    JSON array with fields: scientificName,eventDate,decimalLatitude...
  DNA Sequences:  FASTA format with header metadata
  Otolith:        CSV with columns: occurrenceID,age_years,sr_ca_ratio,delta_18_o...

Sample Files:
  data/samples/fao_sample.csv
  data/samples/noaa_sample.csv
  data/samples/darwin_core.json (create this)
  data/samples/dna_sequences.fasta (create this)
  data/samples/otolith_data.csv (create this)
  `);
}

// Check for help flag
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp();
  process.exit(0);
}

main();
