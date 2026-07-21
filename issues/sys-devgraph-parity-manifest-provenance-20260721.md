---
graph_node_id: "issue-devgraph-parity-manifest-provenance-20260721"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "documentation"
tags: ["dev-graph","beads","parity","schedule"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "parity manifest に由来情報がなく stale 検出できない / graph node を持たない bd issue が ready 判定へ乗らない"
owners: ["daishiman"]
created_at: "2026-07-21T00:00:00Z"
updated_at: "2026-07-21T00:00:00Z"
status: "draft"
depends_on: []
related_nodes: ["issue-bd-bridge-notes-passthrough-20260721"]
resource_scope: ["plugins/dev-graph/scripts/bd-bridge.py","plugins/dev-graph/scripts/schedule-graph.py","plugins/dev-graph/references/execution-tracker-contract.md"]
purpose: "schedule (C28→C16) の beads parity 経路で、古い snapshot による ready 推薦と、tracker 側で落ちた候補の silent drop を機械的に検出可能にする"
goal: "parity manifest が由来 (generated_at / source_graph_digest) を必須で持ち、stale snapshot では schedule が停止し、unmapped が対処 owner 別に分離されている"
scope_in: ["parity manifest への generated_at / source_graph_digest 必須化","schedule-graph での canonical digest 突合による stale 停止","unmapped reason の分離と件数サマリ","C28 unmapped/conflicts の schedule report への引き継ぎ","契約文書 (execution-tracker-contract §10) への明記","回帰テスト"]
scope_out: ["parity manifest 生成スクリプトの新設","graph への beads_linkage backfill","bd CLI 側の変更"]
acceptance: ["parity manifest が generated_at / source_graph_digest を欠く場合 C28 が fail-closed で拒否する","manifest の source_graph_digest が現 graph の canonical digest と一致しない場合 C16 schedule が停止する","unmapped が external_ref_absent と parity_manifest_missing に分離され件数サマリが receipt に載る","C28 の unmapped/conflicts が schedule report へ source 付きで引き継がれる","回帰テストが plugins/dev-graph/tests に存在する"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-devgraph-parity-manifest-provenance-20260721.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-21T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":"issues/sys-bd-bridge-notes-passthrough-20260721.md","source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "schedule の beads parity 経路を実行した際に観測した契約欠落を追跡する issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-devgraph-parity-manifest-provenance-20260721.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-4oc","linked_at":"2026-07-21T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-21T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

C28 `bd-bridge.py --op ready --parity-manifest` が受け取る parity manifest は graph の snapshot だが、いつ・どの graph から作ったかを持たない。そのため下流の C16 `schedule-graph.py` は「古い snapshot による ready 推薦」を機械検出できない。あわせて、ready 候補が manifest に載らなかった理由が 1 種類に丸められており、対処が必要な取りこぼしと graph 管理外の bd 課題を区別できない。

## 背景と問題

### (1) 由来なし snapshot による stale 推薦

manifest は `{"nodes": [...]}` だけを持つ。schedule-graph は node 単位で `graph_status` / `graph_depends_on` を graph 実体と再照合するが、**その検査は manifest に載っている node しか見ない**。snapshot 生成後に graph へ追加/削除された node は原理的に捕まらず、stale snapshot の ready-set がそのまま推薦される。

### (2) unmapped の理由が丸められ silent drop になる

`bd ready` 候補のうち manifest に対応 node が無いものは、すべて `reason: "parity_manifest_missing"` になる。しかし実体は 2 種類ある。

- `external_ref` を持たない bd 課題 (手起票などの graph 管理外) — 対処不要
- `external_ref` を持つのに manifest から落ちた課題 — graph 管理下の取りこぼしで sync 必要

さらに schedule-graph は C28 receipt の `ready_set` しか読まず、`unmapped` / `conflicts` を捨てている。結果として tracker 側で落ちた候補は最終 report から完全に消える。

## 現在の挙動

`eval-log/run-dev-graph-schedule-beads-ready.json` (2026-07-18 実行) では、unmapped 5 件がすべて `external_ref: null` かつ `reason: "parity_manifest_missing"` で並び、graph 管理外か取りこぼしかを判別できない。同 receipt を入力にした schedule report には unmapped 5 件の情報が現れない。

## 期待する挙動

- parity manifest は `generated_at` (RFC3339 UTC) と `source_graph_digest` (`sha256:<64 hex>`) を必須で持つ。
- C28 は由来を検証して receipt の `parity_provenance` へ載せ、欠落/形式違反は fail-closed で拒否する。
- C16 は `source_graph_digest` を graph の canonical digest と突合し、不一致なら stale として停止する。
- unmapped は `external_ref_absent` / `parity_manifest_missing` に分離され、`unmapped_summary` で件数が分かる。
- C28 の unmapped / conflicts は schedule report へ `source: "bd-bridge"` 付きで引き継がれる。

## 再現手順またはユースケース

1. `bd-bridge.py --op ready --parity-manifest <manifest>` を由来なしの manifest で実行する
2. receipt に snapshot の鮮度を判定できる情報が一切含まれない
3. graph へ node を 1 件追加してから同じ receipt を `schedule-graph.py --ready-json` へ渡す
4. 追加分を無視した ready-set が警告なく返る

## 影響と優先度

- 影響範囲: system (dev-graph の並列スケジューリング経路)
- 深刻度: medium
- 緊急度: 中 — 誤った ready 推薦は worktree の並列着手に直結し、気付きにくい。

## スコープ

- In: 由来必須化、canonical digest 突合による stale 停止、unmapped 理由分離と件数サマリ、C28 unmapped/conflicts の引き継ぎ、契約明記、回帰テスト
- Out: parity manifest 生成スクリプトの新設、graph への `beads_linkage` backfill、bd CLI 側の変更

## 関連グラフ

- 原因/親ノード: —
- 関連仕様: `plugins/dev-graph/references/execution-tracker-contract.md` §10
- 関連アーキテクチャ: arch-harness-hub-dev-workflow
- 解決タスク: —

## 受入条件

- [x] parity manifest が `generated_at` / `source_graph_digest` を欠く場合 C28 が fail-closed で拒否する
- [x] `source_graph_digest` が現 graph の canonical digest と一致しない場合 C16 schedule が停止する
- [x] unmapped が `external_ref_absent` / `parity_manifest_missing` に分離され `unmapped_summary` が receipt に載る
- [x] C28 の unmapped / conflicts が schedule report へ `source` 付きで引き継がれる
- [x] 回帰テストが `plugins/dev-graph/tests` に存在する

## 検証証跡

- コマンド/テスト: `python3 -m pytest plugins/dev-graph/tests -q`
- 証跡 path: `plugins/dev-graph/tests/test_parity_manifest_provenance.py`
