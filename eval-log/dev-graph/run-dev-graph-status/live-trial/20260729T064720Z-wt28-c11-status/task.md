# タスク: dev-graph:run-dev-graph-status の実走 (scenario C18-OUT1-positive-read-only-status)

## 最重要 — Skill ツールの起動が本 trial の測定対象 (これを外すと trial 全体が無効)

本 trial は **skill をその入口から起動したときの挙動**を計測します。次を **Skill ツールとして実際に呼び出してください**。

Skill({skill: "dev-graph:run-dev-graph-status", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-28/eval-log/dev-graph/live-trial-fixtures/wt28-status"})

次の代替は**いずれも不可**です。これらで代替した場合、成果物が正しくても trial は launch=FAIL として破棄されます:

- SKILL.md や `prompts/R1-elicit.md` などを読んで手順を自分で再現する
- `plugins/dev-graph/scripts/` 配下の script (`resolve-repo-context.py` / `validate-graph-schema.py` / `status-graph.py` など) を Bash から直接叩いて skill 本体を代替する
- Task / Agent ツールへ委譲する

transcript に `Skill` ツールの起動が **1 件以上**現れることが必須条件です。SKILL.md を参照するのは Skill 起動後の手順確認としては構いませんが、Skill 起動そのものを省略してはいけません。

## 被験対象

被験 fixture は `/Users/dm/orca/workspaces/HarnessHub/wt-28/eval-log/dev-graph/live-trial-fixtures/wt28-status` にある dev-graph 初期化済みの独立 Git repository です。

## goal-seek 配線の必須履行 (省略禁止)

`run-dev-graph-status` は `goal_seek` を宣言します。SKILL.md の `## ゴールシーク実行` に従い、`/Users/dm/orca/workspaces/HarnessHub/wt-28/eval-log/dev-graph/live-trial-fixtures/wt28-status/eval-log/` へ 3 点セット (`run-dev-graph-status-goal-spec.json` / `run-dev-graph-status-progress.json` / `run-dev-graph-status-intermediate.jsonl`、intermediate は必須 6 キー) をすべて書き出してください。

`intermediate.jsonl` は実行途中の証拠です。次を厳守してください:

1. skill 実行前に SKILL.md の original_goal を goal-spec へ書き、その同じ文字列から UTF-8 SHA-256 を計算する。
2. skill 実行前に、計算済みの正しい hash を持つ最初の intermediate 行を新規作成する。
3. skill 実行と検証後に、結果を持つ2行目だけを append（末尾追加）する。
4. 2行を後からまとめて書かない。既存行の Edit / Update / 全体上書きはしない。hash 検証に失敗した場合は書き換えず FAIL とする。

## 成功条件 (すべて実測値で示すこと)

- the reported status, closed_at and dependency edges equal the values stored in the graph store, compared field by field rather than by summary count
- the dependent task is reported as blocked by its predecessor and the predecessor as ready
- the run leaves graph, config, content and GitHub state unchanged
- goal-seek 3 点セットがすべて書き出され、intermediate は実行時系列どおりの append-only である。

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. `/Users/dm/orca/workspaces/HarnessHub/wt-28/eval-log/dev-graph/run-dev-graph-status/live-trial/20260729T064720Z-wt28-c11-status/out/status.json` に完了マーカーを 1 ファイルだけ Write する。内容:
   `{"status": "PASS|FAIL|ERROR", "scenario": "C18-OUT1-positive-read-only-status"}`
2. 「DONE: <status>」と 1 行だけ報告する。

制約:

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと (中間生成物は skill 側の出力先 (WORK_DIR 外) へ)。

## required_observations（scenario 正本の逐語転記）

1. the reported status, closed_at and dependency edges equal the values stored in the graph store, compared field by field rather than by summary count
2. the dependent task is reported as blocked by its predecessor and the predecessor as ready
3. the run leaves graph, config, content and GitHub state unchanged
