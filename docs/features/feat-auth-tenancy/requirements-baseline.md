---
status: confirmed
layer: feature-design
task: SYS-AUTH-TENANCY-P01
parent_feature: feat-auth-tenancy
feature_package_id: feature-package/feat-auth-tenancy
source: .dev-graph/plans/feature-package-feat-auth-tenancy/goal-spec.json
feature_context_digest: sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5
architecture_refs: [arch-harness-hub-security, arch-harness-hub-backend]
---

# feat-auth-tenancy 要件ベースライン

> **位置づけ**: P01 (要件ベースライン確定) の成果物。promoted goal-spec の purpose/goal/scope_in/scope_out/acceptance/quality_constraints を**確定転記**した baseline であり、P02 以降の全 task はこの文書を唯一の合意事項として参照する。転記元との相違が判明した場合は本文書を修正せず goal-spec 側の再確定を dev-graph へ差し戻す (rollback 規約)。

## 1. 目的 (purpose)

テナント別 OIDC (Auth.js) と role 4 種、全 API への Tenant/Workspace スコープ強制 (D4 row-level-scope)、Publisher 向け OAuth Device Flow を確立する

## 2. ゴール (goal)

2 テナント同時稼働で認可の越境が分離テストにより 0 件と証明され、Device Flow で token 取得・失効が動作する状態

## 3. スコープ

### 3.1 scope_in

1. Auth.js マルチテナント OIDC 動的解決
2. role: provider-admin/workspace-admin/owner/member
3. 認可の単一ミドルウェア集約
4. OAuth Device Flow + token 失効導線
5. テナント分離テスト

### 3.2 scope_out

1. 承認キュー (Stage 2)
2. 監査 UI (Stage 2)

## 4. 受入基準 (acceptance — goal-spec 3 件の確定転記・転記原文)

1. テナント越境アクセスが分離テストで 0 件
2. Device Flow の E2E (承認→token→失効) が成功する
3. Auth.js 依存が adapter 境界に隔離されている (D3 caveat)

## 5. 品質制約 (quality_constraints — goal-spec 7 件の確定転記)

