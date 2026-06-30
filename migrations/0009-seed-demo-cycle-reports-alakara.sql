-- Demo report data for alakara101@gmail.com.
--
-- This migration is intentionally idempotent:
--   * It inserts nothing if the user does not exist.
--   * It inserts nothing if no crop variety exists.
--   * It uses fixed IDs and INSERT IGNORE so it can be re-run safely.
--
-- Import after:
--   0007-create-cycle-reports.sql
--   0008-expand-activity-type-enum.sql

SET @demo_user_email = 'alakara101@gmail.com';
SET @demo_user_id = (
  SELECT `id`
  FROM `users`
  WHERE `email` = @demo_user_email
  LIMIT 1
);

SET @demo_crop_variety_id = (
  SELECT `id`
  FROM `crop_varieties`
  ORDER BY (`name` = 'Shangi') DESC, `created_at` ASC
  LIMIT 1
);

SET @demo_farm_id = '770e8400-e29b-41d4-a716-4466554d0001';
SET @demo_cycle_id = '770e8400-e29b-41d4-a716-4466554d0002';
SET @demo_planting_activity_id = '770e8400-e29b-41d4-a716-4466554d0003';
SET @demo_fertilizer_activity_id = '770e8400-e29b-41d4-a716-4466554d0004';
SET @demo_pest_activity_id = '770e8400-e29b-41d4-a716-4466554d0005';
SET @demo_harvest_activity_id = '770e8400-e29b-41d4-a716-4466554d0006';
SET @demo_activity_report_id = '770e8400-e29b-41d4-a716-4466554d0007';
SET @demo_financial_report_id = '770e8400-e29b-41d4-a716-4466554d0008';
SET @demo_generated_at = '2026-06-30 09:00:00';
SET @demo_generated_at_iso = '2026-06-30T09:00:00.000Z';

INSERT IGNORE INTO `farms` (
  `id`,
  `owner_id`,
  `name`,
  `description`,
  `location`,
  `location_lat`,
  `location_lng`,
  `size_acres`,
  `created_at`,
  `updated_at`
)
SELECT
  @demo_farm_id,
  @demo_user_id,
  'Demo Report Farm',
  'Seeded farm for previewing frozen cycle reports.',
  'Njoro, Nakuru County',
  -0.30310000,
  35.94420000,
  2.50,
  NOW(),
  NOW()
WHERE @demo_user_id IS NOT NULL;

INSERT IGNORE INTO `production_cycles` (
  `id`,
  `user_id`,
  `farm_id`,
  `crop_variety_id`,
  `land_size_acres`,
  `farm_location`,
  `farm_county`,
  `farm_subcounty`,
  `farm_location_name`,
  `farm_location_lat`,
  `farm_location_lng`,
  `planting_date`,
  `estimated_harvest_date`,
  `actual_harvest_date`,
  `status`,
  `total_cost`,
  `total_yield_kg`,
  `expected_yield`,
  `expected_price_per_kg`,
  `actual_yield`,
  `actual_price_per_kg`,
  `created_at`,
  `updated_at`
)
SELECT
  @demo_cycle_id,
  @demo_user_id,
  @demo_farm_id,
  @demo_crop_variety_id,
  2.50,
  'Demo Report Farm, Njoro, Nakuru County',
  'Nakuru',
  'Njoro',
  'Demo Report Farm',
  -0.30310000,
  35.94420000,
  '2026-03-30',
  '2026-06-28',
  '2026-06-27',
  'harvested',
  164500.00,
  18750.00,
  20000.00,
  42.00,
  18750.00,
  45.00,
  NOW(),
  NOW()
WHERE @demo_user_id IS NOT NULL
  AND @demo_crop_variety_id IS NOT NULL;

INSERT IGNORE INTO `activities` (
  `id`,
  `user_id`,
  `production_cycle_id`,
  `type`,
  `description`,
  `scheduled_date`,
  `completed_date`,
  `cost`,
  `labor_hours`,
  `labor_type`,
  `inputs`,
  `notes`,
  `status`,
  `created_at`,
  `updated_at`
)
SELECT
  @demo_planting_activity_id,
  @demo_user_id,
  @demo_cycle_id,
  'planting',
  'Plant certified seed potatoes and apply basal fertilizer.',
  '2026-03-30 08:00:00',
  '2026-03-30 15:00:00',
  92000.00,
  18.0,
  'manual-hired',
  JSON_ARRAY(
    JSON_OBJECT('name', 'Certified seed potatoes', 'quantity', 40, 'unit', 'bag', 'cost', 64000, 'brand', 'Shangi', 'supplier', 'Local agrovet'),
    JSON_OBJECT('name', 'Basal fertilizer', 'quantity', 12, 'unit', 'bag', 'cost', 24000, 'brand', 'DAP', 'supplier', 'Local agrovet')
  ),
  'Seeded rows were spaced at 75 cm by 30 cm.',
  'completed',
  NOW(),
  NOW()
