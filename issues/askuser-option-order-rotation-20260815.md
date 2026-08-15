---
graph_node_id: "issue-askuser-option-order-rotation-20260815"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["neutrality","hearing","order-effect"]
priority: "medium"
start_date: "2026-08-15"
target_date: null
iteration: null
title: "AskUserQuestion の選択肢順序を固定せずローテーションし、提示順を記録する"
owners: ["daishiman"]
created_at: "2026-08-15T00:00:00.000000Z"
updated_at: "2026-08-14T21:58:12.926487Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["system-spec/spec-state.json","plugins/system-spec-harness/skills/run-system-spec-elicit/prompts/R5-decision-guide.md"]
purpose: "順序効果 (先頭が選ばれやすい) による中立性の毀損を防ぐ"
goal: "選択肢の提示順がローテーションされ、その順序が qa entry へ記録されて後から中立性を検証できる状態"
scope_in: ["提示順ローテーション機構の設計","qa entry への提示順記録"]
scope_out: ["AskUserQuestion ツール自体の改修"]
acceptance: ["連続する質問で先頭に置かれる案が固定されない","qa entry から提示順を復元できる"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/askuser-option-order-rotation-20260815.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"1667f958b176c3b015db6fa8eb5e13d9860beb0033b6bd004dc5304384b9d02a","evaluator":"2026-08-15 dev-graph 11 verb 一括実行の実測・既存ドラフト棚卸しで確認","evidence_ref":"eval-log/dev-graph/"}
source_lineage: {"imported_at":"2026-08-15T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "順序効果 (先頭が選ばれやすい) による中立性の毀損を防ぐ"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/askuser-option-order-rotation-20260815.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-33i8","linked_at":"2026-08-15T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":"manual","status":"open"}
implementation_readiness: {"checked_at":"2026-08-15T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

AskUserQuestion の選択肢順序を固定せずローテーションし、提示順を記録する

## 背景と問題

順序効果 (先頭が選ばれやすい) による中立性の毀損を防ぐ

## 現在の挙動

### 理由

順序効果 (先頭が選ばれやすい) が中立性を損なう。提示順を qa entry へ残せば後から中立性を検証できる。

### 実施報告 (追補)

本対策を appr-048 で初めて手動実施した。Q1 は代替案 (縮約) を先頭、Q2/Q3 は現行案を先頭に置き、その事実を approval note へ記載した。`AskUserQuestion` 側にローテーション機構は無いため手動運用であり、恒久対策は依然必要。

## 期待する挙動

選択肢の提示順がローテーションされ、その順序が qa entry へ記録されて後から中立性を検証できる状態

## 再現手順またはユースケース

1. 上記「現在の挙動」に記した証跡・実測の手順を再実行する。

## 影響と優先度

- 影響範囲: quality
- 深刻度: medium
- 緊急度: 本 issue は 2026-08-15 の dev-graph 11 verb 一括実行で洗い出した残作業として起票した。

## スコープ

- In:
  - 提示順ローテーション機構の設計
  - qa entry への提示順記録
- Out:
  - AskUserQuestion ツール自体の改修

## 関連グラフ

- 原因/親ノード: なし (独立 issue)
- 関連仕様: system-spec/
- 関連アーキテクチャ: arch-harness-hub-frontend
- 解決タスク: 未起票

## 受入条件

- [ ] 連続する質問で先頭に置かれる案が固定されない
- [ ] qa entry から提示順を復元できる

## 検証証跡

- 対象 path:
- `system-spec/spec-state.json`
- `plugins/system-spec-harness/skills/run-system-spec-elicit/prompts/R5-decision-guide.md`
- 証跡 path: eval-log/dev-graph/
