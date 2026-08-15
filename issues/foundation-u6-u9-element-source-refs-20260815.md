---
graph_node_id: "issue-foundation-u6-u9-element-source-refs-20260815"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "documentation"
tags: ["spec-state","traceability","completeness-finding"]
priority: "medium"
start_date: "2026-08-15"
target_date: null
iteration: null
title: "requirements_foundation U6-U9 へ要素単位の source_refs を付与する"
owners: ["daishiman"]
created_at: "2026-08-15T00:00:00.000000Z"
updated_at: "2026-08-14T21:58:11.676902Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["system-spec/spec-state.json","plugins/system-spec-harness/skills/run-system-spec-compile/scripts/compile-spec-doc.py","plugins/system-spec-harness/skills/run-system-spec-elicit/scripts/apply-spec-transition.py"]
purpose: "上位概念の各要素がどの質疑に接地しているかを機械的に追跡できるようにする"
goal: "U6-U9 の全要素が source_refs + source_binding を持ち、C03 の章描画も dict 形式へ対応した状態"
scope_in: ["約 35 要素の根拠 qa の再導出","U6 (stakeholders) / U8 (constraints) / U7 (scope in|out) / U9 (concrete_intents) の dict 化","compile-spec-doc.py の描画を「文字列または dict」の両対応へ拡張"]
scope_out: ["U1-U5 の再ヒアリング"]
acceptance: ["U6-U9 の全要素が source_refs を持つ","compile-spec-doc.py の出力に {'text': ...} が現れない","validate-coverage-matrix.py --require-foundation が exit 0"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/foundation-u6-u9-element-source-refs-20260815.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"007bc4ec01aad3b3d19d439618fa65b379a903523048dcc81de9f54573ec3ca4","evaluator":"2026-08-15 dev-graph 11 verb 一括実行の実測・既存ドラフト棚卸しで確認","evidence_ref":"eval-log/dev-graph/"}
source_lineage: {"imported_at":"2026-08-15T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "上位概念の各要素がどの質疑に接地しているかを機械的に追跡できるようにする"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/foundation-u6-u9-element-source-refs-20260815.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-gp82","linked_at":"2026-08-15T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":"manual","status":"open"}
implementation_readiness: {"checked_at":"2026-08-15T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

requirements_foundation U6-U9 へ要素単位の source_refs を付与する

## 背景と問題

上位概念の各要素がどの質疑に接地しているかを機械的に追跡できるようにする

## 現在の挙動

### 現状

U3 (goals) / U4 (objectives) は要素ごとに `source_refs` + `source_binding` を持つが、U6 (stakeholders) と U8 (constraints) は素の文字列配列、U7 (scope) は `in`/`out` の文字列配列。U9 (concrete_intents) は dict だが `source_refs` を持たない。

### 作業量

約 35 要素それぞれの根拠 qa を再導出し、あわせて `compile-spec-doc.py` の描画を「文字列または dict」の両対応へ広げる必要がある。

### 注意

`foundation_missing_fields` は U6/U8 に非空 list しか要求しないため dict 化は writer を通るが、C03 の章描画が文字列前提のままだと `{'text': ...}` がそのまま出る。writer と compiler を同時に直す。

### 関連

[[#17 C16 接地の機械層ギャップ]] と同一 PR で対応する (qa-295)。

## 期待する挙動

U6-U9 の全要素が source_refs + source_binding を持ち、C03 の章描画も dict 形式へ対応した状態

## 再現手順またはユースケース

1. 上記「現在の挙動」に記した証跡・実測の手順を再実行する。

## 影響と優先度

- 影響範囲: documentation
- 深刻度: medium
- 緊急度: 本 issue は 2026-08-15 の dev-graph 11 verb 一括実行で洗い出した残作業として起票した。

## スコープ

- In:
  - 約 35 要素の根拠 qa の再導出
  - U6 (stakeholders) / U8 (constraints) / U7 (scope in|out) / U9 (concrete_intents) の dict 化
  - compile-spec-doc.py の描画を「文字列または dict」の両対応へ拡張
- Out:
  - U1-U5 の再ヒアリング

## 関連グラフ

- 原因/親ノード: なし (独立 issue)
- 関連仕様: system-spec/
- 関連アーキテクチャ: arch-harness-hub-frontend
- 解決タスク: 未起票

## 受入条件

- [ ] U6-U9 の全要素が source_refs を持つ
- [ ] compile-spec-doc.py の出力に {'text': ...} が現れない
- [ ] validate-coverage-matrix.py --require-foundation が exit 0

## 検証証跡

- 対象 path:
- `system-spec/spec-state.json`
- `plugins/system-spec-harness/skills/run-system-spec-compile/scripts/compile-spec-doc.py`
- `plugins/system-spec-harness/skills/run-system-spec-elicit/scripts/apply-spec-transition.py`
- 証跡 path: eval-log/dev-graph/
