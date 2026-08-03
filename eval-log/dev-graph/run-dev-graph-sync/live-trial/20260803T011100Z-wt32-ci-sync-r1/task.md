# タスク: dev-graph:run-dev-graph-sync の CI 証跡再実走

scenario `C03-OUT1-positive-second-sync-zero` を独立 fixture `/Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/live-trial-fixtures/20260803-wt32-ci-sync-r1` だけで検証する。途中で質問せず最後まで自走し、skill の手順を省略しない。

この task を読んだ直後の最初の tool call は必ず次の Skill 呼出しにする。Skill より前に Read、Agent、Bash を呼ばず、内部 script 直実行で Skill 本体を代替しない。

この run は scenario C03-OUT1-positive-second-sync-zero の充足を確認するものです。

## required_observations（scenario 正本の逐語転記）

1. the first sync applies the expected import and export
2. the second sync reports imports changes=0 and exports changes=0
3. stable IDs and snapshots are unchanged on the second run

Skill({skill: "dev-graph:run-dev-graph-sync", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/live-trial-fixtures/20260803-wt32-ci-sync-r1 と続けて --dry-run / --apply / 確認 --dry-run の 3 パスを同じ入力で回す (決定論 remote は fixture 内 .dev-graph/remote.json)"})

Skill 起動後は `goal_seek.engine=inline` / `fork=subagent` を省略せず、未達 responsibility の prompt を読み、Agent tool で分離 context の subagent を少なくとも 1 回呼ぶ。分離 Agent は fixture の final graph / remote / sync-snapshot と該当回帰 test だけを独立確認し、初回 import/export 件数、2 回目 changes=0、stable digest、PASS/FAIL を返す。

fixture `eval-log/` の goal-seek 3 点は exact filename を使う。`run-dev-graph-sync-goal-spec.json`、`run-dev-graph-sync-progress.json`、`run-dev-graph-sync-intermediate.jsonl`。intermediate 初回行を実行前に作り、実行後の行だけ append する。全行が original_goal/hash と必須 6 key を持つ。progress は完了 checklist と feedback criteria を具体的 evidence へ束縛し、pending/N/A/null を残さない。

最初の sync は dry-run 後に apply し、同じ入力の確認 dry-run で import/export changes=0 を測る。2 回目の前後で stable ID、graph、remote、sync-snapshot の digest が不変であることを確認する。外部 GitHub API を呼ばず fixture remote だけを使う。

HarnessHub 本体を変更せず、`out/` には最後の status 1 件だけを書く。全工程後、`/Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/run-dev-graph-sync/live-trial/20260803T011100Z-wt32-ci-sync-r1/out/status.json` へ `{"status":"PASS|FAIL|ERROR","scenario":"C03-OUT1-positive-second-sync-zero"}` を Write し、「DONE: <status>」と 1 行だけ報告する。

制約:
- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。
