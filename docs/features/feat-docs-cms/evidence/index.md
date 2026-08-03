---
title: "feat-docs-cms 再現可能証跡索引 (P11)"
status: confirmed
graph_node_id: "SYS-DOCS-CMS-P11"
beads_linkage: "HarnessHub-9wb.11"
---

# feat-docs-cms 再現可能証跡索引

| phase | 成果物 | 再現コマンド |
| --- | --- | --- |
| P06 | [test-run-report.md](../test-run-report.md) | `pnpm --filter hub test` |
| P07 | [acceptance-report.md](../acceptance-report.md) | `cd apps/hub && /opt/homebrew/bin/node ../../node_modules/.bin/vitest run src/__tests__/docs-cms/` |
| P08 | [refactoring-migration-note.md](../refactoring-migration-note.md) | `pnpm --filter @harness-hub/db run check:ddl` |
| P09 | [quality-assurance-report.md](../quality-assurance-report.md) | `pnpm --filter @harness-hub/db run check:tenant-isolation-coverage` |
| P10 | [final-review-notes.md](../final-review-notes.md) | `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-docs-cms` |

`DOCS-PAGE-001` は `cd packages/db && /opt/homebrew/bin/node ../../node_modules/.bin/vitest run __tests__/docs-cms.test.ts`
で実行する。2026-08-03 の再実行では、Hub フルスイート 99 ファイル / 1,136 pass・本番 build・
型検査・DB/security gates・task 仕様書品質ゲートの全てが pass した。詳細は
[evidence-summary.md](../evidence-summary.md) と [P10 最終レビュー記録](../final-review-notes.md) を参照する。
