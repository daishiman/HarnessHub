CREATE TABLE `user_workspaces` (
	`tenant_id` text NOT NULL,
	`user_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`tenant_id`, `user_id`, `workspace_id`)
);

--> statement-breakpoint
CREATE INDEX `user_workspaces_tenant_user_idx` ON `user_workspaces` (`tenant_id`,`user_id`);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_device_authorizations` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`device_code_hash` text NOT NULL,
	`user_code` text NOT NULL,
	`user_id` text,
	`workspace_id` text,
	`scopes_json` text NOT NULL,
	`device_name` text,
	`status` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`interval_sec` integer NOT NULL,
	`last_polled_at` integer,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL
);

--> statement-breakpoint
-- 新列は旧表に存在しないため、生成された SELECT を手当てして既定値を与える:
--   workspace_id / device_name / last_polled_at → NULL (承認前は未確定)
--   scopes_json → '[]' (要求 scope を復元できないので空集合。過剰付与を作らない)
--   attempts → 0
--   status='expired' → 'denied' (新 enum に expired は無い。期限切れは expires_at から導出する)
--   tenant_id IS NULL の行 → 移送しない (テナント境界を復元できない行は D4 の穴になる)
INSERT INTO `__new_device_authorizations`("id", "tenant_id", "device_code_hash", "user_code", "user_id", "workspace_id", "scopes_json", "device_name", "status", "attempts", "interval_sec", "last_polled_at", "expires_at", "created_at") SELECT "id", "tenant_id", "device_code_hash", "user_code", "user_id", NULL, '[]', NULL, CASE "status" WHEN 'expired' THEN 'denied' ELSE "status" END, 0, "interval_sec", NULL, "expires_at", "created_at" FROM `device_authorizations` WHERE "tenant_id" IS NOT NULL;
--> statement-breakpoint
-- ddl:contract-approved device_authorizations の tenant_id NOT NULL 化と列追加は SQLite では表再作成しか手段が無い。旧認可コードは現行契約へ安全に復元できないため、tenant 不明行を失効扱いで移送しない。
DROP TABLE `device_authorizations`;
--> statement-breakpoint
-- ddl:contract-approved 上の再作成表を正式名へ入れ替える (表再作成の最終段)。
ALTER TABLE `__new_device_authorizations` RENAME TO `device_authorizations`;
--> statement-breakpoint
PRAGMA foreign_keys=ON;
--> statement-breakpoint
CREATE UNIQUE INDEX `device_authorizations_code_hash_uq` ON `device_authorizations` (`device_code_hash`);
--> statement-breakpoint
CREATE UNIQUE INDEX `device_authorizations_tenant_user_code_uq` ON `device_authorizations` (`tenant_id`,`user_code`);
--> statement-breakpoint
CREATE TABLE `__new_publisher_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`user_id` text NOT NULL,
	`device_name` text,
	`refresh_token_hash` text NOT NULL,
	`scopes_json` text NOT NULL,
	`family_id` text NOT NULL,
	`last_used_at` integer,
	`expires_at` integer NOT NULL,
	`revoked_at` integer,
	`created_at` integer NOT NULL
);

--> statement-breakpoint
-- 旧行は workspace 帰属を復元する手段が無い (旧表に workspace_id が無く、user_workspaces は本 migration で
-- 新設したため空)。workspace_id 不明の refresh token は認可判定で必ず拒否される死んだ資格情報なので、
-- 移送せず失効させる。Device Flow をやり直せば正しい workspace_id つきで再発行される。
-- (生成された INSERT ... SELECT は旧表に無い workspace_id を参照して prepare 時に落ちるため削除した)
-- ddl:contract-approved publisher_tokens への workspace_id NOT NULL 追加は SQLite では表再作成しか手段が無い。旧 token は Workspace 帰属を復元できないため移送せず、migration 後に再認証する。
DROP TABLE `publisher_tokens`;
--> statement-breakpoint
-- ddl:contract-approved 上の再作成表を正式名へ入れ替える (表再作成の最終段)。
ALTER TABLE `__new_publisher_tokens` RENAME TO `publisher_tokens`;
--> statement-breakpoint
CREATE UNIQUE INDEX `publisher_tokens_refresh_hash_uq` ON `publisher_tokens` (`refresh_token_hash`);
--> statement-breakpoint
CREATE INDEX `publisher_tokens_tenant_family_idx` ON `publisher_tokens` (`tenant_id`,`family_id`);
