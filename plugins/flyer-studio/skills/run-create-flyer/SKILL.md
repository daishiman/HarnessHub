---
name: run-create-flyer
description: 確認済み案件や承認済み提案から制作したいとき、完成評価を受けて修正したいときに使う。
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
      text: 描画前の基準・入力・承認・素材と、描画後の機械検査が最新の成果物に対してすべて成立する
      verify_by: script
    - id: OUT1
      loop_scope: outer
      text: 別contextの画像評価で適用全必須条件がPASSとなり、改善予算内で納品できる。未達はINCOMPLETEとして返す
      verify_by: evaluator
manifest: workflow-manifest.json
responsibility_refs:
  - agents/flyer-producer.md
  - ../../prompts/design.md
  - ../../prompts/background.md
schema_refs:
  - ../../schemas/brief.schema.json
  - ../../schemas/concepts.schema.json
  - ../../schemas/design-intent.schema.json
  - ../../schemas/scene.schema.json
reference_refs:
  - references/production-contract.md
  - ../../references/stage-common.md
  - ../../references/design-knowledge-index.json
---

# 目的に合わせて制作し、採用済み改善を実物へ反映する

実行担当は[stage agent](agents/flyer-producer.md)、判断の基準は[stage contract](references/production-contract.md)。PLUGIN_ROOT・実行形式・記録・戻り先・本質アンカー・知識の読み方・独立性は[stage-common](../../references/stage-common.md)に必ず従う。

## Purpose & Output Contract（目標と入出力）

読者の価値と行動を伝え、保持条件と採用要求を実画像で成立させ、全案を最新証拠で納品する。

- 入力: 確認済みbrief/assets/concepts/scene。既存修正は同一baselineと要求へ結び付くanalysis.jsonと独立PASSのanalysis-review.json。完成評価から戻った必須修正（fixClass 付き）。
- 出力: 理由を伴う編集元/designIntent、要求採否のbrief.feedback、凍結入力からの新PDF/PNG・機械検査・評価テンプレート。全案の独立PASS後に finalize した納品成果。

## ゴールシーク実行

進め方は [共通の判断手順](../../references/stage-common.md#共通の判断手順)。この担当では、採用要求と保持点を実レイヤーへ対応させ、構図・書体・背景の候補を比較して採用/見送りを designIntent へ残し、選んだ処方を実際に制作する。処方の制約は stage contract、共通の上限は stage-common の「戻り先と改善上限」に従う。

様式は intake で決まった brief.stylePreferences（提案を経た案件では style-proposals.json の chosen も）を起点に、[design prompt](../../prompts/design.md) に従って案ごとに具体化し、採った理由を designIntent へ残す。様式が未確定なら制作で決めず、[ヒアリングの手順 7](../run-intake-flyer/SKILL.md#手順) へ戻して回答から作った案を選んでもらう（評価 FIX ではないので cycle を消費しない）。

## Gotchas（完了判定と戻り）

必須事実・素材条件・採否が揃い、validate→render→verifyが成功。処理中の入力/素材/実装変更は失効扱い。制作の自己確認を独立合格に置き換えない。

新PDF由来PNGと評価テンプレートを[完成画像評価](../assign-flyer-review/SKILL.md)へ渡し、全担当の結果が揃うまで変更しない。FIX は fixClass で決まる戻り先どおりに受ける。全案の最新独立PASSと必須修正0が揃ったら、この stage が finalize する。

## 実行への接続

PLUGIN_ROOT で次を実行する。評価テンプレート（pilot-review.json・visual-review.json の雛形）の生成と finalize はこの stage の責務で、評価担当は記入だけを行う。

```text
python3 scripts/build-flyer.py validate --project <DIR>
python3 scripts/build-flyer.py render --project <DIR> [--id <pilot案ID>]
python3 scripts/build-flyer.py pilot-review-template --project <DIR>
python3 scripts/build-flyer.py verify --project <DIR>
python3 scripts/build-flyer.py review-template --project <DIR>
python3 scripts/build-flyer.py finalize --project <DIR>
```

executionPlanがあれば先にpilot案だけを描き、pilot-review-templateの台帳をassign-flyer-reviewへ渡す。その独立PASSの後に残りの案を描く。

修正後に評価テンプレートを出し直すと、前の評価は cycle 台帳へ記録されてから reviews/<時刻>/ へ退避され、新しい台帳には [評価コストの原則](../../references/review-rubric.md#評価コストの原則) に従って前の PASS が引き継がれる。退避した評価や台帳を手で書き換えない。残りの予算は `cycle-status` で確かめる。

新規案件は[ヒアリング](../run-intake-flyer/SKILL.md)で brief を確定してから始める。案件の作成（doctor・init）は[runtime のコマンド一覧](../../references/runtime.md#コマンド一覧)。既存紙面を直す案件は analysis-template で analysisMode を source-artifact に切り替え、現物診断→提案評価→制作へ進む。brief から新規に作る案件（new-from-brief）は分析の 2 段を飛ばして制作へ進む。

本質基準は旧案件を含めて必須。欠落時は元の依頼文と確認済み事実を取り直し、runtime の essence-baseline で固定してから再開する。基準なしの描画・納品や、無承認での基準の再作成は行わない。
