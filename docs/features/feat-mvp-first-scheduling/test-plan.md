---
status: confirmed
layer: feature-design
task: SYS-MVP-FIRST-SCHEDULING-P04
parent_feature: feat-mvp-first-scheduling
feature_package_id: feature-package/feat-mvp-first-scheduling
design: docs/features/feat-mvp-first-scheduling/design.md
design_review: docs/features/feat-mvp-first-scheduling/design-review.md
architecture_refs: [arch-harness-hub-dev-workflow]
---

# feat-mvp-first-scheduling テスト計画 (P04)

> **位置づけ**: P05 が実装対象とし、P06 が実行し、P07/P10 が「実行済み証跡のみ」で判定するテスト ID の正本 (trace rule)。全テストは決定論 (時刻・乱数・外部ネットワーク非依存) で、`plugins/dev-graph/tests/` の既存様式 (pytest + tmp_path fixture + module loader) に従う。

## 0. テストファイルと実行コマンド

| ファイル (P05 write scope) | 担当カテゴリ |
|---|---|
| `plugins/dev-graph/tests/test_schedule_graph_mvp_first.py` | C1 (ソート)・C2 (冪等)・C3 (後方互換)・C4 (receipt) |
| `plugins/dev-graph/tests/test_bd_bridge_mvp_ready_order.py` | C1 (bd-bridge 順序整合・rank 定数同一性) |
| `plugins/dev-graph/tests/test_graph_node_mvp_schema_registration.py` | C5 (schema 登録検証) |

P06 実行コマンド (evidence は `eval-log/dev-graph/mvp-first-scheduling/test-run-p06.json` へ記録):

```bash
python3 -m pytest plugins/dev-graph/tests/test_schedule_graph_mvp_first.py \
  plugins/dev-graph/tests/test_bd_bridge_mvp_ready_order.py \
  plugins/dev-graph/tests/test_graph_node_mvp_schema_registration.py -v
python3 -m pytest plugins/dev-graph/tests/ -v   # C6 (qa-066 非退行, AC-5)
```

## 1. カテゴリ C1 — MVP-first ソート (AC-1)

| ID | 入力 | 期待結果 |
|---|---|---|
| TC-MVP-SORT-01 | ready な task 4 件: mvp_fit=deferred / 未設定 / enabling / direct (node_id は rank 逆順に命名し辞書順では deferred が先に来る配置) | candidates 順序が direct → enabling → 未設定 → deferred (rank 0→1→2→3)。node_id 辞書順が rank を上書きしない |
| TC-MVP-SORT-02 | 同 rank (direct) の task 3 件 | rank 同点は node_id 辞書順で tie-break (design §3 INV-1) |
| TC-MVP-SORT-03 | mvp_alignment 付き feature node と task node の混在 | features batch の並びにも同じ MVP_FIT_RANK が適用される (design §2 適用対象) |
| TC-MVP-SORT-04 | mvp_fit="urgent" (enum 外の非 null) を持つ task | schedule-graph が ContractError で plan 全体を fail (exit 非 0)。rank 2 への silent fallback をしない (design §3 fail-closed) |
| TC-MVP-SORT-05 | mvp_alignment=文字列 (dict/null 以外の型) を持つ task | 同上 ContractError (design §3 fail-closed) |

bd-bridge 側 (SI-3 整合):

| ID | 入力 | 期待結果 |
|---|---|---|
| TC-MVP-BRIDGE-01 | parity manifest nodes[] に mvp_fit 付き 4 行 (deferred/なし/enabling/direct) | ready_set が (MVP_FIT_RANK, external_ref) 順にソートされて返る (design §4) |
| TC-MVP-BRIDGE-02 | mvp_fit キー無し / null の行 | 未設定 rank (2) へ fallback し ContractError にならない (tolerant 契約) |
| TC-MVP-BRIDGE-03 | mvp_fit="invalid" の行 1 件 + 正常行 2 件 | 不正行のみ per-candidate ContractError として conflicts[] へ転記され ready_set から除外。正常 2 行は返る (design §4 fail-closed) |
| TC-MVP-BRIDGE-04 | schedule-graph.py と bd-bridge.py の MVP_FIT_RANK 定数を両 module から import | 完全一致 (F-6: `_common.py` が write scope 外のため定数二重定義をテストで固定) |

## 2. カテゴリ C2 — 冪等性 (AC-2)

| ID | 入力 | 期待結果 |
|---|---|---|
| TC-MVP-IDEM-01 | TC-MVP-SORT-01 と同一の graph 入力で schedule を 2 回実行 | batches・全 batch 内順序・selection_receipt (order_index 含む) が byte 一致相当で完全一致 (design §3 INV-1) |

## 3. カテゴリ C3 — 後方互換 (MVP metadata 未設定 node の fallback)

