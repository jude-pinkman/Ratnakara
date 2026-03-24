CREATE TABLE IF NOT EXISTS taxonomy (
    species TEXT PRIMARY KEY,
    kingdom TEXT,
    phylum TEXT,
    class TEXT,
    order_name TEXT,
    family TEXT,
    genus TEXT,
    common_name TEXT,
    description TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_taxonomy_species_unique ON taxonomy (species);

CREATE TABLE IF NOT EXISTS otolith_images (
    id BIGSERIAL PRIMARY KEY,
    species TEXT NOT NULL REFERENCES taxonomy(species) ON UPDATE CASCADE ON DELETE RESTRICT,
    image_path TEXT NOT NULL UNIQUE,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otolith_images_species ON otolith_images (species);

CREATE TABLE IF NOT EXISTS otolith_records (
    id BIGSERIAL PRIMARY KEY,
    species TEXT NOT NULL REFERENCES taxonomy(species) ON UPDATE CASCADE ON DELETE RESTRICT,
    age_years INTEGER,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    location TEXT
);

CREATE INDEX IF NOT EXISTS idx_otolith_records_species ON otolith_records (species);
CREATE INDEX IF NOT EXISTS idx_otolith_records_recorded_at ON otolith_records (recorded_at);

CREATE TABLE IF NOT EXISTS correlations (
    id BIGSERIAL PRIMARY KEY,
    species_name TEXT,
    metric_x TEXT,
    metric_y TEXT,
    value DOUBLE PRECISION,
    sample_size INTEGER,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_correlations_species_name ON correlations (species_name);
CREATE INDEX IF NOT EXISTS idx_correlations_metric_x ON correlations (metric_x);
