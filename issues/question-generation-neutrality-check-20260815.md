---
graph_node_id: "issue-question-generation-neutrality-check-20260815"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["neutrality","hearing","validator"]
priority: "medium"
start_date: "2026-08-15"
target_date: null
iteration: null
title: "質問生成時点の中立性チェックを機械層へ組み込む"
owners: ["daishiman"]
created_at: "2026-08-15T00:00:00.000000Z"
updated_at: "2026-08-14T21:58:14.563576Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["plugins/system-spec-harness/scripts/validate-coverage-matrix.py"]
purpose: "誘導的な質問文が生成された時点で検出できるようにする"
goal: "質問生成時に中立性の機械検査が走り、事後監査に依存しない状態"
scope_in: ["誘導表現の検出規則","生成時ゲートへの組込み"]
scope_out: ["過去 qa の遡及検査"]
acceptance: ["誘導的な質問文の fixture で検出される回帰テストが green"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/question-generation-neutrality-check-20260815.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"a6631b357c312d8ecfb499d84c071dd4a3373926195479df4e2f147ac2a966a9","evaluator":"2026-08-15 dev-graph 11 verb 一括実行の実測・既存ドラフト棚卸しで確認","evidence_ref":"eval-log/dev-graph/"}
source_lineage: {"imported_at":"2026-08-15T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "誘導的な質問文が生成された時点で検出できるようにする"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/question-generation-neutrality-check-20260815.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-d3bj","linked_at":"2026-08-15T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":"manual","status":"open"}
implementation_readiness: {"checked_at":"2026-08-15T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

質問生成時点の中立性チェックを機械層へ組み込む

## 背景と問題

誘導的な質問文が生成された時点で検出できるようにする

## 現在の挙動

### 内容

現状、中立性は事後監査 (C06 相当) でしか見ていない。質問が生成される時点で検査すれば、誘導的な問いが利用者へ届く前に止められる。

### 関連

[[#7 選択肢順序ローテーション]] と同じ「中立性の機械化」の系列。

## 期待する挙動

質問生成時に中立性の機械検査が走り、事後監査に依存しない状態

## 再現手順またはユースケース

1. 上記「現在の挙動」に記した証跡・実測の手順を再実行する。

## 影響と優先度

- 影響範囲: quality
- 深刻度: medium
- 緊急度: 本 issue は 2026-08-15 の dev-graph 11 verb 一括実行で洗い出した残作業として起票した。

## スコープ

- In:
  - 誘導表現の検出規則
  - 生成時ゲートへの組込み
- Out:
  - 過去 qa の遡及検査

## 関連グラフ

- 原因/親ノード: なし (独立 issue)
- 関連仕様: system-spec/
- 関連アーキテクチャ: arch-harness-hub-frontend
- 解決タスク: 未起票

## 受入条件

- [ ] 誘導的な質問文の fixture で検出される回帰テストが green

## 検証証跡

- 対象 path:
- `plugins/system-spec-harness/scripts/validate-coverage-matrix.py`
- 証跡 path: eval-log/dev-graph/
