# 🌊 Marine Data Platform - Data Pipeline Guide

## Overview

This guide explains how data flows from APIs (NOAA, GBIF) and mock generators into your Neon PostgreSQL database, with complete field mapping validation.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATA SOURCES                             │
├─────────────────────────────────────────────────────────────────┤
│  NOAA API (Real)    │ GBIF API (Taxonomy)  │ Mock Generators    │
│  - Ocean buoys      │ - Species data       │ - Fisheries        │
│  - Temperature      │ - Taxonomy           │ - eDNA             │
│  - Salinity         │                      │                    │
│  - Wave height      │                      │                    │
└───────────┬──────────────────┬──────────────────────┬───────────┘
            │                  │                      │
            └──────────────────┼──────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                 DATA PIPELINES (Python)                         │
├─────────────────────────────────────────────────────────────────┤
│  • noaa_pipeline.py      - NOAA buoy data ingestion             │
│  • taxonomy_fetcher.py   - GBIF taxonomy lookup                 │
│  • fisheries_generator.py - Mock fisheries generation           │
│  • edna_generator.py     - Mock eDNA generation                 │
│  • correlation_generator.py - Correlate oceanographic data      │
│  • orchestrator.py       - Schedule runs (hourly by default)    │
└───────────┬──────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│             NEON PostgreSQL Database                            │
├─────────────────────────────────────────────────────────────────┤
│  • ocean_data         - Real NOAA measurements                  │
│  • fisheries_data     - Mock species abundance                  │
│  • edna_data          - Mock eDNA concentrations                │
│  • taxonomy           - Species taxonomy                        │
│  • correlations       - Computed correlations                   │
│  • forecasts          - ML predictions                          │
│  • ingestion_logs     - Pipeline run logs                       │
└───────────┬──────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Node.js API (backend)                              │
├─────────────────────────────────────────────────────────────────┤
│  REST endpoints for all data queries                            │
│  • /api/ocean          - Ocean data                             │
│  • /api/fisheries      - Fisheries data                         │
│  • /api/edna           - eDNA data                              │
│  • /api/taxonomy       - Taxonomy lookup                        │
│  • /api/correlations   - Correlations                           │
└───────────┬──────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│            Next.js Dashboard (frontend)                         │
├─────────────────────────────────────────────────────────────────┤
│  • Dashboard - Live data visualization                          │
│  • Explorer - Interactive data browser                          │
│  • Correlations - Statistical analysis                          │
└─────────────────────────────────────────────────────────────────┘
```

## Complete Field Mapping

### 1. NOAA Ocean Data Pipeline

**Source**: NOAA NDBC (National Data Buoy Center)
**Endpoint**: https://www.ndbc.noaa.gov/data/realtime2/{station_id}.txt
**Stations Monitored**:
- 41037 (South of Bermuda, 27.5°N, -75.0°W)
- 41001 (East of Cape Hatteras, 34.7°N, -72.7°W)
- 46050 (Oregon Coast, 44.7°N, -124.5°W)
- 51003 (Hawaii, 19.2°N, -160.6°W)

**Field Mapping**:

| DB Column | SQL Type | Source Field | Transformation | Validation |
|-----------|----------|--------------|-----------------|------------|
| id | SERIAL | - | Auto-increment primary key | - |
| station_id | VARCHAR | Hardcoded | Station ID from STATIONS list | Not null |
| latitude | DOUBLE PRECISION | Hardcoded | Station latitude | Not null |
| longitude | DOUBLE PRECISION | Hardcoded | Station longitude | Not null |
| recorded_at | TIMESTAMP WITH TIME ZONE | #YY, MM, DD, hh, mm | Combined & parsed to ISO8601 | Not null |
| temperature | DOUBLE PRECISION | WTMP | Numeric conversion, 999/99→NULL | Optional |
| salinity | DOUBLE PRECISION | SAL | Numeric conversion, 999/99→NULL | Optional |
| ph | DOUBLE PRECISION | - | Not currently fetched | Optional |
| oxygen | DOUBLE PRECISION | - | Not currently fetched | Optional |
| wave_height | DOUBLE PRECISION | WVHT | Numeric conversion, 999/99→NULL | Optional |
| wind_speed | DOUBLE PRECISION | WSPD | Numeric conversion, 999/99→NULL | Optional |
| source | VARCHAR | (constant) | Always "NOAA_NDBC" | Not null |
| geom | GEOMETRY(POINT, 4326) | latitude, longitude | PostGIS point from coords | Optional |
| created_at | TIMESTAMP WITH TIME ZONE | - | Current server time | - |

**Quality Checks**:
- Only records with at least one valid measurement are stored
- NOAA uses 999/99 as "missing data" markers - converted to NULL
- Timestamp must be valid
- At least one weather field must have data

### 2. Taxonomy Data Pipeline

**Source**: GBIF API (Global Biodiversity Information Facility)
**Endpoint**: https://api.gbif.org/v1/species/search
**Initial Data**: Pre-populated with 3 tuna/sardine species

**Field Mapping**:

| DB Column | SQL Type | Source Field | Transformation | Notes |
|-----------|----------|--------------|-----------------|-------|
| id | SERIAL | - | Auto-increment | - |
| species | VARCHAR UNIQUE | canonicalName | Scientific name | Unique constraint |
| kingdom | VARCHAR | kingdom | Taxonomic kingdom | Always "Animalia" for fish |
| phylum | VARCHAR | phylum | Taxonomic phylum | Usually "Chordata" |
| class_name | VARCHAR | class | Taxonomic class | Usually "Actinopterygii" |
| order_name | VARCHAR | order | Taxonomic order | e.g., "Scombriformes" |
| family | VARCHAR | family | Taxonomic family | e.g., "Scombridae" |
| genus | VARCHAR | genus | Taxonomic genus | e.g., "Thunnus" |
| gbif_species_key | INTEGER | key | GBIF species identifier | Used for API lookups |
| created_at | TIMESTAMP WITH TIME ZONE | - | Current server time | - |

**ON CONFLICT Behavior**:
- If species already exists, skip (don't update)
- Use for safe re-runs without duplicate key errors

### 3. Fisheries Mock Generator

**Source**: Generated intelligently based on ocean conditions
**Logic**: Simulates fish abundance constrained by temperature

**Field Mapping**:

| DB Column | SQL Type | Source | Transformation | Dependencies |
|-----------|----------|--------|-----------------|--------------|
| id | SERIAL | - | Auto-increment | - |
| species | VARCHAR | SPECIES_REGIONS | Species name from list | Must match taxonomy |
| latitude | DOUBLE PRECISION | ocean_data | From correlated ocean record | Requires ocean_data |
| longitude | DOUBLE PRECISION | ocean_data | From correlated ocean record | Requires ocean_data |
| recorded_at | TIMESTAMP WITH TIME ZONE | ocean_data | From ocean record | Requires ocean_data |
| abundance | INTEGER | Generated | Gaussian around optimal temp | Formula: temp_factor * 1000 |
| biomass | DOUBLE PRECISION | Generated | Random 0.5-1.5x abundance | abundance * random(0.5, 1.5) |
| diversity_index | DOUBLE PRECISION | Generated | Shannon diversity metric | random(1.5, 4.0) |
| region | VARCHAR | SPECIES_REGIONS | Geographic region name | Hardcoded per species |
| source | VARCHAR | (constant) | Provider identifier | Always "MOCK" |
| taxonomy_id | INTEGER | taxonomy | Foreign key reference | Must exist in taxonomy |
| geom | GEOMETRY(POINT, 4326) | latitude, longitude | PostGIS point | Generated from coords |
| created_at | TIMESTAMP WITH TIME ZONE | - | Current server time | - |

**Temperature Correlation Species**:
```python
SPECIES_REGIONS = [
    {"species": "Tuna", "region": "Arabian Sea", "temp_range": (24, 30)},
    {"species": "Skipjack Tuna", "region": "Pacific Ocean", "temp_range": (20, 28)},
    {"species": "Yellowfin Tuna", "region": "Indian Ocean", "temp_range": (22, 29)},
    {"species": "Sardine", "region": "Mediterranean Sea", "temp_range": (15, 22)},
    {"species": "Mackerel", "region": "Atlantic Ocean", "temp_range": (10, 20)},
]
```

**Generation Algorithm**:
1. Fetch ocean_data from last 24 hours
2. For each ocean record, find suitable species (temperature match)
3. Calculate abundance: `1 - abs(temp - optimal) / 10` (scaled to 0-1)
4. Abundance = abundance_factor × 1000 (integer count)
5. Generate biomass and diversity randomly
6. Store with ocean coordinates and timestamp

### 4. eDNA Mock Generator

**Source**: Generated based on fisheries data
**Logic**: Simulates environmental DNA detection correlated with fish presence

**Field Mapping**:

| DB Column | SQL Type | Source | Transformation | Dependencies |
|-----------|----------|--------|-----------------|--------------|
| id | SERIAL | - | Auto-increment | - |
| species | VARCHAR | fisheries_data | Species name | Requires fisheries_data |
| latitude | DOUBLE PRECISION | fisheries_data | From fisheries location | Requires fisheries_data |
| longitude | DOUBLE PRECISION | fisheries_data | From fisheries location | Requires fisheries_data |
| recorded_at | TIMESTAMP WITH TIME ZONE | Generated | Random within 24h window | Uses current timestamp |
| concentration | DOUBLE PRECISION | Generated | Concentration in units/ml | Correlated with abundance |
| confidence | DOUBLE PRECISION | Generated | Confidence score 0-1 | quality_factor |
| depth | INTEGER | Generated | Sampling depth in meters | Random 0-500m |
| source | VARCHAR | (constant) | Provider identifier | Always "MOCK" |
| taxonomy_id | INTEGER | taxonomy | Foreign key reference | Must exist in taxonomy |
| geom | GEOMETRY(POINT, 4326) | latitude, longitude | PostGIS point | Generated from coords |
| created_at | TIMESTAMP WITH TIME ZONE | - | Current server time | - |

**Generation Algorithm**:
1. Fetch fisheries_data from last 24 hours
2. For each fisheries record:
   - Copy species and location
   - Generate concentration correlated with abundance
   - Generate confidence score (0.6-0.95)
   - Random depth (10-500m)
   - Timestamp within fisheries record ±12 hours

### 5. Correlations Generator

**Source**: Calculated from ocean_data + fisheries_data
**Purpose**: Pre-compute statistical correlations for performance

**Field Mapping**:

| DB Column | SQL Type | Source | Calculation | Updates |
|-----------|----------|--------|-------------|---------|
| id | SERIAL | - | Auto-increment | - |
| species | VARCHAR | fisheries_data | Species name | Hourly |
| temperature | DOUBLE PRECISION | ocean_data | Mean ocean temp | Recalculated |
| salinity | DOUBLE PRECISION | ocean_data | Mean ocean salinity | Recalculated |
| abundance | INTEGER | fisheries_data | Mean abundance | Recalculated |
| correlation_coefficient | DOUBLE PRECISION | Computed | Pearson correlation | Updated |
| computed_at | TIMESTAMP WITH TIME ZONE | Generated | Query execution time | Updated |

**Calculation Process**:
1. Fetch ocean_data and fisheries_data from last 7 days
2. For each species, calculate:
   - Mean temperature, salinity, abundance
   - Pearson correlation coefficient (temperature vs abundance)
3. Store for dashboard performance optimization
4. Update hourly via orchestrator

## Field Validation Rules

### Type Coercion
```python
# Numeric fields
pd.to_numeric(value, errors='coerce')  # Invalid→NaN→NULL

