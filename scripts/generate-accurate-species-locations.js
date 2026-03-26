import * as fs from 'fs';
import * as path from 'path';

// Comprehensive mapping of Indian coastal locations to actual coordinates
const LOCATION_COORDINATES = {
  'Kanyakumari': { lat: 8.0883, lng: 77.5385, region: 'Tamil Nadu' },
  'Trivandrum': { lat: 8.7426, lng: 76.7338, region: 'Kerala' },
  'Thiruvananthapuram': { lat: 8.7426, lng: 76.7338, region: 'Kerala' },
  'Cape Comorin': { lat: 8.0883, lng: 77.5385, region: 'Tamil Nadu' },
  'Colachel': { lat: 8.2227, lng: 77.3087, region: 'Tamil Nadu' },
  'Kovalam': { lat: 8.4030, lng: 76.9855, region: 'Kerala' },
  'Vizhinjam': { lat: 8.3833, lng: 76.8667, region: 'Kerala' },
  'Alleppey': { lat: 9.4867, lng: 76.3289, region: 'Kerala' },
  'Kodungallur': { lat: 10.2183, lng: 76.2397, region: 'Kerala' },
  'Kochi': { lat: 9.9312, lng: 76.2673, region: 'Kerala' },
  'Cochin': { lat: 9.9312, lng: 76.2673, region: 'Kerala' },
  'Calicut': { lat: 11.8683, lng: 75.4761, region: 'Kerala' },
  'Kannur': { lat: 11.8745, lng: 75.3706, region: 'Kerala' },
  'Kasaragod': { lat: 12.4940, lng: 75.0153, region: 'Kerala' },
  'Mangalore': { lat: 12.8833, lng: 74.8622, region: 'Karnataka' },
  'Udupi': { lat: 13.3348, lng: 74.7421, region: 'Karnataka' },
  'Karwar': { lat: 14.8086, lng: 74.1239, region: 'Karnataka' },
  'Honnavar': { lat: 14.2833, lng: 74.4500, region: 'Karnataka' },
  'Panaji': { lat: 15.2993, lng: 73.8243, region: 'Goa' },
  'Vengurla': { lat: 15.7167, lng: 73.7000, region: 'Maharashtra' },
  'Dabhol': { lat: 17.8000, lng: 73.0500, region: 'Maharashtra' },
  'Mumbai': { lat: 19.0760, lng: 72.8777, region: 'Maharashtra' },
  'Dwarka': { lat: 22.2391, lng: 68.9680, region: 'Gujarat' },
  'Veraval': { lat: 21.6509, lng: 71.9992, region: 'Gujarat' },
  'Chennai': { lat: 13.0827, lng: 80.2707, region: 'Tamil Nadu' },
  'Madras': { lat: 13.0827, lng: 80.2707, region: 'Tamil Nadu' },
  'Ennore': { lat: 13.1939, lng: 80.3167, region: 'Tamil Nadu' },
  'Nagapattinam': { lat: 10.7667, lng: 79.8500, region: 'Tamil Nadu' },
  'Tuticorin': { lat: 8.8054, lng: 78.1505, region: 'Tamil Nadu' },
  'Mandapam': { lat: 9.2827, lng: 79.1254, region: 'Tamil Nadu' },
  'Rameswaram': { lat: 9.2876, lng: 79.3129, region: 'Tamil Nadu' },
  'Puducherry': { lat: 12.0016, lng: 79.8083, region: 'Puducherry' },
  'Karaikal': { lat: 10.9319, lng: 79.8661, region: 'Puducherry' },
  'Kakinada': { lat: 16.9891, lng: 82.2475, region: 'Andhra Pradesh' },
  'Visakhapatnam': { lat: 17.6869, lng: 83.2185, region: 'Andhra Pradesh' },
  'Srikakulam': { lat: 18.2963, lng: 84.1437, region: 'Andhra Pradesh' },
  'Machilipatnam': { lat: 16.1897, lng: 81.1467, region: 'Andhra Pradesh' },
  'Agatti Island': { lat: 10.8567, lng: 72.1821, region: 'Lakshadweep' },
  'Kavaratti': { lat: 10.5614, lng: 72.6417, region: 'Lakshadweep' },
  'Kiltan': { lat: 10.0836, lng: 72.7719, region: 'Lakshadweep' },
  'Amini': { lat: 11.1306, lng: 72.8133, region: 'Lakshadweep' },
  'Kadmat Island': { lat: 11.2436, lng: 72.7272, region: 'Lakshadweep' },
  'Katchal Island': { lat: 9.9294, lng: 92.5875, region: 'Andaman & Nicobar' },
  'Port Blair': { lat: 11.7345, lng: 92.7592, region: 'Andaman & Nicobar' },
  'North Andaman Island': { lat: 13.0419, lng: 92.6631, region: 'Andaman & Nicobar' },
  'Middle Andaman Island': { lat: 12.7123, lng: 92.9500, region: 'Andaman & Nicobar' },
  'South Andaman Island': { lat: 11.5271, lng: 92.6346, region: 'Andaman & Nicobar' },
  'Great Nicobar Island': { lat: 7.0402, lng: 93.7773, region: 'Andaman & Nicobar' },
  'Little Nicobar Island': { lat: 8.4123, lng: 93.7850, region: 'Andaman & Nicobar' },
  'Car Nicobar Island': { lat: 9.1905, lng: 92.7756, region: 'Andaman & Nicobar' },
  'Rutland Island': { lat: 12.4653, lng: 92.5833, region: 'Andaman & Nicobar' },
  'Interview Island': { lat: 12.0667, lng: 92.9833, region: 'Andaman & Nicobar' },
  'Havelock Island': { lat: 11.9942, lng: 93.0371, region: 'Andaman & Nicobar' },
};

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  if (lines.length === 0) throw new Error('CSV file is empty');

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