WHERE @demo_user_id IS NOT NULL
  AND @demo_crop_variety_id IS NOT NULL;

INSERT IGNORE INTO `activities` (
  `id`,
  `user_id`,
  `production_cycle_id`,
  `type`,
  `description`,
  `scheduled_date`,
  `completed_date`,
  `cost`,
  `labor_hours`,
  `labor_type`,
  `inputs`,
  `notes`,
  `status`,
  `created_at`,
  `updated_at`
)
SELECT
  @demo_fertilizer_activity_id,
  @demo_user_id,
  @demo_cycle_id,
  'fertilizing',
  'Apply first top-dressing fertilizer.',
  '2026-04-20 09:00:00',
  '2026-04-20 12:00:00',
  14500.00,
  6.0,
  'manual-family',
  JSON_ARRAY(
    JSON_OBJECT('name', 'CAN fertilizer', 'quantity', 10, 'unit', 'bag', 'cost', 12500, 'brand', 'CAN', 'supplier', 'Njoro agrovet')
  ),
  'Applied after first weeding while soil was moist.',
  'completed',
  NOW(),
  NOW()
WHERE @demo_user_id IS NOT NULL
  AND @demo_crop_variety_id IS NOT NULL;

INSERT IGNORE INTO `activities` (
  `id`,
  `user_id`,
  `production_cycle_id`,
  `type`,
  `description`,
  `scheduled_date`,
  `completed_date`,
  `cost`,
  `labor_hours`,
  `labor_type`,
  `inputs`,
  `notes`,
  `status`,
  `created_at`,
  `updated_at`
)
SELECT
  @demo_pest_activity_id,
  @demo_user_id,
  @demo_cycle_id,
  'pest_control',
  'Spray preventive fungicide and scout for pests.',
  '2026-05-11 07:30:00',
  '2026-05-11 10:00:00',
  18000.00,
  5.0,
  'manual-hired',
  JSON_ARRAY(
    JSON_OBJECT('name', 'Fungicide', 'quantity', 4, 'unit', 'litre', 'cost', 12000, 'brand', 'Protective spray', 'supplier', 'Nakuru supplier'),
    JSON_OBJECT('name', 'PPE and sprayer service', 'quantity', 1, 'unit', 'service', 'cost', 3000, 'brand', '', 'supplier', 'Sprayer team')
  ),
  'No major pest pressure observed after spraying.',
  'completed',
  NOW(),
  NOW()
WHERE @demo_user_id IS NOT NULL
  AND @demo_crop_variety_id IS NOT NULL;

INSERT IGNORE INTO `activities` (
  `id`,
  `user_id`,
  `production_cycle_id`,
  `type`,
  `description`,
  `scheduled_date`,
  `completed_date`,
  `cost`,
  `labor_hours`,
  `labor_type`,
  `inputs`,
  `notes`,
  `status`,
  `created_at`,
  `updated_at`
)
SELECT
  @demo_harvest_activity_id,
  @demo_user_id,
  @demo_cycle_id,
  'harvesting',
  'Harvest, sort, and bag mature potatoes.',
  '2026-06-27 06:30:00',
  '2026-06-27 17:00:00',
  40000.00,
  32.0,
  'manual-hired',
  JSON_ARRAY(
    JSON_OBJECT('name', 'Harvest bags', 'quantity', 190, 'unit', 'piece', 'cost', 9500, 'brand', '', 'supplier', 'Market supplier'),
    JSON_OBJECT('name', 'Transport to collection point', 'quantity', 1, 'unit', 'trip', 'cost', 18000, 'brand', '', 'supplier', 'Local transporter')
  ),
  'Harvest graded into ware and seed-size categories.',
  'completed',
  NOW(),
  NOW()
WHERE @demo_user_id IS NOT NULL
  AND @demo_crop_variety_id IS NOT NULL;

