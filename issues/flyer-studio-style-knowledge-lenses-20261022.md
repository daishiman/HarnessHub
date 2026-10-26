---
graph_node_id: "issue-flyer-studio-style-knowledge-lenses-20261022"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","flyer-studio","knowledge","style"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "flyer-studio: designer-knowledge に様式別の一次資料レンズ(漫画・墨絵など)を追加する"
owners: ["daishiman"]
created_at: "2026-10-22T13:00:57Z"
updated_at: "2026-10-25T01:24:29.440756Z"
status: "draft"
depends_on: []
related_nodes: ["doc-flyer-studio-final-review-spec-reflection-20261025","task-flyer-studio-final-integration-20261025"]
resource_scope: ["plugins/flyer-studio/references/designer-knowledge.md","plugins/flyer-studio/references/style-profiles.md","plugins/flyer-studio/references/design-knowledge-index.json"]
purpose: "DD11（style-profiles.md）で様式ごとの判断点・背景生成・レビューの重点は定義した。しかし designer-knowledge.md の専門知見は写真・文字組・配色が中心で、漫画や墨絵などを一次資料（原典に近い出典）に基づいて判断するレンズ（見方）が無い。"
goal: "様式ごとに出典付きのレンズがあり、DD11 の各様式から参照され、制作とレビューの根拠に使える。"
scope_in: ["漫画・墨絵ほか DD11 の様式ごとの出典付きレンズ","DD11 からの参照リンク"]
scope_out: ["特定作家の画風の模写指示","様式ごとの固定数値（pt や比率）の焼き込み"]
acceptance: ["DD11 の各様式に対応する出典付きレンズが designer-knowledge.md にある","固定数値や特定作家の模写を既定にしていない","package.py --check が緑のまま"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/flyer-studio-style-knowledge-lenses-20261022.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-10-22T13:00:57Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.9
classification_reason: "flyer-studio への v13 品質層反映で残った追跡課題"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/flyer-studio-style-knowledge-lenses-20261022.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-mv0o","linked_at":"2026-10-22T13:20:01Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-10-22T13:00:57Z","missing_sections":[],"status":"complete"}
---

# 概要

DD11（style-profiles.md）で様式ごとの判断点・背景生成・レビューの重点は定義した。しかし designer-knowledge.md の専門知見は写真・文字組・配色が中心で、漫画や墨絵などを一次資料（原典に近い出典）に基づいて判断するレンズ（見方）が無い。

## 背景と問題

利用者は写真・画像・漫画調・墨絵など多様なチラシへ対応することを求めている。様式の判断点だけでは、様式固有の良し悪しを評価者が根拠付きで述べにくい。

## 現在の挙動

- designer-knowledge.md に漫画のコマ割り・視線誘導・フキダシの読み順、墨絵の濃淡・滲み・余白（間）・落款位置の知見が無い。
- DD11 の各様式から参照できる知見の出典が無い。

## 期待する挙動

様式ごとに出典付きのレンズがあり、DD11 の各様式から参照され、制作とレビューの根拠に使える。

## 再現手順またはユースケース

1. 漫画調の案を作り、構図レビューで様式固有の根拠を求める。
2. designer-knowledge.md に参照できる知見が無いことを確認する。

## 影響と優先度

- 影響範囲: plugins/flyer-studio
- 深刻度は中。多様な様式への対応が、一般的なデザイン規則の当てはめに留まる。

## スコープ

- In: 漫画・墨絵ほか DD11 の様式ごとの出典付きレンズ、DD11 からの参照リンク
- Out: 特定作家の画風の模写指示、様式ごとの固定数値（pt や比率）の焼き込み

## 関連グラフ

- 原因/親ノード: なし（flyer-studio への v13 反映の残作業）
- 関連仕様: `plugins/flyer-studio/references/review-rubric.md`・`plugins/flyer-studio/references/style-profiles.md`
- 関連アーキテクチャ: なし
- 解決タスク: 本 issue の実装時に作成する

## 受入条件

- DD11 の各様式に対応する出典付きレンズが designer-knowledge.md にある。
- 固定数値や特定作家の模写を既定にしていない。
- package.py --check が緑のまま。

## 検証証跡

- 起票元: flyer-studio へ v13 の品質層を反映した作業の残作業
- 実装後の証跡: 試験結果と検査の終了コードを本 issue の notes に記録する
