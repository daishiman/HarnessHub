CREATE TABLE `builds` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`type` text NOT NULL,
	`stage` text NOT NULL,
	`sheet_id` text,
	`feedback_id` text,
	`publish_request_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `builds_feedback_id_uq` ON `builds` (`feedback_id`);--> statement-breakpoint
CREATE INDEX `builds_tenant_workspace_stage_updated_idx` ON `builds` (`tenant_id`,`workspace_id`,`stage`,`updated_at`);