CREATE TABLE `feedbacks` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`code` text NOT NULL,
	`project_id` text NOT NULL,
	`type` text NOT NULL,
	`priority` text NOT NULL,
	`source` text NOT NULL,
	`body` text NOT NULL,
	`status` text NOT NULL,
	`ai_response` text,
	`ai_job_id` text,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `feedbacks_tenant_code_uq` ON `feedbacks` (`tenant_id`,`code`);--> statement-breakpoint
CREATE INDEX `feedbacks_tenant_workspace_status_updated_idx` ON `feedbacks` (`tenant_id`,`workspace_id`,`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `feedbacks_tenant_project_updated_idx` ON `feedbacks` (`tenant_id`,`project_id`,`updated_at`);