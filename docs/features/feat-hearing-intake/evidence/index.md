---
status: complete
layer: feature-evidence
task: SYS-HEARING-INTAKE-P11
feature_package_id: feature-package/feat-hearing-intake
source_digest: sha256:61fac79fec00ca6a6788ee4aa0ed2152e1ded2451ce3d8633e88c09149c96db5
---

# feat-hearing-intake 証跡索引

| phase | 成果物 | 内容 |
|---|---|---|
| P06 | [test-run-report.md](../test-run-report.md) | 5カテゴリ、normative evidence、再実行コマンド |
| P07 | [acceptance-report.md](../acceptance-report.md) | acceptance 3件の判定 |
| P09 | [quality-assurance-report.md](../quality-assurance-report.md) | axe、tenant、SEC5/7/8、容量ゲート |
| P10 | [final-review-notes.md](../final-review-notes.md) | quality constraints 10件の判定 |
| P10 | [spec-reflection-receipt.md](../spec-reflection-receipt.md) | 仕様影響なしの判断根拠と正本照合 |

## 実装証跡

- contract: `packages/schemas/hearing-intake/contracts.ts`
- data/transaction: `packages/db/schema/hearing-intake/schema.ts`、
  `packages/db/repository/hearing-intake.ts`、
  `packages/db/repository/hearing-intake-queue.ts`
- queue consumer: `apps/hub/src/features/hearing-intake/ai-job-adapter/index.ts`
- server estimate: `apps/hub/src/features/hearing-intake/estimation-adapter/index.ts`
- UI/API: `apps/hub/src/app/(dashboard)/sheets/`、`apps/hub/src/app/api/v1/{sheets,ai-jobs}/`
- tests: `apps/hub/tests/hearing-intake/`、`packages/db/__tests__/hearing-intake.test.ts`

## 再現

```bash
pnpm --filter @harness-hub/hub exec vitest run tests/hearing-intake
pnpm --filter @harness-hub/hub test
pnpm --filter @harness-hub/db test
pnpm --filter @harness-hub/schemas test
pnpm check:duplicates
pnpm check:auth
node packages/db/scripts/check-db-write-gate.mjs
pnpm --filter @harness-hub/db check:tenant-isolation-coverage
python3 plugins/system-dev-planner/scripts/validate-system-plan.py \
  --repo-root . --feature-package feature-package/feat-hearing-intake
```