function getCoordinatesForLocation(locality) {
  // Try exact match first
  let found = Object.keys(LOCATION_COORDINATES).find(
    key => locality.toLowerCase().includes(key.toLowerCase())
  );

  if (found) {
    return LOCATION_COORDINATES[found];
  }

  // Extract key words and try to match
  if (locality.toLowerCase().includes('kanyakumari') || locality.toLowerCase().includes('cape comorin')) {
    return LOCATION_COORDINATES['Kanyakumari'];
  }
  if (locality.toLowerCase().includes('trivandrum') || locality.toLowerCase().includes('thiruvananthapuram')) {
    return LOCATION_COORDINATES['Trivandrum'];
  }
  if (locality.toLowerCase().includes('alleppey') || locality.toLowerCase().includes('alappuzha')) {
    return LOCATION_COORDINATES['Alleppey'];
  }
  if (locality.toLowerCase().includes('cochin') || locality.toLowerCase().includes('kochi')) {
    return LOCATION_COORDINATES['Kochi'];
  }
  if (locality.toLowerCase().includes('puducherry') || locality.toLowerCase().includes('pondicherry')) {
    return LOCATION_COORDINATES['Puducherry'];
  }
  if (locality.toLowerCase().includes('karaikal')) {
    return LOCATION_COORDINATES['Karaikal'];
  }
  if (locality.toLowerCase().includes('chennai') || locality.toLowerCase().includes('madras')) {
    return LOCATION_COORDINATES['Chennai'];
  }
  if (locality.toLowerCase().includes('nagapattinam')) {
    return LOCATION_COORDINATES['Nagapattinam'];
  }
  if (locality.toLowerCase().includes('kakinada')) {
    return LOCATION_COORDINATES['Kakinada'];
  }
  if (locality.toLowerCase().includes('visakhapatnam')) {
    return LOCATION_COORDINATES['Visakhapatnam'];
  }

  return null;
}

