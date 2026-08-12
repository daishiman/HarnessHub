ALTER TABLE `documents` ADD `publish_at` integer;--> statement-breakpoint
CREATE INDEX `documents_publish_due_idx` ON `documents` (`status`,`publish_at`,`id`);