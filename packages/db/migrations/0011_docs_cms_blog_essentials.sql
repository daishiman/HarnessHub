ALTER TABLE `documents` ADD `category` text;--> statement-breakpoint
ALTER TABLE `documents` ADD `tags_json` text;--> statement-breakpoint
ALTER TABLE `documents` ADD `eyecatch_image_url` text;--> statement-breakpoint
ALTER TABLE `documents` ADD `publish_at` integer;--> statement-breakpoint
CREATE INDEX `documents_publish_at_idx` ON `documents` (`status`,`publish_at`);