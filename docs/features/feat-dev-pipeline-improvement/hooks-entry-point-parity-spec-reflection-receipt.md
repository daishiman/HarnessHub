---
graph_node_id: "doc-hooks-entry-point-parity-spec-reflection-receipt-20260804"
artifact_kind: "document"
artifact_subtypes: []
layer: "feature-spec-reflection"
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["spec-reflection","plugin-governance","hooks","qa-146"]
priority: "high"
start_date: "2026-08-04"
target_date: null
iteration: null
title: "Hook entry point parity 仕様反映受領書"
owners: ["daishiman"]
created_at: "2026-08-04T00:00:00Z"
updated_at: "2026-08-04T00:00:00Z"
status: "active"
depends_on: []
related_nodes: ["issue-hooks-entry-point-parity-generalization-20260728","issue-fetched-reference-evidence-provenance-20260804","feat-dev-pipeline-improvement","spec-harness-hub-plugin-hook-governance-20260804","arch-harness-hub-dev-workflow","task-hooks-entry-point-parity-final-review-handoff-20260804","task-live-trial-evidence-selection-handoff-20260804"]
resource_scope: ["docs/features/feat-dev-pipeline-improvement/hooks-entry-point-parity-spec-reflection-receipt.md","docs/features/feat-dev-pipeline-improvement/live-trial-evidence-selection-spec-reflection-receipt.md","system-spec/dev-workflow.md","system-spec/spec-state.json","specs/harness-hub-plugin-hook-governance-addendum.md","architecture/harness-hub-dev-workflow.md","features/feat-dev-pipeline-improvement.md","tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-hooks-parity-final-review-handoff.md"]
purpose: "HarnessHub-vf66、HarnessHub-85z0、HarnessHub-3tw の仕様・設計影響、製品非変更境界、検証と公開前受領を人間・機械双方で追跡する。"
goal: "競合した qa-143 を qa-146 へ統合し、各文書層、Beads、commit、draft PR と矛盾なく結び付ける。"
scope_in: ["仕様反映の根拠","検証結果","製品非変更の判断","公開前の追跡情報"]
scope_out: ["製品 API、DB schema、認証認可、UI、Cloudflare deploy unit の変更"]
acceptance: ["仕様影響ありの理由と反映先を明記する","中学生向けと技術的な説明を併記する","残課題と Beads ID を記録する","qa-146 への QA ID 統合理由を記録する"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "docs/features/feat-dev-pipeline-improvement/hooks-entry-point-parity-spec-reflection-receipt.md"
template_id: "document"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"4b0c134b7643358cf7928fb2bf2327539278030d546f247046bdad84980a96a1","evaluator":"final-review + system-spec-harness (qa-146)","evidence_ref":"system-spec/dev-workflow.md"}
source_lineage: {"imported_at":"2026-08-04T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "競合した開発品質契約の仕様反映と製品非変更境界の受領記録を独立 document として残す。"
classification_candidates: [{"artifact_kind":"document","candidate_path":"docs/features/feat-dev-pipeline-improvement/hooks-entry-point-parity-spec-reflection-receipt.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-08-04T00:00:00Z","missing_sections":[],"status":"complete"}
---

# Hook entry point parity — 仕様反映受領書

## 結論

**仕様・設計への影響あり（開発品質契約のみ）。** 全 plugin の hook に対し、台帳・登録・実体を一致させる fail-closed の検査を、live-trial 証跡選択・C02 receipt 検出契約とともに `qa-146` として正規反映した。別ブランチで意味の異なる変更に同じ `qa-143` が使われていたため、C01 で新しい統合 ID を発行して曖昧さを除いた。Harness Hub の製品 API、DB schema、認証認可、UI、Cloudflare deploy unit は変更していない。

## 中学生向けの説明

プラグインの hook は「ある合図が来たら自動で動く小さな係」です。今回、係の名簿、係を呼ぶ設定、実際の係のファイルが必ずそろっているかを、すべてのプラグインで調べるようにした。手でだけ使う道具は自動の係の棚に置かないよう整理したので、間違ったタイミングで動く心配を減らせる。

## 技術的な説明

`scripts/validate-plugin-completeness.py` は `entry_points.hooks` を台帳の正本とし、sidecar `hooks/hooks.json` と manifest inline hooks の和集合を登録実態として取得する。HK-001（登録 ⊆ 宣言）、HK-002（登録構成を持つ plugin の宣言 ⊆ 登録）、HK-003（hook directory の残余は import 専用 support module のみ）を非 0 終了で検査する。相対 command の正規化、shebang / `__main__` の拒否、CLI と hook 判定の責務分離を回帰テストで固定した。

## 層別の正規反映

| 層 | 反映 | 判断 |
|---|---|---|
| `system-spec/` | `qa-146` と `appr-035`、coverage state | 競合した開発品質契約を一意に統合するため反映 |
| `specs/` | hook governance 追補 | 既存要件 wrapper を 500 行超にしないため分離 |
| `architecture/` | HK-001..003 の登録経路・責務境界 | 検査の所有と fail-closed 境界が変わるため反映 |
| `features/`・`docs/` | feature 記録、差分ログ、本受領書 | 目的・検証・非変更境界を追跡するため反映 |
| `tasks/` | Phase 13 補助引継ぎ | 凍結済み P01..P13 を書き換えず、統合条件を別 task に記録 |

## 検証

- focused pytest: 68 passed
- `python3 scripts/validate-plugin-completeness.py`: 23 plugin complete
- `lint-script-naming.py`、`py_compile`、`bash -n`、`git diff --check`: pass
- `validate-system-plan.py --feature-package feature-package/feat-dev-pipeline-improvement`: pass
- C01 coverage matrix: pass
- `qa-146` の C01/C03 compile、coverage matrix、source citation gate: pass
- 最新 `main`（`46c72792`）を本ブランチへ統合後、hook parity・live-trial 回帰の focused pytest: 50 passed
- `validate-system-plan.py --feature-package feature-package/feat-dev-pipeline-improvement`: P01..P13 / violations 0
- `bash scripts/run-ci-checks.sh`: 139 PASS / 5 既知 soft warning / 0 FAIL
- graph schema、300 行文書上限、`git diff --check`: pass

## 追跡と残課題

- Beads: `HarnessHub-vf66`、`HarnessHub-85z0`、`HarnessHub-3tw`、`HarnessHub-yxb2` / Dev Graph node: `issue-hooks-entry-point-parity-generalization-20260728`。
- hook parity の原変更は [#666](https://github.com/daishiman/HarnessHub/pull/666) で `main` へ統合済み。本統合レビューは draft PR [#664](https://github.com/daishiman/HarnessHub/pull/664)（base: `main`、branch: `devgraph/issue-required-heading-presence-validation-20260729`）へ反映する。
- `HarnessHub-yxb2` は citation gate を current tree で再実行して PASS だったため、誤検知として closed にした。live-trial 証跡選択の詳細は `live-trial-evidence-selection-spec-reflection-receipt.md` を参照する。
- `validate-source-citation.py` を current system-spec で再実行し、20 reference の必須 provenance・公式 host・取得証跡は PASS だった。過去の 40 件不足報告は再現しないため、Beads `HarnessHub-yxb2` を誤検知として closed にする。

## 目的

hook parity と live-trial 証跡選択を統合した `qa-146` が、仕様・設計・実装・検証・追跡先で同じ意味を持つことを受領する。

## 対象読者

plugin 作者、CI を保守する開発者、最終レビュー担当者を対象とする。

## 要約

異なる変更へ誤って同じ `qa-143` が使われたため、C01 が新しい `qa-146` を確定した。製品機能は変えず、開発品質の契約と証跡受領だけを統合した。

## 本文

hook の台帳・登録・実体には HK-001..003 を、live-trial には criteria receipt が指す verdict を使う。両方を `system-spec/dev-workflow.md` の qa-146 にまとめ、C02 writer が各成果物と dev-graph を同時に更新する。

## 決定事項

qa-143 を統合 ID として再利用せず qa-146 を正本にする。`scripts/validate-plugin-hooks.py` は 500 行上限を守る責務分離であり、製品 API、DB、認証、UI、deploy は変更しない。

## 運用・更新方法

hook を追加・変更する際は台帳、登録、実体を同じ変更で更新し HK-001..003 を再実行する。live-trial の採用 verdict を変える際は criteria receipt を正規更新し、C01/C03 と C02 の受領を再実行する。

## 関連資料

- `system-spec/dev-workflow.md` (qa-146)
- `specs/harness-hub-plugin-hook-governance-addendum.md`
- `live-trial-evidence-selection-spec-reflection-receipt.md`

## 変更履歴

- 2026-08-04: qa-143 の ID 衝突を qa-146 に統合し、必須章を補って C02 の成果物検査へ適合させた。
