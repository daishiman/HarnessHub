---
graph_node_id: "issue-build-claude-settings-skill-name-conflict-20260815"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["tooling","settings","plugin-conflict"]
priority: "high"
start_date: "2026-08-15"
target_date: null
iteration: null
title: "skill 名 run-skill-feedback の衝突で .claude/settings.json を再生成できない"
owners: ["daishiman"]
created_at: "2026-08-15T00:00:00.000000Z"
updated_at: "2026-08-14T21:58:11.267262Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["scripts/build-claude-settings.py",".claude/settings.json"]
purpose: "hook 配線の変更を正規経路で反映できない状態を解消する"
goal: "build-claude-settings.py が exit 0 で settings.json を再生成でき、手作業の追記に頼らない状態"
scope_in: ["skill 名の名前空間設計 (plugin 名 prefix の導入等)","conflict 検出時の診断メッセージ改善"]
scope_out: ["company-master / harness-hub-publisher の機能変更"]
acceptance: ["python3 scripts/build-claude-settings.py が exit 0","生成結果が手作業追記分と一致する"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/build-claude-settings-skill-name-conflict-20260815.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"72030518c2b34dbb6608f49f838fef9b0d7db9730c9bb02405c6179b9cb53d56","evaluator":"2026-08-15 dev-graph 11 verb 一括実行の実測・既存ドラフト棚卸しで確認","evidence_ref":"eval-log/dev-graph/"}
source_lineage: {"imported_at":"2026-08-15T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "hook 配線の変更を正規経路で反映できない状態を解消する"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/build-claude-settings-skill-name-conflict-20260815.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-yhq8","linked_at":"2026-08-15T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":"manual","status":"open"}
implementation_readiness: {"checked_at":"2026-08-15T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

skill 名 run-skill-feedback の衝突で .claude/settings.json を再生成できない

## 背景と問題

hook 配線の変更を正規経路で反映できない状態を解消する

## 現在の挙動

### 証跡

`python3 scripts/build-claude-settings.py` が exit 2。conflict は次の 1 件のみ。

```json
{"type":"skill","name":"run-skill-feedback","plugins":["company-master","harness-hub-publisher"]}
```

### 影響

任意の plugin の hook 配線変更が正規経路で反映できず、手作業の追記に頼る状態。generator と同一形状で 2 件を追記して回避したが、恒久対策ではない。

## 期待する挙動

build-claude-settings.py が exit 0 で settings.json を再生成でき、手作業の追記に頼らない状態

## 再現手順またはユースケース

1. 上記「現在の挙動」に記した証跡・実測の手順を再実行する。

## 影響と優先度

- 影響範囲: dev-workflow
- 深刻度: high
- 緊急度: 本 issue は 2026-08-15 の dev-graph 11 verb 一括実行で洗い出した残作業として起票した。

## スコープ

- In:
  - skill 名の名前空間設計 (plugin 名 prefix の導入等)
  - conflict 検出時の診断メッセージ改善
- Out:
  - company-master / harness-hub-publisher の機能変更

## 関連グラフ

- 原因/親ノード: なし (独立 issue)
- 関連仕様: system-spec/
- 関連アーキテクチャ: arch-harness-hub-frontend
- 解決タスク: 未起票

## 受入条件

- [ ] python3 scripts/build-claude-settings.py が exit 0
- [ ] 生成結果が手作業追記分と一致する

## 検証証跡

- 対象 path:
- `scripts/build-claude-settings.py`
- `.claude/settings.json`
- 証跡 path: eval-log/dev-graph/
