---
graph_node_id: "issue-run-dev-graph-schedule-parity-manifest-recovery-20260724"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "tooling"
tags: ["dev-graph","schedule","parity-manifest","c03","c16","c28"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "run-dev-graph-schedule が parity manifest を再生成できず ready-set が空になる"
owners: ["daishiman"]
created_at: "2026-07-24T09:23:39Z"
updated_at: "2026-07-24T09:28:14.113001Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["plugins/dev-graph/skills/run-dev-graph-schedule/","plugins/dev-graph/skills/run-dev-graph-sync/","plugins/dev-graph/scripts/bd-bridge.py","plugins/dev-graph/scripts/schedule-graph.py","plugins/dev-graph/scripts/sync-graph.py","plugins/dev-graph/tests/"]
purpose: "run-dev-graph-schedule の自動選定で、Beads ready 候補が存在しても parity manifest に node が無いと C28 が parity_manifest_missing へ分類し、C16 の ready-set が空になる。SKILL.md は C03 sync で manifest を再生成すると案内するが、sync-graph.py と run-dev-graph-sync に manifest 生成出力がなく、通常経路だけでは自己回復できない。"
goal: "schedule の通常経路が現行 graph から provenance 付き parity manifest を決定論的に生成し、正しく linkage 済みの Beads ready node を silent drop せず推薦できる状態"
scope_in: ["canonical graph から parity manifest を生成する単一の正規経路を C03 または schedule 前処理へ実装","graph_node_id / bd_issue_id / graph_status / depends_on と generated_at / source_graph_digest の完全生成","run-dev-graph-schedule が毎回 fresh manifest を生成して C28 ready → C16 schedule へ渡す配線","missing / stale / 正常 manifest の回帰テストと recovery 手順の正本化"]
scope_out: ["parity_provenance の fail-closed 要件を緩める","source_graph_digest だけを現在値へ書き換える","draft status の写像問題 (HarnessHub-57v)","merge 後 lifecycle 投影 (HarnessHub-vy0)","package-contract.json 被覆 (HarnessHub-dbb)"]
acceptance: ["Beads に ready な linkage 済み schedulable node が 1 件以上ある fixture で、通常の schedule 実行が空でない ready_set を返す","正しく linkage 済みの node が parity_manifest_missing に分類されない","manifest は generated_at / source_graph_digest と全対象 node の graph_node_id / bd_issue_id / graph_status / depends_on を持つ","stale manifest は停止または正規再生成され、digest 手書き更新では回復しない","C03 / C16 / C28 の責務と実コマンドが SKILL.md・契約・実装で一致する"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/run-dev-graph-schedule-parity-manifest-recovery-20260724.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-24T09:23:39Z","origin_kind":"manual","source_digest":"6f6563a5205fc63a6a8f071d632307222853be988ac40ed51bf33b2b71c79085","source_path":"plugins/dev-graph/skills/run-dev-graph-schedule/SKILL.md","source_plugin":"dev-graph","source_version":"0.1.0"}
classification_confidence: 0.98
classification_reason: "C03/C16/C28 間の parity manifest 生成責務が実装上欠落し、schedule の自動選定が empty ready-set になる再現可能な dev-graph tooling issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/run-dev-graph-schedule-parity-manifest-recovery-20260724.md","confidence":0.98}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-i07","linked_at":"2026-07-24T09:27:21Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-24T09:23:39Z","missing_sections":[],"status":"complete"}
---

# 概要

Beads に着手可能な dev-graph node が存在しても、schedule 用 parity manifest にその node が無いと、C28 は `parity_manifest_missing` へ分類し、C16 は候補として採用しない。この結果、`run-dev-graph-schedule` の自動選定が空になる。

## 背景と問題

`run-dev-graph-schedule/SKILL.md` は、manifest が stale / 欠落なら `run-dev-graph-sync` (C03) で作り直すと案内している。しかし `run-dev-graph-sync/SKILL.md` と `sync-graph.py` には parity manifest の生成・出力契約がなく、リポジトリ内検索でも生成実装は見つからない。C28 の分類と C16 の fail-closed 動作は契約どおりだが、正常系の manifest 生成 owner が実装されていないため自己回復できない。

## 現在の挙動

1. `bd ready` には `external_ref=dev-graph:<node>` を持つ候補がある。
2. parity manifest に対応 node が無い。
3. C28 receipt の `unmapped` が `reason=parity_manifest_missing` になる。
4. C16 は unmapped をレポートへ引き継ぐが ready candidate にせず、推薦が空になる。

## 期待する挙動

schedule の平常経路が現行 graph から fresh な provenance 付き manifest を自動生成し、正しく linkage 済みの Beads ready node を C28 parity 確認後に C16 へ渡す。欠落・stale は黙って通さず、正規の再生成手順で回復する。

## 影響と優先度

- 影響範囲: dev-graph の次タスク自動選定、複数 worktree の並列スケジュール
- 深刻度: medium — 誤ったタスクを選ぶより安全だが、ready work があるのに『なし』と見える silent starvation が起きる
- 緊急度: scheduler を通常運用へ使う前に回復経路を実装する必要がある

## スコープ

- In: parity manifest generator、C03/C16/C28 配線、回帰テスト、契約同期
- Out: provenance 検査の緩和、digest forgery、draft status 写像、merge lifecycle、package contract 被覆

## 関連グラフ

- C03: `run-dev-graph-sync`
- C16: `schedule-graph.py`
- C28: `bd-bridge.py --op ready`
- 近接だが別問題: HarnessHub-57v / HarnessHub-vy0 / HarnessHub-dbb

## 受入条件

- [ ] linkage 済み Beads ready node を含む fixture で schedule の ready-set が空にならない
- [ ] 正しく linkage 済み node の `parity_manifest_missing` が 0 件
- [ ] manifest の provenance と node/edge exact-set が current graph と一致
- [ ] stale / missing manifest の回復が正規再生成で成立
- [ ] SKILL.md・契約・実装・テストの責務記述が一致

## 検証証跡

- `plugins/dev-graph/tests/test_parity_manifest_provenance.py`
- schedule skill の live-trial で、C28 ready receipt と C16 ready-set の候補数が一致すること
