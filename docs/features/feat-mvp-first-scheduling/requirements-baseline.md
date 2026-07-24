---
status: confirmed
layer: feature-design
task: SYS-MVP-FIRST-SCHEDULING-P01
parent_feature: feat-mvp-first-scheduling
feature_package_id: feature-package/feat-mvp-first-scheduling
source: .dev-graph/plans/generations/feature-package-feat-mvp-first-scheduling/55a34fe2a62841c0175b568204b4a1fde8e1fd04d1c0496bb4e0444e3cf86387/goal-spec.json
package_digest: sha256:55a34fe2a62841c0175b568204b4a1fde8e1fd04d1c0496bb4e0444e3cf86387
feature_context_digest: sha256:b0d003254ac6f42d4616dfff30ab605e355c09c9abe642b71559cea6a49e6291
architecture_refs: [arch-harness-hub-dev-workflow]
---

# feat-mvp-first-scheduling 要件ベースライン

> **位置づけ**: P01 (要件ベースライン確定) の成果物。promoted goal-spec の purpose/background/goal/scope_in/scope_out/acceptance を**逐語転記**した baseline であり、P02 以降の全 task はこの文書を唯一の合意事項として参照する。転記元との相違が判明した場合は本文書を修正せず goal-spec 側の再確定を dev-graph へ差し戻す (rollback 規約)。

## 1. 目的 (purpose)

dev-graph/beads (bd) のタスク優先度選定が品質・本質・再現性を先回りする基準に寄り、いちばん作りたい機能 (MVP) から離れて同じ基盤タスクを繰り返す停滞が起きている (qa-069)。判断軸を「目的=何のために作るか / 背景=どういう経緯か / MVP=今必要な動くもの」の3軸へ組み替え、まず作って使って課題をあぶり出す build-use-learn の回転を取り戻す

## 2. 背景 (background)

dev-graph/beads (bd) のタスク優先度選定が品質・本質・再現性を先回りする基準に寄り、いちばん作りたい機能 (MVP) から離れて同じ基盤タスクを繰り返す停滞が起きている (qa-069)。判断軸を「目的=何のために作るか / 背景=どういう経緯か / MVP=今必要な動くもの」の3軸へ組み替え、まず作って使って課題をあぶり出す build-use-learn の回転を取り戻す

> **転記注記 (background_source_note 逐語)**: feature context/文書は目的節と背景節を分離しておらず、単一の purpose フィールド (および文書 `# 目的` 節) に両方を統合して記述している。そのため background は purpose と同一テキストを転記し、独自の要約・分割は行っていない。

## 3. ゴール (goal)

next/schedule と bd ready の着手候補選定が MVP 適合 (今必要な動くものへの直結度) を第一ソートキーとして動作し、品質・再現性強化系タスクは MVP 成立後へ繰り延べられ、同一入力での選定結果が冪等に再現される状態 (既確定 CI/CD・quality gate 要件 qa-066 は維持)

## 4. スコープ

### 4.1 scope_in (5 件)

| # | 項目 (逐語) | 主担当 phase |
|---|---|---|
| SI-1 | feature/task metadata への MVP 判断軸 (目的・背景・MVP 適合度) の表現追加と登録経路 | P02 / P05 |
| SI-2 | schedule/next の着手候補算出への MVP 適合第一ソートキー導入 | P02 / P05 |
| SI-3 | bd-bridge ready 候補順序の MVP-first 整合 | P02 / P05 |
| SI-4 | 品質・再現性強化系タスクの MVP 成立後繰り延べ規則 | P02 / P05 |
| SI-5 | 選定理由 (なぜこのタスクが先か) の receipt 出力 | P02 / P05 / P12 |

未割当: **0 件**。

### 4.2 scope_out (5 件)

1. bd CLI 本体の変更
2. CI/CD・quality gate 要件 (qa-066) 自体の緩和・削除
3. dev-graph への新 verb 追加
4. 既存 task 資産の一括書き換え
5. Hub プロダクト本体機能 (Web/API/DB) の変更

## 5. 受入条件 (acceptance / 5 件)

| # | 受入条件 (逐語) | 対応 scope_in | 検証 phase |
|---|---|---|---|
| AC-1 | MVP 適合度を持つ task と品質先行 task が混在する入力で、next が MVP 適合 task を先に選定する | SI-2 / SI-3 / SI-4 | P06 / P07 |
| AC-2 | 同一入力で next を再実行しても選定 batch と順序が一致する (冪等) | SI-2 | P06 / P07 |
| AC-3 | MVP 判断軸 metadata を持つ node が validate-graph-schema.py PASS で登録できる | SI-1 | P06 / P07 |
| AC-4 | 選定 receipt に 目的・背景・MVP 適合の判断根拠が記録される | SI-5 | P06 / P07 |
| AC-5 | qa-066 由来の既存品質ゲートの検査が非退行である | (制約: scope_out 2 の裏面) | P06 / P09 |

P04 がこの 5 件へ実行可能なテスト ID を割り当て、P06 が実行し、P07/P10 が実行済み証跡のみで判定する (trace rule)。

## 6. qa-069 との対応表

正本: `system-spec/dev-workflow.md` qa-069 (`sha256:43336931b9d84c400dc5782da751ef86682e031b5169643c25778584c065cd86`)。

