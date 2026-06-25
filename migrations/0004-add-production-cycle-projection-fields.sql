-- Add optional yield and price projection fields to production cycles.
-- These values are entered after cycle creation from the cycle detail page.

SET @db_name = DATABASE();

SET @has_expected_yield = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'production_cycles'
    AND COLUMN_NAME = 'expected_yield'
);

SET @sql = IF(
  @has_expected_yield = 0,
  'ALTER TABLE `production_cycles` ADD COLUMN `expected_yield` DECIMAL(10,2) NULL AFTER `total_yield_kg`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_expected_price_per_kg = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'production_cycles'
    AND COLUMN_NAME = 'expected_price_per_kg'
);

SET @sql = IF(
  @has_expected_price_per_kg = 0,
  'ALTER TABLE `production_cycles` ADD COLUMN `expected_price_per_kg` DECIMAL(10,2) NULL AFTER `expected_yield`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_actual_yield = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'production_cycles'
    AND COLUMN_NAME = 'actual_yield'
);

SET @sql = IF(
  @has_actual_yield = 0,
  'ALTER TABLE `production_cycles` ADD COLUMN `actual_yield` DECIMAL(10,2) NULL AFTER `expected_price_per_kg`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_actual_price_per_kg = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'production_cycles'
    AND COLUMN_NAME = 'actual_price_per_kg'
);

SET @sql = IF(
  @has_actual_price_per_kg = 0,
  'ALTER TABLE `production_cycles` ADD COLUMN `actual_price_per_kg` DECIMAL(10,2) NULL AFTER `actual_yield`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
