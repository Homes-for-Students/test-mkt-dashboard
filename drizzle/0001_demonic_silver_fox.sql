CREATE TABLE `brand_colors` (
	`brand` varchar(255) NOT NULL,
	`backgroundColor` varchar(32) NOT NULL,
	`textColor` varchar(32) NOT NULL DEFAULT '#ffffff',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `brand_colors_brand` PRIMARY KEY(`brand`)
);
