---
graph_node_id: "spec-harness-hub-worktree-mtime-diagnostic-20260803"
artifact_kind: "specification"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["worktree","diagnostic","qa-140"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "並列 worktree 更新時刻診断の追補"
owners: ["daishiman"]
created_at: "2026-08-03T00:00:00Z"
updated_at: "2026-08-03T09:45:00Z"
status: "active"
depends_on: ["spec-harness-hub-requirements"]
related_nodes: ["issue-worktree-main-ref-desync-20260728","arch-harness-hub-dev-workflow"]
resource_scope: ["specs/harness-hub-worktree-mtime-diagnostic-addendum.md"]
purpose: "並列 worktree の異常調査で mtime クラスタを断定材料として誤用しない。"
goal: "一括書込みの疑いを検知し、直接証拠に基づいて安全に復旧判断できる。"
scope_in: ["repository の開発運用と診断ツール"]
scope_out: ["Hub 製品の外部 API、DB schema、認証認可、UI、Cloudflare deploy unit"]
acceptance: ["mtime クラスタが診断専用である","reflog 等の直接証拠で原因を確認する"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "specs/harness-hub-worktree-mtime-diagnostic-addendum.md"
template_id: "specification"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"7863d7fc569ddf9661497519d63763bfab0cc1b525497f2bb541ef8c86ec3e05","evaluator":"system-spec-harness compile + coverage validation (qa-139, qa-140)","evidence_ref":"system-spec/dev-workflow.md"}
source_lineage: {"imported_at":"2026-08-03T09:45:00Z","origin_kind":"system-spec-harness","source_digest":"7863d7fc569ddf9661497519d63763bfab0cc1b525497f2bb541ef8c86ec3e05","source_path":"system-spec/dev-workflow.md","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.95
classification_reason: "qa-140 の確定 system-spec から導出する開発運用仕様の追補"
classification_candidates: [{"artifact_kind":"specification","candidate_path":"specs/harness-hub-worktree-mtime-diagnostic-addendum.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-08-03T09:45:00Z","missing_sections":[],"status":"complete"}
---

# 並列 worktree 更新時刻診断の追補

## 目的と背景

`HarnessHub-7xi9` の再調査で、2026-07-31 06:56 の更新時刻クラスタは、reflog に記録された
`git reset --hard` と直後の `git pull` で説明できると判明した。mtime（ファイル更新時刻）の一致を
非 Git 系 clobber の確定証拠と扱うと、復旧判断を誤る。

## 契約

- `scripts/lint-worktree-clobber-mtime.py` は変更・未追跡ファイルの mtime クラスタを診断する。
- 検知時は exit 1 で材料を報告するが、hook や commit を停止する gate には配線しない。
- Git 状態を取得できない場合は exit 0 とする fail-open（診断不能時に開発を止めない設計）である。
- 原因は `git reflog`、`git diff --shortstat HEAD`、対象実体の照合で確認する。mtime 単独で原因を断定しない。

## 影響境界

本追補は repository の開発・復旧運用だけを対象とし、Hub 製品の外部 API、DB schema、認証認可、UI、Cloudflare deploy unit を変更しない。正本は `system-spec/dev-workflow.md` の `qa-140`、設計参照は `architecture/harness-hub-dev-workflow.md`、操作手順は `docs/worktree-desync-recovery-runbook.md` とする。
