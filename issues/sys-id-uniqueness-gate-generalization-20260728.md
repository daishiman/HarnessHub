---
graph_node_id: "issue-id-uniqueness-gate-generalization-20260728"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","dev-graph","beads","orphan-recovery"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "同種の集合化による ID 重複無検出が他の validate-*.py にも無いかの点検 (HarnessHub-33ho scope_in 未消化分)"
owners: ["daishiman"]
created_at: "2026-07-28T01:25:05Z"
updated_at: "2026-07-28T01:25:05Z"
status: "draft"
depends_on: []
related_nodes: ["issue-bd-external-ref-orphan-nodes-20260725","issue-orphan-external-ref-backlog-disposition-20260726"]
resource_scope: []
purpose: "未解決の Beads issue HarnessHub-ory6 を canonical graph から到達可能に戻し、課題内容を失わず ready/parity の信号を回復する"
goal: "同種の集合化による ID 重複無検出が他の validate-*.py にも無いかの点検 (HarnessHub-33ho scope_in 未消化分)"
mvp_alignment: null
scope_in: ["Beads issue HarnessHub-ory6 の題名・説明・notes・受入条件を保持した issue node の復元"]
scope_out: ["orphan 復元と同時に元 issue の実装や close を行うこと"]
acceptance: ["Beads issue HarnessHub-ory6 の未解決内容と判断根拠が保持され、実装時に検証結果を記録できる","C02 writer の検証を通り、external_ref が canonical graph の実在 node を指す"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-id-uniqueness-gate-generalization-20260728.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-28T01:33:02.881Z","origin_kind":"generated","source_digest":"a2609e33b4e33fd81d4c6c88896f000cc5c22d8b9b82832cec8c09d71527b7fc","source_path":"issues/sys-orphan-external-ref-backlog-disposition-20260726.md#HarnessHub-ory6","source_plugin":"dev-graph","source_version":null}
classification_confidence: 1
classification_reason: "2026-07-28 orphan 再棚卸しで HarnessHub-ory6 の本文と notes を確認し、未解決で実作業を持つため参照剥がし・close ではなく node 復元と判断"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-id-uniqueness-gate-generalization-20260728.md","confidence":1}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-ory6","linked_at":"2026-07-28T01:33:02.881Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-28T01:33:02.881Z","missing_sections":[],"status":"complete"}
---

# 概要

同種の集合化による ID 重複無検出が他の validate-*.py にも無いかの点検 (HarnessHub-33ho scope_in 未消化分)

## 背景と問題

Beads の未解決 issue `HarnessHub-ory6` は `dev-graph:issue-id-uniqueness-gate-generalization-20260728` を参照しているが、
canonical graph に node が無く、課題本文が ready/parity の対象から外れていた。
課題自体は未解決で内容も有効なため、参照を剥がしたり close したりせず node として復元する。

### Beads に記録された内容

validate-coverage-matrix.py の qa_log ID 重複無検出は fail-closed 化したが、issue-qa-log-id-uniqueness-gate-20260726 (HarnessHub-33ho) の scope_in にあった『同種の集合化による取りこぼしが requirement_ids など他の ID 集合にも無いかの点検』は未実施のまま HarnessHub-33ho が close された。grep 実測で validate-task-graph.py / validate-consult-session.py / validate-route-build-reports.py に同型の {x.get("id") for x in ...} パターンを確認した。詳細: issues/sys-id-uniqueness-gate-generalization-20260728.md

### Beads notes

追加 notes は未記録。

## 現在の挙動

`bd-bridge.py --op orphan-audit --scan-refs` では、この参照が
`repoint_or_close` の非クローズ orphan として検出される。どの走査 ref にも同名 node が無く、
issue 文書も存在しないため、canonical graph から課題へ到達できない。

## 期待する挙動

同じ `graph_node_id` の issue node と本文が C02 writer 経由で登録され、Beads の
`external_ref` が実在 node を指す。元の課題内容と notes は失われず、実装は別タスクとして継続できる。

## 再現手順またはユースケース

1. `bd --readonly show HarnessHub-ory6 --json` で `external_ref` と元の本文を読む。
2. `python3 plugins/dev-graph/scripts/bd-bridge.py --op orphan-audit --repo-root . --scan-refs` を実行する。
3. 出力で `HarnessHub-ory6` が非クローズ orphan に含まれることを確認する。

## 影響と優先度

- 影響範囲: dev-graph の ready/parity 表示と、未解決バックログへの到達性
- 深刻度: medium
- 緊急度: 警告を orphan 在庫で埋めず、本物の manifest 取りこぼしを識別できる状態へ戻す必要がある

## スコープ

- In: 元 Beads issue の内容を保持した issue node の復元
- Out: 元 issue が要求する機能・文書・運用作業そのものの実装

## 関連グラフ

- 原因/親ノード: `issue-bd-external-ref-orphan-nodes-20260725`
- 関連仕様: `issue-orphan-external-ref-backlog-disposition-20260726`
- 関連アーキテクチャ: N/A: orphan 復元は既存課題の到達性回復であり新規アーキテクチャを定義しない
- 解決タスク: `issue-id-uniqueness-gate-generalization-20260728`

## 受入条件

- [ ] Beads issue HarnessHub-ory6 の未解決内容と判断根拠が保持され、実装時に検証結果を記録できる
- [ ] C02 writer の frontmatter/schema 検証を通り、orphan-audit の非クローズ件数が 1 件減る

## 検証証跡

- コマンド/テスト: `upsert-node.py --dry-run`、`upsert-node.py`、`bd-bridge.py --op orphan-audit --scan-refs`
- 証跡 path: `issues/sys-orphan-external-ref-backlog-disposition-20260726.md`
