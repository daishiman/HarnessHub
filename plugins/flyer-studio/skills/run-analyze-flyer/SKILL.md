---
name: run-analyze-flyer
description: 既存チラシを最新要望に沿って診断・比較したいとき、提案評価の修正を反映したいときに使う。
kind: run
prefix: run
owner: harness maintainers
version: 1.3.0
user-invocable: true
combinators:
  - with-goal-seek
goal_seek:
  engine: inline
  fork: inline
  max_loops: 3
feedback_contract:
  max_iterations: 3
  criteria:
    - id: IN1
      loop_scope: inner
      text: analysis-validateで元画像・最新要求・保持点・要求別候補の型と指紋が揃う
      verify_by: script
    - id: OUT1
      loop_scope: outer
      text: 別contextの提案評価が同一版の観察・要求網羅・変更規律・実現性を確認し、FIXは制作へ流さない
      verify_by: evaluator
manifest: workflow-manifest.json
responsibility_refs:
  - agents/artifact-analyst.md
schema_refs:
  - ../../schemas/analysis.schema.json
reference_refs:
  - references/analysis-contract.md
  - ../../references/stage-common.md
  - ../../references/design-knowledge-index.json
---

# 現物を診断し、根拠のある改善案へまとめる

実行担当は[stage agent](agents/artifact-analyst.md)、判断の基準は[stage contract](references/analysis-contract.md)。PLUGIN_ROOT・実行形式・記録・戻り先・本質アンカー・知識の読み方・独立性は[stage-common](../../references/stage-common.md)に必ず従う。

## Purpose & Output Contract（目標と入出力）

実際の紙面から問題と長所を特定し、明示要望を落とさず、制作へ渡せる比較可能な改善案を作る。

- 入力: 既存画像/PDF/編集元の絶対パス、今回の目的、最新の必須要望と候補、素材の公開条件。premise（前提の崩れ）の必須修正が [workflow の表](../../references/workflow.md#改善と納品) に従って分析へ戻されたときは、その案 ID・画像領域・元要求 ID。
- 出力: 元画像SHA・観察領域・保持点・要求別候補と採否理由・未達に対する次行動を持つanalysis.json。

## ゴールシーク実行

進め方は [共通の判断手順](../../references/stage-common.md#共通の判断手順)。この担当では、意図の説明より先に元画像の読み順と保持点を観察し、現物の問題と処方の仮説を分けて採否を決める。共通の上限の扱いは stage-common の「戻り先と改善上限」に従う。

## Gotchas（完了判定と戻り）

元画像を個別に開き、全適用要求の判断、保持点、観察領域、必要指針ID、nextActionsが実内容で記録され、analysis-validateが通る。機械PASSは提案品質の独立承認ではない。

別contextの[提案評価](../assign-flyer-analysis-review/SKILL.md)へ渡し、FIXはここで直す。入力不足はこのstageで補い、既に許可された分析・修正を細切れの再確認へ戻さない。

提案評価の PASS 後の実行範囲は [workflow](../../references/workflow.md#stage-ごとの要点) に従う。制作まで許可済みなら制作へ進み、分析だけの依頼ならここで返す。制作の依頼が未指定のときだけ 1 回確認する。cycle-ledger.json は制作が引き継ぐ。

## 実行への接続

PLUGIN_ROOT で次を実行する。analysis-template の brief.analysisMode 切替と、提案評価テンプレート生成・再発行時の記録/退避は、この stage の準備責務（[所有と機械による付随更新](../../references/stage-common.md#所有と機械による付随更新)）。生成した台帳と同一版の分析・元画像を別担当へ渡し、評価内容は記入しない。

```text
python3 scripts/build-flyer.py analysis-template --project <DIR> --sources <SOURCES.json>
python3 scripts/build-flyer.py analysis-seal --project <DIR>
python3 scripts/build-flyer.py analysis-validate --project <DIR>
python3 scripts/build-flyer.py analysis-review-template --project <DIR>
```
