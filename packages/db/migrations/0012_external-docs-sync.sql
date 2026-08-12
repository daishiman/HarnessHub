ALTER TABLE `documents` ADD `external_source` text;--> statement-breakpoint
ALTER TABLE `documents` ADD `external_document_id` text;--> statement-breakpoint
ALTER TABLE `documents` ADD `external_content_hash` text;--> statement-breakpoint
ALTER TABLE `documents` ADD `external_revision` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `documents_tenant_external_key_uidx` ON `documents` (`tenant_id`,`external_source`,`external_document_id`);