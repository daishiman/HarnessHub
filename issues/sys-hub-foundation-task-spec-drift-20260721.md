---
graph_node_id: "issue-hub-foundation-task-spec-drift-20260721"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "governance"
tags: ["dev-graph","hub-foundation","task-spec","drift"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "feat-hub-foundation の 13 task-spec が成果物より 1 世代古い前提のまま残っている"
owners: ["daishiman"]
created_at: "2026-07-21T00:00:00Z"
updated_at: "2026-07-21T13:15:04Z"
status: "done"
depends_on: []
related_nodes: ["issue-hub-foundation-progress-reconcile-20260721"]
resource_scope: [".dev-graph/plans/feature-package-feat-hub-foundation/task-specs/"]
purpose: "13 phase の task-spec が acceptance 3 件・quality_constraints 8 件の旧世代を前提にしたまま残り、受入判定の基準が成果物と食い違っている状態を解消する"
goal: "task-spec の feature_context_digest と acceptance/quality_constraints が確定済みの成果物世代と一致している"
scope_in: ["13 task-spec の feature_context_digest 更新","acceptance 4 件・quality_constraints 9 件への追随","P02 の workspace member 構成と P08 の workstream 粒度の記述是正"]
scope_out: ["acceptance/quality_constraints の内容そのものの再設計","成果物側の書き換え"]
acceptance: ["13 task-spec の feature_context_digest が成果物側の digest と一致する","task-spec の acceptance が 4 件 (A1-A4)、quality_constraints が 9 件になっている","P02 の member 構成と P08 の N/A 粒度の要求が実体と整合する"]
architecture_refs: []
parent_feature: "feat-hub-foundation"
feature_package_id: "feature-package/feat-hub-foundation"
phase_ref: null
file_path: "issues/sys-hub-foundation-task-spec-drift-20260721.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-21T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":"issues/sys-hub-foundation-progress-reconcile-20260721.md","source_plugin":null,"source_version":null}
classification_confidence: 0.9
classification_reason: "HarnessHub-8bc の突合中に観測した task-spec と成果物の世代ずれを追跡する派生 issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-hub-foundation-task-spec-drift-20260721.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-p4f","linked_at":"2026-07-21T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-07-21T13:15:04Z","evidence_refs":["beads:HarnessHub-p4f","issues/sys-hub-foundation-task-spec-drift-20260721.md"],"policy":"linked_pr_merged_all","reconciled_at":"2026-07-21T13:15:04Z","source":"manual (graph 未登録 node のため reconcile-github-lifecycle.py 対象外)","status":"closed"}
implementation_readiness: {"checked_at":"2026-07-21T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

`feature-package-feat-hub-foundation` の 13 task-spec が、確定済みの成果物より 1 世代古い前提 (`feature_context_digest: sha256:06c97e2e...` / acceptance 3 件 / quality_constraints 8 件) のまま残っている。成果物側は `sha256:938ecf38...` / acceptance 4 件 / quality_constraints 9 件に更新済み。

## 背景と問題

`HarnessHub-8bc` の突合で、phase ごとの受入条件を spec から読むと A4 と 9 件目の quality_constraint が存在しないことが判明した。受入判定 (P07) と最終レビュー (P10) は新しい世代 (4 件 / 9 件) で実施されているため、spec を基準に再判定すると要求が欠ける。

同種のずれが個別 phase にも出ている。

- P02: spec は workspace member 5 件を想定するが、実体は `packages/estimation` を含む 6 件 (ADR 側で確定済み)
- P08: spec は「9 workstream すべての N/A 判定理由」を要求するが、成果物は 4 観点での記述になっており、要求粒度そのものが現行構成と噛み合っていない

## 現在の挙動

`.dev-graph/plans/feature-package-feat-hub-foundation/task-specs/phase-01-requirements.md` 〜 `phase-13-release-deploy.md` の 13 ファイルが旧世代の digest と件数を保持している。

## 期待する挙動

task-spec の `feature_context_digest` と acceptance / quality_constraints が、`docs/features/feat-hub-foundation/requirements-baseline.md` の確定内容と一致する。

## 影響と優先度

- 影響範囲: feat-hub-foundation の受入判定・最終レビューの基準
- 深刻度: medium — 成果物側が新しいため実害は出ていないが、spec を正本として再判定すると要求が欠落する
- 緊急度: 未完了 9 phase の残項目を消化する際に spec を参照するため、それより前に揃えたい

## スコープ

- In: 13 task-spec の digest 更新と acceptance / quality_constraints の追随、P02・P08 の記述是正
- Out: acceptance / quality_constraints の内容そのものの再設計、成果物側の書き換え

## 関連グラフ

- 親 issue: `issue-hub-foundation-progress-reconcile-20260721` (`HarnessHub-8bc`)
- 対象 feature: `feat-hub-foundation`

## 受入条件

- [x] 13 task-spec の `feature_context_digest` が成果物側の digest と一致する
- [x] task-spec の acceptance が 4 件 (A1-A4)、quality_constraints が 9 件になっている
- [x] P02 の member 構成と P08 の N/A 粒度の要求が実体と整合する

## 検証証跡

- コマンド: `grep -l "06c97e2e" .dev-graph/plans/feature-package-feat-hub-foundation/task-specs/*.md` が 0 件になること
- 証跡 path: `docs/features/feat-hub-foundation/requirements-baseline.md` §4 / §6

2026-07-21 の是正では、13/13 ファイルに現行 digest `sha256:938ecf38...`、`feature_acceptance: 4 items (A1-A4)`、`quality_constraints: 9 items` が存在し、旧 digest・3件・8件・`9 workstream` の記述が 0 件であることを機械確認した。P02 は `packages/estimation` を含む 6 member、P08 は成果物と同じ 4 判定軸へ更新した。

`validate-system-plan.py` の package 全体検証は fail のまま。ただし HEAD 版だけを隔離実行しても inventory/handoff schema、P01 gate、runtime reference、registration path の計 31 件が既に fail していた。今回の 13 task-spec 編集により immutable promotion の manifest/handoff digest 不一致が追加されるが、manifest/handoff と成果物側の再生成は本 issue の `resource_scope` / `scope_out` 外であり、正本 generation の手編集を避けるため変更していない。
