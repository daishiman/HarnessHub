---
status: confirmed
layer: feature-acceptance
task: SYS-DEV-PIPELINE-IMPROVEMENT-P07
parent_feature: feat-dev-pipeline-improvement
---

# feat-dev-pipeline-improvement 受入判定 (P07)

7 acceptance を P06 実測・実在ファイルへ突合した結果。

| # | acceptance | 判定 | 根拠 (evidence path) |
|---|---|---|---|
| AC-1 | 解決済み open 残置の決定論検査が存在し bd-bridge issue が close-loop で閉じている | **PASS** | `lint-open-residue.py` (OR-003 検出) / bd-bridge issue は upsert-node で completion_evidence=done へ収束 (close-loop exit 0) |
| AC-2 | eval-log 配置規約が README に明文化・CI lint が直下残置/重複/1MiB 超を遮断 | **PASS** | `eval-log/README.md` §配置規約 / `lint-eval-log-layout.py` exit 0 / `dev-pipeline-lint.yml` |
| AC-3 | handoff schema に per-finding disposition 必須化・既存 findings に消化状態付与 | **PASS** | `improvement-handoff.schema.json` 1.1.0 拡張 / `migration-receipt.json` (123 項目) / `lint-handoff-disposition.py` exit 0 |
| AC-4 | task template に status=文書ライフサイクルの意味論明記・二重正本なし | **PASS** | `plugins/dev-graph/templates/task.md` §status の意味論 (2 パス同期) |
| AC-5 | graph.json 分割の再検討トリガーが仕様に記録 | **PASS** | design.md §7.2 (500 node / 週3衝突 / 5MiB)。`system-spec/dev-workflow.md` qa-067【5】に記録済み |
| AC-6 | spec-drift-guardian の C03/C04 verdict が close gate に配線・proposal のみ close 遮断 | **PASS** | C07 が GitHub/Beads 4 close 形式を捕捉し、C10 と4 schemaが Beads id を受理。proposal-only/部分artifact/変数idを遮断する回帰テストと `.claude/settings.json` 登録を確認 |
| AC-7 | 陳腐化文書の棚卸し手順が sync verb 運用に組込み | **PASS** | `operations.md` (P12) の GC runbook |

## 残件・関連対応

- **P13 (リリース)**: main 反映と AC-1 の 3 表現同時 close の最終実証は PR merge 後に確定する (未実施)。
- **HarnessHub-t1i**: exact-13 task の graph 登録メタデータと YAML frontmatter を canonical writer で同期し、`validate-graph-schema` と正規 `status-graph --keyword PIPELINE-IMPROVEMENT` を通せる形へ修復した。回帰テストも追加済み。
