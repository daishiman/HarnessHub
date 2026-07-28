---
graph_node_id: "issue-devgraph-graph-gc-bd-close-propagation-20260726"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","dev-graph","beads","parity","governance"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "graph node の GC 削除が bd issue へ伝播せず orphan external_ref を生み続ける"
owners: ["daishiman"]
created_at: "2026-07-26T00:00:00Z"
updated_at: "2026-07-28T02:23:00Z"
status: "draft"
depends_on: []
related_nodes: ["issue-bd-external-ref-orphan-nodes-20260725"]
resource_scope: [".dev-graph/state/graph.json","plugins/dev-graph/scripts/","plugins/dev-graph/tests/","issues/"]
purpose: "C28 create 側の穴 (HarnessHub-mfh7 で修正済み) を塞いでも、graph から node を消す経路が bd を放置する限り orphan は増え続ける。参照整合を『作るとき』だけでなく『消すとき』にも守り、unmapped の警告を信号として保つ"
goal: "graph node の削除時に、その node を external_ref に持つ非クローズ bd issue が必ず検出され、終了させるか参照を剥がすかの判断が強制される状態"
mvp_alignment: null
scope_in: ["stale GC を含む graph node 削除経路の全数特定 (commit 84c8076 の GC を起点に洗い出す)","削除対象 node を external_ref に持つ非クローズ bd issue を書込前に検出する fail-closed ゲートの追加","検出時の処分 (bd 側終了 / 参照剥がし / 削除中止) の exact-set 定義と receipt への記録","回帰テストの追加"]
scope_out: ["21 件の既存 orphan の個別処分 (issue-orphan-external-ref-backlog-disposition-20260726 の担当)","検出した bd issue を自動で閉じる実装 (中身を読まずに終わらせるのは silent drop と同型のため禁止)"]
acceptance: ["graph node 削除経路が全数特定され一覧化されている","非クローズ bd issue から参照されている node の削除が、既定で拒否されるか明示的な処分指定を要求する","--op orphan-audit を GC 実行の前後で走らせ、非クローズ orphan が増えないことがテストで固定されている","commit 84c8076 の GC が消した node の実測と、それが生んだ orphan の対応が記録されている"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-devgraph-graph-gc-bd-close-propagation-20260726.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-26T00:00:00Z","origin_kind":"generated","source_digest":"43336931b9d84c400dc5782da751ef86682e031b5169643c25778584c065cd86","source_path":"system-spec/dev-workflow.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.9
classification_reason: "HarnessHub-mfh7 の orphan 棚卸しで特定した発生経路 P2。C28 create 側の P1 とは独立に orphan を生む別経路であり、修正範囲も C28 ではなく graph 削除経路側"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-devgraph-graph-gc-bd-close-propagation-20260726.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-ii90","linked_at":"2026-07-26T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-26T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

`.dev-graph/state/graph.json` から node を削除する経路が、その node を
`external_ref: dev-graph:<id>` で参照している bd issue を放置する。結果として
参照が宙に浮いた状態 (dangling reference) が削除のたびに増える。

親 issue `issue-bd-external-ref-orphan-nodes-20260725` (HarnessHub-mfh7) の棚卸しで
特定した発生経路 **P2** である。

## 根拠

commit `84c8076` の stale GC が `graph.json` から node を削除した一方、対応する
bd issue は `open` のまま残った。graph → bd の削除伝播経路が実装上どこにも存在しない。

2026-07-26 時点の実測では、非クローズ orphan 30 件のうち 21 件が
「どの ref の graph にも `issues/` にも実体が無い」系統に分類され、その相当数が
この経路の由来と考えられる。

## P1 との違い

| | P1 (修正済み) | P2 (本 issue) |
|---|---|---|
| 経路 | `bd-bridge.py --op create` が node 実在を検証していなかった | graph からの node 削除が bd へ伝播しない |
| 向き | bd を作るとき graph を見ていない | graph を消すとき bd を見ていない |
| 修正 | HarnessHub-mfh7 で `_require_registered_nodes()` を追加し fail-closed 化 | 未着手 |

P1 を塞いでも P2 は独立に orphan を生み続ける。**流入は 2 本あり、止めたのは片方だけ**である。

## 対処方針

1. graph node を削除しうる経路を全数洗い出す (stale GC、手動 patch、lifecycle apply 等)。
2. 削除の**書込前**に、対象 node を参照する非クローズ bd issue を検出する fail-closed ゲートを置く。
   検出時は既定で削除を拒否し、明示的な処分指定を要求する。
3. 処分の exact-set を定義し receipt に記録する。**自動で bd 側を終了させてはならない** —
   中身を読まずに未解決課題を消すのは、親 issue が `scope_out` で禁じた silent drop と同型である。

## 検証

```bash
python3 plugins/dev-graph/scripts/bd-bridge.py --op orphan-audit --repo-root .
```

GC 実行の前後でこれを走らせ、`orphan_summary.non_closed` が増えないことを回帰テストで固定する。

## 完了記録 (2026-07-28)

### 削除経路の全数棚卸し

現行の graph writer と削除相当経路を実装まで確認した。

| 経路 | node 物理削除 | 現行の扱い |
|---|---:|---|
| `upsert-node.py` (C02) | なし | 1 node の add/update のみ |
| `register-package.py` | なし | exact-13 package の add/update のみ |
| `sync-graph.py` | なし | remote close/delete を `closed` / `tombstoned` へ論理遷移し、receipt も `physical_delete=false` |
| `reconcile-github-lifecycle.py` | なし | C02 lifecycle request による status/completion 更新 |
| `build-graph-store.py` | なし | graph が無い場合だけ空 store を作成し、既存 store は byte-for-byte 保持 |
| Write/Edit、shell、interpreter の直接変更 | 禁止 | C10 `guard-graph-schema.py` が graph authority 迂回を静的に拒否 |
| Git 差分による手動 GC / merge / patch | あり得る | commit `84c8076` の stale GC が使った唯一の物理削除経路。今回の removal preflight の対象 |

つまり、sanctioned writer（正規の書込処理）はすでに物理削除を持たず、削除は Git 差分として
持ち込まれる手動 GC だけだった。そこで `bd-bridge.py --op removal-preflight` を追加し、
before/after graph の node ID 差分と共有 Beads DB の全 `dev-graph:` 参照を、書込なしで突合する。

### fail-closed 契約

物理削除 node ごとに disposition manifest の指定を必須とした。exact-set は次の 3 つ。

| disposition | 意味 | preflight が確認する実状態 |
|---|---|---|
| `cancel_deletion` | node を残して削除を中止 | after graph に node が戻っていること。消えたままなら拒否 |
| `close_issue_first` | 人が issue 内容を確認して先に終了 | 宣言した全 `bd_issue_ids` が実参照と exact match し、全件 `closed` |
| `detach_external_ref_first` | graph 管理外と判断して先に参照を外す | 当該 node を指す Beads external_ref が 0 件 |

bridge 自身は issue の close も external_ref の剥離も行わない。manifest は人の判断を記録するが、
文字列を指定しただけでは通らず、Beads の現在状態が既に選択どおり収束した場合だけ許可する。
各 removed node の参照・非クローズ参照・判断理由・検証結果と、
削除前後の `orphan_audit.before_non_closed / after_non_closed /
new_non_closed_bd_issue_ids` を receipt に残す。非クローズ orphan が 1 件でも増えれば
disposition とは独立に拒否し、exit 2 / `write_count=0` で停止する。

通常の作業ツリー検証:

```bash
python3 plugins/dev-graph/scripts/bd-bridge.py \
  --op removal-preflight --repo-root . --before-ref HEAD
```

本変更では `before_node_count=339 / after_node_count=362 /
removed_node_count=0 / allowed=true / write_count=0`。
非クローズ orphan は before 22 → after 1 で、新規増加は 0 件だった。

### commit `84c8076` の再現

実コミットの親と適用後 graph を直接比較した。

```bash
python3 plugins/dev-graph/scripts/bd-bridge.py \
  --op removal-preflight --repo-root . \
  --before-ref '84c8076^' --after-ref 84c8076
```

実測は `before_node_count=283 / after_node_count=279` で、次の 4 node が物理削除されていた。

| removed graph node | Beads issue | 現在 status | preflight 判定 |
|---|---|---|---|
| `issue-hub-cwv-tbt-over-budget-20260724` | `HarnessHub-aqi` | `in_progress` | `disposition_missing` + `non_closed_orphan_increase` |
| `issue-promoted-plan-validator-version-drift-20260724` | `HarnessHub-4q8` | `closed` | `disposition_missing` |
| `issue-run-dev-graph-schedule-parity-manifest-recovery-20260724` | `HarnessHub-i07` | `closed` | `disposition_missing` |
| `issue-shared-layers-gate-table-stale-20260724` | `HarnessHub-dxy` | `closed` | `disposition_missing` |

削除前後の非クローズ orphan は **44 → 45**、新規増加は
`HarnessHub-aqi` の 1 件だったため `allowed=false / exit 2 / write_count=0`。
親 issue で推定していた P2 を、削除 node と Beads issue の実 ID まで対応づけて再現できた。
`HarnessHub-aqi` の node は後続作業ですでに復元され、現行 graph には実在する。

### 回帰テスト

`test_bd_bridge_node_removal_preflight.py` で次を固定した。

- 非クローズ参照がある削除は `close_issue_first` を書くだけでは通らない
- closed 実状態と exact issue ID が揃った `close_issue_first` は通る
- external_ref が実際に 0 件になった `detach_external_ref_first` は通る
- 処分未指定、未完の `cancel_deletion`、issue ID 不一致は拒否する
- node 削除なしの add/update は manifest 無しで冪等に通る
- disposition 語彙が上記 3 件の exact-set である

### 品質ゲートの現在値

決定論テストは removal preflight、orphan audit、update passthrough を合わせて
`53 passed`、C14 provenance の対象 2 件も `2 passed`。
live 証跡検査を除く全 dev-graph suite は
`581 passed / 2 skipped / 1 failed` だった。失敗は本変更ロジックではなく
`test_denial_latency_does_not_depend_on_the_repository_graph` の 1 秒性能境界で、
guard は毎回正しく exit 2 で遮断したが、並列 vitest 稼働中の load average 144.47 で
Python 起動が 1.64 秒だった。単独再実行も 1.31 秒、5 回実測は
0.85〜2.07 秒と負荷に応じて揺れ、機能的な fail-open は 0 回だった。
一方、`bd-bridge.py` は C02/C03/C14/C15 の挙動閉包に含まれるため、増分 planner は
C02 node と C03 sync の live-trial 再実走を要求した。両方とも Skill の起動
(`launch=PASS`) 後、外部 Claude Code が使用上限
「2026-07-31 17:00 Asia/Tokyo に reset」で停止し、完了成果物を作れなかった。
証跡は `20260728T015300Z-ii90-current` に `completion=FAIL` として保存し、
古い PASS receipt を新挙動へ流用していない。

`test_skill_criteria_evidence.py` は `17 passed / 4 failed`。4 件は
C02/C03/C14/C15 の stale behavior closure digest で、上記 live-trial 未完了と同じ未達を
別の gate が正しく検出した結果である。

このため実装受け入れ条件の機械テストは満たすが、plugin 全体の live 品質ゲートは未完了である。
使用枠復旧後に C02/C03 を再実走し、planner を再計算して C14/C15 も fresh PASS へ更新するまで、
Beads issue `HarnessHub-ii90` は `in_progress` を維持する。
