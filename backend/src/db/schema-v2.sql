-- Ratnakara Platform - Schema v2
-- Darwin Core Standardization + Genetic & Otolith Data Support
-- Created: 2026-03-23

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================================
-- CORE BIODIVERSITY TABLE (Darwin Core Standard)
-- ============================================================================
CREATE TABLE occurrences (
  -- UUID & Timestamps
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Darwin Core: Record identification
  occurrenceID VARCHAR UNIQUE NOT NULL,  -- Globally unique identifier
  recordedBy VARCHAR,                    -- Who recorded this observation
  recordedDate TIMESTAMP,                -- When recorded (may differ from eventDate)

  -- Darwin Core: Event data
  eventDate TIMESTAMP NOT NULL,          -- Observation date/time
  eventTime TEXT,                        -- Time component
  eventID VARCHAR,                       -- Event reference (e.g., cruise ID)

  -- Darwin Core: Organism identification
  scientificName VARCHAR NOT NULL,       -- Species scientific name (required)
  scientificNameAuthority VARCHAR,       -- Taxonomic authority
  taxonRank VARCHAR,                     -- Rank: kingdom|phylum|class|order|family|genus|species
  taxonID VARCHAR,                       -- Reference to taxonomy table

  -- Darwin Core: Organism information
  individualCount INTEGER,               -- Number of organisms observed
  sex VARCHAR,                           -- M|F|unknown|hermaphrodite
  lifeStage VARCHAR,                     -- egg|larva|juvenile|adult|unknown
  reproductiveCondition VARCHAR,         -- breeding|non-breeding|unknown

  -- Darwin Core: Location (Geographic)
  decimalLatitude DECIMAL(10,8) NOT NULL,   -- Latitude in decimal degrees
  decimalLongitude DECIMAL(11,8) NOT NULL,  -- Longitude in decimal degrees
  coordinateUncertaintyInMeters INTEGER,    -- Uncertainty radius in meters
  geodeticDatum VARCHAR DEFAULT 'WGS84',    -- Coordinate reference system

  locationID VARCHAR,                    -- Reference location ID
  locality VARCHAR,                      -- Specific location name
  waterBody VARCHAR,                     -- Water area (Bay of Bengal, etc.)
  countryCode VARCHAR,                   -- ISO 3166-1 alpha-2
  continent VARCHAR,                     -- Continent name

  -- Ratnakara extensions: Region classification
  region VARCHAR,                        -- Bay of Bengal|Arabian Sea|Andaman Sea|etc.
  stationId VARCHAR,                     -- Monitoring station reference

  -- Darwin Core: Sampling details
  samplingProtocol VARCHAR,              -- How data was collected
  samplingEffort VARCHAR,                -- Effort description (e.g., '10 trawls')
  fieldNumber VARCHAR,                   -- Field notebook/trip reference

  -- Darwin Core: Record basis
  basisOfRecord VARCHAR,                 -- PreservedSpecimen|HumanObservation|MachineObservation|etc.
  occurrenceStatus VARCHAR DEFAULT 'present', -- present|absent

  -- Darwin Core: Related resources
  datasetName VARCHAR,                   -- Dataset this record belongs to
  datasetID VARCHAR,                     -- UUID of dataset
  institutionCode VARCHAR,               -- Museum/institution shortcode
  collectionCode VARCHAR,                -- Collection within institution

  -- Ratnakara extensions: Data type classification
  dataType VARCHAR,                      -- ocean|fisheries|edna|otolith|genetic
  dataSource VARCHAR,                    -- WoRMS|FAO|NOAA|upload|manual|etc.

  -- Darwin Core compliance
  isHarvestedByGBIF BOOLEAN DEFAULT FALSE, -- Published to GBIF?
  gbifDatasetKey UUID,                   -- GBIF dataset reference
  remarks TEXT                           -- Additional notes
);

-- Indexes for performance
CREATE INDEX idx_occurrences_species ON occurrences(scientificName);
CREATE INDEX idx_occurrences_date ON occurrences(eventDate);
CREATE INDEX idx_occurrences_location ON occurrences(decimalLatitude, decimalLongitude);
CREATE INDEX idx_occurrences_region ON occurrences(region);
CREATE INDEX idx_occurrences_datatype ON occurrences(dataType);
CREATE INDEX idx_occurrences_occurrence_id ON occurrences(occurrenceID);

