-- ===========================================================================
-- FarmMall — seed data (admin user + crop varieties)
-- ===========================================================================
-- Import AFTER schema.sql, via phpMyAdmin (Import -> choose file -> Go).
--
-- Seeds:
--   1. An initial admin user (mirrors `npm run admin:bootstrap`).
--   2. The reference `crop_varieties` rows the app needs (variety pickers,
--      yield/cost calculators) — the four Kenya potato varieties with real
--      per-acre production cost data (mirrors the final state of `npm run seed`).
--
-- Fixed UUIDs are used so re-importing this file errors on duplicate primary
-- keys (by design) rather than inserting duplicate rows.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Admin user
-- ---------------------------------------------------------------------------
-- !!! CHANGE THESE BEFORE/AFTER IMPORT !!!
--   * email:    edit the value below to your real admin email.
--   * password: the hash below is for the temporary password  ChangeMe!2026
--               Log in, then change the password immediately (or replace the
--               hash with your own bcrypt hash, $2a/$2b, generated with:
--               node -e "console.log(require('bcryptjs').hashSync('YOUR_PW',12))")
INSERT INTO `users` (
  `id`, `full_name`, `email`, `password_hash`, `county`, `sub_county`,
  `subscription_type`, `email_verified`, `phone_verified`, `role`,
  `created_at`, `updated_at`
) VALUES (
  '650e8400-e29b-41d4-a716-4466554ad001',
  'Farm Mall Admin',
  'admin@yourdomain.com',
  '$2a$12$khJ2wqtxaHxkGLHyydmDKeq0XkJRDu0Jc81eCv7o3SfArg1ZlnyU2',
  'Nairobi',
  'Central',
  'premium',
  1,
  0,
  'admin',
  NOW(), NOW()
);

-- ---------------------------------------------------------------------------
-- Crop varieties (KES per acre). To add more crops, INSERT rows with new UUIDs.
-- ---------------------------------------------------------------------------

INSERT INTO `crop_varieties` (
  `id`, `name`, `crop_type`, `maturity_period_days`,
  `seed_size_1_bags_per_acre`, `seed_size_2_bags_per_acre`,
  `seed_size_1_cost_per_acre`, `seed_size_2_cost_per_acre`,
  `fertilizer_cost_per_acre`, `herbicide_cost_per_acre`, `fungicide_cost_per_acre`,
  `insecticide_cost_per_acre`, `labor_cost_per_acre`, `land_preparation_cost_per_acre`,
  `miscellaneous_cost_per_acre`, `average_yield_per_acre`,
  `cost_data_updated_at`, `created_at`
) VALUES
  ('650e8400-e29b-41d4-a716-4466554a0001', 'Shangi',   'potato',  90, 16, 20, 64000.00, 77000.00, 17850.00, 4780.00, 3950.00, 5000.00, 20000.00, 21500.00, 5000.00,  8000.00, NOW(), NOW()),
  ('650e8400-e29b-41d4-a716-4466554a0002', 'Markies',  'potato', 120, 16, 20, 74400.00, 83000.00, 17850.00, 4780.00, 3950.00, 5000.00, 20000.00, 21500.00, 5000.00, 10000.00, NOW(), NOW()),
  ('650e8400-e29b-41d4-a716-4466554a0003', 'Sherekea', 'potato', 100, 16, 20, 64000.00, 69000.00, 17850.00, 4780.00, 3950.00, 5000.00, 20000.00, 21500.00, 5000.00,  9000.00, NOW(), NOW()),
  ('650e8400-e29b-41d4-a716-4466554a0004', 'Unica',    'potato',  90, 16, 20, 64000.00, 69000.00, 17850.00, 4780.00, 3950.00, 5000.00, 20000.00, 21500.00, 5000.00,  8000.00, NOW(), NOW());
