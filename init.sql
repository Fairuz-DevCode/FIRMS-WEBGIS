-- Database & Schema Initialization Script for NASA FIRMS Hotspot Dataset (PostgreSQL + PostGIS)

-- Enable PostGIS Extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create hotspots table
CREATE TABLE IF NOT EXISTS hotspots (
    id SERIAL PRIMARY KEY,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    brightness DOUBLE PRECISION,
    acq_date DATE NOT NULL,
    acq_time VARCHAR(10),
    confidence VARCHAR(10),
    frp DOUBLE PRECISION,
    geom GEOMETRY(Point, 4326)
);

-- Indexes for spatial and attribute query performance
CREATE INDEX IF NOT EXISTS idx_hotspots_acq_date ON hotspots(acq_date);
CREATE INDEX IF NOT EXISTS idx_hotspots_confidence ON hotspots(confidence);
CREATE INDEX IF NOT EXISTS idx_hotspots_coords ON hotspots(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_hotspots_geom ON hotspots USING GIST (geom);

-- Bulk load CSV dataset if mounted
COPY hotspots(latitude, longitude, brightness, acq_date, acq_time, confidence, frp)
FROM '/docker-entrypoint-initdb.d/hotspots_7years_clean.csv'
WITH (FORMAT csv, HEADER true, DELIMITER ',');

-- Populate geometry column from latitude & longitude
UPDATE hotspots
SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
WHERE geom IS NULL;
