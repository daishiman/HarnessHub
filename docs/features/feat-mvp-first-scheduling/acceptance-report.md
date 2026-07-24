---
status: confirmed
layer: feature-acceptance
task: SYS-MVP-FIRST-SCHEDULING-P07
parent_feature: feat-mvp-first-scheduling
feature_package_id: feature-package/feat-mvp-first-scheduling
test_plan: docs/features/feat-mvp-first-scheduling/test-plan.md
evidence: eval-log/dev-graph/mvp-first-scheduling/test-run-p06.json
architecture_refs: [arch-harness-hub-dev-workflow]
adjudicated_at: "2026-07-23T14:02:00Z"
verdict: pass
---

# feat-mvp-first-scheduling 受入判定 (P07)

> **位置づけ**: goal-spec acceptance 5 件を P06 の実行済み証跡 (`eval-log/dev-graph/mvp-first-scheduling/test-run-p06.json`) のみに照らして突合する (trace rule: P07 は実行済みエビデンスのみで判定し、計画・文書で代替しない)。

## 判定サマリー

| # | goal-spec acceptance | 判定 | 根拠テスト ID |
|---|---|---|---|
| AC-1 | MVP 適合度を持つ task と品質先行 task が混在する入力で、next が MVP 適合 task を先に選定する | **pass** | TC-MVP-SORT-01〜05, TC-MVP-BRIDGE-01〜04 (9/9 pass) |
| AC-2 | 同一入力で next を再実行しても選定 batch と順序が一致する (冪等) | **pass** | TC-MVP-IDEM-01 (pass) |
| AC-3 | MVP 判断軸 metadata を持つ node が validate-graph-schema.py PASS で登録できる | **pass** | TC-MVP-SCHEMA-REG-01〜05 (5/5 pass) + 実 graph PASS |
| AC-4 | 選定 receipt に 目的・背景・MVP 適合の判断根拠が記録される | **pass** | TC-MVP-RCPT-01〜05 (5/5 pass) |
| AC-5 | qa-066 由来の既存品質ゲートの検査が非退行である | **pass** (逸脱注記あり) | TC-MVP-REGR-01 (406 passed / 9 failed — 逸脱分類は下記) |
| 裏面 | 後方互換 (mvp_alignment 未設定 graph の順序・plan キー不変) | **pass** | TC-MVP-COMPAT-01〜02 (2/2 pass) |

**総合判定: pass — P08 へ引き継ぐ。P05 への差し戻しは不要 (理由は AC-5 の逸脱注記を参照)。**

## 各判定の根拠

### AC-1: MVP 適合 task の先行選定 — pass

- 証跡: test-run-p06.json `results[]` の TC-MVP-SORT-01〜05 (全 pass, 実行日時 2026-07-23T13:48:01Z, junitxml: eval-log/dev-graph/mvp-first-scheduling/test-run-p06.xml)。
- TC-MVP-SORT-01 は deferred/未設定/enabling/direct 混在入力で `["t-d","t-c","t-b","t-a"]` (direct → enabling → 未設定 → deferred) の選定順を固定。TC-MVP-SORT-03 は feature batch にも同順が適用されることを確認。
- bd-bridge 側整合: TC-MVP-BRIDGE-01 (rank 順が external_ref 辞書順に勝つ)、TC-MVP-BRIDGE-04 (schedule-graph と bd-bridge の MVP_FIT_RANK 定数完全一致) が pass — next/schedule と bd ready の順序が食い違わないことを二重に固定。
- fail-closed の裏面: TC-MVP-SORT-04/05 (enum 外・非 object は ContractError)、TC-MVP-BRIDGE-03 (不正行のみ conflicts[] へ転記) が pass。

### AC-2: 冪等 — pass

- 証跡: TC-MVP-IDEM-01 (pass)。同一入力での 2 回実行で ready_set・batches・selection_receipt が完全一致することを確認。
- fixture は時刻・乱数を含まず、環境は pytest-randomly (テスト順序ランダム化) 下で pass — 順序依存の偶然一致ではない。

### AC-3: MVP 判断軸 metadata の schema 登録 — pass

Required evidence の指定どおり 3 層の根拠を明記する:

1. **P04 定義**: docs/features/feat-mvp-first-scheduling/test-plan.md の TC-MVP-SCHEMA-REG-01 (「目的・背景・MVP 適合度を持つ task の登録が PASS」)。
2. **P05 実装**: plugins/dev-graph/schemas/graph-node.schema.json へ `mvp_alignment` (nullable object, required: mvp_fit/purpose/background/rationale, mvp_fit enum: direct/enabling/deferred, additionalProperties: false, root required 非追加) を git apply 経路で追加。
3. **P06 実行結果**: test-run-p06.json の TC-MVP-SCHEMA-REG-01〜05 全 pass、および `validate_graph_schema` セクション — `python3 plugins/dev-graph/scripts/validate-graph-schema.py --graph .dev-graph/state/graph.json --repo-root .` が exit 0 / PASS / violations 0 (2026-07-23T13:58:02Z, 実 graph 最終状態 graph_revision 484)。

