---
status: confirmed
layer: feature-migration
task: SYS-MVP-FIRST-SCHEDULING-P08
parent_feature: feat-mvp-first-scheduling
feature_package_id: feature-package/feat-mvp-first-scheduling
design: docs/features/feat-mvp-first-scheduling/design.md
acceptance_report: docs/features/feat-mvp-first-scheduling/acceptance-report.md
architecture_refs: [arch-harness-hub-dev-workflow]
measured_at: "2026-07-23T14:07:26Z"
verdict: no-migration-required
---

# feat-mvp-first-scheduling 互換性ノート (P08)

> **位置づけ**: scope_out「既存 task 資産の一括書き換え」を行わないという判断が正しいこと、および既存 node (MVP metadata 未設定) が P05 実装後も fallback 動作 (未設定 rank 2 での従来同等スケジュール) で継続することを**実測**し、migration N/A 判定の根拠として記録する。

## 結論

**既存 task 資産の一括書き換え (migration/backfill) は不要。** 実 graph の schedulable な beads 連携 node 226 件は全て mvp_alignment 未設定のまま、rank 2 (未設定) の fallback で従来どおりスケジュール対象になり続けることを実測で確認した。mvp_alignment は漸進的 (必要な node から順次) に付与すればよい。

## 実測 1: 実 graph の母集団 (fallback 対象の全数確認)

実 `.dev-graph/state/graph.json` (graph_revision 486 時点) を読み取り専用で走査した結果:

| 指標 | 実測値 |
|---|---|
| beads 連携 (beads_linkage.bd_issue_id あり) node | 270 |
| うち schedulable (active + confirmed + pass + readiness complete) | 226 |
| うち mvp_alignment 未設定 (mvp_fit なし) | **226 (100%)** |

→ 既存資産は全件が fallback 経路を通る。1 件でも invalid 化すれば全体が止まる構成だが、後述のとおり invalid 化は起きない。

## 実測 2: 実データでの fallback スケジュール (bd-bridge → schedule-graph 実行)

手順 (全て読み取り専用 — graph/leases/bd DB への書込なし):

1. 実 graph から parity manifest を構築 (270 行、`source_graph_digest` は現行 graph の canonical digest と一致)。→ `.dev-graph/cache/p08-parity-manifest.json`
2. `bd-bridge.py --op ready --parity-manifest ...` を実行 (2026-07-23T14:06Z 頃)。→ `.dev-graph/cache/p08-ready-receipt.json`
   - candidate 38 件中 ready_set 3 件。**ready_set 全行の mvp_fit は null** — ContractError にならず tolerant fallback で受理 (TC-MVP-BRIDGE-02 の実データ再現)。
   - conflicts 9 件・unmapped 26 件は mvp_fit と無関係な既存事由 (依存の beads 未連携・parity 不一致等) であり、本 feature の変更による新規排除は 0 件。
3. `schedule-graph.py --graph .dev-graph/state/graph.json --ready-json ...` を実行 (2026-07-23T14:07:25Z / 14:07:26Z の 2 回)。

schedule-graph の実測結果 (run1):

- ready_set: features 2 件 + tasks 2 件が正常に選定された (mvp_alignment 未設定でも**排除されない**)。
- selection_receipt (policy `mvp-first/v1`): 全 4 entry が `mvp_fit: null, sort_rank: 2, deferral_reason: null` で記録 — silent drop なし (TC-MVP-RCPT-02 の実データ再現)。
- mvp_established: 対象 feature 2 件とも `null` (direct task 0 件 = MVP 未定義) — deferred 繰り延べは発動せず、従来動作と同等 (design の後方互換規則どおり)。

## 実測 3: 冪等性 (P08 acceptance「同一入力で選定 batch と順序が一致」)

同一入力で schedule-graph を 2 回実行し全キーを比較した結果:

- 差分キーは **`executed_at` (実行時刻印) のみ**。
- 選定に関わる全キー (`ready_set` / `batches` / `selection_receipt` / `conflicts` / `unmapped`) は**完全一致**。

→ 実データでも冪等 (べきとう＝何回実行しても結果が同じになる性質) を確認。TC-MVP-IDEM-01 (合成 fixture) の実データ裏付け。

## 自動テストによる裏付け

| コマンド | 結果 |
|---|---|
| `python3 -m pytest plugins/dev-graph/tests/test_schedule_graph_mvp_first.py -k compat` | **2 passed** (TC-MVP-COMPAT-01: 未設定 graph は従来の node_id 辞書順を維持 / TC-MVP-COMPAT-02: plan への追加キーは selection_receipt のみ) — 2026-07-23T14:04Z |
| task spec 字義の `-k backward_compat` | 0 件収集 (exit 5) — テスト命名が `test_mvp_compat_*` のため。**逸脱注記**: spec の `-k` 式は命名想定のずれであり、等価の `-k compat` で同カテゴリ 2 件を実行した |

schema 側の互換性は TC-MVP-SCHEMA-REG-04 (mvp_alignment 省略 / null の node が validate-graph-schema PASS) が P06 で pass 済み (eval-log/dev-graph/mvp-first-scheduling/test-run-p06.json)。さらに実 graph 全体 (未設定 node 込み) が `validate-graph-schema.py` exit 0 / violations 0 (同 test-run-p06.json の validate_graph_schema 節)。

## 移行方針 (確定)

- **一括書き換えしない**: 既存 node への mvp_alignment 一斉付与は行わない (scope_out 遵守)。fallback rank 2 で全件スケジュール継続できるため、書き換えの必要がない。
- **漸進付与**: MVP 判断が必要になった feature/task から順次 C02 (upsert-node.py) 経由で mvp_alignment を付与する。
- **付与時の注意**: mvp_alignment を付与すると graph の canonical digest が変わるため、beads 経路では parity manifest の再生成が必要 (stale digest は schedule-graph が fail-closed で停止する)。運用手順の詳細は P12 の運用ドキュメントが所有する。

## 再現コマンド

```bash
# 互換性テスト (TC-MVP-COMPAT-01/02)
python3 -m pytest plugins/dev-graph/tests/test_schedule_graph_mvp_first.py -k compat

# 実データ fallback 実測 (読み取り専用)
python3 plugins/dev-graph/scripts/bd-bridge.py --op ready --repo-root . \
  --parity-manifest .dev-graph/cache/p08-parity-manifest.json
python3 plugins/dev-graph/scripts/schedule-graph.py \
  --graph .dev-graph/state/graph.json \
  --leases "$(git rev-parse --git-common-dir)/dev-graph/leases.json" \
  --repo-root . --ready-json .dev-graph/cache/p08-ready-receipt.json
```

注: parity manifest は graph 変更のたびに `source_graph_digest` を現行 graph へ合わせて再生成すること (stale なら schedule-graph が設計どおり ContractError で停止する)。
