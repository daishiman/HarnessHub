---
graph_node_id: "issue-elegant-card-review-20260815"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "ui-ux"
tags: ["card-ui","spec-review","deduplication","elegant-review"]
priority: "high"
start_date: "2026-08-15"
target_date: null
iteration: null
title: "カード関連仕様を30思考法で再検証し作成・管理範囲と重複を整える"
owners: ["daishiman"]
created_at: "2026-08-15T00:00:00+09:00"
updated_at: "2026-08-14T22:09:39.130299Z"
status: "closed"
depends_on: []
related_nodes: ["feat-card-list-shell","feat-card-block-authoring","feat-card-mutation-safety","feat-semantic-emphasis-icons"]
resource_scope: ["features/feat-card-list-shell.md","features/feat-card-block-authoring.md","features/feat-card-mutation-safety.md"]
purpose: "成果物カードとドキュメントの作成・管理要件を漏れなく反映し、責務の重複と現状認識の矛盾を除いて実行可能な機能仕様へ整える"
goal: "30種の思考法による独立分析を統合し、カード関連3仕様が矛盾なし・漏れなし・整合性あり・依存関係整合の4条件を満たす状態にする"
scope_in: ["qa-232〜qa-240とカード関連3仕様の対応確認","成果物カード・ドキュメント作成・管理導線の責務境界明確化","現状と到達状態の分離","管理された投影と除去すべき重複の区別","依存順序・検証責務・handoffの明文化"]
scope_out: ["カード関連3 featureの製品実装","既存成果物の削除","公開・merge・本番deploy"]
acceptance: ["30種の思考法すべての分析結果が揃っている","成果物カードとドキュメントの作成・管理要件が各featureの単一責務へ割り当てられている","意図的投影と不要な重複が区別され、後者が整理されている","カード関連3仕様が矛盾なし・漏れなし・整合性あり・依存関係整合を満たす","関連する静的検証と差分検査が成功する"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-backend","arch-harness-hub-security","arch-harness-hub-design-system"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/elegant-card-review-20260815.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"50f573ce2dd900c7fe35369cc1481a844fbaeee0c0674c410b7c9fcc6b276dc8","evaluator":"user-request-2026-08-15","evidence_ref":"issues/elegant-card-review-20260815.md"}
source_lineage: {"imported_at":"2026-08-15T00:00:00+09:00","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "利用者がカード関連変更の網羅性確認と重複整理を明示的に依頼した"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/elegant-card-review-20260815.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-mlvc","linked_at":"2026-08-14T21:47:49.689279Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-08-14T22:08:51Z","evidence_refs":["features/feat-card-list-shell.md","features/feat-card-block-authoring.md","features/feat-card-mutation-safety.md","tests/test_card_feature_contracts.py"],"policy":"manual","reconciled_at":"2026-08-14T22:08:51Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-08-15T00:00:00+09:00","missing_sections":[],"status":"complete"}
---

# 概要

成果物カードとドキュメントの作成・管理に関する今回の変更を、思考リセット後に30種の思考法で再検証し、仕様の漏れ・矛盾・不要な重複を整える。

## 背景と問題

`qa-232`〜`qa-240` から3つのカード関連 feature が生成されているが、現状と到達状態、一覧・本文・更新安全性の責務境界、既存実装との不変条件が混在している。機械向け frontmatter と人向け本文の管理された投影は維持しつつ、異なる仕様間で同じ責務を持つ重複は除く必要がある。

## 現在の挙動

カード関連3 feature は draft で、Beads linkage を持たない。現行製品は広幅でテーブル・狭幅でカード、絞り込みの多くはクライアント状態、Docs は永続 excerpt と外部同期用 ETag を使う。今回の feature は将来の到達状態であり、現行実装済みとは区別する必要がある。

## 期待する挙動

3 feature が単一責務で分割され、成果物カード、ドキュメントの作成方法、一覧・詳細・編集を含む管理方法が漏れなく割り当てられる。依存順序と不変条件が現実の実装境界に接地し、4つの検証条件をすべて満たす。

## 再現手順またはユースケース

利用者がカード関連3 feature と `qa-232`〜`qa-240` を照合すると、どの要件をどの feature が所有し、どの既存契約を変更する必要があるかを一意に追跡できる。実装担当は重複実装や成立しない不変条件を解釈で補わずに計画へ進める。

## 影響と優先度

未整合のまま実装へ進むと、一覧状態の二重管理、永続 excerpt とPII非複製の衝突、通常文書へ使えないETag、作成・管理導線の欠落が後工程で再設計になるため high。

## スコープ

対象はカード関連3 feature の仕様改善と検証。製品コードの実装、既存成果物の削除、公開・merge・本番deployは対象外。

## 関連グラフ

- `feat-card-list-shell`
- `feat-card-block-authoring`
- `feat-card-mutation-safety`
- `feat-semantic-emphasis-icons`

## 受入条件

- 30種の思考法をすべて適用する。
- 成果物カードとドキュメントの作成・管理要件を漏れなく割り当てる。
- 管理された投影を維持し、不要な意味重複を整理する。
- 矛盾なし・漏れなし・整合性あり・依存関係整合をすべて満たす。

## 検証証跡

Dev Graph schema、対象featureのartifact検査、対応表の静的検査、`git diff --check` を実行し、結果をBeads notesへ記録する。
