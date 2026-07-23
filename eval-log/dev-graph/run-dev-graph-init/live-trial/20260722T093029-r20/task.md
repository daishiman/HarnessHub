# タスク: dev-graph:run-dev-graph-init の初回初期化 + 冪等再初期化 (scenario C01-OUT1-positive-idempotence-r17)

被験 fixture は `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260722-wt-7r2/eval-log/dev-graph/live-trial-fixtures/init` にある **dev-graph 未初期化の独立 Git repository** です。content root も `.dev-graph/` もまだ存在しません。

以下を実行してください:

## pass 1 (初回初期化)

Skill({skill: "dev-graph:run-dev-graph-init", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260722-wt-7r2/eval-log/dev-graph/live-trial-fixtures/init --hook-source plugin。必ず prompts/R1-elicit.md から R5-hooks.md までを読み、R1/R2/R3/R4/R5 を少なくとも 5 件の別々の Agent tool call へ fork してから統合する"})

## goal-seek 配線の必須履行 (省略禁止)

`run-dev-graph-init` は frontmatter で `goal_seek` を宣言する skill です。SKILL.md の ## ゴールシーク実行 が定める実行契約に従い、`$DEV_GRAPH_ROOT/eval-log/`（= `eval-log/dev-graph/live-trial-fixtures/init/eval-log/`）へ **3 点セットを必ず全て書き出す**こと。1 つでも欠けると受け入れは機械 gate で DEGRADED に降格される:

- `run-dev-graph-init-goal-spec.json` (original_goal と checklist)
- `run-dev-graph-init-progress.json` (各 checklist の status/evidence) ← **前回これが欠落した。必ず書く**
- `run-dev-graph-init-intermediate.jsonl` (各周回末に original_goal / original_goal_hash / current_goal_snapshot / delta_from_original / merged_directive_for_next / drift_signal の 6 キーを append)

## pass 1 と pass 2 の間 (scenario 前提の作り込み)

1. pass 1 が `.dev-graph/templates/` へ scaffold した canonical template のうち 1 件を選び、**利用者編集として本文を書き換える**。編集前後の SHA-256 を両方記録する。
2. `dev-graph:run-dev-graph-node` を使って task を 1 件登録する。graph.json を直接書かない (C02 の atomic writer 以外の書込みは hook が遮断する)。

## pass 2 (冪等再初期化)

pass 1 と同じ引数で `dev-graph:run-dev-graph-init` の Skill を**もう一度呼ぶ**。ファイルの有無を自分で調べて「変わっていないはず」と判断してはいけない。

## 成功条件 (すべて実測値で示すこと)

- pass 1 が issues/tasks/specs/architecture/features/docs の 6 root と routing policy と graph store を作った。
- pass 2 が planned_changes=0 / created=[] を報告した。
- 編集した template の SHA-256 が pass 2 の後も編集後の値のまま (init を実際に走らせて示す)。
- plugin hook source が解決され receipt か却下診断が記録された。
- `.dev-graph/config.json` に絶対 path・token・GitHub node ID が 1 件も無い。
- validate-graph-schema.py が exit 0 で graph に node が 1 件以上ある。
- goal-seek 3 点セット (goal-spec / progress / intermediate) が全て書き出されている。
- transcript に target Skill 呼び出しが 2 回 (pass1/pass2) と R1〜R5 の Agent fork が 5 件以上ある。

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260722-wt-7r2/eval-log/dev-graph/run-dev-graph-init/live-trial/20260722T093029-r20/out/status.json` に完了マーカーを 1 ファイルだけ Write する。内容:
   {"status": "PASS|FAIL|ERROR", "scenario": "C01-OUT1-positive-idempotence-r17"}
2. 「DONE: <status>」と 1 行だけ報告する。

制約:
- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。
