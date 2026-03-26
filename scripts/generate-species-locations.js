import * as fs from 'fs';
import * as path from 'path';

// Parse CSV
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    data.push(row);
  }

  return { headers, data };
}

// Main function
function generateSpeciesLocations(csvPath, outputPath) {
  console.log(`Reading CSV from: ${csvPath}`);

  const { headers, data } = parseCSV(csvPath);
  console.log(`Found ${data.length} records, ${headers.length} columns`);

  // Group by scientific name
  const speciesMap = new Map();

  data.forEach(row => {
    const scientificName = row['ScientificName'] || row['scientificName'];
    const latitude = parseFloat(row['decimalLatitude']);
    const longitude = parseFloat(row['decimalLongitude']);
    const locality = row['locality'] || 'Unknown';

    // Skip if coordinates are invalid
    if (isNaN(latitude) || isNaN(longitude)) {
      return;
    }

    if (!scientificName) {
      return;
    }

    if (!speciesMap.has(scientificName)) {
      speciesMap.set(scientificName, {
        scientificName,
        totalRecords: 0,
        locationsMap: new Map()
      });
    }

    const species = speciesMap.get(scientificName);
    species.totalRecords += 1;

    // Create a location key to group occurrences
    const locKey = `${latitude.toFixed(2)}|${longitude.toFixed(2)}|${locality}`;

    if (!species.locationsMap.has(locKey)) {
      species.locationsMap.set(locKey, {
        latitude: parseFloat(latitude.toFixed(2)),
        longitude: parseFloat(longitude.toFixed(2)),
        locality,
        count: 0
      });
    }

    species.locationsMap.get(locKey).count += 1;
  });

  // Convert to final format
  const species = Array.from(speciesMap.values()).map(sp => ({
    scientificName: sp.scientificName,
    totalRecords: sp.totalRecords,
    locations: Array.from(sp.locationsMap.values()).sort((a, b) => b.count - a.count)
  }));

  // Sort by total records
  species.sort((a, b) => b.totalRecords - a.totalRecords);

  const output = {
    generatedAt: new Date().toISOString(),
    totalSpecies: species.length,
    species
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`Successfully generated ${outputPath}`);
  console.log(`Total species: ${output.totalSpecies}`);
  console.log(`Total locations: ${species.reduce((sum, sp) => sum + sp.locations.length, 0)}`);

  // Log top 5 species
  console.log('\nTop 5 species by records:');
  species.slice(0, 5).forEach((sp, i) => {
    console.log(`  ${i + 1}. ${sp.scientificName} - ${sp.totalRecords} records, ${sp.locations.length} locations`);
  });
}

// Run
const csvPath = 'Taxonomyformatter/taxonomy-data-Copy.csv';
const outputPath = 'backend/data/species_locations.json';

generateSpeciesLocations(csvPath, outputPath);
