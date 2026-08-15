---
graph_node_id: "issue-callout-vrt-catalog-coverage-20260814"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "ui-ux"
tags: ["design-system","vrt","markdown","follow-up"]
priority: "medium"
start_date: "2026-08-14"
target_date: null
iteration: null
title: "VRT catalog へ callout 記法 4 種を追加し視覚回帰の被覆へ入れる"
owners: ["daishiman"]
created_at: "2026-08-14T11:30:00Z"
updated_at: "2026-08-14T12:55:16.415253Z"
status: "active"
depends_on: []
related_nodes: ["feat-semantic-emphasis-icons"]
resource_scope: ["apps/hub/tests/browser/catalog"]
purpose: "callout の視覚回帰が VRT を実行しても検出できない被覆ギャップを埋める"
goal: "catalog の MarkdownView entry が callout 4 種を含み、VRT の被写体になる状態にする"
scope_in: ["apps/hub/tests/browser/catalog/entries-data.tsx の MarkdownView entry へ callout 4 種を追加","基準画像の更新"]
scope_out: ["ui-visual.yml の起動条件 (opt-in) の変更","callout の意匠そのものの変更"]
acceptance: ["catalog の MarkdownView entry が [!POINT] / [!ATTENTION] / [!WARNING] / [!NOTE] を含む","VRT 実行時に callout が被写体として撮影される"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/callout-vrt-catalog-coverage-20260814.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"b10daedf4d24a112c73943e2cecac213a193042aaa0e6e43518a2314a64cfbdf","evaluator":"feat-semantic-emphasis-icons P09/P10 の品質ゲート確認で検出","evidence_ref":"docs/features/feat-semantic-emphasis-icons/quality-gate-report.md"}
source_lineage: {"imported_at":"2026-08-14T11:30:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.98
classification_reason: "catalog entry が見出しと箇条書きだけで callout 記法を含まず、VRT を実行しても callout の視覚回帰を検出できない"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/callout-vrt-catalog-coverage-20260814.md","confidence":0.98}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-xere","linked_at":"2026-08-14T12:30:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-14T11:30:00Z","missing_sections":[],"status":"complete"}
---

# VRT catalog へ callout 記法 4 種を追加し視覚回帰の被覆へ入れる

## 背景

`apps/hub/tests/browser/catalog/entries-data.tsx` の `MarkdownView` entry は見出しと箇条書きだけで、
callout 記法 (`[!POINT]` / `[!ATTENTION]` / `[!WARNING]` / `[!NOTE]`) を含まない。
そのため **VRT を実行しても callout の視覚回帰は検出できない**。

現状 callout の視覚を担保しているのは `Markdown.test.tsx` の DOM 契約 (`data-hh-callout` と token 名) と
`visual-contract.test.tsx` の 2 件だけで、これは「どの token を参照しているか」は固定するが
「見え方が変わっていないか」は見ない。

## 前提として知っておくこと

`ui-visual.yml` は通常 CI から分離された **opt-in** ジョブである。

| 起動条件 | 内容 |
| --- | --- |
| `workflow_dispatch` | 手動実行 |
| PR ラベル `ui-visual` | ラベルが付いた PR のみ |

さらに `update_baseline` モードの run は比較を一切行わない。**緑を「差分なし」と読まないこと。**

## やること

catalog の `MarkdownView` entry へ callout 4 種を追加し、基準画像を更新する。

## 出所

`docs/features/feat-semantic-emphasis-icons/quality-gate-report.md` §2.4 / §4-2
