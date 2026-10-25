---
graph_node_id: "issue-flyer-studio-arbitrary-rotation-20261022"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["feature","flyer-studio","rendering","style"]
priority: "low"
start_date: null
target_date: null
iteration: null
title: "flyer-studio: 任意角度の回転配置に対応する"
owners: ["daishiman"]
created_at: "2026-10-22T13:00:57Z"
updated_at: "2026-10-25T01:24:20.628377Z"
status: "draft"
depends_on: []
related_nodes: ["doc-flyer-studio-final-review-spec-reflection-20261025","task-flyer-studio-final-integration-20261025"]
resource_scope: ["plugins/flyer-studio/schemas","plugins/flyer-studio/scripts","plugins/flyer-studio/tests"]
purpose: "漫画の傾いたフキダシ・墨絵の斜めの書・写真の傾きなど、様式によっては任意角度の回転配置が必要になる。現行の scene は任意回転を未対応として検査で止める。"
goal: "scene で任意角度の回転を指定でき、描画とはみ出し・重なり検査が回転後の外接矩形で正しく動く。"
scope_in: ["scene schema への回転指定","描画と境界検査の回転対応","試験の追加"]
scope_out: ["回転を既定にすること"]
acceptance: ["rotation を指定した scene が検査を通り、描画結果に反映される","回転後にはみ出す・重なる配置は検査が失敗する","rotation 未指定の既存案件の結果が変わらない"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/flyer-studio-arbitrary-rotation-20261022.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-10-22T13:00:57Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.9
classification_reason: "flyer-studio への v13 品質層反映で残った追跡課題"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/flyer-studio-arbitrary-rotation-20261022.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-pzdu","linked_at":"2026-10-22T13:22:33Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-10-22T13:00:57Z","missing_sections":[],"status":"complete"}
---

# 概要

漫画の傾いたフキダシ・墨絵の斜めの書・写真の傾きなど、様式によっては任意角度の回転配置が必要になる。現行の scene は任意回転を未対応として検査で止める。

## 背景と問題

v13 の分析では回転は候補として比較し、必然性がなければ採らない扱いだった。多様な様式へ広げると、回転が様式の表現として必要になる場面がある。

## 現在の挙動

- scene の text に rotation を指定すると `unsupported-rotation` で検査が失敗する（tests/runtime-gates.test.cjs）。
- 縦組みは writingMode で扱える。

## 期待する挙動

scene で任意角度の回転を指定でき、描画とはみ出し・重なり検査が回転後の外接矩形で正しく動く。

## 再現手順またはユースケース

1. scene.variants[0].texts[0].rotation=12 を指定する。
2. validate が unsupported-rotation を返すことを確認する。

## 影響と優先度

- 影響範囲: plugins/flyer-studio
- 深刻度は低。現状は未対応と正直に報告されるので誤った完成扱いにはならない。

## スコープ

- In: scene schema への回転指定、描画と境界検査の回転対応、試験の追加
- Out: 回転を既定にすること

## 関連グラフ

- 原因/親ノード: なし（flyer-studio への v13 反映の残作業）
- 関連仕様: `plugins/flyer-studio/references/review-rubric.md`・`plugins/flyer-studio/references/style-profiles.md`
- 関連アーキテクチャ: なし
- 解決タスク: 本 issue の実装時に作成する

## 受入条件

- rotation を指定した scene が検査を通り、描画結果に反映される。
- 回転後にはみ出す・重なる配置は検査が失敗する。
- rotation 未指定の既存案件の結果が変わらない。

## 検証証跡

- 起票元: flyer-studio へ v13 の品質層を反映した作業の残作業
- 実装後の証跡: 試験結果と検査の終了コードを本 issue の notes に記録する
