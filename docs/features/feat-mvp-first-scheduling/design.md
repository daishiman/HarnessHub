---
status: draft
layer: feature-design
task: SYS-MVP-FIRST-SCHEDULING-P02
parent_feature: feat-mvp-first-scheduling
feature_package_id: feature-package/feat-mvp-first-scheduling
requirements_baseline: docs/features/feat-mvp-first-scheduling/requirements-baseline.md
architecture_refs: [arch-harness-hub-dev-workflow]
---

# feat-mvp-first-scheduling 設計 (P02)

> **位置づけ**: P01 requirements-baseline の DEF-1〜DEF-5 を確定する決定論設計。P03 が独立レビューし、P05 がこの設計のみを根拠に実装する。実装対象は P05 write scope (graph-node.schema.json / schedule-graph.py / bd-bridge.py / 回帰テスト 3 本) に閉じる。

## 1. 設計の入力事実 (実測)

| # | 事実 | 根拠 |
|---|---|---|
| F-1 | 着手候補の順序は `sorted(ready_ids - lease_conflicts)` の node_id 辞書順のみ | `schedule-graph.py:298` |
| F-2 | bd-bridge `_ready_with_parity()` は `bd ready --json` の返却順を ready_set へ転写するだけで並べ替えなし | `bd-bridge.py:355-405` |
| F-3 | 既存 `purpose`/`goal` フィールドは MM-01 で artifact_kind=feature のとき非 null 必須 (schema 強制)。非 feature の null は description 契約上の運用であり schema 強制ではないが、MM-01 契約に従い task node の MVP 軸表現には流用しない | `graph-node.schema.json` (allOf feature 条件 + description) |
| F-4 | validate-graph-schema.py の unknown properties 検査 (`:140-142`) は **nested オブジェクトにのみ働き、トップレベルは additionalProperties 未設定のため検出されない** (P03 レビューで実測確認)。schema への `mvp_alignment` 追加が必須である真の根拠は、AC-3 の「不正値 FAIL」を subschema の enum + additionalProperties: false で実現するため | P03 design-review findings 2 |
| F-5 | parity manifest (nodes[].graph_node_id/bd_issue_id/graph_status/depends_on) の生成元は C03 (run-dev-graph-sync) の skill 手順で、P05 write scope 外 | `run-dev-graph-schedule/SKILL.md:78` |
| F-6 | 共有定数の置き場 `_common.py` も P05 write scope 外。両 script 間の定数一致はテストで固定するしかない | P05 spec resource_scope |
| F-7 | batches() は candidates の並び順どおりに詰めるため、candidates の順序がそのまま並列 batch の順序になる | `schedule-graph.py:317-333` |

## 2. MVP 判断軸 metadata schema 案 (DEF-1)

graph-node.schema.json の node properties へ **optional/nullable** な単一オブジェクト `mvp_alignment` を追加する。qa-069 の 3 軸 (目的・背景・MVP 適合度) を 1 フィールドに閉じ、MM-01 の purpose/goal と衝突させない。

```json
"mvp_alignment": {
  "type": ["object", "null"],
  "additionalProperties": false,
  "required": ["mvp_fit", "purpose", "background", "rationale"],
  "properties": {
    "mvp_fit":    { "enum": ["direct", "enabling", "deferred"] },
    "purpose":    { "type": "string", "minLength": 1 },
    "background": { "type": "string", "minLength": 1 },
    "rationale":  { "type": "string", "minLength": 1 }
  }
}
```

