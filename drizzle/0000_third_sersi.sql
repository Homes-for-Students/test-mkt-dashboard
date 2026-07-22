CREATE TABLE `filter_presets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`presetName` varchar(255) NOT NULL,
	`propertyIds` json NOT NULL,
	`city` varchar(255) NOT NULL,
	`isFavorite` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `filter_presets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketing_api_caches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cacheKey` varchar(255) NOT NULL,
	`data` json NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketing_api_caches_id` PRIMARY KEY(`id`),
	CONSTRAINT `marketing_api_caches_cacheKey_unique` UNIQUE(`cacheKey`)
);
--> statement-breakpoint
CREATE TABLE `properties` (
	`id` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`brand` varchar(255) NOT NULL,
	`city` varchar(255) NOT NULL,
	`beds` int NOT NULL DEFAULT 0,
	`occupancyRate` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `properties_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shareable_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(64) NOT NULL,
	`createdByUserId` int NOT NULL,
	`selectedPropertyIds` json,
	`selectedCity` varchar(255) NOT NULL DEFAULT 'All',
	`dashboardView` varchar(255) NOT NULL DEFAULT 'overview',
	`displayName` varchar(255),
	`expiresAt` timestamp,
	`accessCount` int NOT NULL DEFAULT 0,
	`lastAccessedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shareable_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `shareable_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
