---
graph_node_id: "issue-qa-log-multi-topic-detection-20260815"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["spec-state","qa-log","validator"]
priority: "medium"
start_date: "2026-08-15"
target_date: null
iteration: null
title: "qa_log の論点束ねを機械検出する"
owners: ["daishiman"]
created_at: "2026-08-15T00:00:00.000000Z"
updated_at: "2026-08-14T21:58:15.387826Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["plugins/system-spec-harness/scripts/validate-coverage-matrix.py","system-spec/spec-state.json"]
purpose: "1 entry = 1 論点の契約が破られたことを人手の目視に頼らず検出する"
goal: "複数論点を束ねた qa entry が validator で検出される状態"
scope_in: ["束ね検出のヒューリスティクス設計","validate-coverage-matrix.py への組込み"]
scope_out: ["既存の束ね entry の遡及分離"]
acceptance: ["束ねた fixture で警告または exit != 0 になる"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/qa-log-multi-topic-detection-20260815.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"76f8ccbf5dc741a9538ddb6721c792b0ca3ed2c06fb9cc6df2b10dcb8a0ed909","evaluator":"2026-08-15 dev-graph 11 verb 一括実行の実測・既存ドラフト棚卸しで確認","evidence_ref":"eval-log/dev-graph/"}
source_lineage: {"imported_at":"2026-08-15T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "1 entry = 1 論点の契約が破られたことを人手の目視に頼らず検出する"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/qa-log-multi-topic-detection-20260815.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-hray","linked_at":"2026-08-15T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":"manual","status":"open"}
implementation_readiness: {"checked_at":"2026-08-15T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

qa_log の論点束ねを機械検出する

## 背景と問題

1 entry = 1 論点の契約が破られたことを人手の目視に頼らず検出する

## 現在の挙動

### 内容

`plugins/system-spec-harness/skills/run-system-spec-elicit/references/spec-state-contract.md` の「qa_log の論点分離」契約は「1 entry = 1 論点」を求めるが、違反の検出は人手の目視に頼っている。C06 が論点別に中立性を検証できなくなるため、機械検出が要る。

## 期待する挙動

複数論点を束ねた qa entry が validator で検出される状態

## 再現手順またはユースケース

1. 上記「現在の挙動」に記した証跡・実測の手順を再実行する。

## 影響と優先度

- 影響範囲: quality
- 深刻度: medium
- 緊急度: 本 issue は 2026-08-15 の dev-graph 11 verb 一括実行で洗い出した残作業として起票した。

## スコープ

- In:
  - 束ね検出のヒューリスティクス設計
  - validate-coverage-matrix.py への組込み
- Out:
  - 既存の束ね entry の遡及分離

## 関連グラフ

- 原因/親ノード: なし (独立 issue)
- 関連仕様: system-spec/
- 関連アーキテクチャ: arch-harness-hub-frontend
- 解決タスク: 未起票

## 受入条件

- [ ] 束ねた fixture で警告または exit != 0 になる

## 検証証跡

- 対象 path:
- `plugins/system-spec-harness/scripts/validate-coverage-matrix.py`
- `system-spec/spec-state.json`
- 証跡 path: eval-log/dev-graph/
