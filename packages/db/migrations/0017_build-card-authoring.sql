ALTER TABLE `builds` ADD `title_override` text;--> statement-breakpoint
ALTER TABLE `builds` ADD `risk_override` text;--> statement-breakpoint
ALTER TABLE `builds` ADD `assignee_user_id` text;--> statement-breakpoint
ALTER TABLE `builds` ADD `note` text;--> statement-breakpoint
CREATE UNIQUE INDEX `builds_sheet_id_uq` ON `builds` (`sheet_id`);
