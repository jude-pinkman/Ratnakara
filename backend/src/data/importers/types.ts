// Shared TypeScript interfaces for data importers

export interface OceanDataRecord {
  location: string;
  latitude: number;
  longitude: number;
  temperature: number;
  salinity: number;
  ph: number;
  oxygen: number;
  depth: number;
  recorded_at: Date;
  region: string;
}

export interface FisheriesDataRecord {
  species: string;
  common_name?: string;
  abundance: number;
  biomass: number;
  location: string;
  latitude: number;
  longitude: number;
  region: string;
  recorded_at: Date;
  diversity_index?: number;
}

export interface EdnaDataRecord {
  species: string;
  concentration: number;
  depth: number;
  location: string;
  latitude: number;
  longitude: number;
  confidence: number;
  season: string;
  recorded_at: Date;
  region: string;
}

export interface TaxonomyRecord {
  kingdom: string;
  phylum: string;
  class: string;
  order_name: string;
  family: string;
  genus: string;
  species: string;
  common_name: string;
  description?: string;
}

export interface ImportStats {
  processed: number;
  inserted: number;
  skipped: number;
  errored: number;
  startTime: Date;
  endTime?: Date;
}

export interface ImportOptions {
  reset?: boolean;
  importers?: string[];
  dryRun?: boolean;
  verbose?: boolean;
  batchSize?: number;
}

// ============================================================================
// Darwin Core Standardized Records (Phase 1)
// ============================================================================

export interface DarwinCoreOccurrence {
  // Identification
  occurrenceID: string;                 // Globally unique identifier
  recordedBy?: string;
  recordedDate?: Date;

  // Event data
  eventDate: Date;                      // Observation date (required)
  eventTime?: string;
  eventID?: string;

  // Organism
  scientificName: string;               // Species name (required)
  scientificNameAuthority?: string;
  taxonRank?: string;
  taxonID?: string;

  // Organism info
  individualCount?: number;
  sex?: string;                         // M|F|unknown|hermaphrodite
  lifeStage?: string;                   // egg|larva|juvenile|adult
  reproductiveCondition?: string;

  // Location (Darwin Core GIS)
  decimalLatitude: number;              // Required
  decimalLongitude: number;             // Required
  coordinateUncertaintyInMeters?: number;
  geodeticDatum?: string;               // Default: WGS84

  locationID?: string;
  locality?: string;
  waterBody?: string;
  countryCode?: string;
  continent?: string;

  // Ratnakara extensions
  region?: string;                      // Bay of Bengal, Arabian Sea, etc.
  stationId?: string;

  // Sampling
  samplingProtocol?: string;
  samplingEffort?: string;
  fieldNumber?: string;

  // Record basis
  basisOfRecord?: string;               // PreservedSpecimen|HumanObservation|MachineObservation
  occurrenceStatus?: string;            // present|absent

  // Dataset
  datasetName?: string;
  datasetID?: string;
  institutionCode?: string;
  collectionCode?: string;

  // Ratnakara classification
  dataType: 'ocean' | 'fisheries' | 'edna' | 'otolith' | 'genetic';
  dataSource?: string;                  // WoRMS|FAO|NOAA|upload|manual

  // GBIF compliance
  isHarvestedByGBIF?: boolean;
  gbifDatasetKey?: string;

  remarks?: string;
}

export interface EnvironmentalMeasurement {
  occurrenceID: string;

  // Oceanographic parameters
  temperature_celsius?: number;
  salinity_psu?: number;
  ph?: number;
  dissolved_oxygen_mg_per_l?: number;
  dissolved_oxygen_percent?: number;

  // Location
  depth_metres?: number;
  pressure_decibars?: number;

  // Optional parameters
  chlorophyll_a_mg_m3?: number;
  turbidity_ntu?: number;
  conductivity_ms_cm?: number;

  // Quality
  measurement_quality?: 'excellent' | 'good' | 'moderate' | 'poor';
}

export interface EdnaObservation {
  occurrenceID: string;

  // eDNA specific
  edna_concentration_per_litre: number;
  detection_confidence: number;        // 0-100%
  depth_metres?: number;

  // Season (Indian monsoon)
  season?: 'Winter' | 'Spring' | 'Summer' | 'Monsoon';

