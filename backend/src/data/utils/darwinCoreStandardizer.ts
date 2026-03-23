import { v4 as uuidv4 } from 'uuid';
import { DataValidator } from './validator.js';

/**
 * Darwin Core Data Standardizer
 * Converts raw data into Darwin Core compliant format
 */
export class DarwinCoreStandardizer {
  // Darwin Core basis of record values
  static readonly BASIS_OF_RECORD = {
    HUMAN_OBSERVATION: 'HumanObservation',
    MACHINE_OBSERVATION: 'MachineObservation',
    MATERIAL_SAMPLE: 'MaterialSample',
    PRESERVED_SPECIMEN: 'PreservedSpecimen',
    LIVING_SPECIMEN: 'LivingSpecimen',
    FOSSIL_SPECIMEN: 'FossilSpecimen',
    OCCURRENCE: 'Occurrence',
  };

  // Common Indian marine species mapping for normalization
  static readonly SPECIES_ALIASES: Record<string, string> = {
    'indian oil sardine': 'Sardinella longiceps',
    'oil sardine': 'Sardinella longiceps',
    'sardine': 'Sardinella longiceps',
    'indian mackerel': 'Rastrelliger kanagurta',
    'mackerel': 'Rastrelliger kanagurta',
    'yellowfin tuna': 'Thunnus albacares',
    'yellowfin': 'Thunnus albacares',
    'skipjack tuna': 'Katsuwonus pelamis',
    'skipjack': 'Katsuwonus pelamis',
    'king mackerel': 'Scomberomorus guttatus',
    'indo-pacific king mackerel': 'Scomberomorus guttatus',
    'tiger prawn': 'Penaeus monodon',
    'giant tiger prawn': 'Penaeus monodon',
    'kadal shrimp': 'Metapenaeus dobsoni',
    'barramundi': 'Lates calcarifer',
    'asian seabass': 'Lates calcarifer',
    'malabar grouper': 'Epinephelus malabaricus',
    'grouper': 'Epinephelus malabaricus',
    'anchovy': 'Stolephorus indicus',
    'indian anchovy': 'Stolephorus indicus',
    'threadfin bream': 'Nemipterus japonicus',
    'japanese threadfin bream': 'Nemipterus japonicus',
    'pharaoh cuttlefish': 'Sepia pharaonis',
    'cuttlefish': 'Sepia pharaonis',
    'blue swimming crab': 'Portunus pelagicus',
    'whitefish': 'Lactarius lactarius',
    'ribbonfish': 'Trichiurus lepturus',
    'largehead hairtail': 'Trichiurus lepturus',
    'lizardfish': 'Saurida tumbil',
    'greater lizardfish': 'Saurida tumbil',
    'bigeye': 'Priacanthus hamrur',
    'scad': 'Decapterus russelli',
    'indian scad': 'Decapterus russelli',
    'grenadier anchovy': 'Coilia dussumieri',
    'torpedo scad': 'Megalaspis cordyla',
    'frigate tuna': 'Auxis thazard',
    'rainbow sardine': 'Dussumieria acuta',
    'silver pomfret': 'Pampus argenteus',
    'karut croaker': 'Johnius carutta',
    'malabar sole': 'Cynoglossus macrostomus',
  };

  // Water body classification for Indian waters
  static readonly WATER_BODIES: Record<string, { bounds: [number, number, number, number]; name: string }> = {
    BAY_OF_BENGAL: { bounds: [6, 80, 22, 95], name: 'Bay of Bengal' },
    ARABIAN_SEA: { bounds: [8, 65, 24, 77], name: 'Arabian Sea' },
    ANDAMAN_SEA: { bounds: [5, 92, 14, 98], name: 'Andaman Sea' },
    LAKSHADWEEP_SEA: { bounds: [8, 71, 14, 75], name: 'Lakshadweep Sea' },
    GULF_OF_MANNAR: { bounds: [6, 77, 10, 80], name: 'Gulf of Mannar' },
    PALK_BAY: { bounds: [9, 79, 10, 80], name: 'Palk Bay' },
    INDIAN_OCEAN: { bounds: [-10, 40, 30, 100], name: 'Indian Ocean' },
  };