- `mvp_fit` (MVP 適合度): `direct` = 今必要な動くものに直結 / `enabling` = MVP の直接の前提 (これが無いと direct が動かない) / `deferred` = 品質・再現性強化系で MVP 成立後へ繰り延べ。
- `purpose` (目的) / `background` (背景): qa-069 の第 1・第 2 軸。receipt へ転写する自然文。
- `rationale`: mvp_fit 判定の根拠 (なぜこの適合度か)。
- **後方互換**: フィールド省略・null は valid (既存 node の一括書き換え禁止 = scope_out 4 を守る)。設定は新規登録・個別更新 (upsert-node.py の既存経路) からの opt-in。JSON Schema の `default` キーワードは validator が値を注入しない宣言のみのため**記載しない** (省略時 None は §3 の読み出しコードが担保)。
- 適用対象: artifact_kind=task / feature の両方に許可。feature 側の用途は **features batch 自身の並び順**にも同じ rank (§3) を適用するため。§5 の mvp_established 判定は feature 自身の mvp_alignment ではなく**子 task の mvp_fit/status の集計**で行う (混同注意)。他 kind は null のまま (schema 上は制約しない — 検査を増やして既存 node を invalid 化しない)。

## 3. schedule/next の MVP 適合第一ソートキー (DEF-2)

置換点は F-1 の 1 行。`sorted(ready_ids - lease_conflicts)` を「MVP 適合 rank 第一・node_id 辞書順 tie-break」の決定論ソートへ置き換える。rank は script 冒頭の定数 `MVP_FIT_RANK` として定義する (F-6 により bd-bridge 側と定数一致テストで固定)。

**不変条件 (P03 レビュー・P04 テスト設計の対象)**:
- INV-1: 同一入力 → 同一出力 (AC-2 冪等)。ソートキーは node の静的 metadata のみから決まり、時刻・乱数・外部状態を参照しない。
- INV-2: mvp_fit=direct の task は、他条件が同じならどの非 direct task よりも先に並ぶ (AC-1)。
- INV-3: mvp_alignment 未設定 node の相対順序は現行 (node_id 辞書順) を維持し、既存挙動から劣化しない (後方互換)。
- INV-4: deferred は必ず末尾グループになる (§5 繰り延べ規則)。

**ソートキー疑似コード**:

```python
# 確定版 (2026-07-23): 未設定 node は deferred より前 — 既存資産 (全て未設定) を
# 品質系明示 task より優先し、scope_out 4 (一括書き換え禁止) の下で挙動劣化させない
MVP_FIT_RANK = {"direct": 0, "enabling": 1, None: 2, "deferred": 3}

def sort_key(node):
    fit = (node.get("mvp_alignment") or {}).get("mvp_fit")
    return (MVP_FIT_RANK[fit], node_id(node))  # tie-break は node_id 辞書順 (AC-2 冪等)
```

- 決定根拠: 未設定を最後尾に置く案 (deferred=2, 未設定=3) は「未分類 task が選ばれない」強い誘導になるが、既存 task 全件が沈み INV-3 (現行挙動からの非劣化) に反するため不採用。

- ソートは `candidates` 構築時の 1 箇所のみで行い、features/tasks への分割 (F-7) と batches() は並び順をそのまま継承する。

**fail-closed 規則 (schedule-graph 側)**:

- `mvp_alignment` の値が **dict でも null でもない**場合 → `ContractError` (silent skip しない)。
- `mvp_fit` が `{"direct", "enabling", "deferred"}` 以外の**非 null 値**の場合 → `ContractError`。未設定 rank (2) への silent fallback で不正値を隠さない。fallback が許されるのは「キー欠落 / null」のみ。
- エラー経路は既存方針 (`schedule-graph.py:417-420` の ContractError → stderr + exit 非 0) に従い plan 全体を fail させる。validate-graph-schema.py PASS 済み graph では到達しない防衛線であり、検査迂回・手書き破損データを黙って通さないための規則 (AC-3 の裏面)。

## 4. bd-bridge ready 候補順序の MVP-first 整合 (DEF-3)

bd CLI は変更できず (scope_out 1)、parity manifest 生成元も write scope 外 (F-5)。よって **許容型 (tolerant) 契約**とする:

