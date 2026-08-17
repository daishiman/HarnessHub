CREATE TABLE `mutation_create_idempotency` (
	`tenant_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`resource` text NOT NULL,
	`operation` text NOT NULL,
	`key` text NOT NULL,
	`payload_hash` text NOT NULL,
	`resource_id` text NOT NULL,
	`response_status` integer,
	`response_headers_json` text,
	`response_body` text,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`tenant_id`, `workspace_id`, `resource`, `operation`, `key`)
);
--> statement-breakpoint
CREATE INDEX `mutation_create_idempotency_expires_idx` ON `mutation_create_idempotency` (`expires_at`);--> statement-breakpoint
ALTER TABLE `documents` ADD `entity_revision` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `hearing_sheets` ADD `entity_revision` integer DEFAULT 1 NOT NULL;
