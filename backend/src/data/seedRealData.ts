import { query } from '../db/connection.js';

/**
 * Seed real taxonomy and eDNA data into the database
 * Run after importing WoRMS/FAO/NOAA data
 */

const taxonomyData = [
  {
    kingdom: 'Animalia',
    phylum: 'Chordata',
    class: 'Actinopterygii',
    order_name: 'Clupeiformes',
    family: 'Clupeidae',
    genus: 'Sardinella',
    species: 'Sardinella longiceps',
    common_name: 'Indian Oil Sardine',
  },
  {
    kingdom: 'Animalia',
    phylum: 'Chordata',
    class: 'Actinopterygii',
    order_name: 'Perciformes',
    family: 'Scombridae',
    genus: 'Rastrelliger',
    species: 'Rastrelliger kanagurta',
    common_name: 'Indian Mackerel',
  },
  {
    kingdom: 'Animalia',
    phylum: 'Chordata',
    class: 'Actinopterygii',
    order_name: 'Perciformes',
    family: 'Scombridae',
    genus: 'Thunnus',
    species: 'Thunnus albacares',
    common_name: 'Yellowfin Tuna',
  },
  {
    kingdom: 'Animalia',
    phylum: 'Chordata',
    class: 'Actinopterygii',
    order_name: 'Perciformes',
    family: 'Scombridae',
    genus: 'Katsuwonus',
    species: 'Katsuwonus pelamis',
    common_name: 'Skipjack Tuna',
  },
  {
    kingdom: 'Animalia',
    phylum: 'Chordata',
    class: 'Actinopterygii',
    order_name: 'Perciformes',
    family: 'Scombridae',
    genus: 'Scomberomorus',
    species: 'Scomberomorus guttatus',
    common_name: 'Indo-Pacific King Mackerel',
  },
  {
    kingdom: 'Animalia',
    phylum: 'Arthropoda',
    class: 'Malacostraca',
    order_name: 'Decapoda',
    family: 'Penaeidae',
    genus: 'Penaeus',
    species: 'Penaeus monodon',
    common_name: 'Giant Tiger Prawn',
  },
  {
    kingdom: 'Animalia',
    phylum: 'Chordata',
    class: 'Actinopterygii',
    order_name: 'Percichthyiformes',
    family: 'Latidae',
    genus: 'Lates',
    species: 'Lates calcarifer',
    common_name: 'Barramundi',
  },
  {
    kingdom: 'Animalia',
    phylum: 'Chordata',
    class: 'Actinopterygii',
    order_name: 'Perciformes',
    family: 'Serranidae',
    genus: 'Epinephelus',
    species: 'Epinephelus malabaricus',
    common_name: 'Malabar Grouper',
  },
];

const ednaSampleData = [
  { species: 'Sardinella longiceps', location: 'Bay of Bengal - Zone 1', latitude: 12.5, longitude: 88.3, concentration: 45.2, confidence: 0.92, depth: 45, recorded_at: '2026-03-20', season: 'Spring' },
  { species: 'Rastrelliger kanagurta', location: 'Arabian Sea - Zone 1', latitude: 15.8, longitude: 72.5, concentration: 38.7, confidence: 0.88, depth: 35, recorded_at: '2026-03-20', season: 'Spring' },
  { species: 'Thunnus albacares', location: 'Bay of Bengal - Zone 3', latitude: 18.5, longitude: 89.2, concentration: 52.1, confidence: 0.95, depth: 65, recorded_at: '2026-03-19', season: 'Spring' },
  { species: 'Katsuwonus pelamis', location: 'Andaman Sea', latitude: 10.5, longitude: 94.5, concentration: 41.5, confidence: 0.87, depth: 28, recorded_at: '2026-03-19', season: 'Spring' },
  { species: 'Penaeus monodon', location: 'Lakshadweep Sea', latitude: 10.8, longitude: 72.5, concentration: 33.2, confidence: 0.85, depth: 25, recorded_at: '2026-03-18', season: 'Spring' },
  { species: 'Lates calcarifer', location: 'Andaman Sea', latitude: 9.8, longitude: 94.2, concentration: 29.8, confidence: 0.82, depth: 20, recorded_at: '2026-03-18', season: 'Spring' },
  { species: 'Epinephelus malabaricus', location: 'Arabian Sea - Zone 3', latitude: 17.5, longitude: 70.2, concentration: 35.6, confidence: 0.89, depth: 40, recorded_at: '2026-03-18', season: 'Spring' },
  { species: 'Sardinella longiceps', location: 'Bay of Bengal - Zone 2', latitude: 14.2, longitude: 86.5, concentration: 48.3, confidence: 0.91, depth: 40, recorded_at: '2026-03-17', season: 'Spring' },
  { species: 'Rastrelliger kanagurta', location: 'Bay of Bengal - Zone 1', latitude: 12.5, longitude: 88.3, concentration: 42.1, confidence: 0.90, depth: 45, recorded_at: '2026-03-17', season: 'Spring' },
  { species: 'Thunnus albacares', location: 'Arabian Sea - Zone 3', latitude: 17.5, longitude: 70.2, concentration: 55.2, confidence: 0.94, depth: 60, recorded_at: '2026-03-16', season: 'Spring' },
];