| qa-069 回答の要素 | scope_in | acceptance |
|---|---|---|
| 判断軸を 目的/背景/MVP の 3 軸へ組み替え、metadata として表現する | SI-1 | AC-3 |
| MVP 適合 (今必要な動くものに直結するか) を第一ソートキーへ昇格 | SI-2 | AC-1 / AC-2 |
| bd ready の候補順序も同じ判断軸で整合させる | SI-3 | AC-1 |
| 品質・再現性強化系は MVP 成立後に繰り延べる | SI-4 | AC-1 |
| 選定理由 (なぜこのタスクが先か) を記録し build-use-learn の回転を可視化する | SI-5 | AC-4 |
| CI/CD・quality gate 等の既確定要件 (qa-066) 自体は維持する | scope_out 2 | AC-5 |

## 7. 転記元 lineage (digest 固定・2026-07-23 実測)

| path | sha256 | status |
|---|---|---|
| `features/feat-mvp-first-scheduling.context.json` | `b0d003254ac6f42d4616dfff30ab605e355c09c9abe642b71559cea6a49e6291` | verified (goal-spec pin と一致) |
| `system-spec/dev-workflow.md` | `43336931b9d84c400dc5782da751ef86682e031b5169643c25778584c065cd86` | verified (goal-spec pin と一致) |
| `architecture/harness-hub-dev-workflow.md` | `1921dab3fa45ba48ec75dc68534a756be613b3de08c4616f8f668f016637eaa2` | 実測 (wrapper 本体。frontmatter の source_lineage.source_digest は system-spec 側 43336931… を指す) |
| `specs/harness-hub-system-specification.md` | `909b1cc73750698f7f130340fe9fbb303645895133193b639762bdcb40e9d61a` | 実測 (第2参照) |
| `features/feat-mvp-first-scheduling.md` | `d96c364f5350c104ae542b6a7942c542fdd2df869111d9f0c4b81bdc404eef0b` | 実測 (canonical feature 文書) |

> goal-spec の drift_signals (逐語要旨): architecture/harness-hub-dev-workflow.md 本文プロースの「正本 (source of truth)」節が旧 digest 断片 `c8f21b091cfc28b2…` / 取込日時 2026-07-18T15:40:17Z のまま frontmatter (43336931… / 2026-07-23T04:45:00Z) に追随していない。goal-spec は機械可読な frontmatter 側 source_lineage を正本として採用した。本 drift は qa-069 要件固有ではなく文書更新漏れであり、P13 writeback の対象候補として申し送る。

## 8. P02 で確定すべき据置事項 (5 件)

| id | 据置事項 | 確定先 |
|---|---|---|
| DEF-1 | MVP 判断軸 node metadata の schema 案 — graph-node.schema.json への追加フィールド名・型・後方互換 (optional/nullable) 方式。既存 `purpose`/`goal` は MM-01 で artifact_kind=feature のとき限定必須のため task-kind へ流用できない | P02 design.md §2 |
| DEF-2 | schedule/next の MVP 適合第一ソートキー — 現行 `sorted(ready_ids - lease_conflicts)` (schedule-graph.py:298, node_id 辞書順のみ) を置き換えるソートキー疑似コードと冪等 tie-break | P02 design.md §3 |
| DEF-3 | bd-bridge ready 候補順序の整合方式 — `_ready_with_parity()` (bd-bridge.py:355) は bd ready --json の順序をそのまま ready_set へ転写するだけで並べ替えを行わない。bd CLI 非変更 (scope_out 1) での整合手段 | P02 design.md §4 |
| DEF-4 | 品質・再現性強化系タスクの繰り延べ規則 — 「MVP 成立後」の判定条件と繰り延べ対象の分類規約 | P02 design.md §5 |
| DEF-5 | 選定 receipt の出力形式 — 目的・背景・MVP 適合の判断根拠を記録する schema と出力先 | P02 design.md §6 |

## 9. 実測ベースライン (2026-07-23 時点)

P02 以降の設計・検証はこの実測値を出発点とする。

| 指標 | 実測値 | 取得根拠 |
|---|---|---|
| schedule-graph.py の着手候補算出 | `candidates = [by_id[node_id] for node_id in sorted(ready_ids - lease_conflicts)]` — node_id 辞書順のみで MVP 適合度を評価しない | `plugins/dev-graph/scripts/schedule-graph.py:298` |
| bd-bridge ready の順序 | `_ready_with_parity()` は `bd ready --json` の返却順を ready_set へ転写するのみで独自ソートなし | `plugins/dev-graph/scripts/bd-bridge.py:355-401` |
| graph-node.schema.json の purpose/goal | artifact_kind=feature のとき非 null 必須・他 kind は null (MM-01)。task node への MVP 軸表現には新規 optional フィールドが必要 | `plugins/dev-graph/schemas/graph-node.schema.json` (purpose/goal description) |
| 既存 node への影響制約 | 既存 task 資産の一括書き換え禁止 (scope_out 4)・既存 promoted package digest 失効禁止 | 本文書 §4.2・P01 spec「Architecture and deploy unit」 |

## 10. rollback

本 baseline が goal-spec と乖離した場合、本文書を編集せず `/dev-graph plan` の再実行で package を再生成し、P01 から再着手する。
