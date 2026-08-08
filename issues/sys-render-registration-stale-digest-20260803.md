---
graph_node_id: "issue-render-registration-stale-digest-20260803"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","dev-graph","render","registration-receipt","graph-digest","stale"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "dev-graph: render の registration receipt が sync 後に必ず stale になる"
owners: ["daishiman"]
created_at: "2026-08-03T21:15:05.909349Z"
updated_at: "2026-08-07T12:55:00Z"
status: "draft"
depends_on: []
related_nodes: ["issue-render-registration-receipt-contract-mismatch-20260726","feat-dev-pipeline-improvement","arch-harness-hub-testing-qa"]
resource_scope: ["plugins/dev-graph/scripts/render-graph-html.py","plugins/dev-graph/tests/test_render_registration_verification.py","plugins/dev-graph/skills/run-dev-graph-render/SKILL.md","plugins/dev-graph/references/execution-tracker-contract.md","system-spec/testing-qa.md","specs/harness-hub-system-specification.md","architecture/harness-hub-testing-qa.md","features/feat-dev-pipeline-improvement.md","tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-p13-registration-stale-digest-handoff.md","docs/features/feat-dev-pipeline-improvement/","eval-log/dev-graph/run-dev-graph-render/","issues/sys-render-registration-stale-digest-20260803.md"]
purpose: null
goal: null
mvp_alignment: null
scope_in: []
scope_out: []
acceptance: []
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-render-registration-stale-digest-20260803.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":null,"origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "registration 時点の graph_digest_after と sync 後の canonical graph digest が 11 verb 順序で構造的に異なるため、registration proof の部分照合を明示する品質不具合として分類した"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-render-registration-stale-digest-20260803.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-08-04T00:00:00Z","missing_sections":[],"status":"complete"}
---


# 概要

registration receipt の graph digest は登録時点に固定され、後続 sync 後の render では必ず stale となるため、完全な検証失敗ではない状態を表現できない。

## 背景と問題

Dev Graph の 11 verb 実行順では package 登録後に sync が graph revision を進める。node ID、件数、source digest、lineage は一致していても、登録時の graph 全体 digest だけが不一致となり、render が HTML を生成できなかった。

## 現在の挙動

`graph_digest_after` の完全一致を要求し、登録後に sync された正常な graph を stale receipt として `ContractError` で停止する。

## 期待する挙動

node ID、件数、source digest、lineage が一致する場合は HTML を出力し、graph digest だけが古いことを `registration_verification.status=partial` と `graph_digest_match="stale"` で明示する。これらの部分照合も失敗した場合は従来どおり fail-closed とする。

## 再現手順またはユースケース

1. package registration 時点の `graph_digest_after` を含む receipt を用意する。
2. 後続 sync により graph revision を進める。
3. 同じ feature scope を receipt 指定で render する。

## 影響と優先度

- 影響範囲: repository 内の Dev Graph renderer と開発品質の可視化
- 深刻度: medium
- 緊急度: 実行順が固定のため、正規フローで receipt 指定 render が常に停止する

## スコープ

- In: renderer の状態表現、skill 契約、回帰テスト、仕様・設計の書き戻し、Beads/graph 記録
- Out: receipt の digest 書き換え、製品 API、DB、認証認可、製品 UI、Cloudflare deploy unit

## 関連グラフ

- 原因/親ノード: `issue-render-registration-receipt-contract-mismatch-20260726`
- 関連仕様: `spec-harness-hub-requirements`
- 関連アーキテクチャ: `arch-harness-hub-testing-qa`
- 解決タスク: `issue-render-registration-stale-digest-20260803`

## 受入条件

- [ ] stale graph digest だけの場合に render が `partial` と明示して HTML を生成する。
- [ ] node ID、件数、source digest、lineage の不一致は引き続き fail-closed である。
- [ ] CLI JSON、HTML banner、埋込み metadata、skill 契約、仕様反映文書の状態語が一致する。

## 検証証跡

- コマンド/テスト: focused pytest、plugin 全回帰、task package validator、fresh live trial、repository CI
- 証跡 path: `docs/features/feat-dev-pipeline-improvement/render-registration-stale-digest-spec-reflection-receipt.md`
