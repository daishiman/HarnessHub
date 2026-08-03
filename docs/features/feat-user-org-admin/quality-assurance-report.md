---
status: blocked
layer: feature-quality
task: SYS-USER-ORG-ADMIN-P09
feature_package_id: feature-package/feat-user-org-admin
source_digest: sha256:2b8b98b7ea12e01a3628583051d98647558e7cae652c5e38aee39a4e87046b14
---

# feat-user-org-admin 品質保証報告

| ゲート | 判定 | 実測 |
|---|---|---|
| axe / WCAG 2.2 AA | pass | S17/S18/`/legal` 実コンポーネント、`UOA-A11Y-001~008`・`101~104`、axe違反0件を`toStrictEqual([])`で固定 |
| Tenant分離 (SEC2) | pass | user-org-admin の全route (`/api/v1/users`・`/api/v1/tenant/coefficients`等) は共通 `withAuthz`/`decide()` (単一choke point) を経由し、`tests/auth-tenancy/tenant-isolation.test.ts` T-ISO-01~07 (越境拒否・行レベルscope分離) が既存の共有ゲート `check-tenant-isolation-gate.mjs` で必須実行されている。feature 固有の再実装は行っていない (SEC2 = 判定を二重に持たない設計) |
| 検査pipeline挙動同値 | N/A | `packages/inspection/` (Publisher/Hub共有の静的検査pipeline) は本featureのwrite_scope外であり、変更・呼び出しのいずれも行っていないため対象外 (本featureはユーザー管理/PIIガードのみを扱う) |
| PII ガード (SEC4) | pass | `toPiiViewer`が`atLeast(role, 'workspace-admin')`のみで判定 (`UOA-PII-001~009`)。salary読取は`audit_events`テーブル (`packages/db/schema/core/security.ts`、tenant_id+seq一意で追記専用) へ`user.salary_read`として記録され、既存の監査基盤をそのまま利用 (新規運用対象の追加なし) |
| 監査event (SEC6) | **blocked** | role/salary の監査は PASS。ただし受入条件の `coefficient.change` は未実装で、係数 `PATCH` は `501`。 |
| 通知ディスパッチ (SEC9) | **blocked** | 通知設定の保存のみで、feature から共通 `NotificationDispatcher.dispatch()` を呼ぶ実配線・PII 非混入メッセージ生成・統合テストが無い。 |
| 認可単一middleware | pass | 走査295ファイル、違反0件、allowlist 6件、route例外5件が期待集合と一致 (下記「発見した不適合と是正」参照) |
| Worker bundle (G5) | pass | gzip 1.364 MiB / 3.000 MiB |
| Client bundle (G13) | pass | 最大 `/users/[id]` 116.5 KiB / route予算 120 KiB (下記「発見した不適合と是正」参照) |

## quality constraint 9 ID exact-set (Mandatory evidence)

acceptance-report.md と同一根拠 (`UOA-QC-001~004`) を再確認。8件+1件 (`legal-static-page-all-users`) の意図的分割はドリフトではなく、本 P09 でも変更なし。

## 発見した不適合と是正 (P05 由来、本 P09 で fail-closed に検出・修正)

P09 の横断確認中に、`apps/hub/scripts/check-single-authz-middleware.mjs` と `check-client-bundle.mjs` の2ゲートで実際の違反を検出した。いずれも P05 (実装) 由来の不備であり、P09 の責務 (「applicable checks を fail-closed にする」) に沿って本タスク内で修正した。

1. **単一認可middleware違反 (25件)**: `service.ts`の`toPiiViewer`が`role === 'workspace-admin' || role === 'provider-admin'`という role literal 比較を直接持ち、`user-dashboard.tsx`もローカルに`ADMIN_ROLES`/`ROLE_VALUES`という role literal 配列を持っていた。SEC2 (認可判定は`lib/authz`に一本化) 違反。`atLeast()` (service.ts) と `lib/authz`由来の`BASE_ROLES` (user-dashboard.tsx) を使うよう修正し、role比較・列挙のロジックを`lib/authz`外へ複製しない状態にした。残る21件は`lib/authz`の正本語彙を実際に参照するcontract test 3ファイル (authz-role-rules-contract/pii-salary-contract/legal-page-contract) であり、正本を再実装せず参照するだけの正当な例外としてALLOWLISTに理由付きで追加した。
2. **Client bundle予算超過 (`/users/[id]` 158.9 KiB → 142.4 KiB → 116.5 KiB)**: 上記修正の過程で2段階の予算超過が発生した。(a) `user-dashboard.tsx`がrole入力検証に`sessionRoleSchema` (zod) をclient componentで直接呼び出し、zod本体 (約19.8 KiB gzip) がbundleに混入した。zodを使わず`lib/authz`由来の`BASE_ROLES`配列で列挙値チェックする方式に変更し解消。(b) `atLeast`/`BASE_ROLES`を`lib/authz`の barrel (`index.js`) から import したところ、barrelがnext-auth依存の`runtime.ts`も re-export しており、Buffer polyfill (`@auth/core`のAuthError等、約23 KiB gzip) がclient bundleへ混入した。import元を純粋関数のみを持つ`lib/authz/types.js`に直接向けることで解消し、最終的に予算 120 KiB に対し116.5 KiBに収まった。

いずれも共有ゲート自体の是正ではなく、本feature (P05実装分) 側のコード修正で解消したため、feat-hub-foundationへの差し戻しは不要と判断した。

## Automated commands

- `pnpm --filter hub build` (Next.js): 成功
- `pnpm --filter hub build:worker` (OpenNext): 成功
- `node scripts/check-single-authz-middleware.mjs`: `OK: 走査 295 ファイル / 違反 0 件 / allowlist 6 件 / route 例外 5 件が期待集合と一致`
- `node scripts/check-bundle.mjs` (Worker, wrangler-dry-run): `gzip 後合計 1.364 MiB / 予算 3.000 MiB`
- `node scripts/check-client-bundle.mjs` (Client First Load JS): `/users/[id] OK 116.5 KiB / 予算 120 KiB` (全route pass)
- `pnpm --filter hub test` (vitest, arm64 workaround): 98 files / 1144 passed / 1 skipped / 21 todo / 0 failed
- `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-user-org-admin`: `status: pass`, `violations: []`

## 判定

ビルド・静的品質ゲートは PASS だが、feature acceptance を満たさないため品質保証は blocked。P05 に差し戻し、係数更新＋監査と通知実配線の受入テストを実装してから再判定する。
