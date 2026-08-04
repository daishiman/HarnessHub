---
status: pass
layer: feature-evidence
task: SYS-USER-ORG-ADMIN-P11
feature_package_id: feature-package/feat-user-org-admin
source_digest: sha256:2b8b98b7ea12e01a3628583051d98647558e7cae652c5e38aee39a4e87046b14
---

# feat-user-org-admin 証跡索引

| phase | 成果物 | 内容 |
|---|---|---|
| P06 | (beads issue `HarnessHub-xwt.6` の notes) | 単体/結合/分離/a11yテストの実行結果 (本featureはP06でtest-run-report.mdを生成しない設計、beads notesが一次記録) |
| P07 | [acceptance-report.md](../acceptance-report.md) | acceptance 3件の判定、quality constraint 9 ID exact-set |
| P09 | [quality-assurance-report.md](../quality-assurance-report.md) | axe、Tenant分離、PII運用readiness、認可単一middleware、Worker/Client bundle |
| P10 | [final-review-notes.md](../final-review-notes.md) | acceptance 3件・quality constraint 9件の最終再突合 |
| Review | [final-review-receipt.md](../final-review-receipt.md) | 2026-08-04 再レビューの判定、仕様影響なしの理由、受入・品質ゲートの再実行結果 |

## salary 読取監査ログ / 係数変更監査 event ログの一次証跡

- 監査記録先: `audit_events` テーブル (`packages/db/schema/core/security.ts`、`tenantId`+`seq` 一意index、追記専用)
- 語彙: `user.role_change` / `user.salary_change` / `user.salary_read` (`apps/hub/tests/user-org-admin/audit-event-vocabulary-contract.test.ts` で4件固定・summaryへ金額を含めない設計を検証)
- ルート結線: `apps/hub/tests/user-org-admin/api-routes-acceptance.test.ts` の `UOA-ROUTE-003~005` で、role変更/salary変更/salary読取りがそれぞれ対応する監査語彙でAuditRepoに記録されることをHTTP実行で確認
- 係数変更: `UOA-COEF-102` / `UOA-AUDIT-103` が real-DB HTTP 結合で `PATCH /api/v1/tenant/coefficients` → owner port → `coefficient.change` 監査を確認する。summary は `changedFields` のみで、係数の実値を含めない。
- 通知: `UOA-NOTIF-101~103` が共有 `NotificationDispatcher` への channel 選択・PII 非混入メッセージ・係数 PATCH からの実 dispatch を確認する。

## 実装証跡

- service/http/runtime: `apps/hub/src/features/user-org-admin/service.ts`、`apps/hub/src/features/user-org-admin/http.ts`、`apps/hub/src/features/user-org-admin/runtime.ts`
- authz: `apps/hub/src/lib/authz/types.ts` (`atLeast`・`BASE_ROLES`)、`apps/hub/src/lib/authz/index.ts` (barrel)
- UI: `apps/hub/src/app/(dashboard)/users/`、`apps/hub/src/app/(dashboard)/users/[id]/user-dashboard.tsx`、`apps/hub/src/app/legal/`
- API route: `apps/hub/src/app/api/v1/users/`、`apps/hub/src/app/api/v1/tenant/coefficients/`
- tests (contract): `apps/hub/tests/user-org-admin/{api-routes-acceptance,audit-event-vocabulary-contract,authz-role-rules-contract,coefficients-repository-contract,legal-page-contract,metrics-rollup-repository-contract,notification-message-contract,pii-salary-contract,quality-constraints-exact-set-contract,screens-a11y-contract}.test.ts(x)`

## 再現

```bash
pnpm --filter @harness-hub/hub exec vitest run tests/user-org-admin
pnpm --filter @harness-hub/hub test
node apps/hub/scripts/check-single-authz-middleware.mjs
node apps/hub/scripts/check-bundle.mjs
node apps/hub/scripts/check-client-bundle.mjs
python3 plugins/system-dev-planner/scripts/validate-system-plan.py \
  --repo-root . --feature-package feature-package/feat-user-org-admin
```
