---
status: confirmed
layer: feature-review
task: SYS-MVP-FIRST-SCHEDULING-P10
parent_feature: feat-mvp-first-scheduling
feature_package_id: feature-package/feat-mvp-first-scheduling
requirements_baseline: docs/features/feat-mvp-first-scheduling/requirements-baseline.md
design: docs/features/feat-mvp-first-scheduling/design.md
design_review: docs/features/feat-mvp-first-scheduling/design-review.md
test_plan: docs/features/feat-mvp-first-scheduling/test-plan.md
acceptance_report: docs/features/feat-mvp-first-scheduling/acceptance-report.md
compatibility_note: docs/features/feat-mvp-first-scheduling/compatibility-note.md
architecture_refs: [arch-harness-hub-dev-workflow]
reviewed_at: "2026-07-23T14:14:00Z"
verdict: pass
---

# feat-mvp-first-scheduling 最終レビュー (P10)

> **位置づけ**: P01〜P09 の全成果物が goal-spec と相互に矛盾なく整合していることを横断確認する。判定は実行済み証跡と成果物本文の突合のみに基づく (trace rule: 計画・宣言を証跡の代わりにしない)。

## 総合判定: **pass**

P01〜P09 の成果物チェーンは goal-spec (package digest `sha256:55a34fe2...`) に対して逐語・実装・実測の 3 層で整合している。blocking の不整合は 0 件。non-blocking の記録事項 2 件 (後述) は P12/P13 への引き継ぎ注記であり、差し戻しを要しない。

## 1. 成果物チェーンの存在と lineage 整合

| Phase | 成果物 | 存在 | lineage/digest 整合 |
|---|---|---|---|
| P01 | requirements-baseline.md | ✓ | goal-spec 逐語転記、feature_context_digest `b0d00325...` 一致 |
| P02 | design.md (DEF-1〜5) | ✓ | baseline の SI-1〜5 を DEF-1〜5 が 1:1 で所有 |
| P03 | design-review.md | ✓ | 総合判定「承認 (実装可能)」、blocking findings の design 反映を確認済み |
| P04 | test-plan.md (23 テスト ID) | ✓ | AC 対応表で AC-1〜5 + 裏面 COMPAT を全被覆、抜け漏れなし |
| P05 | schema + schedule-graph + bd-bridge + テスト 3 ファイル | ✓ | P04 の全テスト ID に対応する実装/テストが存在 |
| P06 | test-run-p06.json (+junitxml) | ✓ | P04 の全 23 ID の pass/fail と実行日時を記録 |
| P07 | acceptance-report.md | ✓ | AC-1〜5 を P06 証跡のみで判定 (総合 pass) |
| P08 | compatibility-note.md | ✓ | migration N/A を実データ実測で確定 |
| P09 | qa-fail-closed-report.json | ✓ | 悪性 3 プローブ + unit 7 件で fail-closed 実証 |

検証コマンド (2026-07-23T14:13:35Z 実行): `validate-system-plan.py --feature-package feature-package/feat-mvp-first-scheduling` → **violations 0**、validated_digest は全成果物の frontmatter が pin する `sha256:55a34fe2...` と一致。

## 2. Acceptance 5 件の縦断整合 (定義 → 実装 → 実行 → 判定)

| AC | P04 定義 | P05 実装 | P06 実行 | P07 判定 | 整合 |
|---|---|---|---|---|---|
| AC-1 (MVP 先行選定) | TC-MVP-SORT-01〜05 / BRIDGE-01〜04 | candidates ソートキー (rank, node_id) + bd-bridge ready_set sort | 9/9 pass | pass | ✓ |
| AC-2 (冪等) | TC-MVP-IDEM-01 | 決定論ソート・時刻乱数非依存 | pass | pass | ✓ (P08 実データでも executed_at 以外完全一致) |
| AC-3 (schema 登録) | TC-MVP-SCHEMA-REG-01〜05 | mvp_alignment subschema (enum + additionalProperties: false) | 5/5 pass + 実 graph exit 0 | pass | ✓ |
| AC-4 (receipt 判断根拠) | TC-MVP-RCPT-01〜05 | selection_receipt (policy mvp-first/v1) | 5/5 pass | pass | ✓ |
| AC-5 (qa-066 非退行) | TC-MVP-REGR-01 | ゲートファイル変更 0 | 406 passed / 9 failed (designed gate) | pass + 逸脱注記 | ✓ (下記 3.1) |

## 3. 横断チェックで確認した相互整合点

### 3.1 AC-5 の逸脱注記の一貫性

P06 (test-run-p06.json) → P07 (acceptance-report.md) → P09 (qa-fail-closed-report.json) の 3 成果物が、9 件 FAIL について**同一の分類** (`designed_freshness_gate_not_logic_regression`)、**同一の対象** (C01/C02/C03/C04/C05/C14/C15/C18/C19)、**同一の後続課題** (HarnessHub-4y5 = issue-live-trial-closure-stale-mvp-first-20260723) を参照している。矛盾なし。ゲート緩和・skip 追加・receipt 手書き修正が行われていないことは 3 成果物とも明記。

