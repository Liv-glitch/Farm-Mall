-- Agriculture Management Database Initialization Script

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable postgis extension for location data (if needed)
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- Create database if it doesn't exist (handled by Docker)
-- This script runs after the database is created

-- Ensure proper encoding
SET client_encoding = 'UTF8';

-- Create schemas
CREATE SCHEMA IF NOT EXISTS agriculture;

-- Set search path
SET search_path TO agriculture, public;

-- Grant privileges to the application user
GRANT ALL PRIVILEGES ON SCHEMA agriculture TO agriculture_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA agriculture TO agriculture_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA agriculture TO agriculture_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA agriculture TO agriculture_user;

-- Ensure future objects are also granted permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA agriculture GRANT ALL ON TABLES TO agriculture_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA agriculture GRANT ALL ON SEQUENCES TO agriculture_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA agriculture GRANT ALL ON FUNCTIONS TO agriculture_user;

-- Create basic indexes for performance
-- These will be created by Sequelize migrations, but we can add some basic ones here

-- Note: Actual table creation will be handled by Sequelize migrations
-- This script just sets up the database environment

-- Insert basic configuration data if needed
-- This could include default crop varieties, system settings, etc.

COMMIT; 