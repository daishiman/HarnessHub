---
graph_node_id: "issue-flyer-studio-review-evidence-refresh-20261022"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","flyer-studio","evidence","review"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "flyer-studio: レビュー規範の変更で古くなった verification/ の独立レビュー証跡を取り直す"
owners: ["daishiman"]
created_at: "2026-10-22T13:00:57Z"
updated_at: "2026-10-25T01:24:27.507532Z"
status: "draft"
depends_on: []
related_nodes: ["doc-flyer-studio-final-review-spec-reflection-20261025","task-flyer-studio-final-integration-20261025"]
resource_scope: ["plugins/flyer-studio/verification","plugins/flyer-studio/references/design-contract.json"]
purpose: "v13 反映で design-contract の reviewPolicyFiles（評価規範として指紋を取るファイル群）に含まれる文書を変更した。そのため reviewPolicyFingerprint（規範の指紋）が変わり、verification/ 配下の既存の独立レビュー証跡は古い規範に結び付いたまま（stale）になった。"
goal: "実案件1件で、新しい項目を含む 制作→分析→提案評価→再制作→独立最終レビュー が一巡し、新しい指紋に結び付いた証跡が verification/ にある。"
scope_in: ["実案件1件での一巡と証跡の保存","readingTest の語が紙面の文言と一致すること・preservationChecks の記録"]
scope_out: ["v13 案件そのものの再デザイン","証跡の指紋だけを書き換える偽装"]
acceptance: ["verification/ に新しい reviewPolicyFingerprint に結び付いた visual-review と analysis-review がある","readingTest・preservationChecks・rejectedAlternatives・executionPlan が実データで埋まっている","レビュー実施者が制作者と別である"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/flyer-studio-review-evidence-refresh-20261022.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-10-22T13:00:57Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.9
classification_reason: "flyer-studio への v13 品質層反映で残った追跡課題"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/flyer-studio-review-evidence-refresh-20261022.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-f0ps","linked_at":"2026-10-22T13:16:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-10-22T13:00:57Z","missing_sections":[],"status":"complete"}
---

# 概要

v13 反映で design-contract の reviewPolicyFiles（評価規範として指紋を取るファイル群）に含まれる文書を変更した。そのため reviewPolicyFingerprint（規範の指紋）が変わり、verification/ 配下の既存の独立レビュー証跡は古い規範に結び付いたまま（stale）になった。

## 背景と問題

design-rules.md・review-rubric.md（DD12）・style-profiles.md（DD11）・各 agent/contract 文書を更新した。規範が変われば旧所見は無効とする設計なので、新しい規範で取り直す必要がある。

## 現在の挙動

- verification/stage-1.2.0/ の証跡は変更前の規範の指紋に結び付いている。
- readingTest・preservationChecks・rejectedAlternatives・executionPlan を含む実案件の証跡はまだ無い。

## 期待する挙動

実案件1件で、新しい項目を含む 制作→分析→提案評価→再制作→独立最終レビュー が一巡し、新しい指紋に結び付いた証跡が verification/ にある。

## 再現手順またはユースケース

1. 現行の reviewPolicyFingerprint を計算する。
2. verification/ の既存証跡の指紋と比べ、一致しないことを確認する。

## 影響と優先度

- 影響範囲: plugins/flyer-studio
- 深刻度は中。機械検査は緑でも、規範変更後の独立レビューが一度も実施されていない。

## スコープ

- In: 実案件1件での一巡と証跡の保存、readingTest の語が紙面の文言と一致すること・preservationChecks の記録
- Out: v13 案件そのものの再デザイン、証跡の指紋だけを書き換える偽装

## 関連グラフ

- 原因/親ノード: なし（flyer-studio への v13 反映の残作業）
- 関連仕様: `plugins/flyer-studio/references/review-rubric.md`・`plugins/flyer-studio/references/style-profiles.md`
- 関連アーキテクチャ: なし
- 解決タスク: 本 issue の実装時に作成する

## 受入条件

- verification/ に新しい reviewPolicyFingerprint に結び付いた visual-review と analysis-review がある。
- readingTest・preservationChecks・rejectedAlternatives・executionPlan が実データで埋まっている。
- レビュー実施者が制作者と別である。

## 検証証跡

- 起票元: flyer-studio へ v13 の品質層を反映した作業の残作業
- 実装後の証跡: 試験結果と検査の終了コードを本 issue の notes に記録する
