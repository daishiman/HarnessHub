---
graph_node_id: "issue-doc-freshness-primary-evidence-reproduction-20260815"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["doc-freshness","primary-evidence","audit"]
priority: "high"
start_date: "2026-08-15"
target_date: null
iteration: null
title: "鮮度監査が二次情報で FAIL を出す経路を塞ぎ、一次情報の再現手順を必須にする"
owners: ["daishiman"]
created_at: "2026-08-15T00:00:00.000000Z"
updated_at: "2026-08-14T21:58:14.976345Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["plugins/system-spec-harness/agents/system-spec-doc-freshness-auditor.md","system-spec/fetched-references.json"]
purpose: "監査が一次情報に当たらないまま FAIL を出す誤判定を防ぐ"
goal: "鮮度監査の FAIL に一次情報の URL と取得手順が必須で添付される状態"
scope_in: ["監査 prompt への一次情報必須化","FAIL 出力への再現手順フィールド追加"]
scope_out: ["鮮度判定の閾値変更"]
acceptance: ["一次情報の参照が無い FAIL が machine 層で拒否される"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/doc-freshness-primary-evidence-reproduction-20260815.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"96e488263ae4113f51ffe93cb8189883274a3e9def5e5cb52e96c3d4dcbbb356","evaluator":"2026-08-15 dev-graph 11 verb 一括実行の実測・既存ドラフト棚卸しで確認","evidence_ref":"eval-log/dev-graph/"}
source_lineage: {"imported_at":"2026-08-15T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "監査が一次情報に当たらないまま FAIL を出す誤判定を防ぐ"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/doc-freshness-primary-evidence-reproduction-20260815.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-0v75","linked_at":"2026-08-15T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":"manual","status":"open"}
implementation_readiness: {"checked_at":"2026-08-15T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

鮮度監査が二次情報で FAIL を出す経路を塞ぎ、一次情報の再現手順を必須にする

## 背景と問題

監査が一次情報に当たらないまま FAIL を出す誤判定を防ぐ

## 現在の挙動

### 内容

鮮度監査が二次情報 (まとめ記事・第三者ブログ) を根拠に FAIL を出した実例がある。公式サイトの一次情報に当たり、その URL と取得手順を FAIL へ添付することを必須にする。

### 関連

[[#10 version と summary 散文の整合検査]]。

## 期待する挙動

鮮度監査の FAIL に一次情報の URL と取得手順が必須で添付される状態

## 再現手順またはユースケース

1. 上記「現在の挙動」に記した証跡・実測の手順を再実行する。

## 影響と優先度

- 影響範囲: quality
- 深刻度: high
- 緊急度: 本 issue は 2026-08-15 の dev-graph 11 verb 一括実行で洗い出した残作業として起票した。

## スコープ

- In:
  - 監査 prompt への一次情報必須化
  - FAIL 出力への再現手順フィールド追加
- Out:
  - 鮮度判定の閾値変更

## 関連グラフ

- 原因/親ノード: なし (独立 issue)
- 関連仕様: system-spec/
- 関連アーキテクチャ: arch-harness-hub-frontend
- 解決タスク: 未起票

## 受入条件

- [ ] 一次情報の参照が無い FAIL が machine 層で拒否される

## 検証証跡

- 対象 path:
- `plugins/system-spec-harness/agents/system-spec-doc-freshness-auditor.md`
- `system-spec/fetched-references.json`
- 証跡 path: eval-log/dev-graph/
