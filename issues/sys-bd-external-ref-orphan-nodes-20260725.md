---
graph_node_id: "issue-bd-external-ref-orphan-nodes-20260725"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","dev-graph","beads","parity","governance"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "bd issue 74 件の external_ref が graph に存在しない node を指し、うち 22 件が C28 で parity_manifest_missing に落ちる"
owners: ["daishiman"]
created_at: "2026-07-25T02:57:00Z"
updated_at: "2026-07-28T02:18:00Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: [".dev-graph/state/graph.json","plugins/dev-graph/scripts/bd-bridge.py","plugins/dev-graph/scripts/build-parity-manifest.py","issues/"]
purpose: "graph 側に実体の無い external_ref が大量に残っていると、C28 の unmapped が恒常的に膨らみ「取りこぼしが 22 件ある」という警告が常態化して読まれなくなる。参照の実体を回復し、警告を信号として使える状態に戻す"
goal: "非クローズの orphan external_ref が 0 件になり、C28 の unmapped_summary.parity_manifest_missing が実際の取りこぼしだけを指す状態"
mvp_alignment: null
scope_in: ["bd export と graph.json を突合し orphan external_ref を全数棚卸しする","非クローズ 39 件を 3 系統に仕分ける: (a) graph node を C02 で復元すべきもの、(b) external_ref を実在 node へ張り替えるべきもの、(c) bd 側を close すべきもの","feature package 系 14 件 (feat-task-spec-test-strategy + SYS-TASK-SPEC-TEST-STRATEGY-P01..P13) は package 単位で扱う","orphan を作った経路 (bd create が先行し node 登録が漏れる等) の特定"]
scope_out: ["closed 済み 35 件の遡及復元 (履歴証跡であり、可視化されないため実害が無い)","C28 側で orphan を黙って除外する変更 (silent drop になるため禁止)"]
acceptance: ["bd export × graph.json の突合で、status が closed 以外の orphan external_ref が 0 件","`bd-bridge.py --op ready --parity-manifest <manifest>` の unmapped_summary.parity_manifest_missing が棚卸し後の期待値と一致し、根拠が記録されている","3 系統の仕分け結果と判断理由が本 issue または派生 issue に残っている","orphan の発生経路が特定され、修正または派生 issue が起票されている"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-bd-external-ref-orphan-nodes-20260725.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-25T02:57:00Z","origin_kind":"generated","source_digest":"43336931b9d84c400dc5782da751ef86682e031b5169643c25778584c065cd86","source_path":"system-spec/dev-workflow.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.9
classification_reason: "HarnessHub-57v (C28 draft status) の検証で C28 ready を実行した際、conflicts=0 になった一方で unmapped が 31 件残り、その内訳調査で判明した独立の既存ドリフト"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-bd-external-ref-orphan-nodes-20260725.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-mfh7","linked_at":"2026-07-25T02:59:53Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-25T02:57:00Z","missing_sections":[],"status":"complete"}
---

# 概要

多数の bd issue が `external_ref: dev-graph:<node-id>` を持つのに、その `<node-id>` が `.dev-graph/state/graph.json` に存在しない。参照が宙に浮いた状態 (dangling reference) である。

## 実測 (2026-07-25)

`bd export --format jsonl` (475 行) と graph の node 集合 (280 件) を突合した結果:

| 指標 | 実測値 |
|---|---|
| orphan external_ref 合計 | **74** |
| うち closed | 35 |
| うち open | 34 |
| うち in_progress | 5 |
| **非クローズ小計** | **39** |

非クローズ 39 件の内訳:

| 系統 | 件数 | 内容 |
|---|---|---|
| feature package 系 | 14 | `feat-task-spec-test-strategy` (epic) + `SYS-TASK-SPEC-TEST-STRATEGY-P01..P13` |
| 単発 issue 系 | 25 | `issue-*-2026MMDD` 形式 |

## C28 から見える影響

```bash
python3 plugins/dev-graph/scripts/build-parity-manifest.py --repo-root . \
  --out eval-log/dev-graph/run-dev-graph-schedule/parity-manifest.json
python3 plugins/dev-graph/scripts/bd-bridge.py --op ready --repo-root . \
  --parity-manifest eval-log/dev-graph/run-dev-graph-schedule/parity-manifest.json
```

実測 (2026-07-25T02:56Z):

```json
{"ready_set": 8, "conflicts": 0, "unmapped": 31,
 "unmapped_summary": {"external_ref_absent": 9, "parity_manifest_missing": 22}}
```

`parity_manifest_missing` **22 件**が本 issue の対象。これは「`bd ready` 候補になった orphan」だけの数で、全数 74 件のうち候補集合に入ってきた分である。

`external_ref_absent` 9 件は別事象 (graph 管理外の bd 課題) で、execution-tracker-contract §10 のとおり対処不要。

## なぜ放置できないか

`parity_manifest_missing` は本来「graph 管理下なのに manifest から取りこぼした」= **manifest 生成側の異常**を指す札である。実体の無い参照が 22 件も常駐すると、この札が恒常的に立ち続け、本物の取りこぼしが発生しても区別できない。警告の意味が摩耗する。

## 本変更 (HarnessHub-57v) との関係

無関係。57v は `draft` status の写像欠落を直したもので、`conflicts` は 0 になった。`unmapped` の 31 件は **57v の前から存在する独立のドリフト**であり、57v の検証中に可視化されただけである。

## 対処方針

非クローズ 39 件を 3 系統へ仕分ける。

1. **node を復元すべきもの** — `issues/sys-*.md` 実体があるのに graph 未登録なら C02 (`upsert-node.py`) で登録する。
2. **参照を張り替えるべきもの** — node がリネーム/統合されていれば `external_ref` を実在 node へ更新する。
3. **bd 側を閉じるべきもの** — 課題自体が失効しているなら `bd-bridge.py --op close` で閉じる。

並行して、**なぜ orphan が生まれたか**を特定する。`--op create` は `--graph-node-id` を必須にしているため、node 未登録のまま bd issue だけが作られる経路が存在するはずで、そこを塞がないと再発する。

## 再現コマンド

初版に載せていた再現コマンドは `g['nodes'].keys()` を使っていたが、現行 schema の `nodes` は
dict ではなく **list** であり `AttributeError` で動かない。棚卸しは専用 op に置き換えた。

```bash
# 正: 棚卸しは C28 の専用 op で行う (2026-07-26 以降)
python3 plugins/dev-graph/scripts/bd-bridge.py --op orphan-audit --repo-root .
```

---

## 棚卸しの実測ログ (別ファイル)

2026-07-26 以降の棚卸し結果・仕分け・発生経路の特定・完了確認は、時系列の実測ログとして次へ分離した。

- `issues/sys-bd-external-ref-orphan-nodes-20260725-log.md`

分離は**レイアウトのみ**で、内容の改変・要約・削除はしていない。監査証跡としては本ファイル → ログファイルの順に続けて読むこと。
