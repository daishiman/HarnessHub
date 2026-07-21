---
graph_node_id: "issue-hub-foundation-generation-drift-20260721"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "governance"
tags: ["dev-graph","hub-foundation","content-addressed","promotion","drift"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "feat-hub-foundation の promoted task-spec が immutable generation と乖離している"
owners: ["daishiman"]
created_at: "2026-07-21T00:00:00Z"
updated_at: "2026-07-21T00:00:00Z"
status: "active"
depends_on: []
related_nodes: ["issue-hub-foundation-task-spec-drift-20260721"]
resource_scope: [".dev-graph/plans/feature-package-feat-hub-foundation/"]
purpose: "promoted task-spec を新世代へ直接編集した結果、content-addressed promotion の『promoted copy は generation の写像である』という不変条件が破れている状態を解消する"
goal: "promoted task-spec と package manifest が、参照している generation digest と一致している"
scope_in: ["feature-package 一式の正規再生成による新世代 promote","または promoted copy を generation と一致させる手順の確定","goal-spec.json / feature-package.json / system-build-handoff.json / plan-findings.json の世代整合"]
scope_out: ["acceptance / quality_constraints の内容そのものの再設計","generations/ 配下の既存 snapshot の書き換え"]
acceptance: ["grep -rl 06c97e2e .dev-graph/plans/feature-package-feat-hub-foundation/ が 0 件になる","promoted task-spec 13 件が参照 generation の同名ファイルと一致する","C26 の published task 検証が 13 ノード全件で PASS を維持する"]
architecture_refs: []
parent_feature: "feat-hub-foundation"
feature_package_id: "feature-package/feat-hub-foundation"
phase_ref: null
file_path: "issues/sys-hub-foundation-generation-drift-20260721.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-21T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":"issues/sys-hub-foundation-task-spec-drift-20260721.md","source_plugin":null,"source_version":null}
classification_confidence: 0.9
classification_reason: "HarnessHub-mhh の最終レビュー中に観測した、p4f 是正の副作用として残った世代乖離を追跡する派生 issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-hub-foundation-generation-drift-20260721.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-6cv","linked_at":"2026-07-21T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-21T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

`HarnessHub-p4f` の是正で `.dev-graph/plans/feature-package-feat-hub-foundation/task-specs/` の 13 ファイルを新世代 (`sha256:938ecf38…`) へ更新したが、content-addressed の正本である `.dev-graph/plans/generations/feature-package-feat-hub-foundation/8735bb16…/task-specs/` と package manifest 4 件は旧世代 (`sha256:06c97e2e…`) のまま残っている。promoted copy が正本の写像でなくなっている。

## 背景と問題

`.dev-graph/plans/` の promotion は content-addressed である。`generations/<digest>/` が immutable な正本で、`feature-package-<name>/` はその世代への promoted projection という関係にある。`p4f` は「成果物側の書き換え」と「manifest/handoff の再生成」を明示的に `scope_out` としたため、projection 側だけが新世代の内容を持ち、正本と manifest は旧世代のまま取り残された。

旧世代 digest が残るファイル:

- `.dev-graph/plans/feature-package-feat-hub-foundation/goal-spec.json`
- `.dev-graph/plans/feature-package-feat-hub-foundation/feature-package.json`
- `.dev-graph/plans/feature-package-feat-hub-foundation/system-build-handoff.json`
- `.dev-graph/plans/feature-package-feat-hub-foundation/plan-findings.json`
- `.dev-graph/plans/generations/feature-package-feat-hub-foundation/8735bb16…/task-specs/*.md`

## 現在の挙動

`diff` で promoted copy と generation の同名ファイルが差分を持つ。

```
$ diff -q .dev-graph/plans/generations/feature-package-feat-hub-foundation/8735bb16.../task-specs/phase-01-requirements.md \
         .dev-graph/plans/feature-package-feat-hub-foundation/task-specs/phase-01-requirements.md
Files ... differ
```

## 期待する挙動

promoted task-spec と package manifest が、参照している generation digest と一致する。正規の再生成フローで新世代を作り promote し直すか、promoted copy を generation へ一致させる手順が確定している。

## 影響と優先度

- 影響範囲: `feature-package/feat-hub-foundation` の計画一式
- 深刻度: medium — **実害は現時点で出ていない**。C26 の published task 検証は `source_lineage.source_path` 経由で `generations/` 側 (正本) を読むため、promoted copy の内容に依存しない。`SYS-HUB-FOUNDATION-P01`〜`P13` の 13 ノード全件で検証 PASS を実測済み
- 緊急度: low-medium — 人間と planner が読むのは promoted copy であり、正本と食い違ったまま次の世代を積むと乖離が固定化する

## スコープ

- In: feature-package 一式の正規再生成と promote、または promoted copy を generation へ一致させる手順の確定
- Out: acceptance / quality_constraints の内容そのものの再設計、`generations/` 配下の既存 snapshot の書き換え

## 関連グラフ

- 派生元 issue: `issue-hub-foundation-task-spec-drift-20260721` (`HarnessHub-p4f`)
- 観測元 issue: `issue-devgraph-completion-reconcile-blocked-20260721` (`HarnessHub-mhh`) の最終レビュー

## 受入条件

- [ ] `grep -rl 06c97e2e .dev-graph/plans/feature-package-feat-hub-foundation/` が 0 件になる
- [ ] promoted task-spec 13 件が参照 generation の同名ファイルと一致する
- [ ] C26 の published task 検証が 13 ノード全件で PASS を維持する

## 検証証跡

- コマンド: `grep -rl 06c97e2e .dev-graph/plans/feature-package-feat-hub-foundation/`
- コマンド: `diff -r .dev-graph/plans/generations/feature-package-feat-hub-foundation/<digest>/task-specs/ .dev-graph/plans/feature-package-feat-hub-foundation/task-specs/`
- 証跡 path: `issues/sys-hub-foundation-task-spec-drift-20260721.md` の「検証証跡」節
