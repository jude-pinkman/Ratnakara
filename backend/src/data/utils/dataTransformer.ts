import { OceanDataRecord, FisheriesDataRecord, EdnaDataRecord, TaxonomyRecord } from '../importers/types.js';
import { DataValidator } from './validator.js';

export class DataTransformer {
  /**
   * Transform raw ocean data from CSV to OceanDataRecord
   */
  static transformOceanData(row: any): OceanDataRecord | null {
    try {
      const record: OceanDataRecord = {
        location: row.location || row.station_id || `Station-${row.id || Math.random()}`,
        latitude: parseFloat(row.latitude || row.lat),
        longitude: parseFloat(row.longitude || row.lon),
        temperature: parseFloat(row.temperature || row.temp),
        salinity: row.salinity ? parseFloat(row.salinity) : 35,
        ph: row.ph ? parseFloat(row.ph) : 8.1,
        oxygen: row.oxygen ? parseFloat(row.oxygen) : 7.0,
        depth: row.depth ? parseInt(row.depth) : 100,
        recorded_at: row.recorded_at ? new Date(row.recorded_at) : new Date(),
        region: row.region || DataValidator.getIndianRegion(parseFloat(row.latitude || row.lat), parseFloat(row.longitude || row.lon)),
      };

      const validation = DataValidator.validateOceanData(record);
      return validation.valid ? record : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Transform raw fisheries data from CSV to FisheriesDataRecord
   */
  static transformFisheriesData(row: any): FisheriesDataRecord | null {
    try {
      const record: FisheriesDataRecord = {
        species: row.species || row.scientific_name || '',
        common_name: row.common_name || row.english_name || row.species,
        abundance: parseInt(row.abundance || row.catch || row.quantity || 0),
        biomass: parseFloat(row.biomass || row.weight || 0),
        location: row.location || row.zone || `Zone-${row.id || Math.random()}`,
        latitude: parseFloat(row.latitude || row.lat || 0),
        longitude: parseFloat(row.longitude || row.lon || 0),
        region: row.region || DataValidator.getIndianRegion(parseFloat(row.latitude || row.lat || 0), parseFloat(row.longitude || row.lon || 0)),
        recorded_at: row.recorded_at || row.year ? new Date(row.recorded_at || `${row.year}-01-01`) : new Date(),
        diversity_index: row.diversity_index ? parseFloat(row.diversity_index) : undefined,
      };

      const validation = DataValidator.validateFisheriesData(record);
      return validation.valid ? record : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Transform raw eDNA data from CSV to EdnaDataRecord
   */
  static transformEdnaData(row: any): EdnaDataRecord | null {
    try {
      const season = this.getSeasonFromDate(row.recorded_at || row.date || new Date());

      const record: EdnaDataRecord = {
        species: row.species || row.scientific_name || '',
        concentration: parseFloat(row.concentration || row.read_count || 0),
        depth: parseInt(row.depth || 50),
        location: row.location || row.site_id || `Site-${row.id || Math.random()}`,
        latitude: parseFloat(row.latitude || row.lat || 0),
        longitude: parseFloat(row.longitude || row.lon || 0),
        confidence: parseFloat(row.confidence || row.quality || 75),
        season: season,
        recorded_at: row.recorded_at ? new Date(row.recorded_at) : new Date(),
        region: row.region || DataValidator.getIndianRegion(parseFloat(row.latitude || row.lat || 0), parseFloat(row.longitude || row.lon || 0)),
      };

      const validation = DataValidator.validateEdnaData(record);
      return validation.valid ? record : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Transform WoRMS API response to TaxonomyRecord
   */
  static transformWormsTaxonomy(response: any, commonName?: string): TaxonomyRecord | null {
    try {
      const record: TaxonomyRecord = {
        kingdom: response.kingdom || 'Animalia',
        phylum: response.phylum || 'Chordata',
        class: response.class || 'Actinopterygii',
        order_name: response.order || response.order_name || 'Unknown',
        family: response.family || 'Unknown',
        genus: response.genus || 'Unknown',
        species: response.valid_name || response.scientificname || '',
        common_name: commonName || response.common_name || response.valid_name || '',
        description: `Marine species, part of the ${response.family || 'marine'} family.`,
      };

      const validation = DataValidator.validateTaxonomy(record);
      return validation.valid ? record : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get season from date for eDNA analysis
   */
  private static getSeasonFromDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const month = d.getMonth();

    // Indian monsoon seasons
    if (month >= 11 || month < 2) return 'Winter'; // Dec, Jan, Feb
    if (month >= 2 && month < 5) return 'Spring'; // Mar, Apr, May
    if (month >= 5 && month < 8) return 'Summer'; // Jun, Jul, Aug
    return 'Monsoon'; // Sep, Oct, Nov
  }

  /**
   * Cluster nearby coordinates into virtual stations
   * Useful for NOAA data to match the 180-station schema
   */
  static clusterCoordinates(records: any[], clusterRadius: number = 0.5): Map<string, any[]> {
    const clusters = new Map<string, any[]>();

    for (const record of records) {
      const lat = parseFloat(record.latitude || record.lat || 0);
      const lng = parseFloat(record.longitude || record.lon || 0);

      // Create grid key (rounded coordinates)
      const gridLat = Math.round(lat / clusterRadius) * clusterRadius;
      const gridLng = Math.round(lng / clusterRadius) * clusterRadius;
      const key = `${gridLat.toFixed(1)},${gridLng.toFixed(1)}`;

      if (!clusters.has(key)) {
        clusters.set(key, []);
      }
      clusters.get(key)!.push(record);
    }

    return clusters;
  }

  /**
   * Aggregate clustered data (useful for daily/weekly aggregations)
   */
  static aggregateCluster(records: any[]): any {
    if (records.length === 0) return null;

    return {
      location: `Station-${Math.random().toString(36).substr(2, 9)}`,
      latitude: records.reduce((sum, r) => sum + parseFloat(r.latitude || r.lat || 0), 0) / records.length,
      longitude: records.reduce((sum, r) => sum + parseFloat(r.longitude || r.lon || 0), 0) / records.length,
      temperature: records.reduce((sum, r) => sum + parseFloat(r.temperature || r.temp || 0), 0) / records.length,
      salinity: records.reduce((sum, r) => sum + parseFloat(r.salinity || 35), 0) / records.length,
      ph: records.reduce((sum, r) => sum + parseFloat(r.ph || 8.1), 0) / records.length,
      oxygen: records.reduce((sum, r) => sum + parseFloat(r.oxygen || 7.0), 0) / records.length,
      depth: Math.max(...records.map((r) => parseInt(r.depth || 100))),
      recorded_at: new Date(records[0].recorded_at || records[0].date || new Date()),
      region: DataValidator.getIndianRegion(
        records.reduce((sum, r) => sum + parseFloat(r.latitude || r.lat || 0), 0) / records.length,
        records.reduce((sum, r) => sum + parseFloat(r.longitude || r.lon || 0), 0) / records.length
      ),
    };
  }
}