### 3.2 design 確定事項と実装の突合 (実測)

- **rank 順序**: design §3 確定版「未設定 node は deferred より前」= 実装 `MVP_FIT_RANK {direct:0, enabling:1, None:2, deferred:3}`。TC-MVP-SORT-01 と P08 実データ (226 件未設定が rank 2 で継続) の両方で実証。✓
- **ソフト繰り延べ**: design DEF-4「ready_set からの除外はしない」= 実装は順序のみ変更。P08 実測でも除外 0 件。✓
- **mvp_established の scope 非依存**: design DEF-4「--scope 指定に依存しない全 graph から計算」= 実装 `_mvp_established` は全 by_id を走査。TC-MVP-RCPT-04 が固定。✓
- **direct 0 件 = null**: design「空虚な真で true と誤読させない」= 実装は null 返却。P08 実データで feature 2 件とも null を確認。✓
- **receipt 形式**: design DEF-5 の entries 9 フィールド (graph_node_id/artifact_kind/order_index/mvp_fit/sort_rank/purpose/background/rationale/deferral_reason) = 実装 `_selection_receipt` と一致。order_index が「分割前の通し index」である点も TC-MVP-RCPT-01 が固定。✓
- **fail-closed 非対称**: design F-6/SI-3 (schedule = 全体停止、bd-bridge = per-candidate 隔離) = P09 プローブ B (exit 2) / プローブ A (conflicts 隔離・生存 2 件) で実証。✓
- **rank 定数の二重定義リスク**: design F-6 の指示どおり TC-MVP-BRIDGE-04 が両 script の定数同一性をテストで固定。✓

### 3.3 scope_out 遵守の横断確認

| scope_out | 確認結果 |
|---|---|
| bd CLI 本体の変更 | 変更なし (bd-bridge = ラッパー側のみ変更) ✓ |
| qa-066 ゲートの緩和・削除 | ゲートファイル変更 0・skip 追加 0 (P06/P07/P09 の 3 点で確認) ✓ |
| dev-graph への新 verb 追加 | 新 verb なし (既存 op の内部拡張のみ) ✓ |
| 既存 task 資産の一括書き換え | 書き換え 0 件 — P08 が「不要」を実測で証明 ✓ |
| Hub プロダクト本体機能の変更 | Web/API/DB への変更なし ✓ |

## 4. Non-blocking 記録事項 (差し戻し不要、後続 phase への注記)

1. **deferral_reason の第 4 変種**: design DEF-4 は理由文字列を「3 種」と規定するが、実装は mvp_established=true の deferred 行に第 4 の文字列 (`"quality-after-mvp: parent feature の MVP 成立済み。deferred rank による繰り延べ順序のみ適用"`) を持つ。これは design §6 の不変条件「deferred 行には deferral_reason を必ず記録する」を established=true の状態でも満たすための実装補完であり、design の 3 種では当該状態が未被覆だった (design 側の記述漏れ)。TC-MVP-RCPT-03/04 が 4 変種を固定済み。**P13 の spec/architecture writeback 時に design.md DEF-4 を「4 種」へ追従させること。**
2. **task spec の `-k` 式と実テスト命名のずれ**: P06/P08/P09 の spec 字義コマンド (`-k backward_compat` / `-k fail_closed`) は実テスト命名 (`test_mvp_compat_*` / `test_mvp_sort_fails_closed_*`) と一致せず 0 件収集 (exit 5) になる。各 phase 証跡に等価コマンドでの実行結果を逸脱注記付きで記録済み。実害はないが、**P12 運用ドキュメントに正しい `-k` 式を記載すること。**

## 5. 再実行コマンド

```bash
# 成果物チェーン整合 (世代非依存)
python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . \
  --feature-package feature-package/feat-mvp-first-scheduling

# AC 縦断の一次証跡
python3 -m pytest plugins/dev-graph/tests/test_schedule_graph_mvp_first.py \
  plugins/dev-graph/tests/test_bd_bridge_mvp_ready_order.py \
  plugins/dev-graph/tests/test_graph_node_mvp_schema_registration.py
python3 plugins/dev-graph/scripts/validate-graph-schema.py --graph .dev-graph/state/graph.json --repo-root .
```

## 6. 残課題 (本 feature の完了条件外)

- **HarnessHub-4y5**: 9 skill の live-trial 再取得 (designed freshness gate の解消)。完了判定: `pytest plugins/dev-graph/tests/test_skill_criteria_evidence.py` 全件 PASS。
- **P11〜P13**: 証跡マニフェスト (P11)・運用ドキュメント (P12)・main への writeback/reconciliation (P13) は本レビューの後続 phase が所有。
