-- Marine Data Platform Database Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- Ocean Data
CREATE TABLE ocean_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    temperature DECIMAL(5, 2),
    salinity DECIMAL(5, 2),
    ph DECIMAL(4, 2),
    oxygen DECIMAL(6, 2),
    depth INTEGER,
    recorded_at TIMESTAMP NOT NULL,
    region VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Fisheries Data
CREATE TABLE fisheries_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    species VARCHAR(255) NOT NULL,
    common_name VARCHAR(255),
    abundance INTEGER,
    biomass DECIMAL(10, 2),
    location VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    region VARCHAR(100),
    recorded_at TIMESTAMP NOT NULL,
    diversity_index DECIMAL(5, 3),
    created_at TIMESTAMP DEFAULT NOW()
);

-- eDNA Data
CREATE TABLE edna_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    species VARCHAR(255) NOT NULL,
    concentration DECIMAL(10, 4),
    depth INTEGER,
    location VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    confidence DECIMAL(5, 2),
    season VARCHAR(20),
    recorded_at TIMESTAMP NOT NULL,
    region VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Taxonomy
CREATE TABLE taxonomy (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kingdom VARCHAR(100),
    phylum VARCHAR(100),
    class VARCHAR(100),
    order_name VARCHAR(100),
    family VARCHAR(100),
    genus VARCHAR(100),
    species VARCHAR(255) NOT NULL UNIQUE,
    common_name VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Environmental Correlations
CREATE TABLE correlations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    species VARCHAR(255) NOT NULL,
    temperature DECIMAL(5, 2),
    salinity DECIMAL(5, 2),
    ph DECIMAL(4, 2),
    oxygen DECIMAL(6, 2),
    abundance INTEGER,
    correlation_coefficient DECIMAL(5, 4),
    recorded_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Forecasts
CREATE TABLE forecasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    species VARCHAR(255) NOT NULL,
    forecast_date DATE NOT NULL,
    predicted_abundance INTEGER,
    confidence_interval_low INTEGER,
    confidence_interval_high INTEGER,
    model_version VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Chatbot Logs
CREATE TABLE chatbot_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    session_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_ocean_location ON ocean_data(latitude, longitude);
CREATE INDEX idx_ocean_date ON ocean_data(recorded_at);
CREATE INDEX idx_fisheries_species ON fisheries_data(species);
CREATE INDEX idx_fisheries_location ON fisheries_data(latitude, longitude);
CREATE INDEX idx_edna_species ON edna_data(species);
CREATE INDEX idx_edna_season ON edna_data(season);
CREATE INDEX idx_taxonomy_species ON taxonomy(species);
CREATE INDEX idx_correlations_species ON correlations(species);
