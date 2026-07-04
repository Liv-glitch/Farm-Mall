SET @has_crop_stage = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'activities'
    AND COLUMN_NAME = 'crop_stage'
);

SET @add_crop_stage_sql = IF(
  @has_crop_stage = 0,
  'ALTER TABLE `activities` ADD COLUMN `crop_stage` VARCHAR(100) NULL AFTER `type`',
  'SELECT "activities.crop_stage already exists"'
);

PREPARE add_crop_stage_stmt FROM @add_crop_stage_sql;
EXECUTE add_crop_stage_stmt;
DEALLOCATE PREPARE add_crop_stage_stmt;
