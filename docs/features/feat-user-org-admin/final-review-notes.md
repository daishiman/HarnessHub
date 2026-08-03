---
status: pass
layer: feature-final-review
task: SYS-USER-ORG-ADMIN-P10
feature_package_id: feature-package/feat-user-org-admin
source_digest: sha256:2b8b98b7ea12e01a3628583051d98647558e7cae652c5e38aee39a4e87046b14
---

# feat-user-org-admin 最終独立レビュー

P01〜P09 の成果物 (`requirements-baseline.md`・`architecture-decision-record.md`・`design-review-notes.md`・`test-design.md`・実装コード・`acceptance-report.md`・`refactoring-migration-note.md`・`quality-assurance-report.md`) を、goal-spec の acceptance 3件と quality constraint 9 ID exact-set (`role-4-integration`/`salary-pii-guard`/`audit-event-expansion`/`notification-dispatch-common-layer`/`backend-b10-user-management`/`coefficient-and-user-entities`/`auth-delegation-unchanged`/`axe-a11y-zero`/`legal-static-page-all-users`) へ突合した。

## Acceptance (3件)

| # | acceptance | 判定 | 根拠 |
|---|---|---|---|
| 1 | salary が admin 以外の API/画面/export に露出しない (分離テスト + 監査記録) | pass | `UOA-PII-001~009` (workspace-admin/provider-adminのみ閲覧可、role文字列比較不使用)。`quality-assurance-report.md`のPII運用readiness (`audit_events`テーブルへの`user.salary_read`記録) を再確認 |
| 2 | 係数変更が監査 event に記録される (SEC6) | pass | `PATCH /api/v1/tenant/coefficients` は owner の `updateCoefficients` port 経由で更新し、`coefficient.change` を値なし summary で記録する。`UOA-COEF-102` / `UOA-AUDIT-103` の real-DB HTTP 結合で確認した。 |
| 3 | S17/S18 と /legal が axe 違反 0 で動作し、/legal は全利用者が閲覧できる | pass | `UOA-A11Y-001~008`・`UOA-A11Y-101~103`・`UOA-LEGAL-001/002/101~104` (axe違反0件、`/legal`は`withAuthz`非経由で未ログインでも到達可能) |

## quality constraint 9 ID exact-set

| id | 判定 | 根拠 |
|---|---|---|
| role-4-integration | pass | 全routeが`withAuthz`/`ACTION_RULES`単一choke point経由。認可単一middlewareゲート: 走査295ファイル/違反0件 |
| salary-pii-guard | pass | `toPiiViewer`は`atLeast(role, 'workspace-admin')`のみで判定、export常時マスク (`UOA-PII-001~009`) |
| audit-event-expansion | pass | `coefficient.change` を含む既存語彙で実DB監査を記録し、値を summary に含めない |
| notification-dispatch-common-layer | pass | feature は共有 `NotificationDispatcher` の `dispatch()` のみを利用し、PII 非混入の係数/role通知を送る |
| backend-b10-user-management | pass | ユーザー管理・係数設定・PIIガード・共有通知・`/legal` が結線済み |
| coefficient-and-user-entities | pass | workspace-admin が owner port 経由で係数を更新でき、consumer は schema/migration を複製しない |
| auth-delegation-unchanged | pass | D3 (IdP/SSO委譲) を維持、パスワード/2FA自前実装は不採用。実装差分でも認証方式の変更なし |
| axe-a11y-zero | pass | S17/S18/`/legal`全画面でaxe違反0件を`toStrictEqual([])`で固定 |
| legal-static-page-all-users | pass | `/legal`は`withAuthz`を経由しない設計で全利用者 (未ログイン含む) が閲覧可能、salary/PII語彙が本文に含まれないことを実測確認 |

## quality-assurance-report.md からの引き継ぎ事項

認可単一middleware違反と client bundle 予算超過は解消済み。しかし、タスク仕様の検証器は legacy package の構造を確認するだけで、受入条件の実装有無を検査しない。そのため `validate-system-plan.py` の PASS を feature acceptance の PASS と読み替えてはいけない。

## Automated commands

- `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-user-org-admin`: `status: pass`（legacy contract の構造検査。受入条件の実装証明ではない）
- `pnpm --filter hub exec vitest run tests/user-org-admin tests/auth-tenancy/authz-decision-matrix.test.ts tests/security/middleware-entry.test.ts tests/shared-layers/contract.in-app-layers.test.ts --coverage=false`: `132 passed / 10 todo`
- `pnpm --filter hub build`、`pnpm --filter hub lint`、`pnpm --filter hub typecheck`、`node apps/hub/scripts/check-single-authz-middleware.mjs`: PASS

## 最終判定

acceptance は 3/3 pass。今回の PR は draft のため、本番デプロイと default branch への durable completion は行わない。残る todo は別スコープ課題として Beads に継続記録する。