# Timestamps
pd.to_datetime(string, format='%Y-%m-%d %H:%M')

# Special handling
999, 99 → NULL  # NOAA missing data markers
```

### Constraints
- `NOT NULL`: id, recorded_at, latitude, longitude, source
- `UNIQUE`: species in taxonomy table
- `FOREIGN KEY`: taxonomy_id references taxonomy(id)
- `DEFAULT`: source, created_at

### Validation Checks
- Geography: Latitude ∈ [-90, 90], Longitude ∈ [-180, 180]
- Temperature: Typically [-2, 40]°C for oceans
- Salinity: Typically [0, 40] PSU
- Abundance: Integer > 0
- Confidence: [0, 1] for probabilities

## Pipeline Scheduling

**Orchestrator** (`orchestrator.py`) runs on schedule:

```python
schedule.every(
    int(os.getenv('SCHEDULER_OCEAN_JOB_MINUTES', '60'))
).minutes.do(run_ocean_pipeline)
```

**Default**: Every 60 minutes
1. Run NOAA pipeline (fetch fresh data)
2. Run fisheries generator (correlate)
3. Run eDNA generator (correlate)
4. Run correlation generator
5. Log results to ingestion_logs table

## Error Handling & Logging

All pipeline errors are logged to:
1. **Console**: Real-time monitoring
2. **File**: `pipeline_orchestrator.log`
3. **Database**: `ingestion_logs` table

**Log Record Structure**:
```sql
INSERT INTO ingestion_logs (data_type, source, status, records_ingested, message)
VALUES ('ocean_data', 'NOAA_NDBC', 'SUCCESS', 234, 'Ingested 234 records from 4 stations');
```

## Testing & Validation

### Manual Pipeline Runs

```bash
# Test individual pipelines
cd marine-pipeline-service
python run_pipeline.py noaa
python run_pipeline.py fisheries
python run_pipeline.py edna
python run_pipeline.py taxonomy
python run_pipeline.py correlations

