---
graph_node_id: "issue-register-package-frontmatter-drift-20260815"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["c02","frontmatter","drift"]
priority: "medium"
start_date: "2026-08-15"
target_date: null
iteration: null
title: "register-package.py 登録後に feature artifact の frontmatter が graph と乖離する"
owners: ["daishiman"]
created_at: "2026-08-15T00:00:00.000000Z"
updated_at: "2026-08-14T21:58:21.296147Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["plugins/dev-graph/scripts/register-package.py"]
purpose: "graph と artifact frontmatter の二重管理による乖離を解消する"
goal: "package 登録後に artifact frontmatter が graph と一致し、validate-graph-schema が乖離を出さない状態"
scope_in: ["登録時の frontmatter 同期"]
scope_out: ["frontmatter schema の変更"]
acceptance: ["登録直後の validate-graph-schema.py が exit 0"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/register-package-frontmatter-drift-20260815.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"a0a97ea2be956ec53d570cd7106d6c76ced4aa14b30a6cb1ae62a57c5b2d5079","evaluator":"2026-08-15 dev-graph 11 verb 一括実行の実測・既存ドラフト棚卸しで確認","evidence_ref":"eval-log/dev-graph/"}
source_lineage: {"imported_at":"2026-08-15T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "graph と artifact frontmatter の二重管理による乖離を解消する"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/register-package-frontmatter-drift-20260815.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-l4hw","linked_at":"2026-08-15T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":"manual","status":"open"}
implementation_readiness: {"checked_at":"2026-08-15T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

register-package.py 登録後に feature artifact の frontmatter が graph と乖離する

## 背景と問題

graph と artifact frontmatter の二重管理による乖離を解消する

## 現在の挙動

### 内容

`register-package.py` は graph node を更新するが、対応する feature artifact の frontmatter を追従させないため、登録直後に両者が乖離する。

## 期待する挙動

package 登録後に artifact frontmatter が graph と一致し、validate-graph-schema が乖離を出さない状態

## 再現手順またはユースケース

1. 上記「現在の挙動」に記した証跡・実測の手順を再実行する。

## 影響と優先度

- 影響範囲: dev-workflow
- 深刻度: medium
- 緊急度: 本 issue は 2026-08-15 の dev-graph 11 verb 一括実行で洗い出した残作業として起票した。

## スコープ

- In:
  - 登録時の frontmatter 同期
- Out:
  - frontmatter schema の変更

## 関連グラフ

- 原因/親ノード: なし (独立 issue)
- 関連仕様: system-spec/
- 関連アーキテクチャ: arch-harness-hub-frontend
- 解決タスク: 未起票

## 受入条件

- [ ] 登録直後の validate-graph-schema.py が exit 0

## 検証証跡

- 対象 path:
- `plugins/dev-graph/scripts/register-package.py`
- 証跡 path: eval-log/dev-graph/
