---
graph_node_id: "issue-devgraph-completion-event-ledger-gap-20260724"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["dev-graph","reconcile","design-gap","completion-event","follow-up"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "C26 completion_event 台帳 emission の設計ギャップ (writer-consumer 不在で reconcile 完全経路が未実装)"
owners: ["daishiman"]
created_at: "2026-07-24T12:08:10Z"
updated_at: "2026-07-24T12:12:22Z"
status: "draft"
depends_on: []
related_nodes: ["issue-mvp-first-scheduling-completion-projection-20260724"]
resource_scope: ["plugins/dev-graph/scripts/reconcile-github-lifecycle.py","plugins/dev-graph/skills/run-dev-graph-node/SKILL.md"]
purpose: "reconcile-github-lifecycle.py は完了投影の際 --writer-consumer (apply-lifecycle-request handler) を呼んで C02 へ writer_request を適用し completion_event 台帳/transaction receipt を生成する設計だが、該当する writer-consumer スクリプトがリポジトリに存在せず SKILL にもハンドラが無い。このため MVP-first (xjv) / pipeline-improvement (PR#50) の完了投影は『C26 --mode check で PR merge 事実を検証 + C02 upsert-node.py で適用』の手動多段で確定しており、C26 の completion_event 台帳が emit されていない。"
goal: "reconcile の完全経路 (writer_request -> C02 apply -> writer-receipt 検証 -> completion_event/system_release/beads close) が単一コマンドで完走できる。もしくは already-done node に対する冪等 bless 経路で監査台帳を後追い生成できる。"
scope_in: ["writer-consumer (apply-lifecycle-request) の実装 もしくは reconcile への統合","already-done node への冪等 completion_event 後追い emission 経路","MVP-first 13 / pipeline-improvement の completion_event 台帳の後追い生成"]
scope_out: ["completion_evidence の再投影 (既に done・検証済み)","別ストリーム (doc-governance/qa070/render-out1) の OR-003 解消"]
acceptance: ["reconcile-github-lifecycle.py が writer-consumer 不在でも完了投影を完走 (completion_event 台帳生成) できる","MVP-first P01..P13 に対応する completion_event が events 台帳に存在する","手動 writer-receipt 手書きなしで監査可能な証跡が残る"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-devgraph-completion-event-ledger-gap-20260724.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-24T12:08:10Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.9
classification_reason: "reconcile writer-consumer 不在の設計ギャップを追跡する issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-devgraph-completion-event-ledger-gap-20260724.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-eg0","linked_at":"2026-07-24T12:12:22Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-24T12:08:10Z","missing_sections":[],"status":"incomplete"}
---

# 概要

reconcile-github-lifecycle.py の完全な完了投影経路 (writer-consumer 経由の completion_event 台帳生成) が、該当スクリプト不在のため未実装であることを追跡する。

## 背景と問題

reconcile は `--writer-consumer` に `--operation apply-lifecycle-request --request <path> --receipt <path>` を渡して C02 へ writer_request を適用し、receipt を検証したうえで completion_event / system_release / beads close を実行する設計。しかし writer-consumer スクリプトがリポジトリに存在せず、run-dev-graph-node SKILL にも apply-lifecycle-request ハンドラが無い。

## 現在の挙動

- MVP-first (xjv) / pipeline-improvement (PR #50) の完了投影は「C26 --mode check で PR merge 事実を検証 + C02 upsert-node.py で適用」の手動多段で確定
- completion_event 台帳 / transaction receipt が emit されない (監査証跡が C02 receipt 止まり)

## 期待する挙動

- reconcile の完全経路が単一コマンドで完走し completion_event 台帳を生成
- もしくは already-done node への冪等 bless 経路で台帳を後追い生成

## スコープ

- In: writer-consumer 実装 / reconcile 統合 / already-done 冪等 emission
- Out: 既に done・検証済みの completion_evidence 再投影、別ストリーム OR-003

## 受入条件

- [ ] reconcile が writer-consumer 不在でも完了投影を完走 (completion_event 台帳生成) できる
- [ ] MVP-first P01..P13 に対応する completion_event が events 台帳に存在する
- [ ] 手動 writer-receipt 手書きなしで監査可能な証跡が残る

## 検証証跡

- コマンド/テスト: reconcile-github-lifecycle.py の完全経路実走
- 証跡 path: .git/dev-graph/completion-receipts/ の completion_event / transaction receipt
