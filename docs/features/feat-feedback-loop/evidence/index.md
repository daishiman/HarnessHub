---
status: pass
layer: evidence-index
task: SYS-FEEDBACK-LOOP-P11
parent_feature: feat-feedback-loop
feature_package_id: feature-package/feat-feedback-loop
feature_context_digest: sha256:072f4574b7156af35459d941d9c0655fe9f50453e151420d6e98fcb7da5499c3
depends_on: SYS-FEEDBACK-LOOP-P10
---

# エビデンス索引 — feat-feedback-loop P11

P06(テスト実行)・P07(受入)・P09(品質保証)・P10(最終レビュー) の検証結果を、誰でも同一コマンドで再現できる証跡として索引化する。実装コードの修正・新規検証の実施は本 task のスコープ外(既存結果の索引化のみ)。

## 成果物一覧と再実行コマンド

| Phase | 成果物 | status | 再実行コマンド |
|---|---|---|---|
| P06 | [test-run-report.md](../test-run-report.md) | confirmed | `cd packages/db && /opt/homebrew/bin/node ../../node_modules/vitest/vitest.mjs run`<br>`cd apps/hub && /opt/homebrew/bin/node ../../node_modules/vitest/vitest.mjs run --coverage` |
| P07 | [acceptance-report.md](../acceptance-report.md) | confirmed | 上記 P06 コマンド + `pnpm --filter hub lint` |
| P08 | [refactoring-migration-note.md](../refactoring-migration-note.md) | — | `pnpm --filter @harness-hub/db exec drizzle-kit generate --name <name>`(migration 追加時のみ)。移行整合性は `packages/db/__tests__/migration-lineage.test.ts` / `backup-restore.test.ts` で検証 |
| P09 | [quality-assurance-report.md](../quality-assurance-report.md) | pass(§7 再検証で確定) | `pnpm --filter hub lint`<br>`cd apps/hub && /opt/homebrew/bin/node ../../node_modules/vitest/vitest.mjs run --coverage`<br>`python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-feedback-loop` |
| P10 | [final-review-notes.md](../final-review-notes.md) | pass(差し戻し後再検証で確定) | P09 と同一コマンド一式 + `pnpm --workspace-root exec biome check packages/db apps/hub`<br>`pnpm --filter @harness-hub/db exec tsc --noEmit`<br>`pnpm --filter hub exec tsc --noEmit` |

## 全 feature 共通の再検証コマンド(rerun-command-contract)

```bash
cd packages/db && /opt/homebrew/bin/node ../../node_modules/vitest/vitest.mjs run
cd apps/hub && /opt/homebrew/bin/node ../../node_modules/vitest/vitest.mjs run --coverage
pnpm --workspace-root exec biome check packages/db apps/hub
pnpm --filter @harness-hub/db exec tsc --noEmit
pnpm --filter hub exec tsc --noEmit
python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-feedback-loop
```

published task spec の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できないため、上記の世代非依存コマンド(current pointer から現行世代を再解決)を正本とする。

## Mandatory evidence 対応表

| # | Evidence 項目 | 状態 | 参照 |
|---|---|---|---|
| 1 | priority 値域/round-trip | PASS | `packages/schemas/feedback-loop/contracts.ts` の `FEEDBACK_PRIORITIES` enum + `test-run-report.md` §3 の round-trip 検証。実装: `packages/db/schema/feedback-loop/schema.ts` |
| 2 | workspace-admin 自 tenant pull | PASS | `apps/hub/src/__tests__/feedback-loop/route-handler-execution.test.ts`(P05 差し戻しで実行テスト化、`quality-assurance-report.md` §7 で確認) |
| 3 | provider-admin cross-tenant pull+audit | PASS | 同上 + `packages/db/__tests__/feedback-loop-queue.test.ts`(実DB検証、6テスト) |
| 4 | 他 tenant 拒否 | PASS | `packages/db/__tests__/tenant-isolation.test.ts` + `apps/hub/src/__tests__/feedback-loop/feedback-entity-tenant-scope-isolation.test.ts` |
| 5 | migration | PASS | `packages/db/migrations/0005_feedback-loop.sql`・`0006_builds.sql`(P10差し戻しで追加)。`refactoring-migration-note.md` §「P10差し戻し追補」参照 |
| 6 | P10/P11 証跡対応表 | 本表がその対応表を兼ねる | 本ファイル |

## quality_constraints 8件 最終状態(P10 差し戻し後)

`final-review-notes.md` §「P10 差し戻し後の再検証 (追記)」を正本とする。8件中8件 PASS。差し戻し前に FAIL だった quality_constraint 7(`feedback-fix-publish-existing-pipeline-no-automerge`)は、`builds` テーブル新設 + AiJob 完了時の冪等作成(`apps/hub/src/app/api/v1/ai-jobs/[id]/complete/route.ts`)により解消済み。

## 既知の不整合(参照先成果物との整合確認結果)

参照した4成果物間に矛盾は無い。P09 §7 の再検証(coverage 81.28%)と P10 差し戻し後再検証(coverage 83.05%)は測定タイミングが異なるため数値差があるが、いずれも閾値80%を上回っており矛盾ではない。P12へ引き継ぐ。
