---
graph_node_id: "issue-sync-legacy-linkage-20260723"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["sync","beads","follow-up","pending-retry"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "sync pending_retry 20件 (external_linkage_missing) の legacy 収束"
owners: ["daishiman"]
created_at: "2026-07-23T08:30:00Z"
updated_at: "2026-07-23T12:13:21Z"
status: "closed"
depends_on: []
related_nodes: ["feat-dev-pipeline-improvement"]
resource_scope: ["issues/sys-sync-legacy-linkage-20260723.md"]
purpose: "2026-07-23 の /dev-graph sync (feat-mvp-first-scheduling 投影) で、main から引き継いだ pending_retry 20 件 (tracker_binding=beads だが beads_linkage 未設定) が残存したため、所有 feature 側での収束を追跡する"
goal: "SYS-DEV-PIPELINE-IMPROVEMENT-P01..P13 (bd 実在は P13=HarnessHub-k2u.13 in_progress のみ) と issue node 7 件について、C28 projection または linkage 書き戻しが完了し、sync dry-run の pending_retry が 0 件になっている"
scope_in: ["SYS-DEV-PIPELINE-IMPROVEMENT-P01..P13 の linkage 収束","issue node 7 件 (issue-render-out1-unsatisfiable-20260721 ほか) の linkage 収束","sync dry-run での pending_retry=0 確認"]
scope_out: ["進行中 HarnessHub-k2u.13 の状態変更","feat-mvp-first-scheduling 系 14 node (収束済み)"]
acceptance: ["sync --dry-run の pending_retry から external_linkage_missing が 0 件になる","既存 in_progress issue へ干渉していない"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-sync-legacy-linkage-20260723.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-23T08:30:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "2026-07-23 sync 実行の残存 pending_retry 20 件を追跡する follow-up issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-sync-legacy-linkage-20260723.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-6a1","linked_at":"2026-07-23T08:35:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-07-23T12:13:21Z","evidence_refs":["eval-log/run-dev-graph-sync-execution.json","eval-log/dev-graph/sync-legacy-linkage-open-residue.json","eval-log/dev-graph/run-dev-graph-sync/live-trial/20260723T114338Z-wt1r1/verdict.json","plugins/dev-graph/tests/test_sync_render_schedule_v2.py","plugins/dev-graph/tests/test_c27_c28_projection_contract.py"],"policy":"manual","reconciled_at":"2026-07-23T12:13:21Z","source":"reconciliation","status":"done"}
implementation_readiness: {"checked_at":"2026-07-23T08:30:00Z","missing_sections":[],"status":"complete"}
---

# 概要

2026-07-23 の `/dev-graph sync` で検出した `external_linkage_missing` 20件を、既存 Beads 課題へ一意に対応付けて収束した。

## 背景と問題

`SYS-DEV-PIPELINE-IMPROVEMENT-P01..P13` と既存 issue 7件は `tracker_binding=beads` だったが、`beads_linkage` が未設定だった。そのため同期のたびに20件が `pending_retry` へ残り、依存グラフの完了状態を Beads から取り込めなかった。

あわせて、Beads の issue 応答が `dependencies: null` を返す場合に `sync-graph.py` が反復処理で停止する不具合が判明した。

## 修正後の挙動

- 20 node すべてを既存 Beads ID へ一意にリンクした。
- `dependencies: null` を「依存なし」として正規化し、非 list 値は fail-closed（不正入力として停止）にした。
- Beads で完了済みの13 nodeを graphへ取り込み、completion evidence（完了証跡）を補完した。
- 進行中の `SYS-DEV-PIPELINE-IMPROVEMENT-P13` / `HarnessHub-k2u.13` は変更していない。
- 最終 sync dry-run は imports / exports / conflicts / pending_retry がすべて0、`converged=true`、write count 0となった。

## 再現・検証手順

1. C02 upsert を20件すべて dry-runし、write count 0を確認する。
2. 同じ入力を本実行して linkage を登録する。
3. `/dev-graph sync` の dry-run → apply → 確認 dry-runを実行する。
4. 完了済み13 nodeの completion evidence を C02で補完する。
5. `lint-open-residue.py` と graph schema validatorを実行する。
6. 現行挙動閉包で `run-dev-graph-sync` の live trialを再実行する。

## 影響と優先度

- 影響範囲: dev-graph と Beads の同期、ready 判定、完了状態の可視化
- 深刻度: medium
- 緊急度: `pending_retry` の常時残留が正しい着手候補計算を妨げるため、今回の運用内で収束

## スコープ

- In: P01〜P13とissue 7件の linkage、null dependenciesの正規化、完了済み13件の close-loop証跡
- Out: 進行中 `HarnessHub-k2u.13` の状態変更、無関係な Beads 課題の変更

## 関連グラフ

- 原因/親ノード: `feat-dev-pipeline-improvement`
- 解決課題: `issue-sync-legacy-linkage-20260723`
- 関連実装: `plugins/dev-graph/scripts/sync-graph.py`

## 受入条件

- [x] `external_linkage_missing` 20件が既存 Beads 課題へ一意に対応付いた
- [x] 進行中 `HarnessHub-k2u.13` の状態を変更していない
- [x] sync確認 dry-runで `pending_retry=[]`、`changes=0`、`converged=true`
- [x] close-loop residueが13件から0件へ減少した
- [x] graph schema violations 0
- [x] dev-graph全テスト 393件 PASS
- [x] sync live trialとfresh evaluator PASS

## 検証証跡

- 同期 receipt: `eval-log/run-dev-graph-sync-execution.json`
- close-loop lint: `eval-log/dev-graph/sync-legacy-linkage-open-residue.json`
- live verdict: `eval-log/dev-graph/run-dev-graph-sync/live-trial/20260723T114338Z-wt1r1/verdict.json`
- 回帰テスト: `plugins/dev-graph/tests/test_sync_render_schedule_v2.py`
- linkage入力: `.dev-graph/cache/c02-linkage/`
- completion入力: `.dev-graph/cache/c02-completion/`
