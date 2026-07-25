# タスク: dev-graph:run-dev-graph-sync の実走 (C03-OUT1-positive-second-sync-zero)

## 最初のアクションに関する必須契約

このtaskを読んだ直後の**最初のtool call**は、必ず次のSkill呼出しにしてください。これより前にRead、Glob、Grep、Bash、Write、Task、Agentなどを1回でも使った場合は、結果が正しくても自動FAILです。まず次を呼び出してください。

Skill({skill: "dev-graph:run-dev-graph-sync", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260724-140326-wt-10/eval-log/dev-graph/live-trial-fixtures/sync-wt10-pj6-r2 と続けて --dry-run / --apply / 確認 --dry-run の3パスを同じ入力で回す（決定論remoteはfixture内.dev-graph/remote.json）"})

Skillがロードされた後は、そのSKILL.mdに従って最後まで自走してください。被験skillをBashからscript直叩きで代替してはいけません。

## goal-seek証跡

Skillロード後、fixtureへ最初の変更を加える前にoriginal goalとhashを確定し、fixtureの`eval-log/`へgoal-specとintermediateの1行目を書いてください。処理・検証後にintermediateの2行目だけをappendし、progressを完成させてください。必要な3ファイルは次です。

- `run-dev-graph-sync-goal-spec.json`
- `run-dev-graph-sync-progress.json`
- `run-dev-graph-sync-intermediate.jsonl`

## 成功条件

- 初回syncで期待したimportとexportが適用される。
- 再dry-runでimports changes=0、exports changes=0になる。
- stable IDとsnapshotが再実行で変わらない。
- goal-seek 3点セットが時系列どおり作られる。

終了時は、`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260724-140326-wt-10/eval-log/dev-graph/run-dev-graph-sync/live-trial/20260724T205545Z-pj6-sync-r2/out/status.json`だけをout/へWriteしてください。内容は`{"status":"PASS|FAIL|ERROR","scenario":"C03-OUT1-positive-second-sync-zero"}`です。その後「DONE: <status>」と1行だけ報告してください。

- 人間へ質問せず最後まで自走すること。
- skillの手順を省略・置換しないこと。
- out/にはstatus.json以外を書かないこと。
