const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

/**
 * Extract species locations from taxonomy CSV - INDIA ONLY
 * Processes the taxonomy-data.csv and generates a JSON file with species locations
 */

const csvPath = path.join(__dirname, '../Taxonomyformatter/taxonomy-data.csv');
const outputPath = path.join(__dirname, '../backend/data/species_locations.json');

// India geographical bounds (with buffer)
const INDIA_BOUNDS = {
  minLat: 6,
  maxLat: 36,
  minLong: 66,
  maxLong: 97
};

function isInIndia(lat, long) {
  return (
    lat >= INDIA_BOUNDS.minLat &&
    lat <= INDIA_BOUNDS.maxLat &&
    long >= INDIA_BOUNDS.minLong &&
    long <= INDIA_BOUNDS.maxLong
  );
}

function processFile() {
  try {
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true
    });

    const speciesLocations = {};

    records.forEach((record) => {
      // Only process India records
      if (record.country?.toLowerCase() !== 'india') return;

      const lat = parseFloat(record.decimalLatitude);
      const long = parseFloat(record.decimalLongitude);
      const species = record.scientificName?.trim();
      const locality = record.locality?.trim() || 'Unknown location';

      // Skip invalid coordinates
      if (isNaN(lat) || isNaN(long) || !species) return;

      // Check if within India bounds
      if (!isInIndia(lat, long)) return;

      // Initialize species entry if not exists
      if (!speciesLocations[species]) {
        speciesLocations[species] = {
          scientificName: species,
          locations: [],
          totalRecords: 0
        };
      }

      // Add location if not duplicate
      const locationKey = `${lat.toFixed(4)}_${long.toFixed(4)}`;
      const existingLocation = speciesLocations[species].locations.find(
        (loc) => `${loc.latitude.toFixed(4)}_${loc.longitude.toFixed(4)}` === locationKey
      );

      if (!existingLocation) {
        speciesLocations[species].locations.push({
          latitude: lat,
          longitude: long,
          locality: locality,
          count: 1
        });
      } else {
        existingLocation.count += 1;
      }

      speciesLocations[species].totalRecords += 1;
    });

    // Convert to array and sort by total records
    const output = {
      generatedAt: new Date().toISOString(),
      totalSpecies: Object.keys(speciesLocations).length,
      species: Object.values(speciesLocations)
        .sort((a, b) => b.totalRecords - a.totalRecords)
        .map((sp) => ({
          ...sp,
          locations: sp.locations.sort((a, b) => b.count - a.count) // Sort by frequency
        }))
    };

    // Ensure output directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write output
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

    console.log(`✓ Processed taxonomy data`);
    console.log(`  Total species in India: ${output.totalSpecies}`);
    console.log(`  Output saved to: ${outputPath}`);
    console.log(`\n  Top 10 species by records:`);
    output.species.slice(0, 10).forEach((sp, idx) => {
      console.log(`  ${idx + 1}. ${sp.scientificName} (${sp.totalRecords} records, ${sp.locations.length} locations)`);
    });

  } catch (error) {
    console.error('Error processing file:', error.message);
    process.exit(1);
  }
}

processFile();
