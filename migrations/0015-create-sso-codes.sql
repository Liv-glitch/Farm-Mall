-- Inputs marketplace SSO one-time codes.
-- Idempotent for manual phpMyAdmin imports.

CREATE TABLE IF NOT EXISTS `sso_codes` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `code_hash` CHAR(64) NOT NULL,
  `redirect_path` VARCHAR(512) NOT NULL DEFAULT '/marketplace',
  `expires_at` DATETIME NOT NULL,
  `used_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sso_codes_code_hash_idx` (`code_hash`),
  KEY `sso_codes_user_id_idx` (`user_id`),
  KEY `sso_codes_expires_at_idx` (`expires_at`),
  KEY `sso_codes_used_at_idx` (`used_at`),
  CONSTRAINT `fk_sso_codes_user_id`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
