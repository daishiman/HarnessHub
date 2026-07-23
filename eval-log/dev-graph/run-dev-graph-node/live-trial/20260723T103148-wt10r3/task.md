# タスク: dev-graph:run-dev-graph-node の通常5 artifact正経路実走 (scenario C02-OUT1-positive-mixed-artifacts)

被験 fixture は `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-203015-wt-10/eval-log/dev-graph/live-trial-fixtures/node` にある dev-graph 初期化済みの独立 Git repository です。

fixture repo 内 `mixed-artifacts.json` に、内容から一意に分類できる issue、task、specification(API変更を含む)、architecture(backend+security)、document の5入力を1バッチで作成してください。次に dry-run ではなく C02 の正規経路で、**必ず下記の Skill 呼出し経由**で登録してください (script を直叩きせず、Skill を起動してその手順に従うこと):

Skill({skill: "dev-graph:run-dev-graph-node", args: "add --repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-203015-wt-10/eval-log/dev-graph/live-trial-fixtures/node --input /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-203015-wt-10/eval-log/dev-graph/live-trial-fixtures/node/mixed-artifacts.json"})

その後 batch 内 issue だけ本文を追記して同じ Skill 呼出しで連続更新し、graph_node_id と正規 path が不変であることを確認してください。さらに feature らしい通常入力の直接 add は C14 package 契約なしとして fail-closed になり、features/ へ直登録されないことを確認してください。最終 graph を C11 で検証し、5 kind の frontmatter/path、architecture subtype、API specification の必須 section、直接 feature 登録0件を機械確認してください。

## goal-seek 配線の必須履行 (省略禁止)

`run-dev-graph-node` は frontmatter で `goal_seek` を宣言します。**Skill の ## ゴールシーク実行 の手順どおり**、`$DEV_GRAPH_ROOT/eval-log/` (= `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-203015-wt-10/eval-log/dev-graph/live-trial-fixtures/node/eval-log/`) へ 3 点セット (`run-dev-graph-node-goal-spec.json` / `-progress.json` / `-intermediate.jsonl`、intermediate は 6 キー) を全て書き出すこと。3 点セットは skill の手順に従って生成し、`intermediate.jsonl` の `original_goal_hash` は同 `original_goal` 文字列の sha256 と整合していること (Skill の手順が保証する形で書き出す)。

## 成功条件 (すべて実測値で示すこと)

- 5 kind (issue/task/specification/architecture/document) が正しい artifact_kind で登録され、graph に 5 node が存在する。
- 連続更新で graph_node_id と正規 path が不変。
- feature 直登録は C14 契約なしで fail-closed (features/ へ 0 件登録)。
- 最終 graph が C11 valid。
- goal-seek 3 点セットが全て書き出され、original_goal_hash が original_goal の sha256 と一致する。

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-203015-wt-10/eval-log/dev-graph/run-dev-graph-node/live-trial/20260723T103148-wt10r3/out/status.json` に完了マーカーを 1 ファイルだけ Write する。内容:
   {"status": "PASS|FAIL|ERROR", "scenario": "node-five-artifact-positive"}
2. 「DONE: <status>」と 1 行だけ報告する。

制約:
- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。**特に登録は必ず Skill({skill: "dev-graph:run-dev-graph-node", ...}) 経由で行い、upsert-node.py 等の script を直接叩かないこと。**
- out/ には status.json 以外を書かないこと。
