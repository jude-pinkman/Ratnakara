import { query } from '../db/connection.js';

const regions = ['Bay of Bengal', 'Arabian Sea', 'Indian Ocean', 'Andaman Sea', 'Lakshadweep Sea'];
const seasons = ['Winter', 'Spring', 'Summer', 'Monsoon'];

const species = [
  { name: 'Sardinella longiceps', common: 'Indian Oil Sardine' },
  { name: 'Rastrelliger kanagurta', common: 'Indian Mackerel' },
  { name: 'Thunnus albacares', common: 'Yellowfin Tuna' },
  { name: 'Katsuwonus pelamis', common: 'Skipjack Tuna' },
  { name: 'Scomberomorus guttatus', common: 'Indo-Pacific King Mackerel' },
  { name: 'Penaeus monodon', common: 'Giant Tiger Prawn' },
  { name: 'Metapenaeus dobsoni', common: 'Kadal Shrimp' },
  { name: 'Lates calcarifer', common: 'Barramundi' },
  { name: 'Epinephelus malabaricus', common: 'Malabar Grouper' },
  { name: 'Lutjanus argentimaculatus', common: 'Mangrove Red Snapper' },
  { name: 'Sillago sihama', common: 'Silver Sillago' },
  { name: 'Tachysurus thalassinus', common: 'Giant Catfish' },
  { name: 'Scylla serrata', common: 'Mud Crab' },
  { name: 'Portunus pelagicus', common: 'Blue Swimming Crab' },
  { name: 'Sepia pharaonis', common: 'Pharaoh Cuttlefish' }
];

const taxonomy = [
  { kingdom: 'Animalia', phylum: 'Chordata', class: 'Actinopterygii', order: 'Clupeiformes', family: 'Clupeidae', genus: 'Sardinella', species: 'Sardinella longiceps', common: 'Indian Oil Sardine' },
  { kingdom: 'Animalia', phylum: 'Chordata', class: 'Actinopterygii', order: 'Perciformes', family: 'Scombridae', genus: 'Rastrelliger', species: 'Rastrelliger kanagurta', common: 'Indian Mackerel' },
  { kingdom: 'Animalia', phylum: 'Chordata', class: 'Actinopterygii', order: 'Perciformes', family: 'Scombridae', genus: 'Thunnus', species: 'Thunnus albacares', common: 'Yellowfin Tuna' },
  { kingdom: 'Animalia', phylum: 'Chordata', class: 'Actinopterygii', order: 'Perciformes', family: 'Scombridae', genus: 'Katsuwonus', species: 'Katsuwonus pelamis', common: 'Skipjack Tuna' },
  { kingdom: 'Animalia', phylum: 'Chordata', class: 'Actinopterygii', order: 'Perciformes', family: 'Scombridae', genus: 'Scomberomorus', species: 'Scomberomorus guttatus', common: 'Indo-Pacific King Mackerel' },
  { kingdom: 'Animalia', phylum: 'Arthropoda', class: 'Malacostraca', order: 'Decapoda', family: 'Penaeidae', genus: 'Penaeus', species: 'Penaeus monodon', common: 'Giant Tiger Prawn' },
  { kingdom: 'Animalia', phylum: 'Arthropoda', class: 'Malacostraca', order: 'Decapoda', family: 'Penaeidae', genus: 'Metapenaeus', species: 'Metapenaeus dobsoni', common: 'Kadal Shrimp' },
  { kingdom: 'Animalia', phylum: 'Chordata', class: 'Actinopterygii', order: 'Perciformes', family: 'Latidae', genus: 'Lates', species: 'Lates calcarifer', common: 'Barramundi' },
  { kingdom: 'Animalia', phylum: 'Chordata', class: 'Actinopterygii', order: 'Perciformes', family: 'Serranidae', genus: 'Epinephelus', species: 'Epinephelus malabaricus', common: 'Malabar Grouper' },
  { kingdom: 'Animalia', phylum: 'Chordata', class: 'Actinopterygii', order: 'Perciformes', family: 'Lutjanidae', genus: 'Lutjanus', species: 'Lutjanus argentimaculatus', common: 'Mangrove Red Snapper' },
  { kingdom: 'Animalia', phylum: 'Chordata', class: 'Actinopterygii', order: 'Perciformes', family: 'Sillaginidae', genus: 'Sillago', species: 'Sillago sihama', common: 'Silver Sillago' },
  { kingdom: 'Animalia', phylum: 'Chordata', class: 'Actinopterygii', order: 'Siluriformes', family: 'Ariidae', genus: 'Tachysurus', species: 'Tachysurus thalassinus', common: 'Giant Catfish' },
  { kingdom: 'Animalia', phylum: 'Arthropoda', class: 'Malacostraca', order: 'Decapoda', family: 'Portunidae', genus: 'Scylla', species: 'Scylla serrata', common: 'Mud Crab' },
  { kingdom: 'Animalia', phylum: 'Arthropoda', class: 'Malacostraca', order: 'Decapoda', family: 'Portunidae', genus: 'Portunus', species: 'Portunus pelagicus', common: 'Blue Swimming Crab' },
  { kingdom: 'Animalia', phylum: 'Mollusca', class: 'Cephalopoda', order: 'Sepiida', family: 'Sepiidae', genus: 'Sepia', species: 'Sepia pharaonis', common: 'Pharaoh Cuttlefish' }
];

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomInRange(min, max));
}

