ALTER TABLE `documents` ADD `category` text;--> statement-breakpoint
ALTER TABLE `documents` ADD `tags` text;--> statement-breakpoint
ALTER TABLE `documents` ADD `thumbnail_url` text;--> statement-breakpoint
ALTER TABLE `documents` ADD `thumbnail_source` text DEFAULT 'auto' NOT NULL;--> statement-breakpoint
ALTER TABLE `documents` ADD `excerpt` text;--> statement-breakpoint
ALTER TABLE `documents` ADD `excerpt_source` text DEFAULT 'auto' NOT NULL;--> statement-breakpoint
ALTER TABLE `documents` ADD `asset_summary` text;
