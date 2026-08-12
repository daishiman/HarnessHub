---
graph_node_id: "issue-ui-vrt-linux-baseline-20260811"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["vrt","ui-consistency","testing"]
priority: "medium"
start_date: "2026-08-11"
target_date: null
iteration: null
title: "VRT の Linux 版 baseline を更新する"
owners: ["daishiman"]
created_at: "2026-08-11T00:00:00Z"
updated_at: "2026-08-11T10:45:30Z"
status: "active"
depends_on: []
related_nodes: ["issue-ui-vrt-navigation-baseline-drift-20260810"]
resource_scope: ["apps/hub/tests/browser/__vrt__","apps/hub/tests/browser/vrt.ts",".github/workflows/ui-visual.yml"]
purpose: "darwin 側だけ更新した baseline を、Linux 側でも揃える。"
goal: "Linux 上で VRT を実行し、承認済み baseline を差し替える。"
scope_in: ["catalog-{data,feedback,form,layout,navigation}-{light,dark} の 10 枚","Linux 上での VRT 実行"]
scope_out: ["VRT 閾値の緩和","原因確認なしの baseline 更新"]
acceptance: ["Linux baseline が darwin と同じ意図の画面で更新される","Linux 上で browser test が全 PASS する"]
architecture_refs: ["arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/ui-vrt-linux-baseline-20260811.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"0e62ce0731ba94dd34512edd90fba0b014e6db2804012adddb4b56cccb60cec5","evaluator":"2026-08-11 の全28画面 UI 統一作業で実測した残課題","evidence_ref":"docs/product/backlog.md"}
source_lineage: {"imported_at":"2026-08-11T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":"docs/product/backlog.md","source_plugin":null,"source_version":null}
classification_confidence: 0.98
classification_reason: "UI 統一作業で残した未着手項目であり、実装単位の不具合・改善課題に該当する。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/ui-vrt-linux-baseline-20260811.md","confidence":0.98}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-7mc6","linked_at":"2026-08-11T10:45:30Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-11T00:00:00Z","missing_sections":[],"status":"complete"}
---

# VRT の Linux 版 baseline を更新する

## 概要

UI 統一に伴う画面構造の変更で 10 枚の VRT baseline を更新したが、darwin 分のみ。

## 背景と問題

baseline は OS 別 (tests/browser/__vrt__/<platform>/) に持っており、Linux 版は Linux 上でしか作れない。ui-visual.yml は opt-in (workflow_dispatch または PR label ui-visual) で必須チェックではないため、赤いまま放置されうる。

## 現在の挙動

darwin では 33/33 PASS。Linux baseline は旧構造のまま。

## 期待する挙動

Linux 上で VRT を回し、承認済み baseline を差し替える。

## 再現手順またはユースケース

ui-visual ワークフローを手動実行すると寸法不一致で失敗する。

## 影響と優先度

必須チェックではないため medium。ただし放置すると視覚回帰の検出力が失われる。

## スコープ

baseline の差し替えのみ。閾値は変えない。

## 関連グラフ

issue-ui-vrt-navigation-baseline-drift-20260810 と同じ baseline 契約に従う。

## 受入条件

上記 acceptance のとおり。

## 検証証跡

docs/product/backlog.md (2026-08-11 時点) の優先度低/記録 #12。
