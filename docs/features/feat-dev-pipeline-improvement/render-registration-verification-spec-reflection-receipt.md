---
status: confirmed
layer: feature-spec-reflection
feature_id: feat-dev-pipeline-improvement
graph_node_id: issue-render-registration-receipt-contract-mismatch-20260726
beads_id: HarnessHub-35ai
spec_impact: reflected
reviewed_at: 2026-07-30
---

# renderer 登録検証表示 — 仕様反映受領書

## 1. 受領対象

`HarnessHub-35ai` は、Dev Graph の feature 表示で 13 task が見えていても、
それが登録 receipt（受領書）と照合済みなのか、単に graph を探索表示しただけなのかを
区別できなかった問題を修正する。

| 項目 | 値 |
|---|---|
| Beads ID | `HarnessHub-35ai` |
| dev-graph node | `issue-render-registration-receipt-contract-mismatch-20260726` |
| branch | `devgraph/issue-render-registration-receipt-contract-mismatch-20260726` |
| base | repository default branch `main` |
| 対象 skill | `run-dev-graph-render` |

## 2. 仕様・設計影響の判定

判定は **reflected（開発品質の検証契約へ影響あり）** とする。

外部利用者向けの製品 API、DB schema、認証認可、製品 UI、Cloudflare deploy unit は
変更しない。一方、repository 内 renderer が「登録検証済み」と表示できる条件を
厳密化し、不正確な成功表示を `not_performed` へ変えるため、開発ツールの仕様・設計へは
影響がある。

## 3. 正規フローでの反映

| 層 | 反映先 | 内容 |
|---|---|---|
| `system-spec/` | `system-spec/testing-qa.md` | qa-076 / qa-089 の実装フィードバックとして、receipt 有りだけを verified とする境界を記録 |
| `specs/` | `specs/harness-hub-system-specification.md` | 集約仕様へ正負の検証契約と製品非影響を要約 |
| `architecture/` | `architecture/harness-hub-testing-qa.md` | receipt → validator → 三つの表示面という証拠経路を記録し、source digest を更新 |
| `features/` | `features/feat-dev-pipeline-improvement.md` | 実装履歴と本受領書への導線を追記 |
| `tasks/` | P13 task overlay | main 統合、品質ゲート、公開時の引き継ぎを追記 |
| `docs/` | 本書 / `final-review.md` | 最終レビュー、検証結果、中学生向け説明を記録 |
| issue / Beads | 対象 issue / `HarnessHub-35ai` | 完了証拠、commit、draft PR を正規 writer 経由で記録 |

確定 QA の回答内容は変更しないため、`system-spec/spec-state.json` の状態遷移は
発生させない。`system-spec/testing-qa.md` への追記は、既存確定要件を renderer へ
具体化した実装フィードバックである。

## 4. 実装契約

- `--registration-receipt` が指定された場合は、既存 validator で
  parent feature、expected/applied count、node IDs、graph digest、source digest を照合する。
- 検証成功時だけ `registration_verification.status=verified` とする。
- receipt 未指定時は `registration=null` かつ
  `registration_verification.status=not_performed` とする。
- 判定は CLI JSON receipt、可視 HTML banner、埋込み `render-metadata` で一致させる。
- 同じ 13 child graph を receipt 無しで描画する負例を持ち、
  件数の偶然一致を verified として扱わない。

## 5. 行数と責務分割

今回触れた `test_sync_render_schedule_v2.py` は 560 行だったため、
renderer の登録検証テストを
`test_render_registration_verification.py` へ分離した。分離後は前者 466 行、
後者 142 行であり、変更対象の手書きコード／文書は 500 行以下である。
`component-inventory.json` と `.dev-graph/state/graph.json` は、各 consumer が
単一 JSON document として読む正本台帳であり、分割は本変更の互換性を壊すため行わない。
live-trial の transcript も追記不能な一次証拠であり、行数による再編集はしない。

## 6. 検証証拠

- fresh live trial:
  `eval-log/dev-graph/run-dev-graph-render/live-trial/20260730T053500Z-wt18-35ai-render/`
- live trial: launch / completion / goal fit / overall がすべて PASS
- human nudge 0、gate response 0
- independent evaluator: 8 checks PASS、blocker 0
- content review / criteria review: PASS
- task package: `feature-package/feat-dev-pipeline-improvement` exact-13

| ゲート | main 統合前の最終レビュー結果 |
|---|---|
| focused renderer / sync pytest | 13 passed |
| Dev Graph 全回帰 | 720 passed / 2 skipped |
| content / live-trial | 75 skill verified / 9 verdict verified、対象 run PASS |
| plugin package | 22 plugin、blocking failure 0 |
| task 仕様書 | P01〜P13 exact-set、digest `af8a73df…`、violations 0 |
| graph / source lineage | graph schema valid、testing architecture digest mismatch 0 |
| docs | artifact placement PASS、tracked docs 300 行上限 PASS |

`origin/main` → local `main` → 本 branch の統合後にも同じゲートと
repository CI を再実行し、仕様反映 receipt は最終 HEAD に対して生成する。

## 7. 開発内容の説明

### 中学生向け

クラス名簿に 13 人書いてあっても、それだけでは入学手続きが全部終わったとは限りません。
今回は受付の受領書と名簿を照らし合わせ、名前と人数が全部一致したときだけ
「確認済み」と表示するようにしました。受領書が無ければ、人数が 13 人でも
「確認はしていません」と正直に表示します。

### 技術者向け

renderer の progress projection（進捗投影）と registration proof（登録証拠）を
別概念として扱う。receipt の存在を verification authority とし、既存の
`_validate_registration_receipt()` を通過した場合だけ verified state を構築する。
receipt absence は fail-soft な探索用途を維持しつつ `not_performed` として可視化する。
stdout、HTML banner、埋込み metadata の三面を同じ state object から生成し、
positive/negative control で意味のずれを遮断する。

## 8. 残課題

本変更の実装・仕様反映・検証範囲に残課題はない。draft PR の URL は作成後に
Beads の completion note へ追記する。
