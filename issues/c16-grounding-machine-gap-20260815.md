---
graph_node_id: "issue-c16-grounding-machine-gap-20260815"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["c16","required-info","grounding"]
priority: "medium"
start_date: "2026-08-15"
target_date: null
iteration: null
title: "C16 接地ゲートの機械層が未配線で prose ゲートに留まる"
owners: ["daishiman"]
created_at: "2026-08-15T00:00:00.000000Z"
updated_at: "2026-08-14T21:58:17.489766Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["plugins/system-spec-harness/skills/run-system-spec-elicit/scripts/apply-spec-transition.py","plugins/system-spec-harness/scripts/validate-knowledge-graph.py"]
purpose: "収集必須 item の接地検査を散文の運用から決定論 writer へ移す"
goal: "blocking_items の接地検査が apply-spec-transition へ組み込まれ、機械的に fail-closed になる状態"
scope_in: ["接地検査の決定論実装","apply-spec-transition への組込み"]
scope_out: ["required-info catalog の item 追加"]
acceptance: ["未接地の blocking item がある状態で confirmed が拒否される"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/c16-grounding-machine-gap-20260815.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"251cc618a329c884f2ad45d306ef526d048f34658daa8a1c9cf4393b12bd4df0","evaluator":"2026-08-15 dev-graph 11 verb 一括実行の実測・既存ドラフト棚卸しで確認","evidence_ref":"eval-log/dev-graph/"}
source_lineage: {"imported_at":"2026-08-15T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "収集必須 item の接地検査を散文の運用から決定論 writer へ移す"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/c16-grounding-machine-gap-20260815.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-7yul","linked_at":"2026-08-15T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":"manual","status":"open"}
implementation_readiness: {"checked_at":"2026-08-15T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

C16 接地ゲートの機械層が未配線で prose ゲートに留まる

## 背景と問題

収集必須 item の接地検査を散文の運用から決定論 writer へ移す

## 現在の挙動

### 内容

C16 の収集ゲートは R5 prompt の散文 (prose) ゲートとしてだけ施行されており、決定論 writer である `apply-spec-transition.py` に接地検査が入っていない。skill 本文でも follow-up と明記されている。

### 関連

[[#4 U6-U9 の要素単位 source_refs]] と同一 PR で対応する (qa-295)。

## 期待する挙動

blocking_items の接地検査が apply-spec-transition へ組み込まれ、機械的に fail-closed になる状態

## 再現手順またはユースケース

1. 上記「現在の挙動」に記した証跡・実測の手順を再実行する。

## 影響と優先度

- 影響範囲: quality
- 深刻度: medium
- 緊急度: 本 issue は 2026-08-15 の dev-graph 11 verb 一括実行で洗い出した残作業として起票した。

## スコープ

- In:
  - 接地検査の決定論実装
  - apply-spec-transition への組込み
- Out:
  - required-info catalog の item 追加

## 関連グラフ

- 原因/親ノード: なし (独立 issue)
- 関連仕様: system-spec/
- 関連アーキテクチャ: arch-harness-hub-frontend
- 解決タスク: 未起票

## 受入条件

- [ ] 未接地の blocking item がある状態で confirmed が拒否される

## 検証証跡

- 対象 path:
- `plugins/system-spec-harness/skills/run-system-spec-elicit/scripts/apply-spec-transition.py`
- `plugins/system-spec-harness/scripts/validate-knowledge-graph.py`
- 証跡 path: eval-log/dev-graph/
