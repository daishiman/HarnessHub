CREATE TABLE `catalog_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`project_id` text NOT NULL,
	`visibility` text NOT NULL,
	`summary` text,
	`tags_json` text,
	`dl_count` integer DEFAULT 0 NOT NULL,
	`published_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_entries_project_uq` ON `catalog_entries` (`project_id`);--> statement-breakpoint
CREATE TABLE `deployment_references` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`project_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`release_id` text NOT NULL,
	`url` text NOT NULL,
	`provider` text NOT NULL,
	`orphan_candidate` integer DEFAULT false NOT NULL,
	`registered_by` text NOT NULL,
	`last_health_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `packages` (
	`content_hash` text PRIMARY KEY NOT NULL,
	`r2_key` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`kind` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`owner_user_id` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_workspace_name_uq` ON `projects` (`workspace_id`,`name`);--> statement-breakpoint
CREATE TABLE `releases` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`project_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`version` text NOT NULL,
	`package_hash` text NOT NULL,
	`manifest_json` text NOT NULL,
	`status` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `releases_channel_version_uq` ON `releases` (`channel_id`,`version`);--> statement-breakpoint
CREATE TABLE `target_channels` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`project_id` text NOT NULL,
	`target` text NOT NULL,
	`stable_release_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `target_channels_project_target_uq` ON `target_channels` (`project_id`,`target`);--> statement-breakpoint
CREATE TABLE `idp_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`issuer_url` text NOT NULL,
	`client_id` text NOT NULL,
	`client_secret_enc` text NOT NULL,
	`scopes` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idp_connections_tenant_issuer_uq` ON `idp_connections` (`tenant_id`,`issuer_url`);--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`plan` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tenants_slug_uq` ON `tenants` (`slug`);--> statement-breakpoint
CREATE TABLE `user_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`notify_generation` integer DEFAULT true NOT NULL,
	`notify_review` integer DEFAULT true NOT NULL,
	`notify_weekly` integer DEFAULT true NOT NULL,
	`notify_feedback` integer DEFAULT true NOT NULL,
	`email_enabled` integer DEFAULT true NOT NULL,
	`theme` text DEFAULT 'system' NOT NULL,
	`density` text DEFAULT 'comfortable' NOT NULL,
	`language` text DEFAULT 'ja' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`idp_subject` text NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`department` text,
	`salary` text,
	`role` text NOT NULL,
	`status` text NOT NULL,
	`last_login_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_tenant_idp_subject_uq` ON `users` (`tenant_id`,`idp_subject`);--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspaces_tenant_slug_uq` ON `workspaces` (`tenant_id`,`slug`);--> statement-breakpoint
CREATE TABLE `device_authorizations` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text,
	`device_code_hash` text NOT NULL,
	`user_code` text NOT NULL,
	`user_id` text,
	`status` text NOT NULL,
	`interval_sec` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `device_authorizations_code_hash_uq` ON `device_authorizations` (`device_code_hash`);--> statement-breakpoint
CREATE TABLE `idempotency_ledger` (
	`scope` text NOT NULL,
	`key` text NOT NULL,
	`tenant_id` text NOT NULL,
	`request_hash` text NOT NULL,
	`response_status` integer NOT NULL,
	`response_body_json` text,
	`expires_at` integer NOT NULL,
	PRIMARY KEY(`scope`, `key`)
);
--> statement-breakpoint
CREATE TABLE `publish_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`project_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`status` text NOT NULL,
	`verdict` text,
	`findings_json` text,
	`release_id` text,
	`requested_by` text NOT NULL,
	`idempotency_key` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `publish_requests_channel_active_uq` ON `publish_requests` (`channel_id`) WHERE status NOT IN ('published', 'failed', 'draft');--> statement-breakpoint
CREATE TABLE `publisher_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`user_id` text NOT NULL,
	`device_name` text NOT NULL,
	`refresh_token_hash` text NOT NULL,
	`scopes_json` text NOT NULL,
	`family_id` text NOT NULL,
	`last_used_at` integer,
	`expires_at` integer NOT NULL,
	`revoked_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`workspace_id` text,
	`actor_type` text NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`summary_json` text NOT NULL,
	`seq` integer NOT NULL,
	`prev_hash` text NOT NULL,
	`event_hash` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `audit_events_tenant_seq_uq` ON `audit_events` (`tenant_id`,`seq`);--> statement-breakpoint
CREATE TABLE `encryption_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`purpose` text NOT NULL,
	`key_version` integer NOT NULL,
	`dek_wrapped` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`retired_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `encryption_keys_purpose_version_uq` ON `encryption_keys` (`purpose`,`key_version`);--> statement-breakpoint
CREATE TABLE `session_revocations` (
	`tenant_id` text PRIMARY KEY NOT NULL,
	`revoked_at` integer NOT NULL
);