裏面の TC-MVP-SCHEMA-REG-02 (enum 外 FAIL)・03 (未知キー FAIL)・04 (省略/null PASS = 既存 node を invalid 化しない)・05 (purpose 欠落 FAIL) も全 pass。

### AC-4: 選定 receipt の判断根拠記録 — pass

- 証跡: TC-MVP-RCPT-01〜05 (全 pass)。
- TC-MVP-RCPT-01: selection_receipt.entries が mvp_alignment の purpose/background/rationale を逐語転記し、order_index (分割前の選定順) を持つ。
- TC-MVP-RCPT-02: mvp_alignment 未設定 node も silent drop せず null + sort_rank=2 で記録。
- TC-MVP-RCPT-03/04: deferral_reason 4 変種と mvp_established の true/false/null 3 状態を固定。
- TC-MVP-RCPT-05: receipt は stdout の plan に常に含まれる (eval-log 出力に依存しない)。

### AC-5: qa-066 既存品質ゲート非退行 — pass (逸脱注記あり)

**判定根拠 (ゲートの検査そのものは非退行):**

- 既存テストの修正・削除・skip 追加は 0 件 (test-plan.md scope_out 2「qa-066 ゲートの緩和禁止」を遵守)。qa-066 由来の検査コード (test_skill_criteria_evidence.py を含む) は本 feature で一切変更していない。
- 全 suite 406 件 pass — 実装 logic の退行 0 件。
- ゲートは機能している: 後述の 9 件 FAIL は、鮮度ゲートが P05 の正当な振る舞い変更を検出して fail-closed に発火した結果であり、ゲートが「退行していない」ことの実証でもある。

**逸脱注記 (TC-MVP-REGR-01 の字義的期待「全件 PASS」との差分):**

- 実測 (test-run-p06.json, 2026-07-23T13:56:58Z〜13:57:53Z): 406 passed / 9 failed。
- FAIL 9 件は全て `test_skill_criteria_evidence.py::test_independent_scenario_receipt_covers_exact_criteria` の `stale behavior closure digest` assertion (C01/C02/C03/C04/C05/C14/C15/C18/C19)。P05 が behavior closure 構成ファイル (schedule-graph.py / bd-bridge.py / graph-node.schema.json) を正当に変更したため、live-trial 証跡 (実試行の合格記録) の digest 鮮度ゲートが設計どおり再取得を要求している状態。
- 分類: `designed_freshness_gate_not_logic_regression` — 品質ゲートの検査の退行ではない。
- 解消経路: live-trial の tier=live 再取得 (運用作業)。beads 課題 **HarnessHub-4y5** (graph node `issue-live-trial-closure-stale-mvp-first-20260723`, issues/sys-live-trial-closure-stale-mvp-first-20260723.md) として起票済み。

**P05 へ差し戻さない理由:**

- 差し戻し条件は「acceptance 未達」だが、AC-5 の実体 (ゲート検査の非退行) は満たされている。
- FAIL 9 件の正当な解消手段は live-trial 再取得という運用作業であり、P05 の write scope (実装コード) の変更では解消できない。P05 側で「解消」しようとすれば、ゲート緩和または receipt 手書き修正 (証跡改ざん) しかなく、いずれも scope_out で禁止された行為である。
- したがって未達扱いの差し戻しではなく、後続課題 (HarnessHub-4y5) による追跡が正しい処置である。

### 裏面: 後方互換 — pass

- TC-MVP-COMPAT-01: mvp_alignment 未設定 graph では従来どおり node_id 辞書順 (全候補 rank 2 で同率のため)。
- TC-MVP-COMPAT-02: plan の既存キー集合への追加は `selection_receipt` のみ (`set(plan) - existing_keys == {"selection_receipt"}` の厳密検査)。

## 再実行コマンド (証跡の再現)

```bash
# 新規テスト 22 件 (junitxml 付き)
python3 -m pytest plugins/dev-graph/tests/test_schedule_graph_mvp_first.py \
  plugins/dev-graph/tests/test_bd_bridge_mvp_ready_order.py \
  plugins/dev-graph/tests/test_graph_node_mvp_schema_registration.py \
  --junitxml=eval-log/dev-graph/mvp-first-scheduling/test-run-p06.xml

# 全件回帰 (TC-MVP-REGR-01)
python3 -m pytest plugins/dev-graph/tests/ -q

# 実 graph の schema 検証 (AC-3)
python3 plugins/dev-graph/scripts/validate-graph-schema.py --graph .dev-graph/state/graph.json --repo-root .

# plan 整合 (世代非依存の再検証 — 実行契約 rerun 節)
python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . \
  --feature-package feature-package/feat-mvp-first-scheduling
```

## 判定の前提と制約

- 本判定は P06 の実行済み証跡のみを根拠とし、未実行の計画・期待値では判定していない (trace rule)。
- HarnessHub-4y5 (live-trial 再取得) が完了するまで、全 suite の緑化は保留状態である。同課題の完了判定は `python3 -m pytest plugins/dev-graph/tests/test_skill_criteria_evidence.py` 全件 PASS。
- P13 (main への reconciliation) までは feature branch 上の完了であり、durable done (恒久確定) ではない。
