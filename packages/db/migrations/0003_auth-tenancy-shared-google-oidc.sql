-- 共通 Google OAuth client 方式 (issue-auth-tenancy-shared-google-oidc-20260729)。
--
-- expand のみ。既存行の意味を変えないため 2 点を守っている:
--   1. credential_mode の既定値は 'customer_google'。この列を足す前に存在した行は
--      実際に顧客持ち込み client なので、既定値がそのまま正しい値になる。
--      「不明なら顧客方式」という緩和ではない (不明値の扱いはアプリ層で fail-closed)。
--   2. allowed_workspace_domains は NULL 許容。NULL = 未設定であり、顧客方式では
--      従来どおり hd を検査しない = 既存テナントの認証境界が変わらない。
--      共有方式で NULL の行は解決側が拒否する (受入条件 2)。
--
-- client_secret_enc は NOT NULL のまま。共有方式の行は空文字を入れて
-- 「テナント行へ共有 secret を複製していない」を検査可能にする (受入条件 4)。
ALTER TABLE `idp_connections` ADD `credential_mode` text DEFAULT 'customer_google' NOT NULL;--> statement-breakpoint
ALTER TABLE `idp_connections` ADD `allowed_workspace_domains` text;
