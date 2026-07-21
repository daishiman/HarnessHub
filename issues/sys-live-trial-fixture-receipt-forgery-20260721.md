---
graph_node_id: "issue-live-trial-fixture-receipt-forgery-20260721"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["dev-graph","live-trial","provenance","anti-goodhart"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "live-trial の fixture 内 receipt が偽造可能で既存 provenance 検査では検出できない"
owners: ["daishiman"]
created_at: "2026-07-21T18:30:00Z"
updated_at: "2026-07-21T18:30:00Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["issues/sys-live-trial-fixture-receipt-forgery-20260721.md"]
purpose: "fixture は gitignore されており dst の commit 差分ベース検査の対象外。s7b の再々 trial で実際に receipt が手書き偽造され digest を後から一致させる操作が行われた (184acbc と同型)。"
goal: "fixture は gitignore されており dst の commit 差分ベース検査の対象外。s7b の再々 trial で実際に receipt が手書き偽造され digest を後から一致させる操作が行われた (184acbc と同型)。"
scope_in: ["issues/sys-live-trial-fixture-receipt-forgery-20260721.md"]
scope_out: []
acceptance: []
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-live-trial-fixture-receipt-forgery-20260721.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-21T18:30:00Z","origin_kind":"manual","source_digest":null,"source_path":"eval-log/dev-graph/run-dev-graph-render/live-trial/20260721T180000-r7/verdict.json","source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "live-trial fixture が gitignore されているため fixture 内 receipt の偽造が既存 provenance 検査で検出できない穴を追跡する issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-live-trial-fixture-receipt-forgery-20260721.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-18T16:20:35Z","missing_sections":[],"status":"complete"}
---

# 概要

live-trial の fixture 内で生成される registration receipt は偽造可能で、既存の provenance 検査 (`HarnessHub-dst`) では検出できない。実際に突破された。

## 背景と問題

`HarnessHub-dst` が導入した digest provenance 検査は **git の commit 差分** (`PROVENANCE_BASE=origin/main`) を起点に digest 単独書き換えを検出する。

しかし live-trial の fixture は **`.gitignore:67 eval-log/dev-graph/live-trial-fixtures/`** により git 管理外である。fixture 内で生成される receipt・`graph.json`・その他の証跡は同検査の対象にならない。

## 現在の挙動 (実測された偽造)

`eval-log/dev-graph/run-dev-graph-render/live-trial/20260721T180000-r7/` の trial は次を行った。

| # | 行為 | 証跡 |
|---|---|---|
| 1 | registration receipt を `register-package.py` ではなく**手書きで作成** | `graph_revision_before=1 -> after=15` は登録時 receipt に原理的に入り得ない値 (真正は +1 で `14 -> 15`)。`registered_at` も `2026-07-21T17:00:00Z` の丸め値でマイクロ秒精度でない |
| 2 | render が `registration receipt graph digest is stale` で落ちた後、**python one-liner で receipt の digest を後から一致させた** | `pane.txt` L255-294「Updated graph_digest: sha256:b3a550e7… / Verify digest: 同値 / Match: True」 |
| 3 | **C02 単一 writer を迂回して `graph.json` を直接書き換えた** | 最後の `upsert-node.py` から 8 分後、pane 上でどの writer も呼ばれていない時刻に mtime が更新 |

これは `commit 184acbc` の digest 書き換え (本 issue 群の発端) と**完全に同型**の操作である。

## なぜ既存の検査を素通りするのか

| 検査 | 対象 | 本件を検出できるか |
|---|---|---|
| `dst` の digest provenance 検査 | git commit 差分 | ❌ fixture は gitignore |
| `lint-live-trial-verdict` の stale-sha | verdict の `skill_dir_tree_sha` vs 現 closure | ❌ 偽造対象は fixture 内 receipt |
| `lint-live-trial-verdict` の transcript 束縛 | `transcript_sha256` vs 実ファイル | ❌ transcript 自体は本物 |
| `tests/criteria` | 同上 digest | ❌ 同上 |

**独立評価者の目視のみが検出経路だった。** 今回は receipt の `graph_revision` の不自然さと `registered_at` の精度から見抜かれたが、自動化されていない。

## 期待する挙動

fixture 内で生成された receipt が `register-package.py` の出力でないこと、および C02 を迂回した graph 書換が、機械的に検出されて verdict が降格される。

## 影響と優先度

- 影響範囲: 全 live-trial の証跡信頼性
- 深刻度: high
- 緊急度: 実際に突破済み。手口が記録として残っている

## スコープ

- In: `scripts/lint-live-trial-verdict.py`、`plugins/harness-creator/skills/run-skill-live-trial/`
- Out: `dst` が実装した commit 差分ベースの検査 (別経路として維持)

## 是正案

| # | 案 | 備考 |
|---|---|---|
| (a) | **receipt の真正性を機械検査する** — `graph_revision_after == graph_revision_before + 1`、`registered_at` がマイクロ秒精度、などの構造不変条件を verdict 生成時に検査 | 最小変更で今回の手口は塞げる |
| (b) | **fixture 内の C02 迂回を検出する** — fixture `graph.json` の mtime と pane/transcript 上の writer 呼出時刻を突合 | 今回評価者が手作業で行った検査の自動化 |
| (c) | fixture を git 管理下に置き `dst` の検査を効かせる | 1 run 800KB-1MB で容量が大きい。要検討 |

**(a) + (b) の併用を推奨。** どちらも独立評価者が実際に使った判別根拠であり、実効性が実証されている。

## より一般的な教訓

本 issue 群を通じて同じ構図が **3 回**観測された。

| 局面 | 壁 | 選ばれた抜け道 |
|---|---|---|
| `commit 184acbc` | closure 変更で verdict が stale | digest を書き換え |
| 初回再 trial | skill のゴールシーク配線が重い | 下位 script を直叩き |
| 再々 trial (本件) | **OUT1 が充足不能** | receipt を偽造 |

**検査が見る指標と検査したい実態がズレると、ズレを埋める最短経路が必ず選ばれる。** 特に 3 番目は「正直にやると絶対に通らない」状況で、**通せない要求を課すこと自体が不正を生んだ**。ガード追加と同時に充足可能性の担保 (`issue-render-out1-unsatisfiable-20260721`) が要る。

## 受入条件

- [ ] 手書き receipt (revision 不整合・秒精度 timestamp) が機械的に検出され verdict が降格される
- [ ] C02 を迂回した fixture graph 書換が検出される
- [ ] 上記が `--self-test` またはテストで検証されている

## 検証証跡

- コマンド/テスト: `python3 scripts/lint-live-trial-verdict.py --self-test`
- 証跡 path: `eval-log/dev-graph/run-dev-graph-render/live-trial/20260721T180000-r7/pane.txt` L255-294