-- ============================================================================
-- ENVIRONMENTAL MEASUREMENTS TABLE
-- ============================================================================
CREATE TABLE environmental_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT NOW(),

  -- Link to occurrence
  occurrenceID VARCHAR NOT NULL REFERENCES occurrences(occurrenceID) ON DELETE CASCADE,

  -- Oceanographic parameters
  temperature_celsius DECIMAL(5,2),
  salinity_psu DECIMAL(5,2),
  ph DECIMAL(4,2),
  dissolved_oxygen_mg_per_l DECIMAL(6,2),
  dissolved_oxygen_percent DECIMAL(5,2),

  -- Location-specific
  depth_metres INTEGER,
  pressure_decibars INTEGER,

  -- Additional parameters (optional)
  chlorophyll_a_mg_m3 DECIMAL(8,4),     -- Phytoplankton proxy
  turbidity_ntu DECIMAL(8,2),            -- Water clarity
  conductivity_ms_cm DECIMAL(8,4),       -- Salinity alternative

  -- Quality flags
  measurement_quality VARCHAR,           -- excellent|good|moderate|poor

  CONSTRAINT check_temp CHECK (temperature_celsius IS NULL OR temperature_celsius >= -2 AND temperature_celsius <= 50),
  CONSTRAINT check_salinity CHECK (salinity_psu IS NULL OR salinity_psu >= 0 AND salinity_psu <= 45),
  CONSTRAINT check_ph CHECK (ph IS NULL OR ph >= 6.5 AND ph <= 8.5),
  CONSTRAINT check_oxygen CHECK (dissolved_oxygen_mg_per_l IS NULL OR dissolved_oxygen_mg_per_l >= 0 AND dissolved_oxygen_mg_per_l <= 15)
);

CREATE INDEX idx_env_measurements_occurrence ON environmental_measurements(occurrenceID);
CREATE INDEX idx_env_measurements_date ON environmental_measurements(created_at);

-- ============================================================================
-- eDNA OBSERVATIONS TABLE (Darwin Core eDNA extension)
-- ============================================================================
CREATE TABLE edna_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT NOW(),

  -- Link to occurrence
  occurrenceID VARCHAR NOT NULL REFERENCES occurrences(occurrenceID) ON DELETE CASCADE,

  -- eDNA specific
  edna_concentration_per_litre DECIMAL(10,4),  -- Copies per litre
  detection_confidence DECIMAL(5,2),           -- 0-100% confidence
  depth_metres INTEGER,

  -- Season (for Indian monsoon)
  season VARCHAR,  -- Winter|Spring|Summer|Monsoon

  -- Quality metrics
  pcr_replicates INTEGER,                -- Number of replicates
  detection_method VARCHAR,              -- qPCR|ddPCR|high-throughput sequencing

  CONSTRAINT check_edna_concentration CHECK (edna_concentration_per_litre >= 0),
  CONSTRAINT check_edna_confidence CHECK (detection_confidence >= 0 AND detection_confidence <= 100)
);

CREATE INDEX idx_edna_occurrence ON edna_observations(occurrenceID);
CREATE INDEX idx_edna_season ON edna_observations(season);

