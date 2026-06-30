CREATE TABLE `cycle_reports` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `production_cycle_id` CHAR(36) NOT NULL,
  `type` ENUM('activity','financial') NOT NULL,
  `snapshot_version` INT NOT NULL DEFAULT 1,
  `snapshot_data` JSON NOT NULL,
  `generated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cycle_reports_cycle_type_idx` (`production_cycle_id`, `type`),
  KEY `cycle_reports_user_id_idx` (`user_id`),
  KEY `cycle_reports_generated_at_idx` (`generated_at`),
  CONSTRAINT `fk_cycle_reports_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cycle_reports_production_cycle_id` FOREIGN KEY (`production_cycle_id`) REFERENCES `production_cycles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
