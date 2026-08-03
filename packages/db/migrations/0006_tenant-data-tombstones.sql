CREATE TABLE `tenant_data_tombstones` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`object_id` text NOT NULL,
	`r2_key` text NOT NULL,
	`deleted_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `tenant_data_tombstones_tenant_deleted_idx` ON `tenant_data_tombstones` (`tenant_id`,`deleted_at`);