-- ============================================================================
-- DNA SEQUENCES TABLE (Raw sequence storage)
-- ============================================================================
CREATE TABLE dna_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Link to occurrence
  occurrenceID VARCHAR NOT NULL REFERENCES occurrences(occurrenceID) ON DELETE CASCADE,

  -- Sequence identification
  sequenceIdentifier VARCHAR UNIQUE NOT NULL,  -- NCBI style ID (e.g., MZ123456)
  sequenceAccession VARCHAR,                   -- NCBI accession number

  -- Sequence metadata
  sequenceFormat VARCHAR DEFAULT 'FASTA',      -- FASTA|FASTQ|Genbank
  sequenceLength INTEGER NOT NULL,             -- Base pairs
  gene VARCHAR NOT NULL,                       -- 16S|COX1|ITS|rbcL|matK|etc.
  gene_region VARCHAR,                        -- V3-V4|full-length|etc.

  -- Sequence composition
  gc_content DECIMAL(5,2),                     -- GC percentage (0-100)
  nucleotide_counts JSONB,                     -- {A: 1000, T: 1100, G: 800, C: 900}

  -- Raw sequence (can be large)
  fasta_sequence TEXT NOT NULL,                -- Full FASTA format

  -- Sequence quality
  sequence_quality INTEGER,                    -- Phred score (0-40)
  quality_trimmed BOOLEAN DEFAULT FALSE,       -- Pre-processed?

  -- Taxonomic analysis (cached)
  taxonomic_identification VARCHAR,            -- Top BLAST hit (species)
  blast_evalue DECIMAL(15,4),                 -- E-value score
  blast_identity_percent DECIMAL(5,2),        -- % sequence identity
  blast_query_coverage DECIMAL(5,2),          -- % coverage
  blast_run_date TIMESTAMP,                   -- When BLAST was run

  -- Additional annotations
  functional_annotation VARCHAR,              -- What does this gene do
  organism_source VARCHAR,                    -- Muscle tissue|gill|etc.

  -- Storage metadata
  file_path VARCHAR,                          -- S3/filesystem path (Phase 2)
  file_size_bytes INTEGER,
  checksumMD5 VARCHAR,                        -- For integrity verification

  -- Standards compliance
  submitted_to_ncbi BOOLEAN DEFAULT FALSE,    -- Published to GenBank?
  ncbi_submission_id VARCHAR,

  CONSTRAINT check_gc_content CHECK (gc_content IS NULL OR gc_content >= 0 AND gc_content <= 100),
  CONSTRAINT check_sequence_quality CHECK (sequence_quality IS NULL OR sequence_quality >= 0 AND sequence_quality <= 40)
);

CREATE INDEX idx_dna_sequence_id ON dna_sequences(sequenceIdentifier);
CREATE INDEX idx_dna_gene ON dna_sequences(gene);
CREATE INDEX idx_dna_occurrence ON dna_sequences(occurrenceID);
CREATE INDEX idx_dna_taxonomic ON dna_sequences(taxonomic_identification);

-- ============================================================================
-- OTOLITH RECORDS TABLE (Fish age & biogeochemistry)
-- ============================================================================
CREATE TABLE otolith_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT NOW(),

  -- Link to occurrence (fish this otolith came from)
  occurrenceID VARCHAR NOT NULL REFERENCES occurrences(occurrenceID) ON DELETE CASCADE,

  -- Fish identification
  fish_id VARCHAR UNIQUE,                     -- Specimen number
  fish_total_length_cm DECIMAL(6,2),          -- Fork length
  fish_weight_g DECIMAL(8,2),

  -- Age determination
  age_years INTEGER NOT NULL,                 -- Age estimate
  age_confidence VARCHAR,                     -- high|medium|low
  growth_ring_count INTEGER,                  -- Number of annuli

  -- Growth analysis
  increment_widths_micrometers INTEGER[],    -- Array of growth ring widths
  back_calculated_lengths_cm DECIMAL(6,2)[],  -- Estimated lengths at each age

  -- OTOLITH CHEMISTRY (Elemental composition - ppb = parts per billion)
  sr_ca_ratio DECIMAL(10,6),                 -- Strontium/Calcium (water salinity proxy)
  pb_concentration_ppb DECIMAL(10,6),        -- Lead (anthropogenic pollution)
  ba_concentration_ppb DECIMAL(10,6),        -- Barium (coastal nearfield proxy)
  zn_concentration_ppb DECIMAL(10,6),        -- Zinc (heavy metal)
  mg_concentration_ppb DECIMAL(10,6),        -- Magnesium (metabolic indicator)
  mn_concentration_ppb DECIMAL(10,6),        -- Manganese
  fe_concentration_ppb DECIMAL(10,6),        -- Iron

  -- ISOTOPE COMPOSITION (per mil, VPDB or VSMOW standards)
  delta_18_o_permil DECIMAL(10,6),           -- δ18O (oxygen isotope - temperature proxy)
  delta_13_c_permil DECIMAL(10,6),           -- δ13C (carbon isotope - carbon source)
  delta_d_permil DECIMAL(10,6),              -- δD (deuterium - water source)

  -- Temperature inference (from oxygen isotopes)
  temperature_inferred_celsius DECIMAL(5,2),  -- Calculated from δ18O
  salinity_inferred_psu DECIMAL(5,2),         -- Calculated from Sr/Ca

  -- Otolith morphology
  otolith_width_mm DECIMAL(8,2),
  otolith_height_mm DECIMAL(8,2),
  otolith_thickness_mm DECIMAL(8,2),
  otolith_weight_mg DECIMAL(8,2),

  -- Microstructure quality
  otolith_preservation VARCHAR,              -- clear|moderate|degraded|dissolved
  microstructure_clarity VARCHAR,            -- excellent|good|fair|poor
  resorption_present BOOLEAN DEFAULT FALSE,  -- Indicates stress/starvation

  -- Collection details
  collection_location VARCHAR,               -- Where extracted
  collection_method VARCHAR,                 -- Sectioned|polished|whole|etc.
  analyst_name VARCHAR,
  analysis_laboratory VARCHAR,

  -- Quality assurance
  standard_reference_material_analyzed BOOLEAN,
  duplicates_analyzed INTEGER,               -- How many duplicates run

  CONSTRAINT check_sr_ca CHECK (sr_ca_ratio >= 0),
  CONSTRAINT check_pb CHECK (pb_concentration_ppb >= 0),
  CONSTRAINT check_temp_inferred CHECK (temperature_inferred_celsius IS NULL OR (temperature_inferred_celsius >= -2 AND temperature_inferred_celsius <= 50))
);

