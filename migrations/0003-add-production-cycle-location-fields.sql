-- Add richer location data for production cycle farms.
-- Existing farm_location remains as the backward-compatible display string.

ALTER TABLE `production_cycles`
  ADD COLUMN `farm_county` VARCHAR(100) NULL AFTER `farm_location`,
  ADD COLUMN `farm_subcounty` VARCHAR(100) NULL AFTER `farm_county`,
  ADD COLUMN `farm_location_name` VARCHAR(255) NULL AFTER `farm_subcounty`,
  ADD COLUMN `farm_boundary_coordinates` JSON NULL AFTER `farm_location_lng`;

UPDATE `production_cycles`
SET `farm_location_name` = `farm_location`
WHERE `farm_location_name` IS NULL
  AND `farm_location` IS NOT NULL;

CREATE INDEX `production_cycles_county_idx` ON `production_cycles` (`farm_county`);