  // Quality
  pcr_replicates?: number;
  detection_method?: 'qPCR' | 'ddPCR' | 'high-throughput sequencing';
}

export interface DnaSequenceRecord {
  occurrenceID?: string;

  // Identification
  sequenceIdentifier: string;           // NCBI style ID (required)
  sequenceAccession?: string;

  // Metadata
  sequenceFormat: 'FASTA' | 'FASTQ' | 'Genbank';
  sequenceLength: number;
  gene: string;                         // 16S|COX1|ITS|rbcL|matK|etc.
  gene_region?: string;

  // Composition
  gc_content?: number;                  // 0-100
  nucleotide_counts?: {
    A: number;
    T: number;
    G: number;
    C: number;
  };

  // Raw sequence
  fasta_sequence: string;               // Full FASTA text (required)

  // Quality
  sequence_quality?: number;            // Phred score 0-40
  quality_trimmed?: boolean;

  // Taxonomic analysis (cached)
  taxonomic_identification?: string;
  blast_evalue?: number;
  blast_identity_percent?: number;
  blast_query_coverage?: number;
  blast_run_date?: Date;

  // Additional
  functional_annotation?: string;
  organism_source?: string;

  // Submission
  submitted_to_ncbi?: boolean;
  ncbi_submission_id?: string;
}

export interface OtolithRecord {
  occurrenceID: string;

  // Fish identification
  fish_id?: string;
  fish_total_length_cm?: number;
  fish_weight_g?: number;

  // Age determination
  age_years: number;
  age_confidence?: 'high' | 'medium' | 'low';
  growth_ring_count?: number;

  // Growth analysis
  increment_widths_micrometers?: number[];
  back_calculated_lengths_cm?: number[];

  // OTOLITH CHEMISTRY (ppb)
  sr_ca_ratio?: number;
  pb_concentration_ppb?: number;
  ba_concentration_ppb?: number;
  zn_concentration_ppb?: number;
  mg_concentration_ppb?: number;
  mn_concentration_ppb?: number;
  fe_concentration_ppb?: number;

  // ISOTOPE COMPOSITION (per mil)
  delta_18_o_permil?: number;
  delta_13_c_permil?: number;
  delta_d_permil?: number;

  // Temperature & salinity inference
  temperature_inferred_celsius?: number;
  salinity_inferred_psu?: number;

  // Morphology
  otolith_width_mm?: number;
  otolith_height_mm?: number;
  otolith_thickness_mm?: number;
  otolith_weight_mg?: number;

  // Preservation
  otolith_preservation?: 'clear' | 'moderate' | 'degraded' | 'dissolved';
  microstructure_clarity?: 'excellent' | 'good' | 'fair' | 'poor';
  resorption_present?: boolean;

  // Collection
  collection_location?: string;
  collection_method?: string;
  analyst_name?: string;
  analysis_laboratory?: string;

  // QA
  standard_reference_material_analyzed?: boolean;
  duplicates_analyzed?: number;
}

export interface AnomalyRecord {
  occurrenceID: string;

  // Details
  parameter: string;                   // temperature|salinity|ph|oxygen|edna
  measured_value: number;

  // Statistics
  expected_value?: number;
  z_score?: number;
  percentile_rank?: number;

  // Classification
  anomaly_type: 'outlier' | 'threshold_exceeded' | 'temporal_spike' | 'seasonal_anomaly';
  anomaly_severity: 'warning' | 'critical' | 'severe';
  alert_level?: 'warning' | 'critical' | 'disabled';

  // Context
  lookback_period_days?: number;
  baseline_mean?: number;
  baseline_std_dev?: number;

  // Follow-up
  acknowledged?: boolean;
  acknowledged_by?: string;
  noted?: string;
}

export interface FisherObservation {
  occurrenceID: string;

  // Catch data
  catch_weight_kg: number;
  catch_abundance?: number;

  // Effort
  fishing_effort_hours?: number;
  catch_per_unit_effort_kg?: number;

  // Method
  fishing_gear?: string;                // Trawl|Gillnet|Hook|Trap
  fishing_zone?: string;

  // Biodiversity
  species_diversity_index?: number;
  species_richness?: number;

  // Value
  market_value_usd?: number;
}
