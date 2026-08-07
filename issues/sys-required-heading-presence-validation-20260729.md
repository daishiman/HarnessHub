---
graph_node_id: "issue-required-heading-presence-validation-20260729"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","dev-graph","c11","required-heading","follow-up"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "required heading 欠落を C11 readiness で専用拒否する"
owners: ["daishiman"]
created_at: "2026-07-29T09:35:58Z"
updated_at: "2026-08-04T07:41:06Z"
status: "closed"
depends_on: ["issue-implementation-readiness-body-validation-20260728"]
related_nodes: ["issue-implementation-readiness-body-validation-20260728","feat-dev-pipeline-improvement","arch-harness-hub-dev-workflow"]
resource_scope: ["plugins/dev-graph/scripts/validate-graph-schema.py","plugins/dev-graph/scripts/graph_artifact_readiness.py","plugins/dev-graph/tests/test_validate_graph_schema_c11_coverage.py","plugins/dev-graph/tests/test_graph_artifact_readiness.py","plugins/dev-graph/templates/README.md","issues/"]
purpose: "必須見出し名の欠落を安全に診断し、既存 artifact を正規移行できるようにする"
goal: "required heading の欠落を本文 placeholder と区別した専用 violation で拒否する"
mvp_alignment: null
scope_in: ["required heading 欠落の専用 violation","missing_sections への欠落節名の反映","全 artifact kind の heading mutation 回帰","既存 artifact の互換移行手順"]
scope_out: ["本文 placeholder 判定の再実装","Harness Hub 製品 API・DB・認証認可・UI の変更"]
acceptance: ["必須見出し名を削除した artifact が専用 violation で拒否される","欠落した節名が missing_sections に返る","全 artifact kind の正例・負例が回帰テストで固定される","既存 artifact の互換移行手順と rollback が検証される"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-required-heading-presence-validation-20260729.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-29T09:35:58Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 1
classification_reason: "HarnessHub-4t9g が required heading 名称の欠落を明示的に scope out とした後続単一責務"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-required-heading-presence-validation-20260729.md","confidence":1}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-85z0","linked_at":"2026-07-29T09:37:50Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-29T09:35:58Z","missing_sections":[],"status":"complete"}
---

# 概要

Dev Graph C11 が artifact kind ごとの必須見出し名そのものの欠落を専用 violation として
報告し、本文 readiness と区別して安全に拒否できるようにする。

## 背景と問題

`HarnessHub-4t9g` は、存在する required section の本文が未記入の場合を
`placeholder_only_section` として拒否した。一方、見出し名の欠落は既存の heading
検査経路に残っており、本文未記入と同じ診断・移行フローでは扱えない。

## 現在の挙動

本文 parser は present な required section を対象に substantive content を検査する。
必須見出し名が存在しない場合の専用エラー表現と、既存 artifact の移行手順は
`HarnessHub-4t9g` の scope out である。

## 期待する挙動

必須見出し名の欠落を deterministic な専用 violation として返し、節名を
`missing_sections` に含める。既存 artifact の互換移行と新規登録の rollback を、
本文 placeholder の診断と混同せず検証できる。

## 再現手順またはユースケース

canonical template から required heading を 1 件削除して C11 を実行する。
専用 violation、`implementation_readiness=incomplete`、欠落節名が確認できることを
正例・負例テストで固定する。

## 影響と優先度

影響は repository 内の Dev Graph artifact validation に限定される。
本文 readiness の完成後に診断精度と移行可能性を高める後続改善なので優先度は medium とする。

## スコープ

対象は required heading 欠落の診断、全 artifact kind の変異テスト、既存 artifact の
互換移行手順である。Harness Hub 製品 API、DB、認証認可、UI は対象外とする。

## 関連グラフ

- 原因ノード: `issue-implementation-readiness-body-validation-20260728`
- feature: `feat-dev-pipeline-improvement`
- architecture: `arch-harness-hub-dev-workflow`

## 受入条件

- 必須見出し名を削除した artifact が専用 violation で拒否される。
- 欠落した節名が `missing_sections` に返る。
- 全 artifact kind の正例・負例が回帰テストで固定される。
- 既存 artifact の互換移行手順と rollback が検証される。

## 検証証跡

focused pytest、Dev Graph 全回帰、graph schema、移行 receipt を Beads notes と
仕様反映受領書へ記録する。