const correlationSampleData = [
  { species: 'Sardinella longiceps', temperature: 27.5, salinity: 35.2, ph: 8.15, oxygen: 6.8, abundance: 2500, recorded_at: '2026-03-20' },
  { species: 'Sardinella longiceps', temperature: 27.4, salinity: 35.1, ph: 8.14, oxygen: 6.9, abundance: 2600, recorded_at: '2026-03-19' },
  { species: 'Sardinella longiceps', temperature: 27.6, salinity: 35.2, ph: 8.16, oxygen: 6.7, abundance: 2400, recorded_at: '2026-03-18' },
  { species: 'Rastrelliger kanagurta', temperature: 28.1, salinity: 36.1, ph: 8.18, oxygen: 6.5, abundance: 2100, recorded_at: '2026-03-20' },
  { species: 'Rastrelliger kanagurta', temperature: 27.9, salinity: 36.0, ph: 8.17, oxygen: 6.6, abundance: 2050, recorded_at: '2026-03-19' },
  { species: 'Rastrelliger kanagurta', temperature: 28.0, salinity: 36.1, ph: 8.18, oxygen: 6.4, abundance: 2150, recorded_at: '2026-03-18' },
  { species: 'Thunnus albacares', temperature: 25.9, salinity: 34.8, ph: 8.10, oxygen: 7.5, abundance: 450, recorded_at: '2026-03-20' },
  { species: 'Thunnus albacares', temperature: 26.0, salinity: 34.9, ph: 8.11, oxygen: 7.4, abundance: 460, recorded_at: '2026-03-19' },
  { species: 'Thunnus albacares', temperature: 25.8, salinity: 34.7, ph: 8.09, oxygen: 7.6, abundance: 440, recorded_at: '2026-03-18' },
  { species: 'Katsuwonus pelamis', temperature: 29.2, salinity: 33.5, ph: 8.22, oxygen: 5.8, abundance: 650, recorded_at: '2026-03-20' },
  { species: 'Katsuwonus pelamis', temperature: 29.1, salinity: 33.4, ph: 8.21, oxygen: 5.9, abundance: 660, recorded_at: '2026-03-19' },
  { species: 'Katsuwonus pelamis', temperature: 29.3, salinity: 33.6, ph: 8.23, oxygen: 5.7, abundance: 640, recorded_at: '2026-03-18' },
];

async function seedData() {
  try {
    console.log('🌊 Seeding Real Taxonomy and eDNA Data...\n');

    // Insert taxonomy
    console.log('📚 Inserting taxonomy records...');
    for (const tax of taxonomyData) {
      await query(
        `INSERT INTO taxonomy (kingdom, phylum, class, order_name, family, genus, species, common_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (species) DO NOTHING`,
        [tax.kingdom, tax.phylum, tax.class, tax.order_name, tax.family, tax.genus, tax.species, tax.common_name]
      );
    }
    console.log(`✅ Inserted ${taxonomyData.length} taxonomy records\n`);

    // Insert eDNA data
    console.log('🧬 Inserting eDNA data...');
    let inserted = 0;
    for (const edna of ednaSampleData) {
      const result = await query(
        `INSERT INTO edna_data (species, location, latitude, longitude, concentration, confidence, depth, recorded_at, season)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [edna.species, edna.location, edna.latitude, edna.longitude, edna.concentration, edna.confidence, edna.depth, edna.recorded_at, edna.season]
      );
      if (result.rowCount && result.rowCount > 0) inserted++;
    }
    console.log(`✅ Inserted ${inserted} eDNA records\n`);

    // Insert correlation data
    console.log('📊 Inserting correlation data...');
    let corrInserted = 0;
    for (const corr of correlationSampleData) {
      const result = await query(
        `INSERT INTO correlations (species, temperature, salinity, ph, oxygen, abundance, recorded_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [corr.species, corr.temperature, corr.salinity, corr.ph, corr.oxygen, corr.abundance, corr.recorded_at]
      );
      if (result.rowCount && result.rowCount > 0) corrInserted++;
    }
    console.log(`✅ Inserted ${corrInserted} correlation records\n`);

    // Verify
    const taxCount = await query('SELECT COUNT(*) FROM taxonomy');
    const ednaCount = await query('SELECT COUNT(*) FROM edna_data');
    const corrCount = await query('SELECT COUNT(*) FROM correlations');

    console.log('📊 Final Counts:');
    console.log(`   Taxonomy: ${taxCount.rows[0].count}`);
    console.log(`   eDNA: ${ednaCount.rows[0].count}`);
    console.log(`   Correlations: ${corrCount.rows[0].count}\n`);
    console.log('✨ Seeding complete!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

seedData();
