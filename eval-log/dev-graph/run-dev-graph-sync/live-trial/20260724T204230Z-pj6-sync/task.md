# タスク: dev-graph:run-dev-graph-sync の実走 (scenario C03-OUT1-positive-second-sync-zero)

被験 fixture は `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260724-140326-wt-10/eval-log/dev-graph/live-trial-fixtures/sync-wt10-pj6` にある dev-graph 初期化済みの独立 Git repository です。

以下を実行してください:

Skill({skill: "dev-graph:run-dev-graph-sync", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260724-140326-wt-10/eval-log/dev-graph/live-trial-fixtures/sync-wt10-pj6 と続けて --dry-run / --apply / 確認 --dry-run の3パスを同じ入力で回す（決定論remoteはfixture内.dev-graph/remote.json）"})

**被験 skill の実行は必ず上記 Skill ツール呼出しで行うこと（最初の実行アクションにする）。** `plugins/dev-graph/scripts/` 配下の script を Bash から直接実行して skill 本体を代替してはならない。goal-seek 配線の書き出しに限り Write/Bash を使ってよい。

## goal-seek 配線の必須履行

`run-dev-graph-sync` の `## ゴールシーク実行` に従い、fixture の `eval-log/` へ次の3点をすべて書き出してください。

- `run-dev-graph-sync-goal-spec.json`
- `run-dev-graph-sync-progress.json`
- `run-dev-graph-sync-intermediate.jsonl`

intermediate は必須6キーを持ち、skill実行前に正しいoriginal goal hashを持つ1行目を作成し、実行・検証後に2行目だけをappendしてください。2行を後からまとめて作成したり既存行を書き換えたりしないでください。

## 成功条件

- 最初のsyncで期待したimportとexportが適用される。
- 2回目のsyncでimports changes=0、exports changes=0になる。
- 2回目もstable IDとsnapshotが変わらない。
- goal-seek 3点セットが実行時系列どおりに作成される。

処理が終了（成功・失敗・中断のいずれでも）したら:

1. `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260724-140326-wt-10/eval-log/dev-graph/run-dev-graph-sync/live-trial/20260724T204230Z-pj6-sync/out/status.json` に完了マーカーを1ファイルだけWriteする。内容は `{"status":"PASS|FAIL|ERROR","scenario":"C03-OUT1-positive-second-sync-zero"}`。
2. 「DONE: <status>」と1行だけ報告する。

制約:

- 途中で人間に質問せず最後まで自走すること。
- skillの手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/にはstatus.json以外を書かないこと。
