CREATE TABLE `tenant_data_objects` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`r2_key` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`content_hash` text NOT NULL,
	`enc_key_version` integer NOT NULL,
	`uploaded_by` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tenant_data_objects_r2_key_uq` ON `tenant_data_objects` (`r2_key`);--> statement-breakpoint
CREATE INDEX `tenant_data_objects_tenant_workspace_kind_created_idx` ON `tenant_data_objects` (`tenant_id`,`workspace_id`,`kind`,`created_at`);--> statement-breakpoint
CREATE TABLE `tenant_data_tombstones` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`object_id` text NOT NULL,
	`r2_key` text NOT NULL,
	`deleted_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `tenant_data_tombstones_tenant_deleted_idx` ON `tenant_data_tombstones` (`tenant_id`,`deleted_at`);--> statement-breakpoint
DROP INDEX `encryption_keys_purpose_version_uq`;--> statement-breakpoint
ALTER TABLE `encryption_keys` ADD `tenant_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `encryption_keys_purpose_version_global_uq` ON `encryption_keys` (`purpose`,`key_version`) WHERE tenant_id IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `encryption_keys_tenant_purpose_version_uq` ON `encryption_keys` (`tenant_id`,`purpose`,`key_version`) WHERE tenant_id IS NOT NULL;