-- Buyers marketplace integration.
-- Idempotent for manual phpMyAdmin imports.

CREATE TABLE IF NOT EXISTS `marketplace_integrations` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `farm_id` CHAR(36) NULL,
  `marketplace_farmer_id` VARCHAR(64) NULL,
  `external_platform_ref` VARCHAR(128) NOT NULL,
  `registration_status` VARCHAR(64) NOT NULL DEFAULT 'not_registered',
  `listing_status` VARCHAR(64) NOT NULL DEFAULT 'not_listed',
  `last_synced_at` DATETIME NULL,
  `raw_payload` JSON NULL,
  `last_callback_event` VARCHAR(64) NULL,
  `last_callback_payload` JSON NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `marketplace_integrations_user_id_idx` (`user_id`),
  UNIQUE KEY `marketplace_integrations_external_ref_idx` (`external_platform_ref`),
  KEY `marketplace_integrations_farm_id_idx` (`farm_id`),
  KEY `marketplace_integrations_farmer_id_idx` (`marketplace_farmer_id`),
  KEY `marketplace_integrations_registration_status_idx` (`registration_status`),
  KEY `marketplace_integrations_listing_status_idx` (`listing_status`),
  CONSTRAINT `fk_marketplace_integrations_user_id`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_marketplace_integrations_farm_id`
    FOREIGN KEY (`farm_id`) REFERENCES `farms` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `marketplace_callback_events` (
  `id` CHAR(36) NOT NULL,
  `marketplace_integration_id` CHAR(36) NULL,
  `marketplace_farmer_id` VARCHAR(64) NULL,
  `booking_ref` CHAR(36) NULL,
  `event` VARCHAR(64) NOT NULL,
  `payload` JSON NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `marketplace_callback_events_integration_idx` (`marketplace_integration_id`),
  KEY `marketplace_callback_events_farmer_id_idx` (`marketplace_farmer_id`),
  KEY `marketplace_callback_events_booking_ref_idx` (`booking_ref`),
  KEY `marketplace_callback_events_event_idx` (`event`),
  CONSTRAINT `fk_marketplace_callback_events_integration`
    FOREIGN KEY (`marketplace_integration_id`) REFERENCES `marketplace_integrations` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
