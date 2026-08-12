CREATE TABLE `notion_integrations` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`mode` text NOT NULL,
	`page_url` text,
	`api_key_enc` text,
	`enc_key_version` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notion_integrations_tenant_workspace_uq` ON `notion_integrations` (`tenant_id`,`workspace_id`);