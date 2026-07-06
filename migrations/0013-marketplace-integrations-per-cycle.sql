-- Allow one buyers marketplace integration per production cycle.
-- Idempotent for manual phpMyAdmin imports on MySQL 8+.

SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'marketplace_integrations'
    AND COLUMN_NAME = 'production_cycle_id'
);

SET @sql := IF(
  @column_exists = 0,
  'ALTER TABLE `marketplace_integrations` ADD COLUMN `production_cycle_id` CHAR(36) NULL AFTER `farm_id`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @user_unique_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'marketplace_integrations'
    AND INDEX_NAME = 'marketplace_integrations_user_id_idx'
    AND NON_UNIQUE = 0
);

SET @temp_user_index_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'marketplace_integrations'
    AND INDEX_NAME = 'marketplace_integrations_user_id_lookup_idx'
);

SET @sql := IF(
  @user_unique_exists > 0 AND @temp_user_index_exists = 0,
  'ALTER TABLE `marketplace_integrations` ADD KEY `marketplace_integrations_user_id_lookup_idx` (`user_id`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
  @user_unique_exists > 0,
  'ALTER TABLE `marketplace_integrations` DROP INDEX `marketplace_integrations_user_id_idx`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @user_index_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'marketplace_integrations'
    AND INDEX_NAME = 'marketplace_integrations_user_id_idx'
);

SET @sql := IF(
  @user_index_exists = 0,
  'ALTER TABLE `marketplace_integrations` ADD KEY `marketplace_integrations_user_id_idx` (`user_id`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @temp_user_index_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'marketplace_integrations'
    AND INDEX_NAME = 'marketplace_integrations_user_id_lookup_idx'
);

SET @sql := IF(
  @temp_user_index_exists > 0,
  'ALTER TABLE `marketplace_integrations` DROP INDEX `marketplace_integrations_user_id_lookup_idx`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @cycle_index_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'marketplace_integrations'
    AND INDEX_NAME = 'marketplace_integrations_production_cycle_id_idx'
);

SET @sql := IF(
  @cycle_index_exists = 0,
  'ALTER TABLE `marketplace_integrations` ADD UNIQUE KEY `marketplace_integrations_production_cycle_id_idx` (`production_cycle_id`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @cycle_fk_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND CONSTRAINT_NAME = 'fk_marketplace_integrations_production_cycle_id'
);

SET @sql := IF(
  @cycle_fk_exists = 0,
  'ALTER TABLE `marketplace_integrations` ADD CONSTRAINT `fk_marketplace_integrations_production_cycle_id` FOREIGN KEY (`production_cycle_id`) REFERENCES `production_cycles` (`id`) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