INSERT IGNORE INTO `cycle_reports` (
  `id`,
  `user_id`,
  `production_cycle_id`,
  `type`,
  `snapshot_version`,
  `snapshot_data`,
  `generated_at`,
  `created_at`,
  `updated_at`
)
SELECT
  @demo_activity_report_id,
  @demo_user_id,
  @demo_cycle_id,
  'activity',
  1,
  JSON_OBJECT(
    'reportType', 'activity',
    'generatedAt', @demo_generated_at_iso,
    'cycle', JSON_OBJECT(
      'id', @demo_cycle_id,
      'cropVariety', COALESCE((SELECT `name` FROM `crop_varieties` WHERE `id` = @demo_crop_variety_id LIMIT 1), 'Demo Potato Variety'),
      'cropType', COALESCE((SELECT `crop_type` FROM `crop_varieties` WHERE `id` = @demo_crop_variety_id LIMIT 1), 'potato'),
      'farmName', 'Demo Report Farm',
      'farmLocation', 'Demo Report Farm, Njoro, Nakuru County',
      'county', 'Nakuru',
      'subcounty', 'Njoro',
      'landSizeAcres', 2.50,
      'plantingDate', '2026-03-30T00:00:00.000Z',
      'estimatedHarvestDate', '2026-06-28T00:00:00.000Z',
      'actualHarvestDate', '2026-06-27T00:00:00.000Z',
      'status', 'harvested'
    ),
    'activitySummary', JSON_OBJECT(
      'totalActivities', 4,
      'completedActivities', 4,
      'cycleDurationDays', 89
    ),
    'activities', JSON_ARRAY(
      JSON_OBJECT('id', @demo_planting_activity_id, 'type', 'planting', 'description', 'Plant certified seed potatoes and apply basal fertilizer.', 'status', 'completed', 'scheduledDate', '2026-03-30T08:00:00.000Z', 'completedDate', '2026-03-30T15:00:00.000Z', 'durationDays', 0, 'daysSincePreviousActivity', NULL, 'laborHours', 18, 'laborType', 'manual-hired', 'notes', 'Seeded rows were spaced at 75 cm by 30 cm.', 'inputs', JSON_ARRAY(JSON_OBJECT('name', 'Certified seed potatoes', 'quantity', 40, 'unit', 'bag'), JSON_OBJECT('name', 'Basal fertilizer', 'quantity', 12, 'unit', 'bag'))),
      JSON_OBJECT('id', @demo_fertilizer_activity_id, 'type', 'fertilizing', 'description', 'Apply first top-dressing fertilizer.', 'status', 'completed', 'scheduledDate', '2026-04-20T09:00:00.000Z', 'completedDate', '2026-04-20T12:00:00.000Z', 'durationDays', 0, 'daysSincePreviousActivity', 21, 'laborHours', 6, 'laborType', 'manual-family', 'notes', 'Applied after first weeding while soil was moist.', 'inputs', JSON_ARRAY(JSON_OBJECT('name', 'CAN fertilizer', 'quantity', 10, 'unit', 'bag'))),
      JSON_OBJECT('id', @demo_pest_activity_id, 'type', 'pest_control', 'description', 'Spray preventive fungicide and scout for pests.', 'status', 'completed', 'scheduledDate', '2026-05-11T07:30:00.000Z', 'completedDate', '2026-05-11T10:00:00.000Z', 'durationDays', 0, 'daysSincePreviousActivity', 21, 'laborHours', 5, 'laborType', 'manual-hired', 'notes', 'No major pest pressure observed after spraying.', 'inputs', JSON_ARRAY(JSON_OBJECT('name', 'Fungicide', 'quantity', 4, 'unit', 'litre'), JSON_OBJECT('name', 'PPE and sprayer service', 'quantity', 1, 'unit', 'service'))),
      JSON_OBJECT('id', @demo_harvest_activity_id, 'type', 'harvesting', 'description', 'Harvest, sort, and bag mature potatoes.', 'status', 'completed', 'scheduledDate', '2026-06-27T06:30:00.000Z', 'completedDate', '2026-06-27T17:00:00.000Z', 'durationDays', 0, 'daysSincePreviousActivity', 47, 'laborHours', 32, 'laborType', 'manual-hired', 'notes', 'Harvest graded into ware and seed-size categories.', 'inputs', JSON_ARRAY(JSON_OBJECT('name', 'Harvest bags', 'quantity', 190, 'unit', 'piece'), JSON_OBJECT('name', 'Transport to collection point', 'quantity', 1, 'unit', 'trip')))
    )
  ),
  @demo_generated_at,
  NOW(),
  NOW()
WHERE @demo_user_id IS NOT NULL
  AND @demo_crop_variety_id IS NOT NULL;

