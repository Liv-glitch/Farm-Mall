-- ===========================================================================
-- FarmMall — add crop variety seed cost-per-acre columns for existing DBs
-- ===========================================================================
-- Import AFTER schema.sql/seed.sql only on databases that predate the current
-- baseline or were created from the old Sequelize migration path.
--
-- The app expects:
--   seed_size_1_cost_per_acre
--   seed_size_2_cost_per_acre
--
-- Some older deployments instead have:
--   seed_size_1_cost_per_bag
--   seed_size_2_cost_per_bag
--
-- This migration is safe to re-run. It adds missing per-acre columns and
-- backfills from legacy per-bag values when those legacy columns exist.
-- ===========================================================================

SET @db_name = DATABASE();

SET @has_seed_size_1_cost_per_acre = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'crop_varieties'
    AND COLUMN_NAME = 'seed_size_1_cost_per_acre'
);

SET @sql = IF(
  @has_seed_size_1_cost_per_acre = 0,
  'ALTER TABLE `crop_varieties` ADD COLUMN `seed_size_1_cost_per_acre` DECIMAL(10,2) NULL AFTER `seed_size_2_bags_per_acre`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_seed_size_2_cost_per_acre = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'crop_varieties'
    AND COLUMN_NAME = 'seed_size_2_cost_per_acre'
);

SET @sql = IF(
  @has_seed_size_2_cost_per_acre = 0,
  'ALTER TABLE `crop_varieties` ADD COLUMN `seed_size_2_cost_per_acre` DECIMAL(10,2) NULL AFTER `seed_size_1_cost_per_acre`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_legacy_seed_size_1_cost_per_bag = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'crop_varieties'
    AND COLUMN_NAME = 'seed_size_1_cost_per_bag'
);

SET @sql = IF(
  @has_legacy_seed_size_1_cost_per_bag > 0,
  'UPDATE `crop_varieties` SET `seed_size_1_cost_per_acre` = `seed_size_1_cost_per_bag` * `seed_size_1_bags_per_acre` WHERE `seed_size_1_cost_per_acre` IS NULL AND `seed_size_1_cost_per_bag` IS NOT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_legacy_seed_size_2_cost_per_bag = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'crop_varieties'
    AND COLUMN_NAME = 'seed_size_2_cost_per_bag'
);

SET @sql = IF(
  @has_legacy_seed_size_2_cost_per_bag > 0,
  'UPDATE `crop_varieties` SET `seed_size_2_cost_per_acre` = `seed_size_2_cost_per_bag` * `seed_size_2_bags_per_acre` WHERE `seed_size_2_cost_per_acre` IS NULL AND `seed_size_2_cost_per_bag` IS NOT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
