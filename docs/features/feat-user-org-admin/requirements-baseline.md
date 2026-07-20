---
status: confirmed
layer: feature-design
task: SYS-USER-ORG-ADMIN-P01
parent_feature: feat-user-org-admin
feature_package_id: feature-package/feat-user-org-admin
source: .dev-graph/plans/feature-package-feat-user-org-admin/goal-spec.json
feature_context_digest: sha256:e67d33e37c98456225d7391c7f47a71c19e2efe043a76607487a50897adfa84f
architecture_refs: [arch-harness-hub-security, arch-harness-hub-backend, arch-harness-hub-frontend]
---

# feat-user-org-admin 要件ベースライン

> **位置づけ**: P01 (要件ベースライン確定) の成果物。promoted goal-spec の purpose/goal/scope_in/scope_out/acceptance/quality_constraints を**確定転記**した baseline であり、P02 以降の全 task はこの文書を唯一の合意事項として参照する。転記元との相違が判明した場合は本文書を修正せず goal-spec 側の再確定を dev-graph へ差し戻す (rollback 規約)。

> **構築順オーバーレイ (baseline 外)**: **P4**。S17/S18 の管理 UI は低めの優先度。ただし role/deny-by-default の認可基盤は feat-auth-tenancy が P0 で先に実装する。正本: [system-design-overview.md](../../system-design-overview.md) §3 / [README.md](../README.md)。

## 1. 目的 (purpose)

ユーザー管理 (S17) とアカウント設定 (S18) を提供し、role 管理 (qa-005 の 4 role と統合)・年収→時給換算の係数設定 (PII: admin 限定・API 非公開・export マスク = SEC4)・通知設定 (D6 Resend) を確立する (I14)

## 2. ゴール (goal)

workspace-admin がユーザーの role・部門・年収係数を管理でき、salary が PII ガード (admin 限定表示・読取監査・export マスク) 下にあり、通知設定が通知ディスパッチ共通層と接続された状態

## 3. スコープ

### 3.1 scope_in

1. S17 ユーザー管理 + 個別ダッシュボード
2. S18 アカウント設定 (プロフィール/通知/表示)
3. User 拡張 (department/salary) + TenantCoefficient エンティティ
4. PII ガード共通層 (salary の admin 限定・監査・export マスク)
5. 通知設定と D6 (Resend) 通知ディスパッチの接続

### 3.2 scope_out

1. 認証方式の変更 (D3 の IdP 委譲を維持。パスワード/2FA 自前実装は不採用)
2. role 体系の再設計 (qa-005 の 4 role を維持)

## 4. 受入基準 (acceptance — goal-spec 3 件の確定転記・転記原文)

1. salary が admin 以外の API/画面/export に露出しない (分離テスト + 監査記録)
2. 係数変更が監査 event に記録される (SEC6)
3. S17/S18 が axe 違反 0 で動作する

## 5. 品質制約 (quality_constraints — goal-spec 8 件の確定転記)

| id | summary (転記原文) | source |
|---|---|---|
| role-4-integration | role 管理は qa-005 で確定した 4 role (provider-admin / workspace-admin / owner / member) と統合し、S17 を含む新規 API 群も認可単一ミドルウェア配下で role × 操作の許可表に従う | system-spec/auth.md qa-005; system-spec/security.md qa-025 (SEC2) |
| salary-pii-guard | salary は PII 列として admin 限定表示・一般 API 非公開・export マスクで扱い、読取は監査記録の対象とする | system-spec/security.md qa-025 (SEC4); system-spec/database.md qa-024 |
| audit-event-expansion | 係数変更・ユーザー管理操作を含む新規操作は監査 event に記録される (append-only 監査の対象拡張) | system-spec/security.md qa-025 (SEC6) |
| notification-dispatch-common-layer | 通知設定のメール送信は D6 (Resend Free) を採用し、必ず通知ディスパッチ共通層を経由する (feature 実装から Resend API を直接呼ばない)。API key は環境 binding のみ、宛先はテナント内ユーザー限定、PII をメール本文に含めない | system-spec/00-requirements-definition.md D6; system-spec/security.md qa-025 (SEC9); system-spec/backend.md qa-023 (B8) |
| backend-b10-user-management | ユーザー管理 (S17) の backend 実装は B10 として qa-023 で確定: role 4 種 (qa-005) と統合し、係数設定・PII ガードを備える | system-spec/backend.md qa-023 (B10) |
| coefficient-and-user-entities | TenantCoefficient (annualHours・分/回・削減率) と User 拡張 (department/salary) は qa-024 で確定したエンティティ。全新規テーブルは tenant_id/workspace_id スコープ列を必須とする (D4 row-level-scope) | system-spec/database.md qa-024 |
| auth-delegation-unchanged | 認証方式は D3 (顧客 IdP / SSO 委譲、Auth.js + テナント別 OIDC) を維持し、Studio mockup のパスワードログイン・2FA 自前実装は不採用 | system-spec/00-requirements-definition.md D3; system-spec/auth.md qa-005 |
| axe-a11y-zero | GitHub Actions CI 品質ゲートの一部として axe a11y 違反ゼロが全画面 (S17/S18 を含む) に適用される | docs/shared-layers.md §3 (引用: .dev-graph/plans/feature-package-feat-hub-foundation/goal-spec.json quality_constraints.github-actions-ci) |

## 6. 転記元と検証

- 転記元: `.dev-graph/plans/feature-package-feat-user-org-admin/goal-spec.json` (promoted。feature_context_digest = sha256:e67d33e37c98456225d7391c7f47a71c19e2efe043a76607487a50897adfa84f)
- 本文書の受入条件 (P01 acceptance): goal-spec の acceptance 3 件 (§4) と quality_constraints 8 件 (§5) が過不足なく転記されていること
