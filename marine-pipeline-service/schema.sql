-- Marine Data Platform - Production Schema
-- Compatible with Supabase/Neon PostgreSQL

-- Enable PostGIS for geospatial data
CREATE EXTENSION IF NOT EXISTS postgis;

-- Taxonomy table (GBIF data)
CREATE TABLE IF NOT EXISTS taxonomy (
    id SERIAL PRIMARY KEY,
    species VARCHAR(255) UNIQUE NOT NULL,
    kingdom VARCHAR(100),
    phylum VARCHAR(100),
    class_name VARCHAR(100),
    order_name VARCHAR(100),
    family VARCHAR(100),
    genus VARCHAR(100),
    gbif_species_key INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_taxonomy_species ON taxonomy(species);

-- Ocean Data table (NOAA real data)
CREATE TABLE IF NOT EXISTS ocean_data (
    id SERIAL PRIMARY KEY,
    station_id VARCHAR(50),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    temperature DOUBLE PRECISION,
    salinity DOUBLE PRECISION,
    ph DOUBLE PRECISION,
    oxygen DOUBLE PRECISION,
    wave_height DOUBLE PRECISION,
    wind_speed DOUBLE PRECISION,
    source VARCHAR(100) DEFAULT 'NOAA',
    geom GEOMETRY(POINT, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ocean_data_recorded_at ON ocean_data(recorded_at);
CREATE INDEX idx_ocean_data_station ON ocean_data(station_id);
CREATE INDEX idx_ocean_data_geom ON ocean_data USING GIST(geom);

-- Fisheries Data table (Mock generated)
CREATE TABLE IF NOT EXISTS fisheries_data (
    id SERIAL PRIMARY KEY,
    species VARCHAR(255) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    abundance INTEGER NOT NULL,
    biomass DOUBLE PRECISION NOT NULL,
    diversity_index DOUBLE PRECISION NOT NULL,
    region VARCHAR(100) NOT NULL,
    source VARCHAR(100) DEFAULT 'MOCK',
    taxonomy_id INTEGER REFERENCES taxonomy(id),
    geom GEOMETRY(POINT, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_fisheries_data_recorded_at ON fisheries_data(recorded_at);
CREATE INDEX idx_fisheries_data_species ON fisheries_data(species);
CREATE INDEX idx_fisheries_data_geom ON fisheries_data USING GIST(geom);

-- eDNA Data table (Smart mock)
CREATE TABLE IF NOT EXISTS edna_data (
    id SERIAL PRIMARY KEY,
    species VARCHAR(255) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    concentration DOUBLE PRECISION NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    depth INTEGER NOT NULL,
    source VARCHAR(100) DEFAULT 'MOCK',
    taxonomy_id INTEGER REFERENCES taxonomy(id),
    geom GEOMETRY(POINT, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_edna_data_recorded_at ON edna_data(recorded_at);
CREATE INDEX idx_edna_data_species ON edna_data(species);
CREATE INDEX idx_edna_data_geom ON edna_data USING GIST(geom);

-- Correlations table (Auto-generated)
CREATE TABLE IF NOT EXISTS correlations (
    id SERIAL PRIMARY KEY,
    species VARCHAR(255) NOT NULL,
    temperature DOUBLE PRECISION NOT NULL,
    salinity DOUBLE PRECISION NOT NULL,
    abundance INTEGER NOT NULL,
    correlation_coefficient DOUBLE PRECISION NOT NULL,
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_correlations_species ON correlations(species);
CREATE INDEX idx_correlations_computed_at ON correlations(computed_at);

-- Forecasts table (ML predictions)
CREATE TABLE IF NOT EXISTS forecasts (
    id SERIAL PRIMARY KEY,
    species VARCHAR(255) NOT NULL,
    forecasted_abundance DOUBLE PRECISION NOT NULL,
    model_version VARCHAR(50) DEFAULT 'rf_v1',
    forecast_for TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    features JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_forecasts_species ON forecasts(species);
CREATE INDEX idx_forecasts_forecast_for ON forecasts(forecast_for);

-- Ingestion Logs table (Pipeline tracking)
CREATE TABLE IF NOT EXISTS ingestion_logs (
    id SERIAL PRIMARY KEY,
    data_type VARCHAR(50) NOT NULL,
    source VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    records_ingested INTEGER DEFAULT 0,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ingestion_logs_data_type ON ingestion_logs(data_type);
CREATE INDEX idx_ingestion_logs_status ON ingestion_logs(status);
CREATE INDEX idx_ingestion_logs_created_at ON ingestion_logs(created_at);

-- Insert sample taxonomy data
INSERT INTO taxonomy (species, kingdom, phylum, class_name, order_name, family, genus)
VALUES
    ('Thunnus albacares', 'Animalia', 'Chordata', 'Actinopterygii', 'Scombriformes', 'Scombridae', 'Thunnus'),
    ('Katsuwonus pelamis', 'Animalia', 'Chordata', 'Actinopterygii', 'Scombriformes', 'Scombridae', 'Katsuwonus'),
    ('Sardinella longiceps', 'Animalia', 'Chordata', 'Actinopterygii', 'Clupeiformes', 'Clupeidae', 'Sardinella')
ON CONFLICT (species) DO NOTHING;