| ID | 入力 | 期待結果 |
|---|---|---|
| TC-MVP-COMPAT-01 | 全 node が mvp_alignment 未設定 (現行資産と同型) の graph | candidates 順序が現行実装 (node_id 辞書順) と完全一致 (design §3 INV-3: 既存挙動から劣化しない) |
| TC-MVP-COMPAT-02 | 同上入力の plan JSON 出力 | 既存キー (batches / read-only 検査結果等) の構造・値が不変。selection_receipt は additive 追加のみ (design §6) |

## 4. カテゴリ C4 — 選定 receipt 出力 (AC-4)

| ID | 入力 | 期待結果 |
|---|---|---|
| TC-MVP-RCPT-01 | mvp_alignment 完備の task 混在入力 | entries に purpose/background/rationale が逐語転写され、order_index は features/tasks 分割前の混在通し番号 (0 始まり・欠番なし)、各 entry に artifact_kind を含む (design §6) |
| TC-MVP-RCPT-02 | mvp_alignment 未設定 node を含む入力 | 当該 entry は mvp_fit/purpose/background/rationale = null・sort_rank = 2 で記録される (silent drop しない) |
| TC-MVP-RCPT-03 | deferred task 3 種: (a) parent feature の MVP 未成立 / (b) parent feature の direct 0 件 / (c) parent_feature=null | deferral_reason が design §5 の状況別 3 種の文字列で記録される |
| TC-MVP-RCPT-04 | direct 全件 done の feature / direct 未完の feature / direct 0 件の feature | mvp_established がそれぞれ true / false / null。map の掲載対象は entries に現れる parent_feature 集合のみ (design §5) |
| TC-MVP-RCPT-05 | --eval-log 未指定の実行 | stdout の plan JSON にも同一の selection_receipt が含まれる (design §6) |

## 5. カテゴリ C5 — schema 登録検証 (AC-3)

| ID | 入力 | 期待結果 |
|---|---|---|
| **TC-MVP-SCHEMA-REG-01** | MVP 判断軸 metadata (目的・背景・MVP 適合度) を持つ task-kind node を検証用グラフへ登録 | `validate-graph-schema.py --graph <検証用 graph> --repo-root .` が **PASS** (findings 0 件)。goal-spec acceptance 3 件目を直接カバーする必須ケース |
| TC-MVP-SCHEMA-REG-02 | mvp_fit="urgent" (enum 外) の node | validate-graph-schema.py が **FAIL** (findings 検出) — subschema enum による不正値検出 (design F-4 修正後の根拠) |
| TC-MVP-SCHEMA-REG-03 | mvp_alignment 内に未知キー (例 "priority") を持つ node | **FAIL** — additionalProperties: false による検出 |
| TC-MVP-SCHEMA-REG-04 | mvp_alignment 省略の node / null の node | いずれも **PASS** (後方互換: 既存 node を invalid 化しない) |
| TC-MVP-SCHEMA-REG-05 | mvp_alignment から required サブフィールド (例 purpose) を欠落させた node | **FAIL** — required による検出 (3 軸の判断根拠を欠いた登録を許さない) |

## 6. カテゴリ C6 — qa-066 非退行 (AC-5)

| ID | 入力 | 期待結果 |
|---|---|---|
| TC-MVP-REGR-01 | `python3 -m pytest plugins/dev-graph/tests/ -v` (既存+新規全件) | 全件 PASS。既存テストの修正・削除・skip 追加なし (scope_out 2: qa-066 ゲートの緩和禁止) |

## 7. AC 対応表 (trace rule / 抜け漏れ検査)

| AC | テスト ID |
|---|---|
| AC-1 (MVP 適合 task を先に選定) | TC-MVP-SORT-01〜05, TC-MVP-BRIDGE-01〜04 |
| AC-2 (冪等) | TC-MVP-IDEM-01 |
| AC-3 (schema PASS 登録) | TC-MVP-SCHEMA-REG-01〜05 |
| AC-4 (receipt 判断根拠記録) | TC-MVP-RCPT-01〜05 |
| AC-5 (qa-066 非退行) | TC-MVP-REGR-01 |
| (後方互換 — AC-1/AC-5 の裏面) | TC-MVP-COMPAT-01〜02 |

## 8. fixture 設計指針 (P05 への instruction)

- 既存 `test_operational_loop_v2.py` の `workspace(tmp_path)` / `node_fixture(node_id)` / `load(script, name)` パターンを踏襲し、tmp_path 配下に隔離 graph を組み立てる (実 graph.json・実 bd DB へ触れない)。
- bd-bridge テストの parity manifest は `generated_at` + 正しい `source_graph_digest` (design §4 の canonical digest 式: `sha256(json.dumps(graph, sort_keys=True, separators=(",",":")))`) を持たせ、digest 不一致の fail-closed を誤発火させない。
- schedule-graph は sys.argv patching + `schedule.main()` 呼び出しで、bd-bridge は関数直呼びで検証する (既存様式)。
- 全 fixture は時刻・乱数を含めず固定値のみ (AC-2 冪等の前提)。

## 9. rollback

P05/P06 実行時にテスト ID の不備 (曖昧な期待結果・実装不可能な fixture) が判明した場合、本文書を修正し P04 を再実行する (task spec の Rollback 規約)。
