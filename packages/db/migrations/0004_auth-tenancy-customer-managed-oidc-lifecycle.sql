-- 顧客持ち込み Google OAuth client の管理 lifecycle
-- (issue-auth-tenancy-customer-managed-google-oidc-20260729)。
--
-- expand のみ。既存行の意味を変えないため 3 点を守っている:
--   1. credential_status の既定値は 'active'。この列を足す前に存在した行は実際に稼働中の
--      接続なので、既定値がそのまま正しい値になる。credential_mode の 0003 と同じ根拠であり
--      「不明なら有効」という緩和ではない (管理 API から登録される新しい接続は明示的に
--      'pending' で作られ、接続テストを通るまで認証解決の対象にならない)。
--   2. rotation 中の新 secret は client_secret_enc を上書きせず pending_client_secret_enc へ
--      置く。上書きにすると接続テストに落ちた時点で旧 secret が失われ、テナントのログインが
--      復旧不能になる (受入条件 5)。列を分ければ失敗時は pending 側を捨てるだけで済む。
--   3. last4 系は識別子であって秘密ではない。全値は保存後に一切返さないため、運用者が
--      Google Cloud 側の secret と突き合わせる手掛かりをこれだけに限定する (受入条件 2)。
--
-- staging 列が secret だけでなく client_id / credential_mode / 許可ドメインまで揃っているのは、
-- 0000 の `idp_connections_tenant_issuer_uq` が **1 テナント 1 Google 行**を強制しているため。
-- 行を増やして切り替える余地が無いので、共有方式 → 顧客方式の mode 切替も「既存 1 行の
-- credential 差し替え」になる。差し替える値を staging へ一式置いてから CAS で一斉に昇格させれば、
-- 昇格の瞬間まで現行 credential が生きたままになり、mode 切替も secret rotation と同じく
-- 無停止・取消可能になる (scope_in の mode 切替 / 受入条件 5)。
-- 逆に client_id だけ即時上書きすると、secret と client_id が食い違う中間状態が生まれ、
-- その間のログインが全て失敗する。
--
-- 追加列はすべて NULL 許容 (credential_status のみ DEFAULT 付き NOT NULL) なので、
-- SQLite の ALTER TABLE ADD COLUMN で表再作成なしに適用できる。
ALTER TABLE `idp_connections` ADD `credential_status` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `idp_connections` ADD `client_secret_last4` text;--> statement-breakpoint
ALTER TABLE `idp_connections` ADD `pending_client_secret_enc` text;--> statement-breakpoint
ALTER TABLE `idp_connections` ADD `pending_client_secret_last4` text;--> statement-breakpoint
ALTER TABLE `idp_connections` ADD `pending_client_id` text;--> statement-breakpoint
ALTER TABLE `idp_connections` ADD `pending_credential_mode` text;--> statement-breakpoint
ALTER TABLE `idp_connections` ADD `pending_allowed_workspace_domains` text;--> statement-breakpoint
ALTER TABLE `idp_connections` ADD `pending_tested_at` integer;--> statement-breakpoint
ALTER TABLE `idp_connections` ADD `last_tested_at` integer;--> statement-breakpoint
ALTER TABLE `idp_connections` ADD `updated_at` integer;