# Run all at once (initial setup)
python run_pipeline.py all

# Start continuous scheduler
python orchestrator.py
```

### Schema Validation

```bash
# Check all field mappings
python schema_validator.py

# Generate documentation
# Creates: FIELD_MAPPING.md
```

### Database Verification

```sql
-- Check data volumes
SELECT 'ocean_data' as table, COUNT(*) as rows FROM ocean_data
UNION ALL
SELECT 'fisheries_data', COUNT(*) FROM fisheries_data
UNION ALL
SELECT 'edna_data', COUNT(*) FROM edna_data;

-- Check recent data
SELECT * FROM ocean_data ORDER BY recorded_at DESC LIMIT 5;

-- Check ingestion logs
SELECT * FROM ingestion_logs ORDER BY created_at DESC LIMIT 20;
```

## Troubleshooting Field Mismatches

### Symptom: NULL values where data expected
**Check**:
1. API returning valid data: `python run_pipeline.py noaa` (check logs)
2. Type coercion: Run `schema_validator.py`
3. Missing data markers: Look for 999/99 in NOAA data

### Symptom: Foreign key constraint errors
**Check**:
1. Taxonomy entries exist: `SELECT COUNT(*) FROM taxonomy;`
2. Species names match: Compare fisheries_data.species with taxonomy.species
3. Insert taxonomy first: `python run_pipeline.py taxonomy`

### Symptom: Geospatial data missing
**Check**:
1. PostGIS enabled: `SELECT extname FROM pg_extension;` (should include postgis)
2. Coordinates valid: Latitude ∈ [-90,90], Longitude ∈ [-180,180]
3. POINT generation: `SELECT ST_AsText(geom) FROM ocean_data LIMIT 1;`

---

**Last Updated**: 2026-03-24
**Version**: Pipeline v2 with field validation
