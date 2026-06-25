-- Add activity metadata to farm preparation tasks and convert existing plans
-- to the current four-card preparation template.

SET @db_name = DATABASE();

SET @has_activity_type = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'preproduction_tasks'
    AND COLUMN_NAME = 'activity_type'
);

SET @sql = IF(
  @has_activity_type = 0,
  'ALTER TABLE `preproduction_tasks` ADD COLUMN `activity_type` ENUM(''informational'',''task'') NOT NULL DEFAULT ''task'' AFTER `title`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_importance = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'preproduction_tasks'
    AND COLUMN_NAME = 'importance'
);

SET @sql = IF(
  @has_importance = 0,
  'ALTER TABLE `preproduction_tasks` ADD COLUMN `importance` TEXT NULL AFTER `activity_type`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_recommendations = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'preproduction_tasks'
    AND COLUMN_NAME = 'recommendations'
);

SET @sql = IF(
  @has_recommendations = 0,
  'ALTER TABLE `preproduction_tasks` ADD COLUMN `recommendations` JSON NULL AFTER `importance`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_service_links = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'preproduction_tasks'
    AND COLUMN_NAME = 'service_links'
);

SET @sql = IF(
  @has_service_links = 0,
  'ALTER TABLE `preproduction_tasks` ADD COLUMN `service_links` JSON NULL AFTER `recommendations`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

DROP TEMPORARY TABLE IF EXISTS `tmp_preproduction_completion`;
CREATE TEMPORARY TABLE `tmp_preproduction_completion` AS
SELECT
  p.id AS plan_id,
  MAX(CASE
    WHEN (s.title = 'Soil Testing' OR t.title IN ('Collect soil samples', 'Submit sample for testing', 'Soil Testing'))
      AND t.completed = 1
    THEN 1 ELSE 0
  END) AS soil_testing_completed,
  MAX(CASE
    WHEN (s.title = 'Soil Testing' OR t.title IN ('Collect soil samples', 'Submit sample for testing', 'Soil Testing'))
      AND t.completed = 1
    THEN t.date_completed ELSE NULL
  END) AS soil_testing_date_completed,
  MAX(CASE
    WHEN (s.title = 'Soil Testing' OR t.title IN ('Collect soil samples', 'Submit sample for testing', 'Soil Testing'))
      AND t.completed = 1
    THEN t.cost ELSE NULL
  END) AS soil_testing_cost,
  MAX(CASE
    WHEN (s.title = 'Soil Testing' OR t.title IN ('Collect soil samples', 'Submit sample for testing', 'Soil Testing'))
      AND t.completed = 1
    THEN t.supplier ELSE NULL
  END) AS soil_testing_supplier,
  MAX(CASE
    WHEN (s.title = 'Land Preparation' OR t.title IN ('First ploughing', 'First Plowing'))
      AND t.title IN ('First ploughing', 'First Plowing')
      AND t.completed = 1
    THEN 1 ELSE 0
  END) AS first_plowing_completed,
  MAX(CASE
    WHEN (s.title = 'Land Preparation' OR t.title IN ('First ploughing', 'First Plowing'))
      AND t.title IN ('First ploughing', 'First Plowing')
      AND t.completed = 1
    THEN t.date_completed ELSE NULL
  END) AS first_plowing_date_completed,
  MAX(CASE
    WHEN (s.title = 'Land Preparation' OR t.title IN ('First ploughing', 'First Plowing'))
      AND t.title IN ('First ploughing', 'First Plowing')
      AND t.completed = 1
    THEN t.cost ELSE NULL
  END) AS first_plowing_cost,
  MAX(CASE
    WHEN (s.title = 'Land Preparation' OR t.title IN ('First ploughing', 'First Plowing'))
      AND t.title IN ('First ploughing', 'First Plowing')
      AND t.completed = 1
    THEN t.supplier ELSE NULL
  END) AS first_plowing_supplier,
  MAX(CASE WHEN t.title = 'Second Plowing' AND t.completed = 1 THEN 1 ELSE 0 END) AS second_plowing_completed,
  MAX(CASE WHEN t.title = 'Second Plowing' AND t.completed = 1 THEN t.date_completed ELSE NULL END) AS second_plowing_date_completed,
  MAX(CASE WHEN t.title = 'Second Plowing' AND t.completed = 1 THEN t.cost ELSE NULL END) AS second_plowing_cost,
  MAX(CASE WHEN t.title = 'Second Plowing' AND t.completed = 1 THEN t.supplier ELSE NULL END) AS second_plowing_supplier,
  MAX(CASE WHEN t.title = 'Harrowing' AND t.completed = 1 THEN 1 ELSE 0 END) AS harrowing_completed,
  MAX(CASE WHEN t.title = 'Harrowing' AND t.completed = 1 THEN t.date_completed ELSE NULL END) AS harrowing_date_completed,
  MAX(CASE WHEN t.title = 'Harrowing' AND t.completed = 1 THEN t.cost ELSE NULL END) AS harrowing_cost,
  MAX(CASE WHEN t.title = 'Harrowing' AND t.completed = 1 THEN t.supplier ELSE NULL END) AS harrowing_supplier,
  MAX(CASE WHEN t.title = 'Organic Manure Application' AND t.completed = 1 THEN 1 ELSE 0 END) AS organic_manure_completed,
  MAX(CASE WHEN t.title = 'Organic Manure Application' AND t.completed = 1 THEN t.date_completed ELSE NULL END) AS organic_manure_date_completed,
  MAX(CASE WHEN t.title = 'Organic Manure Application' AND t.completed = 1 THEN t.cost ELSE NULL END) AS organic_manure_cost,
  MAX(CASE WHEN t.title = 'Organic Manure Application' AND t.completed = 1 THEN t.supplier ELSE NULL END) AS organic_manure_supplier,
  MAX(CASE WHEN t.title = 'Soil Fertility Management' AND t.completed = 1 THEN 1 ELSE 0 END) AS soil_fertility_completed,
  MAX(CASE WHEN t.title = 'Soil Fertility Management' AND t.completed = 1 THEN t.date_completed ELSE NULL END) AS soil_fertility_date_completed,
  MAX(CASE WHEN t.title = 'Soil Fertility Management' AND t.completed = 1 THEN t.cost ELSE NULL END) AS soil_fertility_cost,
  MAX(CASE WHEN t.title = 'Soil Fertility Management' AND t.completed = 1 THEN t.supplier ELSE NULL END) AS soil_fertility_supplier
FROM `preproduction_plans` p
LEFT JOIN `preproduction_steps` s ON s.plan_id = p.id
LEFT JOIN `preproduction_tasks` t ON t.step_id = s.id
GROUP BY p.id;

DELETE FROM `preproduction_steps`;

INSERT INTO `preproduction_steps` (`id`, `plan_id`, `order`, `title`, `date_range_start`, `date_range_end`, `created_at`, `updated_at`)
SELECT UUID(), p.id, 1, 'Land Selection', DATE_SUB(p.planting_date, INTERVAL 60 DAY), DATE_SUB(p.planting_date, INTERVAL 45 DAY), NOW(), NOW()
FROM `preproduction_plans` p;

INSERT INTO `preproduction_steps` (`id`, `plan_id`, `order`, `title`, `date_range_start`, `date_range_end`, `created_at`, `updated_at`)
SELECT UUID(), p.id, 2, 'Soil Testing', DATE_SUB(p.planting_date, INTERVAL 42 DAY), DATE_SUB(p.planting_date, INTERVAL 21 DAY), NOW(), NOW()
FROM `preproduction_plans` p;

INSERT INTO `preproduction_steps` (`id`, `plan_id`, `order`, `title`, `date_range_start`, `date_range_end`, `created_at`, `updated_at`)
SELECT UUID(), p.id, 3, 'Land Preparation', DATE_SUB(p.planting_date, INTERVAL 28 DAY), DATE_SUB(p.planting_date, INTERVAL 7 DAY), NOW(), NOW()
FROM `preproduction_plans` p;

INSERT INTO `preproduction_steps` (`id`, `plan_id`, `order`, `title`, `date_range_start`, `date_range_end`, `created_at`, `updated_at`)
SELECT UUID(), p.id, 4, 'Soil Fertility Management', DATE_SUB(p.planting_date, INTERVAL 14 DAY), p.planting_date, NOW(), NOW()
FROM `preproduction_plans` p;

INSERT INTO `preproduction_tasks` (`id`, `step_id`, `order`, `title`, `activity_type`, `importance`, `recommendations`, `service_links`, `completed`, `date_completed`, `cost`, `supplier`, `created_at`, `updated_at`)
SELECT UUID(), s.id, 1, 'Land Selection', 'informational',
  'Choose a well-drained field with a suitable crop rotation history to reduce disease pressure and improve yields.',
  JSON_ARRAY(
    'Select well-drained land.',
    'Avoid fields where potatoes, tomatoes, peppers, or eggplant were planted in the last 2 seasons.',
    'Review crop rotation history.'
  ),
  NULL, 0, NULL, NULL, NULL, NOW(), NOW()
FROM `preproduction_steps` s
WHERE s.title = 'Land Selection';

INSERT INTO `preproduction_tasks` (`id`, `step_id`, `order`, `title`, `activity_type`, `importance`, `recommendations`, `service_links`, `completed`, `date_completed`, `cost`, `supplier`, `created_at`, `updated_at`)
SELECT UUID(), s.id, 1, 'Soil Testing', 'task',
  'Soil testing helps determine nutrient requirements and pH levels, ensuring accurate fertilizer recommendations and reducing unnecessary input costs.',
  NULL,
  JSON_ARRAY(JSON_OBJECT('label', 'Access Soil Testing Services here', 'href', 'https://farmflow-platform.onrender.com/marketplace?category=soil-testing')),
  COALESCE(c.soil_testing_completed, 0),
  IF(COALESCE(c.soil_testing_completed, 0) = 1, c.soil_testing_date_completed, NULL),
  IF(COALESCE(c.soil_testing_completed, 0) = 1, c.soil_testing_cost, NULL),
  IF(COALESCE(c.soil_testing_completed, 0) = 1, c.soil_testing_supplier, NULL),
  NOW(), NOW()
FROM `preproduction_steps` s
LEFT JOIN `tmp_preproduction_completion` c ON c.plan_id = s.plan_id
WHERE s.title = 'Soil Testing';

INSERT INTO `preproduction_tasks` (`id`, `step_id`, `order`, `title`, `activity_type`, `importance`, `recommendations`, `service_links`, `completed`, `date_completed`, `cost`, `supplier`, `created_at`, `updated_at`)
SELECT UUID(), s.id, 1, 'Residue and Weed Clearance', 'informational',
  'Removing previous crop residues and weeds reduces pest and disease carryover while improving field preparation.',
  NULL, NULL, 0, NULL, NULL, NULL, NOW(), NOW()
FROM `preproduction_steps` s
WHERE s.title = 'Land Preparation';

INSERT INTO `preproduction_tasks` (`id`, `step_id`, `order`, `title`, `activity_type`, `importance`, `recommendations`, `service_links`, `completed`, `date_completed`, `cost`, `supplier`, `created_at`, `updated_at`)
SELECT UUID(), s.id, 2, 'First Plowing', 'task',
  'Breaks compacted soil and improves aeration for root development.',
  JSON_ARRAY('Plow to approximately 12 cm depth.', 'Ideally complete this 3–4 weeks before planting.'),
  JSON_ARRAY(JSON_OBJECT('label', 'Access tractor or ox-plowing services', 'href', 'https://farmflow-platform.onrender.com/marketplace?category=mechanization')),
  COALESCE(c.first_plowing_completed, 0),
  IF(COALESCE(c.first_plowing_completed, 0) = 1, c.first_plowing_date_completed, NULL),
  IF(COALESCE(c.first_plowing_completed, 0) = 1, c.first_plowing_cost, NULL),
  IF(COALESCE(c.first_plowing_completed, 0) = 1, c.first_plowing_supplier, NULL),
  NOW(), NOW()
FROM `preproduction_steps` s
LEFT JOIN `tmp_preproduction_completion` c ON c.plan_id = s.plan_id
WHERE s.title = 'Land Preparation';

INSERT INTO `preproduction_tasks` (`id`, `step_id`, `order`, `title`, `activity_type`, `importance`, `recommendations`, `service_links`, `completed`, `date_completed`, `cost`, `supplier`, `created_at`, `updated_at`)
SELECT UUID(), s.id, 3, 'Second Plowing', 'task',
  'Creates a finer seedbed and improves soil structure for planting.',
  JSON_ARRAY('Conduct after initial soil settling.', 'Ensure clods are adequately broken down.'),
  JSON_ARRAY(JSON_OBJECT('label', 'Access plowing services', 'href', 'https://farmflow-platform.onrender.com/marketplace?category=mechanization')),
  COALESCE(c.second_plowing_completed, 0),
  IF(COALESCE(c.second_plowing_completed, 0) = 1, c.second_plowing_date_completed, NULL),
  IF(COALESCE(c.second_plowing_completed, 0) = 1, c.second_plowing_cost, NULL),
  IF(COALESCE(c.second_plowing_completed, 0) = 1, c.second_plowing_supplier, NULL),
  NOW(), NOW()
FROM `preproduction_steps` s
LEFT JOIN `tmp_preproduction_completion` c ON c.plan_id = s.plan_id
WHERE s.title = 'Land Preparation';

INSERT INTO `preproduction_tasks` (`id`, `step_id`, `order`, `title`, `activity_type`, `importance`, `recommendations`, `service_links`, `completed`, `date_completed`, `cost`, `supplier`, `created_at`, `updated_at`)
SELECT UUID(), s.id, 4, 'Harrowing', 'task',
  'Produces a fine, level seedbed and helps incorporate amendments.',
  JSON_ARRAY('Ensure soil is loose and level before planting.'),
  JSON_ARRAY(JSON_OBJECT('label', 'Access harrowing services', 'href', 'https://farmflow-platform.onrender.com/marketplace?category=mechanization')),
  COALESCE(c.harrowing_completed, 0),
  IF(COALESCE(c.harrowing_completed, 0) = 1, c.harrowing_date_completed, NULL),
  IF(COALESCE(c.harrowing_completed, 0) = 1, c.harrowing_cost, NULL),
  IF(COALESCE(c.harrowing_completed, 0) = 1, c.harrowing_supplier, NULL),
  NOW(), NOW()
FROM `preproduction_steps` s
LEFT JOIN `tmp_preproduction_completion` c ON c.plan_id = s.plan_id
WHERE s.title = 'Land Preparation';

INSERT INTO `preproduction_tasks` (`id`, `step_id`, `order`, `title`, `activity_type`, `importance`, `recommendations`, `service_links`, `completed`, `date_completed`, `cost`, `supplier`, `created_at`, `updated_at`)
SELECT UUID(), s.id, 5, 'Organic Manure Application', 'task',
  'Improves soil organic matter, water retention, and nutrient availability.',
  JSON_ARRAY('Use well-decomposed manure.', 'Apply based on soil fertility needs.'),
  JSON_ARRAY(JSON_OBJECT('label', 'Purchase manure through Farm Mall', 'href', 'https://farmflow-platform.onrender.com/marketplace?category=fertilizers')),
  COALESCE(c.organic_manure_completed, 0),
  IF(COALESCE(c.organic_manure_completed, 0) = 1, c.organic_manure_date_completed, NULL),
  IF(COALESCE(c.organic_manure_completed, 0) = 1, c.organic_manure_cost, NULL),
  IF(COALESCE(c.organic_manure_completed, 0) = 1, c.organic_manure_supplier, NULL),
  NOW(), NOW()
FROM `preproduction_steps` s
LEFT JOIN `tmp_preproduction_completion` c ON c.plan_id = s.plan_id
WHERE s.title = 'Land Preparation';

INSERT INTO `preproduction_tasks` (`id`, `step_id`, `order`, `title`, `activity_type`, `importance`, `recommendations`, `service_links`, `completed`, `date_completed`, `cost`, `supplier`, `created_at`, `updated_at`)
SELECT UUID(), s.id, 1, 'Soil Fertility Management', 'task',
  'Proper fertility management improves plant growth, yield, and tuber quality.',
  JSON_ARRAY('Based on your soil test results, apply the recommended nutrients and amendments.'),
  JSON_ARRAY(
    JSON_OBJECT('label', 'Purchase recommended fertilizers', 'href', 'https://farmflow-platform.onrender.com/marketplace?category=fertilizers'),
    JSON_OBJECT('label', 'Access agronomy support', 'href', 'https://farmflow-platform.onrender.com/marketplace?category=advisory')
  ),
  COALESCE(c.soil_fertility_completed, 0),
  IF(COALESCE(c.soil_fertility_completed, 0) = 1, c.soil_fertility_date_completed, NULL),
  IF(COALESCE(c.soil_fertility_completed, 0) = 1, c.soil_fertility_cost, NULL),
  IF(COALESCE(c.soil_fertility_completed, 0) = 1, c.soil_fertility_supplier, NULL),
  NOW(), NOW()
FROM `preproduction_steps` s
LEFT JOIN `tmp_preproduction_completion` c ON c.plan_id = s.plan_id
WHERE s.title = 'Soil Fertility Management';

UPDATE `preproduction_plans` p
LEFT JOIN (
  SELECT
    s.plan_id,
    COUNT(*) AS total_tasks,
    SUM(CASE WHEN t.completed = 1 THEN 1 ELSE 0 END) AS completed_tasks
  FROM `preproduction_steps` s
  INNER JOIN `preproduction_tasks` t ON t.step_id = s.id
  WHERE t.activity_type = 'task'
  GROUP BY s.plan_id
) progress ON progress.plan_id = p.id
SET p.status = CASE
  WHEN COALESCE(progress.total_tasks, 0) > 0 AND progress.completed_tasks = progress.total_tasks THEN 'completed'
  WHEN COALESCE(progress.completed_tasks, 0) > 0 THEN 'in_progress'
  ELSE 'not_started'
END;

ALTER TABLE `preproduction_tasks` MODIFY COLUMN `importance` TEXT NOT NULL;

DROP TEMPORARY TABLE IF EXISTS `tmp_preproduction_completion`;
