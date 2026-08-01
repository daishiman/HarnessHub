# タスク: dev-graph:run-dev-graph-sync の実走再試験

scenario は `C03-OUT1-positive-second-sync-zero` です。被験 fixture は次の独立 Git repository です。

`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-011205-wt-2/eval-log/dev-graph/live-trial-fixtures/sync-mfh7-current`

管理対象 graph/config/content root を手で直接編集してはいけません。

## 被験 Skill

被験 skill の処理は必ず次の Skill ツール呼出しで行ってください。内部 script を Bash から直接実行して代替してはいけません。

Skill({skill: "dev-graph:run-dev-graph-sync", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-011205-wt-2/eval-log/dev-graph/live-trial-fixtures/sync-mfh7-current と続けて --dry-run / --apply / 確認 --dry-run の3パスを同じ入力で回す（決定論 remote は fixture 内 .dev-graph/remote.json）"})

## goal-seek 配線

`run-dev-graph-sync` の SKILL.md にある original_goal を使い、fixture の `eval-log/` に次の3点を作る。

- `run-dev-graph-sync-goal-spec.json`
- `run-dev-graph-sync-progress.json`
- `run-dev-graph-sync-intermediate.jsonl`

original_goal の UTF-8 SHA-256 を使い、Skill 実行前に intermediate の最初の行を新規作成し、検証後に2行目だけ append する。各行は `original_goal`、`original_goal_hash`、`current_goal_snapshot`、`delta_from_original`、`merged_directive_for_next`、`drift_signal` を持つ。2行を後からまとめて書いたり既存行を上書きしたりしない。

## 成功条件

- 1回目の sync で期待する import と export が適用される。
- 2回目の sync は imports changes=0、exports changes=0 になる。
- 2回目でも stable ID と snapshot が変化しない。
- goal-seek 3点が揃い、intermediate が時系列どおり append-only である。

## 完了契約

処理が終了（成功・失敗・中断のいずれでも）したら、次の1ファイルだけを書いてください。

`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-011205-wt-2/eval-log/dev-graph/run-dev-graph-sync/live-trial/20260727T234208Z-mfh7-current/out/status.json`

内容は `{"status":"PASS|FAIL|ERROR","scenario":"C03-OUT1-positive-second-sync-zero"}` とし、最後は「DONE: <status>」の1行だけ報告してください。

制約:

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- `out/` には `status.json` 以外を書かないこと。