function generateAccurateSpeciesLocations(csvPath, outputPath) {
  console.log(`Reading CSV from: ${csvPath}`);

  const { headers, data } = parseCSV(csvPath);
  console.log(`Found ${data.length} records`);

  const speciesMap = new Map();
  let unmappedLocations = 0;
  let csvCoordinates = 0;
  let inferredCoordinates = 0;

  data.forEach(row => {
    const scientificName = row['ScientificName'] || row['scientificName'];
    const locality = row['locality'] || 'Unknown';
    let latitude = parseFloat(row['decimalLatitude']);
    let longitude = parseFloat(row['decimalLongitude']);

    // If CSV doesn't have coordinates, infer from location name
    if (isNaN(latitude) || isNaN(longitude)) {
      const coords = getCoordinatesForLocation(locality);
      if (coords) {
        latitude = coords.lat;
        longitude = coords.lng;
        inferredCoordinates++;
      } else {
        unmappedLocations++;
        return; // Skip unmapped records
      }
    } else {
      csvCoordinates++;
    }

    const eventDate = row['eventDate'] || '';
    const waterBody = row['waterBody'] || 'Arabian Sea, Bay of Bengal, Andaman Sea';
    const samplingProtocol = row['samplingProtocol'] || 'Survey';
    const identifiedBy = row['identifiedBy'] || 'CMLRE';
    const basisOfRecord = row['basisOfRecord'] || 'PreservedSpecimen';
    const minimumDepth = parseFloat(row['minimumDepthInMeters']) || 5;
    const maximumDepth = parseFloat(row['maximumDepthInMeters']) || 30;
    const individualCount = parseInt(row['individualCount']) || 1;

    if (!scientificName) return;

    if (!speciesMap.has(scientificName)) {
      speciesMap.set(scientificName, {
        scientificName,
        totalRecords: 0,
        locations: [],
        locationsSet: new Set(),
        metadata: {
          recordingOrganizations: new Set(),
          waterBodies: new Set(),
          samplingMethods: new Set(),
          basisTypes: new Set(),
          dateRange: { earliest: null, latest: null }
        }
      });
    }

    const species = speciesMap.get(scientificName);
    species.totalRecords += 1;

    const locKey = `${latitude.toFixed(2)}|${longitude.toFixed(2)}|${locality}`;

    if (!species.locationsSet.has(locKey)) {
      species.locationsSet.add(locKey);
      species.locations.push({
        latitude: parseFloat(latitude.toFixed(2)),
        longitude: parseFloat(longitude.toFixed(2)),
        locality: locality,
        waterBody: waterBody,
        depth: {
          minimum: minimumDepth,
          maximum: maximumDepth,
          average: (minimumDepth + maximumDepth) / 2
        },
        samplingProtocol: samplingProtocol,
        count: individualCount,
        recordingOrganization: identifiedBy,
        basisOfRecord: basisOfRecord,
        eventDate: eventDate
      });
    }

    species.metadata.recordingOrganizations.add(identifiedBy);
    species.metadata.waterBodies.add(waterBody);
    species.metadata.samplingMethods.add(samplingProtocol);
    species.metadata.basisTypes.add(basisOfRecord);

    if (eventDate) {
      if (!species.metadata.dateRange.earliest || eventDate < species.metadata.dateRange.earliest) {
        species.metadata.dateRange.earliest = eventDate;
      }
      if (!species.metadata.dateRange.latest || eventDate > species.metadata.dateRange.latest) {
        species.metadata.dateRange.latest = eventDate;
      }
    }
  });

  const species = Array.from(speciesMap.values()).map(sp => ({
    scientificName: sp.scientificName,
    totalRecords: sp.totalRecords,
    uniqueLocations: sp.locations.length,
    locations: sp.locations.sort((a, b) => b.count - a.count),
    metadata: {
      recordingOrganizations: Array.from(sp.metadata.recordingOrganizations).sort(),
      waterBodies: Array.from(sp.metadata.waterBodies).sort(),
      samplingMethods: Array.from(sp.metadata.samplingMethods).sort(),
      basisOfRecord: Array.from(sp.metadata.basisTypes).sort(),
      dateRange: sp.metadata.dateRange
    }
  }));

  species.sort((a, b) => b.totalRecords - a.totalRecords);

  const output = {
    generatedAt: new Date().toISOString(),
    dataSource: 'CMLRE (Central Marine Living Resources & Ecology) - India',
    totalSpecies: species.length,
    totalRecords: data.length,
    totalUniqueLocations: new Set(data.filter(r => !isNaN(parseFloat(r.decimalLatitude))).map(r => `${r.decimalLatitude}|${r.decimalLongitude}|${r.locality}`)).size,
    coverageAreas: [
      'Lakshadweep Archipelago',
      'Andaman & Nicobar Islands',
      'Arabian Sea (West Coast)',
      'Bay of Bengal (East Coast)',
      'Gulf of Mannar',
      'Kerala Coast',
      'Tamil Nadu Coast',
      'Andhra Pradesh Coast',
      'Puducherry',
      'Goa & Karnataka Coast'
    ],
    species
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`✅ Generated ${outputPath}`);
  console.log(`📊 Total species: ${output.totalSpecies}`);
  console.log(`📍 Total records: ${output.totalRecords}`);
  console.log(`🗺️  From CSV coordinates: ${csvCoordinates}`);
  console.log(`🗺️  Inferred from location names: ${inferredCoordinates}`);
  console.log(`⚠️  Unmapped locations: ${unmappedLocations}`);

  console.log('\n🏆 Top 10 Species:');
  species.slice(0, 10).forEach((sp, i) => {
    console.log(`  ${i + 1}. ${sp.scientificName} - ${sp.totalRecords} records`);
  });
}

const csvPath = 'Taxonomyformatter/taxonomy-data-Copy.csv';
const outputPath = 'backend/data/species_locations.json';

generateAccurateSpeciesLocations(csvPath, outputPath);
