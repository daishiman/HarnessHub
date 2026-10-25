---
graph_node_id: "issue-flyer-studio-agent-capability-manifest-20261022"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","flyer-studio","lint","agent"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "flyer-studio: agent定義8件へ CapabilityManifest frontmatter を追加する"
owners: ["daishiman"]
created_at: "2026-10-22T13:00:57Z"
updated_at: "2026-10-25T01:24:18.813016Z"
status: "draft"
depends_on: []
related_nodes: ["doc-flyer-studio-final-review-spec-reflection-20261025","task-flyer-studio-final-integration-20261025"]
resource_scope: ["plugins/flyer-studio/agents","plugins/flyer-studio/skills/assign-flyer-analysis-review/agents","plugins/flyer-studio/skills/assign-flyer-review/agents","plugins/flyer-studio/skills/run-analyze-flyer/agents","plugins/flyer-studio/skills/run-create-flyer/agents"]
purpose: "lint-capability-manifest（agent 定義の前置き情報を検査する lint）が、flyer-studio の agent 定義8件で kind・version などの CapabilityManifest frontmatter の欠落をエラー報告する。"
goal: "8件すべてが harness-creator の agent frontmatter 規約を満たし、lint-capability-manifest が緑になる。"
scope_in: ["8件の frontmatter 追加","package.py --check と npm test の再確認"]
scope_out: ["agent 本文の書き換え"]
acceptance: ["lint-capability-manifest が flyer-studio の agent 定義8件で exit 0","package.py --check と npm test が緑のまま"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/flyer-studio-agent-capability-manifest-20261022.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-10-22T13:00:57Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.9
classification_reason: "flyer-studio への v13 品質層反映で残った追跡課題"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/flyer-studio-agent-capability-manifest-20261022.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-dtr8","linked_at":"2026-10-22T13:17:57Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"blocked"}
implementation_readiness: {"checked_at":"2026-10-22T13:00:57Z","missing_sections":[],"status":"complete"}
---

# 概要

lint-capability-manifest（agent 定義の前置き情報を検査する lint）が、flyer-studio の agent 定義8件で kind・version などの CapabilityManifest frontmatter の欠落をエラー報告する。

## 背景と問題

今回の v13 反映以前からある既存の不備。plugin-composition.yaml の lint は緑だが、agent 単体の lint は赤のまま。

## 現在の挙動

- 対象: agents/flyer-reviewer.md・flyer-composition-reviewer.md・flyer-typography-reviewer.md・flyer-color-reviewer.md、skills/assign-flyer-analysis-review/agents/analysis-evaluator.md、skills/assign-flyer-review/agents/visual-review-coordinator.md、skills/run-analyze-flyer/agents/artifact-analyst.md、skills/run-create-flyer/agents/flyer-producer.md。
- frontmatter は name と description だけ。

## 期待する挙動

8件すべてが harness-creator の agent frontmatter 規約を満たし、lint-capability-manifest が緑になる。

## 再現手順またはユースケース

1. harness-creator の lint-capability-manifest を flyer-studio の agent 定義へ実行する。
2. kind 以降の必須キー欠落でエラーになることを確認する。

## 影響と優先度

- 影響範囲: plugins/flyer-studio
- 深刻度は低〜中。動作には影響しないが、capability-review や配布前検査で赤が残る。

## スコープ

- In: 8件の frontmatter 追加、package.py --check と npm test の再確認
- Out: agent 本文の書き換え

## 関連グラフ

- 原因/親ノード: なし（flyer-studio への v13 反映の残作業）
- 関連仕様: `plugins/flyer-studio/references/review-rubric.md`・`plugins/flyer-studio/references/style-profiles.md`
- 関連アーキテクチャ: なし
- 解決タスク: 本 issue の実装時に作成する

## 受入条件

- lint-capability-manifest が flyer-studio の agent 定義8件で exit 0。
- package.py --check と npm test が緑のまま。

## 検証証跡

- 起票元: flyer-studio へ v13 の品質層を反映した作業の残作業
- 実装後の証跡: 試験結果と検査の終了コードを本 issue の notes に記録する
