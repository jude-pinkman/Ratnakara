import { OceanDataRecord, FisheriesDataRecord, EdnaDataRecord, TaxonomyRecord } from '../importers/types.js';

export class DataValidator {
  static validateOceanData(record: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!record.location) errors.push('Missing location');
    if (record.latitude === null || record.latitude === undefined) errors.push('Missing latitude');
    if (record.longitude === null || record.longitude === undefined) errors.push('Missing longitude');
    if (record.temperature === null || record.temperature === undefined) errors.push('Missing temperature');
    if (!record.recorded_at) errors.push('Missing recorded_at');

    // Validate ranges
    if (record.latitude && (record.latitude < -90 || record.latitude > 90)) {
      errors.push(`Invalid latitude: ${record.latitude}`);
    }
    if (record.longitude && (record.longitude < -180 || record.longitude > 180)) {
      errors.push(`Invalid longitude: ${record.longitude}`);
    }

    // Temperature reasonable range (-2 to 50°C for oceans)
    if (record.temperature && (record.temperature < -2 || record.temperature > 50)) {
      errors.push(`Temperature out of range: ${record.temperature}`);
    }

    // Salinity (0-40 PSU typical)
    if (record.salinity && (record.salinity < 0 || record.salinity > 45)) {
      errors.push(`Salinity out of range: ${record.salinity}`);
    }

    // pH (6.5-8.5 for ocean)
    if (record.ph && (record.ph < 6.5 || record.ph > 8.5)) {
      errors.push(`pH out of range: ${record.ph}`);
    }

    // Oxygen (0-15 mg/L)
    if (record.oxygen && (record.oxygen < 0 || record.oxygen > 15)) {
      errors.push(`Oxygen out of range: ${record.oxygen}`);
    }

    // Depth (0-11000m)
    if (record.depth && (record.depth < 0 || record.depth > 11000)) {
      errors.push(`Depth out of range: ${record.depth}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  static validateFisheriesData(record: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!record.species) errors.push('Missing species');
    if (record.abundance === null || record.abundance === undefined) errors.push('Missing abundance');
    if (record.biomass === null || record.biomass === undefined) errors.push('Missing biomass');
    if (!record.location) errors.push('Missing location');
    if (record.latitude === null || record.latitude === undefined) errors.push('Missing latitude');
    if (record.longitude === null || record.longitude === undefined) errors.push('Missing longitude');
    if (!record.recorded_at) errors.push('Missing recorded_at');

    // Validate ranges
    if (record.latitude && (record.latitude < -90 || record.latitude > 90)) {
      errors.push(`Invalid latitude: ${record.latitude}`);
    }
    if (record.longitude && (record.longitude < -180 || record.longitude > 180)) {
      errors.push(`Invalid longitude: ${record.longitude}`);
    }

    if (record.abundance && record.abundance < 0) {
      errors.push(`Abundance cannot be negative: ${record.abundance}`);
    }

    if (record.biomass && record.biomass < 0) {
      errors.push(`Biomass cannot be negative: ${record.biomass}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  static validateEdnaData(record: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!record.species) errors.push('Missing species');
    if (record.concentration === null || record.concentration === undefined) errors.push('Missing concentration');
    if (record.depth === null || record.depth === undefined) errors.push('Missing depth');
    if (!record.location) errors.push('Missing location');
    if (!record.recorded_at) errors.push('Missing recorded_at');

    if (record.concentration && record.concentration < 0) {
      errors.push(`Concentration cannot be negative: ${record.concentration}`);
    }

    if (record.depth && (record.depth < 0 || record.depth > 11000)) {
      errors.push(`Depth out of range: ${record.depth}`);
    }

    if (record.confidence && (record.confidence < 0 || record.confidence > 100)) {
      errors.push(`Confidence must be 0-100: ${record.confidence}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  static validateTaxonomy(record: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!record.kingdom) errors.push('Missing kingdom');
    if (!record.phylum) errors.push('Missing phylum');
    if (!record.class) errors.push('Missing class');
    if (!record.order_name) errors.push('Missing order_name');
    if (!record.family) errors.push('Missing family');
    if (!record.genus) errors.push('Missing genus');
    if (!record.species) errors.push('Missing species');
    if (!record.common_name) errors.push('Missing common_name');

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  static isIndianWaters(lat: number, lng: number): boolean {
    // Approximate bounds for Indian marine zones
    // Latitude: 8°N to 35°N (roughly)
    // Longitude: 65°E to 98°E
    return lat >= 8 && lat <= 35 && lng >= 65 && lng <= 98;
  }

  static getIndianRegion(lat: number, lng: number): string {
    // Classify coordinates into Indian marine regions
    if (lat >= 8 && lat <= 22 && lng >= 80 && lng <= 92) return 'Bay of Bengal';
    if (lat >= 8 && lat <= 24 && lng >= 68 && lng <= 78) return 'Arabian Sea';
    if (lat >= 4 && lat <= 14 && lng >= 92 && lng <= 99) return 'Andaman Sea';
    if (lat >= 8 && lat <= 14 && lng >= 71 && lng <= 74) return 'Lakshadweep Sea';
    if (lat >= -10 && lat <= 10 && lng >= 65 && lng <= 95) return 'Indian Ocean';
    return 'Unknown Region';
  }
}
