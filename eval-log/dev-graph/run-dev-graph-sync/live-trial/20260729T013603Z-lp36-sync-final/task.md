# タスク: dev-graph:run-dev-graph-sync の最終実走

scenario は `C03-OUT1-positive-second-sync-zero` です。被験 fixture は次の初期化済み独立
Git repository です。

`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/live-trial-fixtures/sync-lp36-final`

次の Skill 呼出しを最初の実行アクションにし、内部 script の直実行で skill 本体を
代替しないでください。

Skill({skill: "dev-graph:run-dev-graph-sync", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/live-trial-fixtures/sync-lp36-final と続けて --dry-run / --apply / 確認 --dry-run の 3 パスを同じ入力で回す（決定論 remote は fixture 内 .dev-graph/remote.json）"})

## goal-seek 契約

SKILL.md の original_goal を使い、fixture の `eval-log/` に次の 3 点を作成してください。

- `run-dev-graph-sync-goal-spec.json`
- `run-dev-graph-sync-progress.json`
- `run-dev-graph-sync-intermediate.jsonl`

intermediate の 1 行目は Skill 実行前に作成し、実行と検証後は 2 行目だけを append
してください。各行には `original_goal`、`original_goal_hash`、
`current_goal_snapshot`、`delta_from_original`、`merged_directive_for_next`、
`drift_signal` の 6 キーが必要です。original_goal_hash は正本文の UTF-8 SHA-256
実値にしてください。progress は全条件の実測後に completed / PASS と具体的 evidence
へ更新し、pending と evidence null を残さないでください。

## 必須検証

- 1 回目の sync が期待する import と export を実際に適用すること。
- 2 回目の sync が imports changes=0 / exports changes=0 を報告すること。
- 2 回目で stable ID と graph / remote / snapshot の SHA-256 が不変であること。
- goal-seek 3 点セットが揃い、intermediate が実行時系列どおり append-only であること。
- 外部 GitHub API には接続せず、fixture 内の決定論 remote だけを使うこと。

## 完了契約

成功・失敗・中断のいずれでも、最後に次の 1 ファイルだけを書いてください。

`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/run-dev-graph-sync/live-trial/20260729T013603Z-lp36-sync-final/out/status.json`

内容は `{"status":"PASS|FAIL|ERROR","scenario":"C03-OUT1-positive-second-sync-zero"}`。
`out/` には status.json 以外を書かず、最後は `DONE: <status>` の 1 行だけを報告して
ください。途中で人間へ質問せず、fixture 以外の repository を変更しないでください。
