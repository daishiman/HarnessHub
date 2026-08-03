CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`scope` text NOT NULL,
	`title` text NOT NULL,
	`body_markdown` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_by` text NOT NULL,
	`updated_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `documents_tenant_scope_updated_idx` ON `documents` (`tenant_id`,`scope`,`updated_at`);--> statement-breakpoint
CREATE INDEX `documents_scope_updated_idx` ON `documents` (`scope`,`updated_at`);