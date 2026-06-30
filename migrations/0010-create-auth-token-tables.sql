CREATE TABLE `password_reset_tokens` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `token_hash` CHAR(64) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `used_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `password_reset_tokens_token_hash_idx` (`token_hash`),
  KEY `password_reset_tokens_user_id_idx` (`user_id`),
  KEY `password_reset_tokens_expires_at_idx` (`expires_at`),
  KEY `password_reset_tokens_used_at_idx` (`used_at`),
  CONSTRAINT `fk_password_reset_tokens_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `email_verification_otps` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `otp_hash` CHAR(64) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `attempts` INT UNSIGNED NOT NULL DEFAULT 0,
  `used_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `email_verification_otps_user_id_idx` (`user_id`),
  KEY `email_verification_otps_expires_at_idx` (`expires_at`),
  KEY `email_verification_otps_used_at_idx` (`used_at`),
  KEY `email_verification_otps_created_at_idx` (`created_at`),
  CONSTRAINT `fk_email_verification_otps_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
