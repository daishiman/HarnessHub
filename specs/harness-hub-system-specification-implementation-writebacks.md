# Harness Hub システム要件仕様 — 実装 writeback 分冊

この文書は [システム要件仕様 wrapper](harness-hub-system-specification.md) から分離した実装反映の索引である。要件の正本は `system-spec/`、判断と検証の正本は各仕様反映受領書に置く。

## 共有 Google OAuth client 方式 (2026-08-01 / `HarnessHub-fnej` / qa-110〜qa-115)

- `idp_connections.credential_mode` は `customer_google` と `shared_google` を明示し、未知値・設定不備を別方式へフォールバックさせない。既存行は `customer_google` を既定にして従来の tenant 別 callback と暗号化 secret を維持する。
- 共有方式は環境単位の Google client 1 組と固定 callback `/api/auth/shared/callback/tenant-oidc` を使う。tenant は 10 分 TTL の署名付き `state` と HttpOnly binding cookie で復元し、PKCE S256 と nonce は Auth.js に残す。
- Auth.js が検証した Google ID token の `hd` を tenant の `allowed_workspace_domains` と完全一致させる。欠落、別 Workspace、サブドメイン、tenant 差し替えでは JIT 利用者・session を作らない。
- 共有 client ID/secret は tenant DB 行、ログ、response、Git、GitHub Secretsへ複製しない。Cloudflare Worker の環境 secret とし、共有方式を使わない環境の未設定は許す。
- migration `0003_auth-tenancy-shared-google-oidc.sql` は列追加のみ。rollback は shared tenant を customer mode へ戻して旧 callback を確認してから Worker code を戻す。
- 正本は [auth](../system-spec/auth.md)、[backend](../system-spec/backend.md)、[security](../system-spec/security.md)、[database](../system-spec/database.md)、[infrastructure](../system-spec/infrastructure.md)、[maintenance-ops](../system-spec/maintenance-ops.md)。判断と検証は [仕様反映受領書](../docs/features/feat-auth-tenancy/shared-google-oidc-spec-reflection-receipt.md) を参照する。

## 外部参考 Skill の所有境界 (2026-08-02 / `HarnessHub-ym9h` / qa-122)

- `doc/参考Skill/` は外部由来の比較・移管記録であり、能動 plugin の契約正本にしない。
- `aiworkflow-requirements` を前提にする参考コピーは directory 単位で削除し、利用中の外部 CLI 契約だけを consumer plugin 配下へ履歴付きで移す。
- 変更は repository の開発文書・plugin reference 所有に限定され、製品 UI、外部 API、DB schema、認証認可、Cloudflare deploy unit は変更しない。
- 正本は [dev-workflow](../system-spec/dev-workflow.md) の `qa-122`、判断・検証・復元経路は [仕様反映受領書](../docs/features/feat-doc-governance-portability/aiworkflow-reference-cleanup-spec-reflection-receipt.md) を参照する。

## 顧客持ち込み Google OAuth client 管理 (2026-08-02 / `HarnessHub-uk2i` / qa-124〜qa-130)

- `provider-admin` は `/settings/auth` と管理 API から顧客 client の登録、接続テスト、有効化、無停止 rotation、取消、無効化、安全な再開を行う。
- lifecycle は `pending → tested → active → disabled`。認証は `active` のみを使い、再開には新 credential の staging と再テストを必須にする。
- client ID・secret・方式・許可ドメインは tenant ごとの staging へ一式保存し、暗号文 CAS で同時昇格する。secret は暗号化保存と last4 表示だけに限定する。
- 管理 API は tenant scope・同一 origin・Google issuer・provider-admin を fail-closed で強制し、有効化後の実ブラウザ login を別ゲートとする。
- 正本は [auth](../system-spec/auth.md)、[backend](../system-spec/backend.md)、[database](../system-spec/database.md)、[frontend](../system-spec/frontend.md)、[security](../system-spec/security.md)、[maintenance-ops](../system-spec/maintenance-ops.md)、[testing-qa](../system-spec/testing-qa.md)。詳細は [仕様反映受領書](../docs/features/feat-auth-tenancy/customer-managed-google-oidc-spec-reflection-receipt.md) を参照する。

## C10 inline Python graph authority guard (2026-08-03 / `HarnessHub-f84o` / qa-139)

- `python -c` / heredoc の変数、Path 式、join、format、import 別名を AST 定数伝播で復元し、graph authority への書込みを C02 writer 迂回として遮断する。rename / move は元と宛先の双方を変更対象とする。
- 遮断経路は subprocess / network / graph 全件検証を起動せず、未解決でも authority prefix または graph store 末尾が確定すれば fail-closed にする。読取と tmp/cache/templates は巻き込まない。
- `exec` / `eval` 内の再帰 source、任意文字列変換、別 script 本文は性能境界から対象外とし、PostToolUse 監査と C02 規約で補完する。製品 runtime 契約は非変更。判断と検証は [仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/f84o-inline-python-guard-spec-reflection-receipt.md) を参照する。

## C16 Beads ready payload 欠落報告 (2026-08-03 / HarnessHub-xz0u / qa-141・qa-142)

- 選択範囲内かつ schedulable な Beads node が bd ready payload に無いとき、C16 は node を黙って除外せず `unmapped[]` に `reason=ready_payload_entry_absent` と `source=schedule-graph` を記録する。
- pre-lease は ready set と unmapped、最終 report は active lease/resource conflict の conflicts を加えた和で候補 node を被覆する。P01 parent / dependency 形状は fail-closed、parity dependency は順序非依存で比較し、依存未充足・parity・manifest 分類とは別 reason とする。復旧は C03/C28 の同期・linkage 修復・fresh parity manifest の後に再実行し、欠落 node を推測で ready set へ加えない。
- 変更は repository 内の Dev Graph 開発品質契約に限り、Harness Hub の外部 API、DB schema、認証認可、UI、Cloudflare deploy unit は変更しない。正規反映と検証は [xz0u 仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/xz0u-ready-payload-entry-absent-spec-reflection-receipt.md) を参照する。
