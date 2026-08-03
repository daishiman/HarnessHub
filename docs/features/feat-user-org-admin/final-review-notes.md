---
status: blocked
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
| 2 | 係数変更が監査 event に記録される (SEC6) | **blocked** | `PATCH /api/v1/tenant/coefficients` は `501`。`updateCoefficients` port も `coefficient.change` の監査呼出しも無く、係数の**読取り**テストを変更の監査証拠として扱っていた。 |
| 3 | S17/S18 と /legal が axe 違反 0 で動作し、/legal は全利用者が閲覧できる | pass | `UOA-A11Y-001~008`・`UOA-A11Y-101~103`・`UOA-LEGAL-001/002/101~104` (axe違反0件、`/legal`は`withAuthz`非経由で未ログインでも到達可能) |

## quality constraint 9 ID exact-set

| id | 判定 | 根拠 |
|---|---|---|
| role-4-integration | pass | 全routeが`withAuthz`/`ACTION_RULES`単一choke point経由。認可単一middlewareゲート: 走査295ファイル/違反0件 |
| salary-pii-guard | pass | `toPiiViewer`は`atLeast(role, 'workspace-admin')`のみで判定、export常時マスク (`UOA-PII-001~009`) |
| audit-event-expansion | **blocked** | role/salary の監査は実装済みだが、要件に含まれる `coefficient.change` は未実装 |
| notification-dispatch-common-layer | **blocked** | 通知設定は保存できるが、feature から `createNotificationDispatcher` / `dispatch()` を呼ぶ実配線もメッセージ生成も無い |
| backend-b10-user-management | **blocked** | 係数設定と通知ディスパッチ接続が未達。ユーザー管理・PIIガード・`/legal` は実装済み |
| coefficient-and-user-entities | **blocked** | `TenantCoefficient` は読取り専用 port での消費に留まり、workspace-admin による係数管理を実現していない |
| auth-delegation-unchanged | pass | D3 (IdP/SSO委譲) を維持、パスワード/2FA自前実装は不採用。実装差分でも認証方式の変更なし |
| axe-a11y-zero | pass | S17/S18/`/legal`全画面でaxe違反0件を`toStrictEqual([])`で固定 |
| legal-static-page-all-users | pass | `/legal`は`withAuthz`を経由しない設計で全利用者 (未ログイン含む) が閲覧可能、salary/PII語彙が本文に含まれないことを実測確認 |

## quality-assurance-report.md からの引き継ぎ事項

認可単一middleware違反と client bundle 予算超過は解消済み。しかし、タスク仕様の検証器は legacy package の構造を確認するだけで、受入条件の実装有無を検査しない。そのため `validate-system-plan.py` の PASS を feature acceptance の PASS と読み替えてはいけない。

## Automated commands

- `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-user-org-admin`: `status: pass`（legacy contract の構造検査。受入条件の実装証明ではない）
- `pnpm --filter hub exec vitest run tests/user-org-admin tests/auth-tenancy/authz-decision-matrix.test.ts tests/security/middleware-entry.test.ts tests/shared-layers/contract.in-app-layers.test.ts --coverage=false`: `124 passed / 21 todo`
- `pnpm --filter hub build`、`pnpm --filter hub lint`、`pnpm --filter hub typecheck`、`node apps/hub/scripts/check-single-authz-middleware.mjs`: PASS

## 最終判定

acceptance は 2/3 pass・1/3 blocked。係数更新の owner port と `coefficient.change` 監査、および通知ディスパッチの feature 実配線が完了するまで、P05/P06/P07/P09/P10/P11/P12/P13 と feature を完了扱いにしない。commit・push・PR・本番デプロイは実施しない。