  /**
   * Generate a Darwin Core compliant occurrence ID
   */
  static generateOccurrenceId(prefix: string = 'RAT'): string {
    const timestamp = Date.now().toString(36);
    const random = uuidv4().slice(0, 8);
    return `${prefix}:${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Normalize species name to scientific name
   */
  static normalizeSpeciesName(name: string): string {
    if (!name) return 'Unknown Species';

    const normalized = name.toLowerCase().trim();

    // Check aliases first
    if (this.SPECIES_ALIASES[normalized]) {
      return this.SPECIES_ALIASES[normalized];
    }

    // If already looks like scientific name (two words, first capitalized)
    if (name.includes(' ') && /^[A-Z][a-z]+ [a-z]+/.test(name)) {
      return name;
    }

    // Return original with proper capitalization
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }

  /**
   * Classify water body from coordinates
   */
  static classifyWaterBody(lat: number, lon: number): string {
    for (const [, config] of Object.entries(this.WATER_BODIES)) {
      const [minLat, minLon, maxLat, maxLon] = config.bounds;
      if (lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon) {
        return config.name;
      }
    }
    return 'Indian Ocean';
  }

  /**
   * Get region classification for Indian waters
   */
  static getRegion(lat: number, lon: number): string {
    return DataValidator.getIndianRegion(lat, lon);
  }

  /**
   * Convert ocean data to Darwin Core occurrence
   */
  static standardizeOceanData(record: any, dataSource: string = 'upload'): any {
    const lat = parseFloat(record.latitude) || 0;
    const lon = parseFloat(record.longitude) || 0;
    const eventDate = record.recorded_at ? new Date(record.recorded_at) : new Date();

    return {
      occurrenceID: this.generateOccurrenceId('OCEAN'),
      scientificName: 'Environmental Measurement',
      eventDate: eventDate.toISOString(),
      decimalLatitude: lat,
      decimalLongitude: lon,
      coordinateUncertaintyInMeters: 100,
      geodeticDatum: 'WGS84',
      locality: record.location || 'Unknown Station',
      waterBody: this.classifyWaterBody(lat, lon),
      region: record.region || this.getRegion(lat, lon),
      countryCode: 'IN',
      dataType: 'ocean',
      dataSource: dataSource,
      basisOfRecord: this.BASIS_OF_RECORD.MACHINE_OBSERVATION,
      samplingProtocol: 'automated sensor monitoring',

      // Environmental measurements (for related table)
      measurements: {
        temperature_celsius: record.temperature,
        salinity_psu: record.salinity,
        ph: record.ph,
        dissolved_oxygen_mg_per_l: record.oxygen,
        depth_metres: record.depth,
      },
    };
  }

  /**
   * Convert fisheries data to Darwin Core occurrence
   */
  static standardizeFisheriesData(record: any, dataSource: string = 'upload'): any {
    const lat = parseFloat(record.latitude) || 0;
    const lon = parseFloat(record.longitude) || 0;
    const eventDate = record.recorded_at ? new Date(record.recorded_at) : new Date();

    return {
      occurrenceID: this.generateOccurrenceId('FISH'),
      scientificName: this.normalizeSpeciesName(record.species),
      eventDate: eventDate.toISOString(),
      decimalLatitude: lat,
      decimalLongitude: lon,
      coordinateUncertaintyInMeters: 500,
      geodeticDatum: 'WGS84',
      locality: record.location || 'Unknown Zone',
      waterBody: this.classifyWaterBody(lat, lon),
      region: record.region || this.getRegion(lat, lon),
      countryCode: 'IN',
      dataType: 'fisheries',
      dataSource: dataSource,
      basisOfRecord: this.BASIS_OF_RECORD.HUMAN_OBSERVATION,
      individualCount: record.abundance,
      samplingProtocol: 'fisheries survey',

      // Fisher observations (for related table)
      fisherObservation: {
        catch_weight_kg: record.biomass || 0,
        catch_abundance: record.abundance,
        species_diversity_index: record.diversity_index,
        fishing_zone: record.location,
      },
    };
  }

  /**
   * Convert eDNA data to Darwin Core occurrence
   */
  static standardizeEdnaData(record: any, dataSource: string = 'upload'): any {
    const lat = parseFloat(record.latitude) || 0;
    const lon = parseFloat(record.longitude) || 0;
    const eventDate = record.recorded_at ? new Date(record.recorded_at) : new Date();

    return {
      occurrenceID: this.generateOccurrenceId('EDNA'),
      scientificName: this.normalizeSpeciesName(record.species),
      eventDate: eventDate.toISOString(),
      decimalLatitude: lat,
      decimalLongitude: lon,
      coordinateUncertaintyInMeters: 50,
      geodeticDatum: 'WGS84',
      locality: record.location || 'Unknown Site',
      waterBody: this.classifyWaterBody(lat, lon),
      region: record.region || this.getRegion(lat, lon),
      countryCode: 'IN',
      dataType: 'edna',
      dataSource: dataSource,
      basisOfRecord: this.BASIS_OF_RECORD.MATERIAL_SAMPLE,
      samplingProtocol: 'environmental DNA water sampling',

      // eDNA observations (for related table)
      ednaObservation: {
        edna_concentration_per_litre: record.concentration,
        detection_confidence: record.confidence || 95,
        depth_metres: record.depth,
        season: record.season || this.getSeasonFromDate(eventDate),
      },
    };
  }

  /**
   * Get season from date (Indian monsoon calendar)
   */
  static getSeasonFromDate(date: Date): string {
    const month = date.getMonth();
    if (month >= 11 || month < 2) return 'Winter';      // Dec-Feb
    if (month >= 2 && month < 5) return 'Pre-Monsoon';  // Mar-May
    if (month >= 5 && month < 9) return 'Monsoon';      // Jun-Sep
    return 'Post-Monsoon';                              // Oct-Nov
  }

  /**
   * Validate Darwin Core compliance
   */
  static validateDarwinCore(record: any): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!record.occurrenceID) errors.push('Missing required field: occurrenceID');
    if (!record.scientificName) errors.push('Missing required field: scientificName');
    if (!record.eventDate) errors.push('Missing required field: eventDate');
    if (record.decimalLatitude === undefined) errors.push('Missing required field: decimalLatitude');
    if (record.decimalLongitude === undefined) errors.push('Missing required field: decimalLongitude');

    // Coordinate validation
    const lat = parseFloat(record.decimalLatitude);
    const lon = parseFloat(record.decimalLongitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      errors.push(`Invalid latitude: ${record.decimalLatitude}`);
    }
    if (isNaN(lon) || lon < -180 || lon > 180) {
      errors.push(`Invalid longitude: ${record.decimalLongitude}`);
    }

    // Indian waters check
    if (!DataValidator.isIndianWaters(lat, lon)) {
      warnings.push(`Coordinates (${lat}, ${lon}) are outside Indian waters`);
    }

    // Event date validation
    if (record.eventDate) {
      const date = new Date(record.eventDate);
      if (isNaN(date.getTime())) {
        errors.push(`Invalid eventDate: ${record.eventDate}`);
      } else if (date > new Date()) {
        warnings.push('eventDate is in the future');
      }
    }

    // Basis of record validation
    const validBases = Object.values(this.BASIS_OF_RECORD);
    if (record.basisOfRecord && !validBases.includes(record.basisOfRecord)) {
      warnings.push(`Non-standard basisOfRecord: ${record.basisOfRecord}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Generate GBIF-ready export format
   */
  static toGBIFExport(records: any[]): any[] {
    return records.map(record => ({
      occurrenceID: record.occurrenceID,
      basisOfRecord: record.basisOfRecord,
      scientificName: record.scientificName,
      eventDate: record.eventDate,
      decimalLatitude: record.decimalLatitude,
      decimalLongitude: record.decimalLongitude,
      coordinateUncertaintyInMeters: record.coordinateUncertaintyInMeters,
      geodeticDatum: record.geodeticDatum,
      countryCode: record.countryCode,
      locality: record.locality,
      waterBody: record.waterBody,
      individualCount: record.individualCount,
      samplingProtocol: record.samplingProtocol,
      datasetName: 'Ratnakara Marine Data Platform',
      institutionCode: 'RATNAKARA',
      collectionCode: record.dataType?.toUpperCase(),
    }));
  }
}

export default DarwinCoreStandardizer;