| id | summary (転記原文) | source |
|---|---|---|
| tenant-oidc-dynamic-resolution-authjs-d3-qa005 | Auth.js (旧 NextAuth) + テナント別 OIDC を採用し、Tenant ごとに顧客既存 IdP (Google Workspace / Microsoft Entra ID) の OIDC 設定を動的に解決する。ログイン URL /{tenant_slug}/signin で tenant を先に確定し当該テナントの idp_connections のみを候補にする。issuer/aud 厳密一致・nonce/state 検証・PKCE S256 併用・email_verified=true のみ受理・識別子は idp_subject (UNIQUE(tenant_id, idp_subject))・JIT provisioning は role=member/status=active で自動昇格しない。Hub 独自のアカウント基盤・パスワード保存は作らない。 | system-spec/spec-state.json qa-005 (Hub Web/API の認証・認可方式: Auth.js + テナント別 OIDC 採用。Tenant ごとに顧客既存 IdP の OIDC 設定を登録し、Hub 独自のアカウント基盤・パスワード保存は作らない §10.2); qa-036 (OIDC 検証契約 T1 対策の詳細: issuer/aud 厳密一致・nonce/state・PKCE S256・tenant 束縛・email_verified=true のみ受理・識別子は idp_subject・JIT provisioning は自動昇格しない); system-spec/00-requirements-definition.md D3 (confirmed。選択肢 authjs-oidc 採用理由: テナントごとに顧客既存 IdP を登録でき Hub 独自アカウント基盤を作らない要件と整合); docs/backend-spec.md §3.2 (Web セッション: Auth.js + テナント別 OIDC → 署名付き JWT cookie。mockup のパスワードログイン画面は採用しない SEC1・D3 維持、IdP redirect へ置換) |
| role4-authorization-matrix-single-middleware-deny-by-default-sec2 | role は provider-admin/workspace-admin/owner/member の 4 種とし、実効 role を全順序 member<owner<workspace-admin<provider-admin の単一値として扱う単調な認可マトリクス (左から右へ許可が増えるだけ) を単一ミドルウェアで判定する (deny-by-default, SEC2)。全 API で Tenant/Workspace スコープを強制する。 | system-spec/spec-state.json qa-005 (role は provider-admin/workspace-admin/owner/member の 4 種。認可は全 API で Tenant/Workspace スコープを強制する); qa-036; qa-020 (security: qa-006 の deny-by-default = 全 API で Tenant/Workspace スコープ強制 D4 row-level-scope と分離テスト必須を維持し、認可判定を単一ミドルウェア層に集約する = 散在させない); docs/backend-spec.md §3.3 認可マトリクス (deny-by-default, SEC2。単一ミドルウェアで判定。この表は単調でなければならず、非単調な行を追加するとテスト T-1b が fail する。判定契約の正本は security-spec §3.5) — 具体的な role×リソースの許可表本文を含む |
| device-flow-os-credential-token-revocation-qa008 | Publisher/CLI/AI worker は OAuth Device Authorization Flow (RFC 8628 準拠) で認証し、短命 access token (15 分) + refresh token (90 日 rotation + 再利用検知) を OS の資格情報域 (macOS Keychain / Windows Credential Manager) に保存する。token の失効は Hub Web (Workspace 設定) から本人・管理者が実行できる導線を持ち、監査 event を記録する。 | system-spec/spec-state.json qa-008 (Publisher local session から Hub API を呼ぶ認証方式: OAuth Device Authorization Flow。access token は短命+refresh token 自動更新とし OS の資格情報域 [macOS Keychain / Windows Credential Manager] に保存。長命 secret のコピペを非エンジニアに求めない G1 整合。token の失効は Hub Web [Workspace 設定] から管理者・本人が実行できる); docs/backend-spec.md §3.2 数値契約 (device_code TTL 10 分 / user_code 8 文字 Crockford Base32・5 回失敗で denied / polling interval 5 秒 / access token 15 分 / refresh 90 日 rotation + 再利用検知) および §4.1 認証・Device Flow エンドポイント一覧 (POST /api/v1/device/code, /device/token, /device/approve, /api/v1/token/refresh, GET /api/v1/tokens, DELETE /api/v1/tokens/:id — 失効 [本人 or admin]・監査 event) および §3.3 認可マトリクス最終行 (token 失効: 本人✓/本人✓/✓/✓) |
| auth-adapter-boundary-better-auth-migration-hedge-d3-qa020 | Auth.js への依存は adapter 境界に閉じ、Auth.js が Better Auth 傘下入りを公式告知していることへの移行に備える (D3 caveat)。Auth.js のセキュリティ修正停止を Better Auth への移行トリガーとして明記する。 | system-spec/00-requirements-definition.md D3 (confirmed。注意事項: 『Auth.js は Better Auth 傘下入りが公式告知済み。実装着手前に Better Auth の移行ガイド成熟度を再確認し、Auth.js のセキュリティ修正停止を Better Auth への移行トリガーとして明記する』); system-spec/spec-state.json qa-020 (backend のコード構造規約: 認証アダプタの隔離。Auth.js への依存を adapter 境界に閉じ、Better Auth 移行 [D3 caveat] に備える); docs/backend-spec.md §1 コード構造規約 (qa-020: 認証アダプタ隔離 — Auth.js 依存を adapter 境界に閉じる); features/feat-auth-tenancy.md 受入 (『Auth.js 依存が adapter 境界に隔離されている [D3 caveat]』) |
| tenant-workspace-row-level-scope-isolation-test-ci-d4 | 単一 DB + tenant_id/workspace_id スコープ列 + アプリ層強制の row-level-scope 方式でマルチテナント論理分離を実装する (D4)。全 API で Tenant/Workspace スコープを強制し、分離テストを CI 必須とする。revisit 条件はテナント数が 10 を超える、または分離テストの失敗が頻発した場合の DB-per-tenant 再評価。 | system-spec/00-requirements-definition.md D4 (confirmed。row-level-scope 採用理由: 個人運用 C1・費用ゼロ C2 の下で実装・運用が最も単純。revisit 条件: テナント数が 10 を超える、または分離テストの失敗が頻発した場合は Turso DB-per-tenant を再評価); system-spec/spec-state.json qa-006 (セキュリティ基盤方針: テナント分離 = 全 API で Tenant/Workspace スコープ強制 + 分離テスト必須); qa-020 (security 適用形として D4 row-level-scope と分離テスト必須を維持); docs/backend-spec.md §3.3 (deny-by-default・単一ミドルウェアで Tenant/Workspace スコープ強制 = D4); features/feat-auth-tenancy.md 受入 (『テナント越境アクセスが分離テストで 0 件』) |
| no-hub-native-account-idp-delegation-i7 | Hub 独自のアカウント基盤・パスワード保存は作らず、マルチ Workspace 論理分離と顧客既存 IdP/SSO への認証委譲を行う (I7)。mockup のパスワードログイン画面は採用せず IdP redirect へ置換する。 | system-spec/00-requirements-definition.md U9 具体的にやりたいこと表 I7 (『マルチ Workspace 論理分離と顧客既存 IdP / SSO への認証委譲 [Hub 独自アカウント基盤を作らない]』資するゴール G4); system-spec/spec-state.json qa-005 (Hub 独自のアカウント基盤・パスワード保存は作らない §10.2); docs/backend-spec.md §3.2 (mockup のパスワードログイン画面は採用しない SEC1・D3 維持。IdP redirect へ置換) |
| session-jwt-staleness-emergency-revocation-qa036 | Web セッションは JWT (stateless) で maxAge 8 時間 / updateAge 15 分とし、role/status 変更の反映が最大 15 分遅延することを許容する。緊急失効 (退職・侵害) は session_revocations テーブル (テナント単位の最終失効時刻、KV/メモリキャッシュ TTL 60 秒) により即時とし、認可ミドルウェアが JWT.iat < revoked_at のトークンを拒否する。 | system-spec/spec-state.json qa-036 (session 数値: maxAge 8 時間・updateAge 15 分。失効の意味論: JWT は stateless のため role/status 変更の反映は最大 15 分遅延する。これを受容する代わりに Publisher/ingest token 失効は即時、緊急失効 [退職・侵害] は session_revocations テーブル [テナント単位の最終失効時刻・KV/メモリキャッシュ TTL 60 秒] により即時とし認可 MW が iat < revoked_at の JWT を拒否する); docs/backend-spec.md §2.2 session_revocations テーブル定義 (tenant_id PK, revoked_at。緊急失効のみ。認可 MW が JWT.iat < revoked_at を拒否する。KV/メモリキャッシュ [TTL 60 秒] 経由で参照し通常の DB 往復を発生させない security-spec §2.1) および §3.2 数値契約 (session maxAge 8h / updateAge 15 分 = role/status 変更の失効許容 15 分。緊急失効は session_revocations により即時 §2.2) |

## 6. 転記元と検証

- 転記元: `.dev-graph/plans/feature-package-feat-auth-tenancy/goal-spec.json` (promoted。feature_context_digest = sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5)
- 本文書の受入条件 (P01 acceptance): goal-spec の acceptance 3 件 (§4) と quality_constraints 7 件 (§5) が過不足なく転記されていること