function generateLatLng(region: string): { lat: number, lng: number } {
  const bounds: Record<string, any> = {
    'Bay of Bengal': { latMin: 8, latMax: 22, lngMin: 80, lngMax: 92 },
    'Arabian Sea': { latMin: 8, latMax: 24, lngMin: 68, lngMax: 78 },
    'Indian Ocean': { latMin: -10, latMax: 10, lngMin: 65, lngMax: 95 },
    'Andaman Sea': { latMin: 4, latMax: 14, lngMin: 92, lngMax: 99 },
    'Lakshadweep Sea': { latMin: 8, latMax: 14, lngMin: 71, lngMax: 74 }
  };

  const b = bounds[region] || bounds['Indian Ocean'];
  return {
    lat: randomInRange(b.latMin, b.latMax),
    lng: randomInRange(b.lngMin, b.lngMax)
  };
}

async function seedOceanData() {
  console.log('Seeding ocean data...');

  const locations = 180;
  const recordsPerLocation = 12;

  for (let i = 0; i < locations; i++) {
    const region = regions[randomInt(0, regions.length)];
    const { lat, lng } = generateLatLng(region);
    const location = `Station-${i + 1}`;

    for (let m = 0; m < recordsPerLocation; m++) {
      const date = new Date();
      date.setMonth(date.getMonth() - m);

      const temp = randomInRange(24, 32);
      const salinity = randomInRange(32, 37);
      const ph = randomInRange(7.8, 8.3);
      const oxygen = randomInRange(4.5, 8.5);
      const depth = randomInt(10, 500);

      await query(
        `INSERT INTO ocean_data (location, latitude, longitude, temperature, salinity, ph, oxygen, depth, recorded_at, region)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [location, lat, lng, temp, salinity, ph, oxygen, depth, date, region]
      );
    }
  }

  console.log('Ocean data seeded');
}

async function seedFisheriesData() {
  console.log('Seeding fisheries data...');

  const locations = 150;
  const recordsPerLocation = 10;

  for (let i = 0; i < locations; i++) {
    const region = regions[randomInt(0, regions.length)];
    const { lat, lng } = generateLatLng(region);
    const location = `Fishing-Zone-${i + 1}`;

    for (let m = 0; m < recordsPerLocation; m++) {
      const date = new Date();
      date.setMonth(date.getMonth() - m);

      const sp = species[randomInt(0, species.length)];
      const abundance = randomInt(100, 10000);
      const biomass = randomInRange(50, 5000);
      const diversity = randomInRange(0.5, 0.95);

      await query(
        `INSERT INTO fisheries_data (species, common_name, abundance, biomass, location, latitude, longitude, region, recorded_at, diversity_index)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [sp.name, sp.common, abundance, biomass, location, lat, lng, region, date, diversity]
      );
    }
  }

  console.log('Fisheries data seeded');
}

async function seedEdnaData() {
  console.log('Seeding eDNA data...');

  const locations = 120;
  const recordsPerLocation = 8;

  for (let i = 0; i < locations; i++) {
    const region = regions[randomInt(0, regions.length)];
    const { lat, lng } = generateLatLng(region);
    const location = `eDNA-Site-${i + 1}`;

    for (let m = 0; m < recordsPerLocation; m++) {
      const date = new Date();
      date.setMonth(date.getMonth() - m);

      const sp = species[randomInt(0, species.length)];
      const concentration = randomInRange(0.1, 100);
      const depth = randomInt(5, 300);
      const confidence = randomInRange(50, 99);
      const season = seasons[Math.floor(date.getMonth() / 3)];

      await query(
        `INSERT INTO edna_data (species, concentration, depth, location, latitude, longitude, confidence, season, recorded_at, region)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [sp.name, concentration, depth, location, lat, lng, confidence, season, date, region]
      );
    }
  }

  console.log('eDNA data seeded');
}

async function seedTaxonomy() {
  console.log('Seeding taxonomy...');

  for (const t of taxonomy) {
    await query(
      `INSERT INTO taxonomy (kingdom, phylum, class, order_name, family, genus, species, common_name, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (species) DO NOTHING`,
      [t.kingdom, t.phylum, t.class, t.order, t.family, t.genus, t.species, t.common, `${t.common} is a marine species found in Indian waters.`]
    );
  }

  console.log('Taxonomy seeded');
}

async function seedCorrelations() {
  console.log('Seeding correlations...');

  for (const sp of species) {
    for (let i = 0; i < 50; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i * 7);

      const temp = randomInRange(24, 32);
      const salinity = randomInRange(32, 37);
      const ph = randomInRange(7.8, 8.3);
      const oxygen = randomInRange(4.5, 8.5);

      const tempFactor = 1 - Math.abs(temp - 28) / 10;
      const abundance = Math.floor(randomInRange(500, 5000) * tempFactor);
      const correlation = randomInRange(-0.8, 0.8);

      await query(
        `INSERT INTO correlations (species, temperature, salinity, ph, oxygen, abundance, correlation_coefficient, recorded_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [sp.name, temp, salinity, ph, oxygen, abundance, correlation, date]
      );
    }
  }

  console.log('Correlations seeded');
}

async function seedForecasts() {
  console.log('Seeding forecasts...');

  for (const sp of species.slice(0, 5)) {
    for (let i = 1; i <= 6; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i);

      const predicted = randomInt(1000, 8000);
      const ciLow = Math.floor(predicted * 0.85);
      const ciHigh = Math.floor(predicted * 1.15);

      await query(
        `INSERT INTO forecasts (species, forecast_date, predicted_abundance, confidence_interval_low, confidence_interval_high, model_version)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [sp.name, date, predicted, ciLow, ciHigh, 'lstm-v1']
      );
    }
  }

  console.log('Forecasts seeded');
}

async function seed() {
  try {
    await seedTaxonomy();
    await seedOceanData();
    await seedFisheriesData();
    await seedEdnaData();
    await seedCorrelations();
    await seedForecasts();

    console.log('All data seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
}

seed();
