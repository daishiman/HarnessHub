---
graph_node_id: "issue-coverage-matrix-qa-ids-set-dedup-20260815"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["validator","bug","dedup"]
priority: "high"
start_date: "2026-08-15"
target_date: null
iteration: null
title: "validate-coverage-matrix.py の qa_ids が set で重複を潰す"
owners: ["daishiman"]
created_at: "2026-08-15T00:00:00.000000Z"
updated_at: "2026-08-14T21:58:16.648006Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["plugins/system-spec-harness/scripts/validate-coverage-matrix.py"]
purpose: "同一 qa への重複参照が検査から消える fail-open を塞ぐ"
goal: "qa_ids の重複が潰れず、参照件数が正しく検査される状態"
scope_in: ["set → list への変更","重複時の扱いの決定"]
scope_out: ["coverage 判定規則そのものの変更"]
acceptance: ["重複参照の fixture で件数が正しく数えられる回帰テストが green"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/coverage-matrix-qa-ids-set-dedup-20260815.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"fbb27c5581f7225b0f753e650e1787204b13fb070024ad9c111def3c210969ae","evaluator":"2026-08-15 dev-graph 11 verb 一括実行の実測・既存ドラフト棚卸しで確認","evidence_ref":"eval-log/dev-graph/"}
source_lineage: {"imported_at":"2026-08-15T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "同一 qa への重複参照が検査から消える fail-open を塞ぐ"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/coverage-matrix-qa-ids-set-dedup-20260815.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-l3vp","linked_at":"2026-08-15T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":"manual","status":"open"}
implementation_readiness: {"checked_at":"2026-08-15T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

validate-coverage-matrix.py の qa_ids が set で重複を潰す

## 背景と問題

同一 qa への重複参照が検査から消える fail-open を塞ぐ

## 現在の挙動

### 内容

`qa_ids` を `set` で保持しているため、同一 qa への重複参照が黙って 1 件に潰れる。件数を根拠にする検査が過少カウントになる。

## 期待する挙動

qa_ids の重複が潰れず、参照件数が正しく検査される状態

## 再現手順またはユースケース

1. 上記「現在の挙動」に記した証跡・実測の手順を再実行する。

## 影響と優先度

- 影響範囲: quality
- 深刻度: high
- 緊急度: 本 issue は 2026-08-15 の dev-graph 11 verb 一括実行で洗い出した残作業として起票した。

## スコープ

- In:
  - set → list への変更
  - 重複時の扱いの決定
- Out:
  - coverage 判定規則そのものの変更

## 関連グラフ

- 原因/親ノード: なし (独立 issue)
- 関連仕様: system-spec/
- 関連アーキテクチャ: arch-harness-hub-frontend
- 解決タスク: 未起票

## 受入条件

- [ ] 重複参照の fixture で件数が正しく数えられる回帰テストが green

## 検証証跡

- 対象 path:
- `plugins/system-spec-harness/scripts/validate-coverage-matrix.py`
- 証跡 path: eval-log/dev-graph/
