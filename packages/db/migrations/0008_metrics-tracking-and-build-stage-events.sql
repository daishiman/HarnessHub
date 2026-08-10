CREATE TABLE `build_stage_events` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`build_id` text NOT NULL,
	`from_stage` text,
	`to_stage` text NOT NULL,
	`actor_user_id` text NOT NULL,
	`reason` text,
	`occurred_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `build_stage_events_tenant_build_occurred_idx` ON `build_stage_events` (`tenant_id`,`build_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `build_stage_events_tenant_workspace_occurred_idx` ON `build_stage_events` (`tenant_id`,`workspace_id`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `metrics_events` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`harness_id` text NOT NULL,
	`actor_user_id` text NOT NULL,
	`department_id` text,
	`run_count` integer NOT NULL,
	`occurred_at` integer NOT NULL,
	`idempotency_key` text,
	`request_digest` text NOT NULL,
	`idempotency_expires_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `metrics_events_scope_idem_uq` ON `metrics_events` (`tenant_id`,`workspace_id`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `metrics_events_tenant_workspace_occurred_idx` ON `metrics_events` (`tenant_id`,`workspace_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `metrics_events_tenant_harness_occurred_idx` ON `metrics_events` (`tenant_id`,`harness_id`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `metrics_rollups` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`period` text NOT NULL,
	`dimension` text NOT NULL,
	`dimension_key` text NOT NULL,
	`period_start` integer NOT NULL,
	`period_end` integer NOT NULL,
	`run_count` integer NOT NULL,
	`saved_minutes` integer NOT NULL,
	`saved_amount` integer NOT NULL,
	`computed_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `metrics_rollups_scope_uq` ON `metrics_rollups` (`tenant_id`,`workspace_id`,`period`,`dimension`,`dimension_key`,`period_start`);--> statement-breakpoint
CREATE INDEX `metrics_rollups_tenant_workspace_read_idx` ON `metrics_rollups` (`tenant_id`,`workspace_id`,`period`,`dimension`,`period_start`);