CREATE INDEX idx_otolith_occurrence ON otolith_records(occurrenceID);
CREATE INDEX idx_otolith_age ON otolith_records(age_years);
CREATE INDEX idx_otolith_fish_id ON otolith_records(fish_id);

-- ============================================================================
-- ANOMALIES TABLE (Detected by analytics)
-- ============================================================================
CREATE TABLE anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT NOW(),

  -- Reference to occurrence
  occurrenceID VARCHAR NOT NULL REFERENCES occurrences(occurrenceID) ON DELETE CASCADE,

  -- Anomaly details
  parameter VARCHAR NOT NULL,                -- temperature|salinity|ph|oxygen|edna|etc.
  measured_value DECIMAL(10,6) NOT NULL,

  -- Statistical measures
  expected_value DECIMAL(10,6),              -- Expected based on historical data
  z_score DECIMAL(8,2),                      -- Standard deviations from mean
  percentile_rank DECIMAL(5,2),              -- Percentile (0-100)

  -- Classification
  anomaly_type VARCHAR,                      -- outlier|threshold_exceeded|temporal_spike|seasonal_anomaly
  anomaly_severity VARCHAR,                  -- warning|critical|severe
  alert_level VARCHAR DEFAULT 'warning',     -- warning|critical|disabled

  -- Context
  lookback_period_days INTEGER,              -- How many days of history used
  baseline_mean DECIMAL(10,6),               -- Mean value used for comparison
  baseline_std_dev DECIMAL(10,6),            -- Std dev used

  -- Follow-up
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by VARCHAR,
  acknowledged_at TIMESTAMP,
  notes TEXT
);

CREATE INDEX idx_anomalies_parameter ON anomalies(parameter);
CREATE INDEX idx_anomalies_alert_level ON anomalies(alert_level);
CREATE INDEX idx_anomalies_occurrence ON anomalies(occurrenceID);
CREATE INDEX idx_anomalies_created ON anomalies(created_at);

-- ============================================================================
-- FISHER OBSERVATIONS TABLE (Fisheries data extension)
-- ============================================================================
CREATE TABLE fisher_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT NOW(),

  -- Link to occurrence
  occurrenceID VARCHAR NOT NULL REFERENCES occurrences(occurrenceID) ON DELETE CASCADE,

  -- Catch data
  catch_weight_kg DECIMAL(10,2) NOT NULL,
  catch_abundance INTEGER,                   -- Number of individuals

  -- Effort
  fishing_effort_hours DECIMAL(8,2),
  catch_per_unit_effort_kg DECIMAL(10,4),    -- CPUE (efficiency metric)

  -- Fishing method
  fishing_gear VARCHAR,                      -- Trawl|Gillnet|Hook|Trap|etc.
  fishing_zone VARCHAR,

  -- Biodiversity metrics
  species_diversity_index DECIMAL(5,3),      -- Shannon/Simpson index
  species_richness INTEGER,                  -- How many species caught

  -- Economic value (optional)
  market_value_usd DECIMAL(10,2),

  CONSTRAINT check_catch_weight CHECK (catch_weight_kg >= 0)
);

CREATE INDEX idx_fisher_occurrence ON fisher_observations(occurrenceID);

