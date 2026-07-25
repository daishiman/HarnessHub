---
graph_node_id: "issue-mvp-first-scheduling-completion-projection-20260724"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["close-loop","open-residue","follow-up","qa-069","mvp-first"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "MVP-first feature 13 node の completion projection 未実施 (lint-open-residue OR-003 13件)"
owners: ["daishiman"]
created_at: "2026-07-24T07:45:00Z"
updated_at: "2026-07-24T12:04:39Z"
status: "done"
depends_on: []
related_nodes: ["feat-mvp-first-scheduling"]
resource_scope: [".dev-graph/state/graph.json","tasks/feat-mvp-first-scheduling/sys-mvp-first-scheduling-p01.md","tasks/feat-mvp-first-scheduling/sys-mvp-first-scheduling-p13.md"]
purpose: "PR #47 (merge commit 8d802c2) で feat-mvp-first-scheduling が main へ統合され beads HarnessHub-6gl.1..13 は closed だが、graph の SYS-MVP-FIRST-SCHEDULING-P01..P13 は completion_evidence=in_progress のまま残置され lint-open-residue OR-003 が 13 件検出される。policy は全 node linked_pr_merged_all のため、正規の解消は C26 reconcile-github-lifecycle の実走のみ (手動 ce 書換は completion authority の偽装で禁止)。gh:pr gate (HarnessHub-6gl.N <-> PR #47) は 2026-07-24 作成済み。C26 は起動時に clean main worktree を要求するため、P13 projection commit 後に 1 node ずつ reconcile し projection commit を挟んで直列実行する"
goal: "SYS-MVP-FIRST-SCHEDULING-P01..P13 が C26 reconcile で durable done になり、lint-open-residue.py --repo-root . が exit 0 に収束している"
scope_in: ["SYS-MVP-FIRST-SCHEDULING-P01..P13 の graph node completion projection (status=done / completion_evidence=done)","13 task Markdown frontmatter の done 同期","PR #47 検証済み merge 事実 (closing_reference_verified=true) の pull_request_linkages 投影"]
scope_out: ["doc-governance-portability / qa070 / render-out1 等の別ストリーム OR-003 (別途判断)","C26 completion_event 台帳の emission (writer-consumer 不在の設計ギャップ・follow-up)"]
acceptance: ["SYS-MVP-FIRST-SCHEDULING-P01..P13 が status=done かつ completion_evidence.status=done へ収束している","lint-open-residue.py の MVP-first (OR-003) 違反が 0 件になっている","validate-graph-schema が valid=true (violations=0) である","各 node の completion_evidence が PR #47 の検証済み merge 事実 (closing_reference_verified=true) に接地している"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-mvp-first-scheduling-completion-projection-20260724.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-23T13:51:02Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.9
classification_reason: "PR #47 merge 後の close-loop 未投影 (OR-003) を追跡する issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-mvp-first-scheduling-completion-projection-20260724.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-xjv","linked_at":"2026-07-24T07:55:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-07-24T12:04:39Z","evidence_refs":["https://github.com/daishiman/HarnessHub/pull/47",".dev-graph/state/graph.json"],"policy":"manual","reconciled_at":"2026-07-24T12:04:39Z","source":"reconciliation","status":"done"}
implementation_readiness: {"checked_at":"2026-07-23T13:51:02Z","missing_sections":[],"status":"incomplete"}
---

# 概要

PR #47 (merge commit 8d802c2) で feat-mvp-first-scheduling が main へ統合され beads HarnessHub-6gl.1..13 は closed になったが、graph の SYS-MVP-FIRST-SCHEDULING-P01..P13 は completion_evidence=in_progress のまま残置し、lint-open-residue が OR-003 を 13 件検出していた。この close-loop 未投影を completion projection で解消する。

## 背景と問題

dev-graph は「graph node・task Markdown・beads」の三重表現を持つ。PR #47 の merge で beads 側は closed へ収束したが、graph/task Markdown 側が in_progress のまま取り残され、「解決済み事象が open のまま残る (open residue)」状態になっていた。

## 現在の挙動 (修正前)

- SYS-MVP-FIRST-SCHEDULING-P01..P13: status=active / completion_evidence.status=in_progress (evidence_refs 空)
- lint-open-residue.py: MVP-first で OR-003 を 13 件検出

## 期待する挙動 (修正後)

- 13 node すべて status=done / completion_evidence.status=done へ収束
- completion_evidence は PR #47 の検証済み merge 事実に接地 (closing_reference_verified=true)
- lint-open-residue の MVP-first OR-003 が 0 件

## 解決手段

C26 reconcile-github-lifecycle を `--mode check --pr 47` で実走し、各 node の PR #47 linkage 事実 (merged / eligible / closing_reference_verified / merge_commit_sha / merged_at) を検証・採取。その検証済み事実を completion_evidence + pull_request_linkages として C02 単一ライター (upsert-node.py, schema 検証 + WAL + lock + atomic + revision++) 経由で投影した。手動の graph 直接書換は行っていない。

注記: writer-consumer スクリプト不在のため C26 の完全 writer 経路 (completion_event 台帳生成) は未実行。先行 PR #50 (a7fac56) の pipeline-improvement 完了投影と同型の「C26 検証 + C02 適用」で確定。completion_event 台帳の後追い emission は follow-up として別 issue 化する。

## スコープ

- In: SYS-MVP-FIRST-SCHEDULING-P01..P13 の graph node / task Markdown completion projection
- Out: doc-governance-portability・qa070・render-out1 等の別ストリーム OR-003 (別途判断)

## 関連グラフ

- 関連 feature: feat-mvp-first-scheduling
- 統合 PR: https://github.com/daishiman/HarnessHub/pull/47

## 受入条件

- [x] SYS-MVP-FIRST-SCHEDULING-P01..P13 が status=done / completion_evidence.status=done へ収束
- [x] lint-open-residue.py の MVP-first (OR-003) 違反が 0 件
- [x] validate-graph-schema が valid=true (violations=0)
- [x] completion_evidence が PR #47 の検証済み merge 事実に接地 (closing_reference_verified=true)

## 検証証跡

- コマンド: `python3 plugins/dev-graph/scripts/lint-open-residue.py --repo-root .` → MVP-first OR-003 = 0
- コマンド: `python3 plugins/dev-graph/scripts/validate-graph-schema.py --graph .dev-graph/state/graph.json --repo-root .` → valid=true
- 統合 PR: https://github.com/daishiman/HarnessHub/pull/47 (state=merged, base=main, merge_commit=8d802c2)