INSERT IGNORE INTO `cycle_reports` (
  `id`,
  `user_id`,
  `production_cycle_id`,
  `type`,
  `snapshot_version`,
  `snapshot_data`,
  `generated_at`,
  `created_at`,
  `updated_at`
)
SELECT
  @demo_financial_report_id,
  @demo_user_id,
  @demo_cycle_id,
  'financial',
  1,
  JSON_OBJECT(
    'reportType', 'financial',
    'generatedAt', @demo_generated_at_iso,
    'cycle', JSON_OBJECT(
      'id', @demo_cycle_id,
      'cropVariety', COALESCE((SELECT `name` FROM `crop_varieties` WHERE `id` = @demo_crop_variety_id LIMIT 1), 'Demo Potato Variety'),
      'cropType', COALESCE((SELECT `crop_type` FROM `crop_varieties` WHERE `id` = @demo_crop_variety_id LIMIT 1), 'potato'),
      'farmName', 'Demo Report Farm',
      'farmLocation', 'Demo Report Farm, Njoro, Nakuru County',
      'county', 'Nakuru',
      'subcounty', 'Njoro',
      'landSizeAcres', 2.50,
      'plantingDate', '2026-03-30T00:00:00.000Z',
      'estimatedHarvestDate', '2026-06-28T00:00:00.000Z',
      'actualHarvestDate', '2026-06-27T00:00:00.000Z',
      'status', 'harvested'
    ),
    'activitySummary', JSON_OBJECT(
      'totalActivities', 4,
      'completedActivities', 4,
      'cycleDurationDays', 89
    ),
    'financialSummary', JSON_OBJECT(
      'activityCostTotal', 164500,
      'inputCostTotal', 143000,
      'totalCost', 164500,
      'actualYield', 18750,
      'actualPricePerKg', 45,
      'actualRevenue', 843750,
      'profit', 679250
    ),
    'activities', JSON_ARRAY(
      JSON_OBJECT('id', @demo_planting_activity_id, 'type', 'planting', 'description', 'Plant certified seed potatoes and apply basal fertilizer.', 'status', 'completed', 'scheduledDate', '2026-03-30T08:00:00.000Z', 'completedDate', '2026-03-30T15:00:00.000Z', 'durationDays', 0, 'daysSincePreviousActivity', NULL, 'laborHours', 18, 'laborType', 'manual-hired', 'notes', 'Seeded rows were spaced at 75 cm by 30 cm.', 'cost', 92000, 'inputs', JSON_ARRAY(JSON_OBJECT('name', 'Certified seed potatoes', 'quantity', 40, 'unit', 'bag', 'cost', 64000, 'brand', 'Shangi', 'supplier', 'Local agrovet'), JSON_OBJECT('name', 'Basal fertilizer', 'quantity', 12, 'unit', 'bag', 'cost', 24000, 'brand', 'DAP', 'supplier', 'Local agrovet'))),
      JSON_OBJECT('id', @demo_fertilizer_activity_id, 'type', 'fertilizing', 'description', 'Apply first top-dressing fertilizer.', 'status', 'completed', 'scheduledDate', '2026-04-20T09:00:00.000Z', 'completedDate', '2026-04-20T12:00:00.000Z', 'durationDays', 0, 'daysSincePreviousActivity', 21, 'laborHours', 6, 'laborType', 'manual-family', 'notes', 'Applied after first weeding while soil was moist.', 'cost', 14500, 'inputs', JSON_ARRAY(JSON_OBJECT('name', 'CAN fertilizer', 'quantity', 10, 'unit', 'bag', 'cost', 12500, 'brand', 'CAN', 'supplier', 'Njoro agrovet'))),
      JSON_OBJECT('id', @demo_pest_activity_id, 'type', 'pest_control', 'description', 'Spray preventive fungicide and scout for pests.', 'status', 'completed', 'scheduledDate', '2026-05-11T07:30:00.000Z', 'completedDate', '2026-05-11T10:00:00.000Z', 'durationDays', 0, 'daysSincePreviousActivity', 21, 'laborHours', 5, 'laborType', 'manual-hired', 'notes', 'No major pest pressure observed after spraying.', 'cost', 18000, 'inputs', JSON_ARRAY(JSON_OBJECT('name', 'Fungicide', 'quantity', 4, 'unit', 'litre', 'cost', 12000, 'brand', 'Protective spray', 'supplier', 'Nakuru supplier'), JSON_OBJECT('name', 'PPE and sprayer service', 'quantity', 1, 'unit', 'service', 'cost', 3000, 'brand', '', 'supplier', 'Sprayer team'))),
      JSON_OBJECT('id', @demo_harvest_activity_id, 'type', 'harvesting', 'description', 'Harvest, sort, and bag mature potatoes.', 'status', 'completed', 'scheduledDate', '2026-06-27T06:30:00.000Z', 'completedDate', '2026-06-27T17:00:00.000Z', 'durationDays', 0, 'daysSincePreviousActivity', 47, 'laborHours', 32, 'laborType', 'manual-hired', 'notes', 'Harvest graded into ware and seed-size categories.', 'cost', 40000, 'inputs', JSON_ARRAY(JSON_OBJECT('name', 'Harvest bags', 'quantity', 190, 'unit', 'piece', 'cost', 9500, 'brand', '', 'supplier', 'Market supplier'), JSON_OBJECT('name', 'Transport to collection point', 'quantity', 1, 'unit', 'trip', 'cost', 18000, 'brand', '', 'supplier', 'Local transporter')))
    )
  ),
  @demo_generated_at,
  NOW(),
  NOW()
WHERE @demo_user_id IS NOT NULL
  AND @demo_crop_variety_id IS NOT NULL;
