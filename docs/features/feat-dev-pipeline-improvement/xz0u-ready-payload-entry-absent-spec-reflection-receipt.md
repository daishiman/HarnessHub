---
graph_node_id: "doc-xz0u-ready-payload-entry-absent-spec-reflection-receipt-20260804"
artifact_kind: "document"
artifact_subtypes: []
layer: "feature-spec-reflection"
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["dev-graph","schedule-graph","beads","spec-reflection"]
priority: "high"
start_date: "2026-08-04"
target_date: null
iteration: null
title: "bd ready payload entry 欠落報告の仕様反映受領書"
owners: ["daishiman"]
created_at: "2026-08-03T22:02:24.549928Z"
updated_at: "2026-08-04T01:25:48.206800Z"
status: "active"
depends_on: []
related_nodes: ["feat-dev-pipeline-improvement","arch-harness-hub-dev-workflow","task-schedule-beads-ready-entry-absent-reporting-20260803"]
resource_scope: ["docs/features/feat-dev-pipeline-improvement/xz0u-ready-payload-entry-absent-spec-reflection-receipt.md","plugins/dev-graph/scripts/schedule-graph.py","plugins/dev-graph/scripts/schedule_graph_nodes.py","plugins/dev-graph/tests/test_schedule_beads_ready_entry_absent_reporting.py","plugins/dev-graph/tests/test_runtime_coverage.py","plugins/dev-graph/references/schedule-graph-contract.md","system-spec/spec-state.json","system-spec/dev-workflow.md","specs/harness-hub-system-specification.md","architecture/harness-hub-dev-workflow.md","features/feat-dev-pipeline-improvement.md","tasks/task-schedule-beads-ready-entry-absent-reporting-20260803.md","eval-log/coverage/scripts/plugins-dev-graph-scripts-schedule_graph_nodes.py.json"]
purpose: "HarnessHub-xz0u の仕様影響判断と正規反映結果を、人間可読かつ graph から追跡可能な形で受領する"
goal: "schedule の payload entry 欠落を silent drop せず復旧可能に報告する契約が、指定された全ドキュメント層で一致していることを記録する"
scope_in: ["C16/C28 の内部 dev-workflow 契約","system-spec、specification、architecture、feature、task、docs の仕様反映"]
scope_out: ["Harness Hub 製品の外部 API、DB schema、認証認可、UI、Cloudflare deploy unit","bd ready の選定規則または Beads issue 状態の変更"]
acceptance: ["C16/C28 の exact reason/source、候補被覆、復旧境界を記録する","内部 dev-workflow 影響と製品 runtime 非変更の根拠を記録する","C01 qa-141/qa-142、C03、C02 の正規 lineage を追跡可能にする"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "docs/features/feat-dev-pipeline-improvement/xz0u-ready-payload-entry-absent-spec-reflection-receipt.md"
template_id: "document"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"1cfe7bc2d9433a14011cde84341a3f824e8a7d6106f7dae7b8cfedf149c92d0e","evaluator":"C01 qa-141/qa-142, C03 compile, C02 specification reflection","evidence_ref":"system-spec/spec-state.json"}
source_lineage: {"imported_at":null,"origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":"dev-graph","source_version":null}
classification_confidence: 1
classification_reason: "HarnessHub-xz0u の仕様反映判断と正規 C01/C03/C02 lineage を記録する受領書"
classification_candidates: []
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":["beads:HarnessHub-xz0u"],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-08-04T00:00:00Z","missing_sections":[],"status":"complete"}
---

# `bd ready` payload entry 欠落報告 — 仕様反映受領書

## 目的と背景

`HarnessHub-xz0u` は、選択範囲内で着手可能（schedulable）な Beads task が C28 の
`bd ready` payload に存在しないとき、C16 schedule report が理由を出さずに task を
落としていた問題を扱う。operator が「依存未充足」「parity 不一致」「payload entry 欠落」を
区別して、正しい復旧手順を選べるようにする。

## 結論

**内部 dev-workflow の仕様・設計には影響あり、Harness Hub 製品 runtime には影響なし**と
判断した。C01 の正規 transition で `dev-workflow.web` を reopen → 再確定し、C03 compile と
C02 document writer で全指定文書層へ反映した。外部 API、DB schema、認証認可、UI、Cloudflare
deploy unit、および `bd ready` の選定規則は変更していない。

## 中学生向けの説明

