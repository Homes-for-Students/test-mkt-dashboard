ALTER TABLE `users` MODIFY COLUMN `loginMethod` varchar(64) DEFAULT 'local';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('viewer','admin','super_admin') NOT NULL DEFAULT 'viewer';--> statement-breakpoint
ALTER TABLE `shareable_tokens` ADD `dateFrom` timestamp;--> statement-breakpoint
ALTER TABLE `shareable_tokens` ADD `dateTo` timestamp;--> statement-breakpoint
ALTER TABLE `shareable_tokens` ADD `isPaused` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `shareable_tokens` ADD `allowedDomains` json;--> statement-breakpoint
ALTER TABLE `users` ADD `password` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_email_unique` UNIQUE(`email`);