-- ============================================================================
-- SPATIAL INDEX (for geographic queries)
-- ============================================================================
ALTER TABLE occurrences ADD COLUMN geom GEOMETRY(POINT, 4326);
CREATE INDEX idx_occurrences_geom ON occurrences USING GIST(geom);

-- Function to update geometry from lat/lon
CREATE OR REPLACE FUNCTION update_occurrences_geom()
RETURNS TRIGGER AS $$
BEGIN
  NEW.geom := ST_SetSRID(ST_MakePoint(NEW.decimalLongitude, NEW.decimalLatitude), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_occurrences_geom
BEFORE INSERT OR UPDATE ON occurrences
FOR EACH ROW
EXECUTE FUNCTION update_occurrences_geom();

-- ============================================================================
-- VIEWS FOR BACKWARD COMPATIBILITY (with old schema)
-- ============================================================================

-- Ocean data view (backward compatible)
CREATE VIEW ocean_data AS
SELECT
  id,
  'station_' || SUBSTRING(occurrenceID, 1, 8) as location,
  decimalLatitude as latitude,
  decimalLongitude as longitude,
  (SELECT temperature_celsius FROM environmental_measurements WHERE environmental_measurements.occurrenceID = occurrences.occurrenceID LIMIT 1) as temperature,
  (SELECT salinity_psu FROM environmental_measurements WHERE environmental_measurements.occurrenceID = occurrences.occurrenceID LIMIT 1) as salinity,
  (SELECT ph FROM environmental_measurements WHERE environmental_measurements.occurrenceID = occurrences.occurrenceID LIMIT 1) as ph,
  (SELECT dissolved_oxygen_mg_per_l FROM environmental_measurements WHERE environmental_measurements.occurrenceID = occurrences.occurrenceID LIMIT 1) as oxygen,
  (SELECT depth_metres FROM environmental_measurements WHERE environmental_measurements.occurrenceID = occurrences.occurrenceID LIMIT 1) as depth,
  eventDate as recorded_at,
  region
FROM occurrences
WHERE dataType = 'ocean';

-- Fisheries data view (backward compatible)
CREATE VIEW fisheries_data AS
SELECT
  id,
  scientificName as species,
  '' as common_name,
  (SELECT catch_abundance FROM fisher_observations WHERE fisher_observations.occurrenceID = occurrences.occurrenceID LIMIT 1) as abundance,
  (SELECT catch_weight_kg FROM fisher_observations WHERE fisher_observations.occurrenceID = occurrences.occurrenceID LIMIT 1) as biomass,
  locality as location,
  decimalLatitude as latitude,
  decimalLongitude as longitude,
  region,
  eventDate as recorded_at,
  (SELECT species_diversity_index FROM fisher_observations WHERE fisher_observations.occurrenceID = occurrences.occurrenceID LIMIT 1) as diversity_index
FROM occurrences
WHERE dataType = 'fisheries';

-- eDNA data view (backward compatible)
CREATE VIEW edna_data AS
SELECT
  id,
  scientificName as species,
  (SELECT edna_concentration_per_litre FROM edna_observations WHERE edna_observations.occurrenceID = occurrences.occurrenceID LIMIT 1) as concentration,
  (SELECT depth_metres FROM edna_observations WHERE edna_observations.occurrenceID = occurrences.occurrenceID LIMIT 1) as depth,
  locality as location,
  decimalLatitude as latitude,
  decimalLongitude as longitude,
  (SELECT detection_confidence FROM edna_observations WHERE edna_observations.occurrenceID = occurrences.occurrenceID LIMIT 1) as confidence,
  (SELECT season FROM edna_observations WHERE edna_observations.occurrenceID = occurrences.occurrenceID LIMIT 1) as season,
  eventDate as recorded_at,
  region
FROM occurrences
WHERE dataType = 'edna';

-- ============================================================================
-- FINAL MIGRATION NOTES
-- ============================================================================
-- Migration Plan:
--   1. Old ocean_data → occurrences with dataType='ocean' + environmental_measurements
--   2. Old fisheries_data → occurrences with dataType='fisheries' + fisher_observations
--   3. Old edna_data → occurrences with dataType='edna' + edna_observations
--   4. Views provide backward compatibility for existing queries
--   5. Recommend updating application code to use new occurrence-based structure