作業の順番を決める一覧で、必要なカードが受付から届かなかったとき、前はそのカードが
何も言わずに一覧から消えていました。今回、その場合は「受付からカードが届いていない」と
いうメモを一覧に残すようにしました。勝手に「今すぐ作業できる」とは決めず、受付と一覧を
もう一度そろえるよう案内します。

## 技術設計と復旧境界

- C16 は selected、`tracker_binding=beads`、schedulable な各 node を、`ready_ids` または
  `unmapped[]` のいずれかへ必ず出力する。
- payload entry が無い場合は exact entry
  `{ "external_ref": <node id>, "reason": "ready_payload_entry_absent", "source": "schedule-graph" }`
  を出力する。依存未充足の `dependency_unsatisfied` や parity 不一致とは混同しない。
- entry 欠落から ready set を推測生成しない。C03/C28 の正規同期を再実行し、新しい provenance
  付き payload で再 schedule する。
- pre-lease の被覆は `ready_set ∪ unmapped`、active lease/resource conflict を含む最終 report の
  被覆は `ready_set ∪ unmapped ∪ conflicts` とする。P01 parent / dependency 形状は fail-closed、
  parity dependency は集合比較であり、配列順だけで stale にしない。
- `schedule-graph.py` が 500 行上限に達したため、node 選別・依存判定の純粋 helper を
  `scripts/schedule_graph_nodes.py` に分離した。C16 の出力責務は前者、共有判定責務は後者に
  明確に分けている。

## 正規仕様反映

| 層 | 反映内容 |
|---|---|
| `system-spec/spec-state.json` | main 側の別件 `qa-140` / `appr-029` を保持し、C01 transition の `qa-141` / `appr-030` と `qa-142` / `appr-031` として C16 の候補被覆、fail-closed、順序非依存 parity、reason/source、C03/C28 recovery、製品非変更を reopen→re-confirm で再確定 |
| `system-spec/dev-workflow.md` | C03 compile 正規生成で上記契約を反映 |
| `specs/`・`architecture/` | 集約仕様と workflow architecture に C16/C28 境界と責務分割を反映 |
| `plugins/dev-graph/references/schedule-graph-contract.md` | C28 共通契約から C16 固有の reason/source・候補被覆・fail-closed を分離。C14/C03 が不要な scheduler 詳細に依存しないようにする |
| `features/`・`tasks/` | feature 履歴、task の受入条件・書込み範囲・公開条件を同じ判断へ同期 |
| `docs/` | 本受領書を C02 の graph/frontmatter 同時更新で記録 |

## 検証記録

main 統合後に再実行した最終実測結果は次のとおりである。

- focused/related schedule regression: **56 passed**。
- Dev Graph criteria: **22 passed**。C15 は fresh live trial
  `20260806T010001Z-xz0u-c15r5` で overall=PASS、nudge=0、gate=0、独立 evaluator=PASS、
  current behavior-closure digest
  `86d58c347f693e56fa911155e24b80c51233682502377befedf22c12bc20645c` を確認した。
- system plan: pass。system-spec coverage: pass。current main の C03 compile suite: **42 passed**。
- graph schema: valid、violations=0。文書行数: **596 文書**が 300 行上限に適合。
  手書きの変更ファイルは最大 500 行で、`schedule-graph.py` は 500 行ちょうどのため helper を分離済み。
- harness coverage ratchet: PASS。新規 helper の実コードレビュー受領書
  `eval-log/coverage/scripts/plugins-dev-graph-scripts-schedule_graph_nodes.py.json` を添付し、
  scripts LLM 評価軸を floor 63.1% 以上に維持した。
- repository CI: **PASS 139 / WARN 5 / FAIL 0**。WARN 5 件と live-trial record-only WARN 6 件は
  段階導入中の既存・非ブロッキング項目。 `git diff --check`: pass。

`origin/main` は local `main` と同一コミットであることを確認したうえで、local `main` を本 branch に
実マージし、上記品質ゲートを再実行した。Draft PR URL と Beads publication note は、作成直後に正規 linkage
として記録する。

## 追跡情報

- Beads ID: `HarnessHub-xz0u`
- Dev Graph node ID: `task-schedule-beads-ready-entry-absent-reporting-20260803`
- 実装対象: C16 schedule graph / C28 ready payload integration
- completion authority: Draft PR 作成時点では in progress。main merge 後に C26 reconciliation を行う。
