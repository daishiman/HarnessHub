CREATE TABLE `hearing_screenshots` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`sheet_id` text NOT NULL,
	`tenant_data_object_id` text NOT NULL,
	`title` text NOT NULL,
	`linked_item` text,
	`note` text,
	`content_type` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hearing_screenshots_tenant_data_object_uq` ON `hearing_screenshots` (`tenant_data_object_id`);--> statement-breakpoint
CREATE INDEX `hearing_screenshots_tenant_sheet_created_idx` ON `hearing_screenshots` (`tenant_id`,`sheet_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `hearing_share_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`sheet_id` text NOT NULL,
	`audience` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`revoked_at` integer,
	`last_accessed_at` integer,
	`access_count` integer DEFAULT 0 NOT NULL,
	`created_by_user_id` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hearing_share_tokens_token_hash_uq` ON `hearing_share_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `hearing_share_tokens_tenant_sheet_created_idx` ON `hearing_share_tokens` (`tenant_id`,`sheet_id`,`created_at`);