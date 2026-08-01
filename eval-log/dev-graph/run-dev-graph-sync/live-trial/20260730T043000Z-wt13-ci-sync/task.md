# タスク: dev-graph:run-dev-graph-sync の実走 (scenario C03-OUT1-positive-second-sync-zero)

この run は scenario C03-OUT1-positive-second-sync-zero の充足を確認するものです。

被験 fixture は `/Users/dm/orca/workspaces/HarnessHub/wt-13/eval-log/dev-graph/live-trial-fixtures/wt13-ci-sync-20260730` にある dev-graph 初期化済みの独立 Git repository です。

以下を実行してください:

Skill({skill: "dev-graph:run-dev-graph-sync", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-13/eval-log/dev-graph/live-trial-fixtures/wt13-ci-sync-20260730 と続けて --dry-run / --apply / 確認 --dry-run の 3 パスを同じ入力で回す (決定論 remote は fixture 内 .dev-graph/remote.json)"})

被験 skill は必ず上記 Skill ツール呼出しで起動し、内部 script の直実行で代替しないでください。

## goal-seek 配線

fixture の `eval-log/` に `run-dev-graph-sync-goal-spec.json`、`run-dev-graph-sync-progress.json`、`run-dev-graph-sync-intermediate.jsonl` を作る。skill 実行前に SKILL.md の original_goal とその SHA-256 を使った intermediate 1 行目を作り、実行・検証後に結果の 2 行目だけを append する。既存行の上書きは禁止です。

未達 responsibility の prompt を読み、`goal_seek.fork: subagent` 契約どおり `Agent` ツールで分離 context の独立検証を少なくとも 1 回実行する。トップレベルの自己検証で代替しない。

## 成功条件

- 1 回目の sync が期待どおりの取込 (import) と反映 (export) を適用する。
- 2 回目の sync が imports changes=0 / exports changes=0 を報告する。
- 2 回目の実行で stable ID と snapshot が変化しない。graph / remote / snapshot の SHA-256 を before / after で比較する。
- goal-seek 3 点セットが揃い、intermediate が append-only、全 progress が PASS である。

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. `/Users/dm/orca/workspaces/HarnessHub/wt-13/eval-log/dev-graph/run-dev-graph-sync/live-trial/20260730T043000Z-wt13-ci-sync/out/status.json` に完了マーカーを 1 ファイルだけ Write する。内容:
   `{"status": "PASS|FAIL|ERROR", "scenario": "C03-OUT1-positive-second-sync-zero"}`
2. 「DONE: <status>」と 1 行だけ報告する。

制約:

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。
- 被験 repository は上記 fixture だけ。HarnessHub 本体を変更しないこと。

## required_observations（scenario 正本の逐語転記）

1. the first sync applies the expected import and export
2. the second sync reports imports changes=0 and exports changes=0
3. stable IDs and snapshots are unchanged on the second run
