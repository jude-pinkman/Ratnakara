import db from '../db/database.js';

const schema = `
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Taxonomy table
CREATE TABLE IF NOT EXISTS taxonomy (
    id SERIAL PRIMARY KEY,
    species VARCHAR(255) UNIQUE NOT NULL,
    kingdom VARCHAR(100),
    phylum VARCHAR(100),
    class_name VARCHAR(100),
    order_name VARCHAR(100),
    family VARCHAR(100),
    genus VARCHAR(100),
    common_name VARCHAR(255),
    gbif_species_key INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_taxonomy_species ON taxonomy(species);

-- Ocean Data table
CREATE TABLE IF NOT EXISTS ocean_data (
    id SERIAL PRIMARY KEY,
    location VARCHAR(255),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    temperature DOUBLE PRECISION,
    salinity DOUBLE PRECISION,
    ph DOUBLE PRECISION,
    oxygen DOUBLE PRECISION,
    depth DOUBLE PRECISION,
    region VARCHAR(100),
    source VARCHAR(100) DEFAULT 'NOAA',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ocean_data_recorded_at ON ocean_data(recorded_at);
CREATE INDEX IF NOT EXISTS idx_ocean_data_location ON ocean_data(location);

-- Fisheries Data table
CREATE TABLE IF NOT EXISTS fisheries_data (
    id SERIAL PRIMARY KEY,
    species VARCHAR(255) NOT NULL,
    common_name VARCHAR(255),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    abundance INTEGER NOT NULL,
    biomass DOUBLE PRECISION NOT NULL,
    diversity_index DOUBLE PRECISION,
    region VARCHAR(100),
    location VARCHAR(255),
    source VARCHAR(100) DEFAULT 'MOCK',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fisheries_data_recorded_at ON fisheries_data(recorded_at);
CREATE INDEX IF NOT EXISTS idx_fisheries_data_species ON fisheries_data(species);

-- eDNA Data table
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_edna_data_recorded_at ON edna_data(recorded_at);
CREATE INDEX IF NOT EXISTS idx_edna_data_species ON edna_data(species);

-- Correlations table
CREATE TABLE IF NOT EXISTS correlations (
    id SERIAL PRIMARY KEY,
    species VARCHAR(255) NOT NULL,
    temperature DOUBLE PRECISION NOT NULL,
    salinity DOUBLE PRECISION NOT NULL,
    ph DOUBLE PRECISION,
    oxygen DOUBLE PRECISION,
    abundance INTEGER NOT NULL,
    correlation_coefficient DOUBLE PRECISION NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_correlations_species ON correlations(species);
CREATE INDEX IF NOT EXISTS idx_correlations_recorded_at ON correlations(recorded_at);

-- Forecasts table
CREATE TABLE IF NOT EXISTS forecasts (
    id SERIAL PRIMARY KEY,
    species VARCHAR(255) NOT NULL,
    forecasted_abundance DOUBLE PRECISION NOT NULL,
    model_version VARCHAR(50) DEFAULT 'v1.0',
    forecast_for TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forecasts_species ON forecasts(species);
CREATE INDEX IF NOT EXISTS idx_forecasts_forecast_for ON forecasts(forecast_for);
`;

export async function initializeDatabase() {
  try {
    console.log('Initializing database schema...');

    // Split schema into individual statements and execute
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    for (const statement of statements) {
      try {
        await db.query(statement);
        console.log('✓ Executed:', statement.substring(0, 50) + '...');
      } catch (error: any) {
        // Ignore "already exists" errors
        if (!error.message.includes('already exists')) {
          console.error('Statement error:', error.message);
        }
      }
    }

    console.log('✓ Database schema initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    return false;
  }
}

export default initializeDatabase;