- parity manifest の nodes[] 行に **optional キー `mvp_fit`** を許可する (無くても valid)。
- `_ready_with_parity()` は ready_set 構築後、`(MVP_FIT_RANK[row の mvp_fit], external_ref)` で **決定論ソートしてから返す**。manifest 行に mvp_fit が無い / null なら未設定 rank へ fallback。
- **fail-closed 規則 (bd-bridge 側)**: manifest 行の `mvp_fit` が enum 外の非 null 値の場合、その候補を **per-candidate ContractError → `conflicts[]` へ転記**し ready_set には載せない (既存の候補単位エラー処理 `bd-bridge.py:380-388` と同一パターン)。行単位で fail-closed にし、他候補の返却は妨げない。
- rank 定数は bd-bridge.py 側にも同名 `MVP_FIT_RANK` を定義し、**schedule-graph.py 側との同一性を回帰テストで固定**する (test_bd_bridge_mvp_ready_order.py)。
- manifest 生成元 (C03) への mvp_fit 埋め込みは**本 package では任意** (追随しなくても fallback で動作が劣化しない)。埋め込み手順は P12 運用文書が記載する。
- 正順序の正本はあくまで schedule-graph.py (graph node の mvp_alignment を直接参照)。bd-bridge 側ソートは「bd ready 表示順の整合」(SI-3) のためであり、schedule の判定を bd-bridge の順序に依存させない。

## 5. 品質・再現性強化系タスクの繰り延べ規則 (DEF-4)

- **分類**: 繰り延べ対象 = `mvp_fit: "deferred"` を明示された node のみ。名称・tag からの推測分類はしない (誤爆と非決定性の排除)。
- **MVP 成立の観測可能条件**: parent feature 配下で `mvp_fit: "direct"` を持つ全 task が `status in {done, closed}` になった状態。schedule-graph が graph から都度計算し、receipt に `mvp_established: {<feature_id>: bool|null}` として記録する。
  - **計算範囲**: `--scope` 指定に**依存しない全 graph** から計算する。mvp_established は feature の graph 上の事実であり、閲覧範囲 (scope) で真偽が変わると AC-2 (同一入力冪等) の「入力」が曖昧になるため。
  - **direct task 0 件の feature**: 値は `null` (空集合に対する空虚な真 (vacuous truth = 対象が 0 件なので形式上は真になってしまう論理) で `true` と誤読させない)。この feature 配下の deferred task の deferral_reason は「MVP 未定義 (direct task 0 件)」を明記する。
  - **map の掲載対象**: selection_receipt の entries に現れる node の `parent_feature` 集合 + entries に feature node 自身が含まれる場合はその feature_id。graph 全 feature を無差別に載せない (receipt の肥大防止・決定論)。
- **繰り延べの実現方式 = ソフト繰り延べ (ソート順のみ)**: deferred は INV-4 により常に末尾グループへ並ぶ。ready_set からの**除外はしない**。
  - 理由: 除外 (ハードゲート) は「deferred しか ready が無い」状況で空 batch → スケジューラ停止 (deadlock) を作る。qa-069 の意図は「MVP を先に」であり「品質タスクを禁止」ではない。
  - MVP 未成立のうちは direct/enabling が先頭に並ぶため、実務上 deferred は選ばれない。MVP 成立後は direct が ready から消えるため deferred が自然に先頭へ繰り上がる。
- receipt の deferred 行には `deferral_reason` を必ず記録する (§6)。理由文字列は状況別に 3 種:
  - parent feature の MVP 未成立 → `"quality-after-mvp: parent feature の MVP (direct 全件 done) が未成立のため繰り延べ"`
  - parent feature の direct task 0 件 (mvp_established=null) → `"quality-after-mvp: MVP 未定義 (direct task 0 件) のため繰り延べ順序のみ適用"`
  - `parent_feature: null` の単発 task → `"quality-after-mvp: parent feature なしのため mvp_established 判定対象外、繰り延べ順序のみ適用"`

## 6. 選定 receipt の出力形式 (DEF-5)

既存の `--eval-log` receipt (plan JSON, `schedule-graph.py:355-388`) へ **additive キー `selection_receipt`** を追加する (既存キーの変更・削除なし = 後方互換)。

