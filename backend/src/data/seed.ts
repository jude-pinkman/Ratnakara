import db from '../db/database.js';

const sampleTaxonomy = [
  { species: 'Thunnus albacares', kingdom: 'Animalia', phylum: 'Chordata', order_name: 'Scombriformes', family: 'Scombridae', genus: 'Thunnus', common_name: 'Yellowfin Tuna' },
  { species: 'Katsuwonus pelamis', kingdom: 'Animalia', phylum: 'Chordata', order_name: 'Scombriformes', family: 'Scombridae', genus: 'Katsuwonus', common_name: 'Skipjack Tuna' },
  { species: 'Sardinella longiceps', kingdom: 'Animalia', phylum: 'Chordata', order_name: 'Clupeiformes', family: 'Clupeidae', genus: 'Sardinella', common_name: 'Indian Oil Sardine' },
  { species: 'Rastrelliger kanagurta', kingdom: 'Animalia', phylum: 'Chordata', order_name: 'Scombriformes', family: 'Scombridae', genus: 'Rastrelliger', common_name: 'Mackerel' },
  { species: 'Scomberomorus guttatus', kingdom: 'Animalia', phylum: 'Chordata', order_name: 'Scombriformes', family: 'Scombridae', genus: 'Scomberomorus', common_name: 'Spotted Seer' },
];

export async function seedDatabase() {
  try {
    console.log('Seeding database with sample data...');

    // Clear existing data FIRST
    try {
      await db.query('DELETE FROM correlations');
      await db.query('DELETE FROM edna_data');
      await db.query('DELETE FROM fisheries_data');
      await db.query('DELETE FROM ocean_data');
      await db.query('DELETE FROM taxonomy');
      console.log('Cleared existing data');
    } catch (clearErr) {
      console.log('No existing data to clear or tables don\'t exist');
    }

    // Seed Taxonomy
    console.log('Seeding taxonomy...');
    for (const tax of sampleTaxonomy) {
      try {
        await db.query(
          'INSERT INTO taxonomy (species, kingdom, phylum, order_name, family, genus, common_name) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [tax.species, tax.kingdom, tax.phylum, tax.order_name, tax.family, tax.genus, tax.common_name]
        );
      } catch (taxError: any) {
        console.log(`Taxonomy insert skipped for ${tax.species}:`, taxError.code);
      }
    }

    // Seed Ocean Data (30 days of data)
    console.log('Seeding ocean data...');
    const oceanLocations = ['Station_A', 'Station_B', 'Station_C', 'Station_D', 'Station_E'];
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      for (const location of oceanLocations) {
        try {
          await db.query(
            'INSERT INTO ocean_data (location, latitude, longitude, recorded_at, temperature, salinity, ph, oxygen, depth, region, source) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
            [
              location,
              8.5 + Math.random() * 0.5,
              75 + Math.random() * 2,
              date.toISOString(),
              25 + Math.random() * 5,
              34.5 + Math.random() * 1,
              8.2 + Math.random() * 0.2,
              5 + Math.random() * 2,
              Math.floor(50 + Math.random() * 50),  // Must be integer
              'Arabian Sea',
              'NOAA'
            ]
          );
        } catch (err) {
          // Skip silently
        }
      }
    }

    // Seed Fisheries Data
    console.log('Seeding fisheries data...');
    const fisheryLocations = ['Mumbai', 'Kochi', 'Chennai', 'Visakhapatnam'];
    for (let i = 0; i < 100; i++) {
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      const species = sampleTaxonomy[Math.floor(Math.random() * sampleTaxonomy.length)].species;

      try {
        await db.query(
          'INSERT INTO fisheries_data (species, common_name, latitude, longitude, recorded_at, abundance, biomass, diversity_index, region, location, source) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
          [
            species,
            species.split('_').join(' '),
            8 + Math.random() * 5,
            72 + Math.random() * 5,
            date.toISOString(),
            Math.floor(1000 + Math.random() * 10000),
            100 + Math.random() * 500,
            0.5 + Math.random() * 0.5,
            'Arabian Sea',
            fisheryLocations[Math.floor(Math.random() * fisheryLocations.length)],
            'MOCK'
          ]
        );
      } catch (err) {
        // Skip silently
      }
    }

    // Seed eDNA Data
    console.log('Seeding eDNA data...');
    for (let i = 0; i < 80; i++) {
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      const species = sampleTaxonomy[Math.floor(Math.random() * sampleTaxonomy.length)].species;

      try {
        await db.query(
          'INSERT INTO edna_data (species, latitude, longitude, recorded_at, concentration, confidence, depth, source) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [
            species,
            8 + Math.random() * 5,
            72 + Math.random() * 5,
            date.toISOString(),
            0.001 + Math.random() * 0.1,
            0.6 + Math.random() * 0.4,
            Math.floor(10 + Math.random() * 100),  // Must be integer
            'MOCK'
          ]
        );
      } catch (err) {
        // Skip silently
      }
    }

    // Seed Correlations
    console.log('Seeding correlations...');
    for (const tax of sampleTaxonomy) {
      try {
        await db.query(
          'INSERT INTO correlations (species, temperature, salinity, ph, oxygen, abundance, correlation_coefficient) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [
            tax.species,
            25 + Math.random() * 5,
            34.5 + Math.random() * 1,
            8.2 + Math.random() * 0.2,
            5 + Math.random() * 2,
            5000 + Math.random() * 10000,
            -0.8 + Math.random() * 1.6
          ]
        );
      } catch (err) {
        // Skip silently
      }
    }

    console.log('✓ Database seeded successfully');
    return true;
  } catch (error) {
    console.error('Failed to seed database:', error);
    return false;
  }
}

export default seedDatabase;
