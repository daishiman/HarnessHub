---
status: confirmed
layer: feature-evidence-index
parent_feature: feat-build-pipeline-board
feature_package_id: feature-package/feat-build-pipeline-board
beads_id: HarnessHub-9am
recorded_at: 2026-08-13
---

# evidence/index: feat-build-pipeline-board (P11)

> SYS-BUILD-PIPELINE-BOARD-P11 の正本成果物。P06/P07/P09/P10 各成果物への再現可能な証跡索引。

## P06: テスト実行結果

- 成果物: [test-run-report.md](../test-run-report.md)
- 再実行コマンド:
  ```bash
  cd apps/hub && pnpm vitest run src/__tests__/build-pipeline-board/
  cd packages/db && pnpm vitest run __tests__/build-stage-transition.test.ts __tests__/migration-lineage.test.ts
  cd packages/schemas && pnpm vitest run build-pipeline-board/contracts.test.ts
  cd apps/hub && pnpm exec tsc --noEmit -p .
  ```
- 結果概要: 91/91 テスト PASS、axe 違反0件、tsc エラー0件。

## P07: 受入判定

- 成果物: [acceptance-report.md](../acceptance-report.md)
- 再実行コマンド: P06 のコマンドを再実行し、結果を `acceptance-report.md` の判定基準表と突合する。
- 結果概要: goal-spec acceptance 3項目中2項目PASS、CWVはP13へ引継ぎの条件付きPASS。

## P09: CI 品質ゲート確認

- 成果物: [quality-assurance-report.md](../quality-assurance-report.md)
- 再実行コマンド:
  ```bash
  pnpm --filter @harness-hub/hub run test:a11y
  pnpm --filter @harness-hub/ui run test:a11y
  node scripts/ci/check-tenant-isolation-gate.mjs --json artifacts/tenant-isolation-gate.json
  pnpm --filter @harness-hub/hub run test:tenant-isolation
  pnpm --filter @harness-hub/schemas run check:drift
  ```
- 結果概要: axe/tenant分離/工程操作認可/PublishRequest整合の4種すべてPASS (ローカル実行)。CI上での実run はPR作成後に GitHub Actions job URL を追記する。

## P10: 最終独立レビュー

- 成果物: [final-review-notes.md](../final-review-notes.md)
- 再実行コマンド: P06/P07/P09 のコマンドを再実行し、結果を `final-review-notes.md` の quality_constraints 6件判定表と突合する。
- 結果概要: quality_constraints 5件PASS、REST 5 endpoint要件は現行3 endpointのみ実装のため1件PARTIAL。

## 補助: system-dev-plan 再検証

```bash
python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-build-pipeline-board
```

前回実行結果: `"status": "pass"`, `"violations": []`。

## scope_in / acceptance 未割当チェック

feature context (`sha256:eeed295d50359e11ac8aee84800def3ad3399cee866ab5b4dc2712116c9a4441`) の scope_in/acceptance に対し、上記索引で P06/P07/P09/P10 全件を追跡した (未割当 0 件)。
