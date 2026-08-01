CREATE TABLE `ai_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`kind` text NOT NULL,
	`status` text NOT NULL,
	`payload_json` text NOT NULL,
	`result_json` text,
	`error` text,
	`attempt` integer DEFAULT 0 NOT NULL,
	`max_attempts` integer DEFAULT 3 NOT NULL,
	`lease_expires_at` integer,
	`claimed_by_token_id` text,
	`ref_type` text NOT NULL,
	`ref_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ai_jobs_tenant_workspace_kind_status_created_idx` ON `ai_jobs` (`tenant_id`,`workspace_id`,`kind`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `ai_jobs_lease_idx` ON `ai_jobs` (`status`,`lease_expires_at`);--> statement-breakpoint
CREATE INDEX `ai_jobs_ref_idx` ON `ai_jobs` (`tenant_id`,`ref_type`,`ref_id`);--> statement-breakpoint
CREATE TABLE `display_code_counters` (
	`tenant_id` text NOT NULL,
	`kind` text NOT NULL,
	`next_value` integer NOT NULL,
	PRIMARY KEY(`tenant_id`, `kind`)
);
--> statement-breakpoint
CREATE TABLE `hearing_sheets` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`code` text NOT NULL,
	`title` text NOT NULL,
	`applicant_user_id` text NOT NULL,
	`department` text,
	`status` text NOT NULL,
	`form_json` text NOT NULL,
	`estimate_json` text NOT NULL,
	`ai_job_id` text,
	`generated_doc_ids_json` text,
	`build_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hearing_sheets_tenant_code_uq` ON `hearing_sheets` (`tenant_id`,`code`);--> statement-breakpoint
CREATE INDEX `hearing_sheets_tenant_workspace_updated_idx` ON `hearing_sheets` (`tenant_id`,`workspace_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `hearing_sheets_tenant_applicant_updated_idx` ON `hearing_sheets` (`tenant_id`,`applicant_user_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `tenant_coefficients` (
	`tenant_id` text PRIMARY KEY NOT NULL,
	`annual_hours` integer DEFAULT 2000 NOT NULL,
	`minutes_per_run` integer DEFAULT 15 NOT NULL,
	`sheet_reduction_rate` real DEFAULT 0.35 NOT NULL,
	`updated_by` text NOT NULL
);