```json
"selection_receipt": {
  "policy": "mvp-first/v1",
  "mvp_established": { "feat-mvp-first-scheduling": false },
  "entries": [
    {
      "graph_node_id": "SYS-…-P05",
      "artifact_kind": "task",
      "order_index": 0,
      "mvp_fit": "direct",
      "sort_rank": 0,
      "purpose": "…(mvp_alignment.purpose 転写)…",
      "background": "…(mvp_alignment.background 転写)…",
      "rationale": "…(mvp_alignment.rationale 転写)…",
      "deferral_reason": null
    },
    {
      "graph_node_id": "SYS-…-P09",
      "artifact_kind": "task",
      "order_index": 7,
      "mvp_fit": "deferred",
      "sort_rank": 3,
      "purpose": "…",
      "background": "…",
      "rationale": "…",
      "deferral_reason": "quality-after-mvp: parent feature の MVP (direct 全件 done) が未成立のため繰り延べ"
    }
  ]
}
```

- **order_index の定義 (一意)**: §3 ソート直後・features/tasks 分割**前**の単一 `candidates` リストにおける 0 始まり index。feature と task が混在した通し番号であり、features batch / tasks batch へ分割された後の番号ではない。entries はこの混在順で全件・欠番なしに記録し、読み手が kind を判別できるよう各 entry に `artifact_kind` を含める。
- mvp_alignment 未設定 node は `mvp_fit: null / sort_rank: <fallback rank> / purpose·background·rationale: null` とし、`deferral_reason: null`。**判断根拠が無いことも記録される** (silent drop させない)。
- receipt は stdout の plan JSON にも同一内容で含める (eval-log 未指定でも AC-4 を検証可能にする)。

## 7. 後方互換とデータ移行

- schema 追加は optional/nullable のみ → 既存 graph.json は無変更で valid (F-4 の unknown properties 検査には schema 追加で対応)。
- 既存 task 資産の一括書き換えはしない (scope_out 4)。P08 が「fallback 動作の実測記録」で互換性を確認する。
- 既存 promoted package・live-trial 証跡の digest に影響する既存ファイル書き換えは行わない (新規フィールド追加は schema と script のみ)。
- **parity manifest の stale 化 (運用影響・P12 申し送り)**: 将来 node へ mvp_alignment を付与すると graph.json が変わり `source_graph_digest` も変わるため、付与前に生成した parity manifest は digest 不一致で ContractError (fail-closed) になる。これは既存仕様どおりの挙動であり本設計の欠陥ではないが、「mvp_alignment 付与 → manifest 再生成 (C03)」の順序を P12 運用文書に明記する。

## 8. P04 テスト設計への引き継ぎ観点

| 観点 | 対応 AC | テストファイル (P05 write scope) |
|---|---|---|
| direct/enabling/未設定/deferred 混在入力での選定順序 | AC-1 | test_schedule_graph_mvp_first.py |
| 同一入力 2 回実行の batch・順序一致 (冪等) | AC-2 | test_schedule_graph_mvp_first.py |
| mvp_alignment 付き node の validate-graph-schema.py PASS / 不正値 FAIL | AC-3 | test_graph_node_mvp_schema_registration.py |
| selection_receipt の 3 軸判断根拠記録・未設定 node の null 記録 | AC-4 | test_schedule_graph_mvp_first.py |
| bd-bridge ready_set の MVP-first ソートと rank 定数の同一性 | AC-1 (SI-3) | test_bd_bridge_mvp_ready_order.py |
| 既存テスト全件 (qa-066 非退行) | AC-5 | 既存 plugins/dev-graph/tests/ 全件 |

## 9. rollback

P03 レビューで差し戻された場合は本文書を修正して P02 を再実行する。P05 実装後に設計欠陥が見つかった場合は、実装を revert し本文書へ差し戻す (実装側での設計上書き禁止)。
