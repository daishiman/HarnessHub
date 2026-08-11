CREATE TABLE `smoke_fixture_leases` (
	`tenant_id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`kind` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `smoke_fixture_leases_expires_idx` ON `smoke_fixture_leases` (`expires_at`);--> statement-breakpoint
CREATE INDEX `smoke_fixture_leases_run_idx` ON `smoke_fixture_leases` (`run_id`);