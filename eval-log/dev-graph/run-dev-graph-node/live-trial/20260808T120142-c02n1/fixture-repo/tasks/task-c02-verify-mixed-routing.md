---
graph_node_id: "task-c02-verify-mixed-routing"
artifact_kind: "task"
artifact_subtypes: []
project_id: "c02fix"
domain: "dev-workflow"
tags: ["live-trial","c02-out1","task"]
priority: null
start_date: null
target_date: null
iteration: null
title: "混在バッチ routing と連続更新の整合を検証する"
owners: ["dev-graph-harness"]
created_at: "2026-08-08T03:10:03Z"
updated_at: "2026-08-08T03:10:03Z"
status: "draft"
depends_on: ["iss-c02-mixed-routing"]
related_nodes: ["spec-c02-mixed-batch-contract","arch-c02-writer-boundary"]
resource_scope: ["tasks/task-c02-verify-mixed-routing.md"]
purpose: null
goal: null
scope_in: []
scope_out: []
acceptance: []
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "tasks/task-c02-verify-mixed-routing.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-08T03:10:03Z","origin_kind":"manual","source_digest":"db95e0994a17f656d563447b0d7398f43cff896ba1081cfec061711e06001ad8","source_path":"mixed-artifacts.json","source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "目的/完了条件を持ち実行単位として閉じているため task へ写像した"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/task-c02-verify-mixed-routing.md","confidence":0.99},{"artifact_kind":"issue","candidate_path":"issues/task-c02-verify-mixed-routing.md","confidence":0.2}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-08T03:10:03Z","missing_sections":[],"status":"complete"}
---

# 目的

混在バッチ登録後に同じノードを連続更新しても frontmatter の kind と保存 path が食い違わないことを確認する。

## 背景

C02 単一 writer は kind から content root を決定論写像する。登録直後は一致していても、連続更新で frontmatter だけが再生成され path が据え置かれると、graph と実ファイルの対応が静かに壊れる。iss-c02-mixed-routing が挙げた懸念を実測で閉じる。

## 入力と前提条件

- 入力: mixed-artifacts.json (issue/task/specification/architecture/document 各1件)
- 前提: dev-graph 初期化済み、graph_revision=0、nodes 空、6 content root が実在する

## 出力と成果物

- 生成物: issues/ tasks/ specs/ architecture/ docs/ 配下の Markdown 実体 5 件
- 更新対象: .dev-graph/state/graph.json (nodes 5 件、graph_revision 増分)

## 依存関係

- `depends_on`: iss-c02-mixed-routing
- ブロッカー: graph store に pending WAL が残っている場合は fail-closed で停止する

## 実装対象

- Frontend: N/A: 本タスクは graph store と Markdown 実体だけを対象とする
- Backend/API: C02 単一 writer (upsert-node.py) の routing と frontmatter 生成
- Database/Data: .dev-graph/state/graph.json の nodes 配列
- Infrastructure: N/A: 実行は caller repository 内で完結し外部資源を使わない
- Security/Privacy: repository 外への read/write を行わない containment 検証
- Documentation: docs/ 配下 runbook (doc-c02-mixed-batch-runbook) との整合

## Write scope と競合制約

- `touches`: .dev-graph/state/graph.json, issues/, tasks/, specs/, architecture/, docs/
- 排他資源: .dev-graph/state/graph.json (C02 単一 writer lock)
- 並列実行条件: 同一 graph store への並列 upsert は行わず逐次実行する
- branch: main (fixture repository、feature branch を切らない live-trial)
- worktree lease: 本 live-trial は lease を取得せず単一 worktree で実行する
- completion projection: 完了は本 run の status.json と receipt で記録する

## GitHub publication

- Mode: local_only
- Project aliases: N/A: github.enabled=false のため auto-add を行わない
- Issue labels/milestone: N/A: 外部 publication を行わない
- Initial Project fields: N/A: Projects 連携なし
- Publication gate: `status=active && confirmation_status=confirmed && evaluation_status=pass && implementation_readiness.status=complete`
- Failure policy: pending_retry とし、ローカル登録はロールバックしない
- Completion policy: manual (beads binding かつ PR を作らない運用のため)
- PR linkage requirement: N/A: PR を作らない
- Closed without merge: keep_active
- Local reconciliation: manual sync

## 実行手順

1. mixed-artifacts.json の 5 件を kind ごとに node 入力へ整形する。
2. dry-run で write_count=0 と routing 先を確認する。
3. 同じ入力で apply し、保存 path と graph.json の file_path を突き合わせる。
4. 1 件を連続更新し、frontmatter kind と保存 path の一致を再確認する。

## 受入条件

- [ ] 5 件すべてが canonical kind path へ保存される
- [ ] 連続更新後も frontmatter kind と保存 path が一致する
- [ ] features/ に C14 macro-feature 契約外のノードが生成されない

## 検証方法

- 自動検証: `python3 plugins/dev-graph/scripts/validate-graph-schema.py --graph .dev-graph/state/graph.json`
- 手動検証: 各 Markdown の frontmatter artifact_kind と実 path の prefix を突き合わせる
- 証跡: .dev-graph/state/graph.json、各 content root の Markdown 実体

## リスクとロールバック

- リスク: 連続更新で本文が template へ戻り、既存記述が失われる
- ロールバック: node_transaction の WAL が before-image を保持しており、中断時は次回起動で復元する

## Handoff

- 実装 route: human
- 次に利用するノード: doc-c02-mixed-batch-runbook
