# タスク: dev-graph:run-dev-graph-schedule の CI 修復実走

scenario は `C15-OUT1-positive-ready-set-r16` です。被験 fixture は次の初期化済み独立
Git repository です。

`/Users/dm/orca/workspaces/HarnessHub/wt-13/eval-log/dev-graph/live-trial-fixtures/wt13-ci-schedule-20260730`

次の Skill 呼出しを最初の実行アクションにし、内部 script の直実行で skill 本体を
代替しないでください。

Skill({skill: "dev-graph:run-dev-graph-schedule", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-13/eval-log/dev-graph/live-trial-fixtures/wt13-ci-schedule-20260730 --max-parallel 2"})

## goal-seek 契約

SKILL.md の original_goal を使い、fixture の `eval-log/` に次の 3 点を作成してください。

- `run-dev-graph-schedule-goal-spec.json`
- `run-dev-graph-schedule-progress.json`
- `run-dev-graph-schedule-intermediate.jsonl`

intermediate の 1 行目は Skill 実行前に作成し、実行と検証後は 2 行目だけを append
してください。各行には `original_goal`、`original_goal_hash`、
`current_goal_snapshot`、`delta_from_original`、`merged_directive_for_next`、
`drift_signal` の 6 キーが必要です。original_goal_hash は正本文の UTF-8 SHA-256
実値にしてください。progress は全条件の実測後に completed / PASS と具体的 evidence
へ更新し、pending と evidence null を残さないでください。

実行後、fresh Agent を 1 つ fork して、被験 Skill の達成結果を独立評価させて
ください。親セッション自身の自己評価で代替せず、Agent の判定と根拠を
`eval-log/independent-verification.json` に保存してください。

## 必須検証

- 同じ `resource_scope` を競合する task 同士が同じ batch に入らないこと。
- unmet dependency のある blocked task が ready set から除外され、理由が報告されること。
- active lease が該当 task を抑止し、stale lease は回収されること。
- 各 batch が `--max-parallel 2` を守ること。
- `suggested_branch` と worktree claim command が task ごとに一意であること。
- goal-seek 3 点セットが揃い、intermediate が実行時系列どおり append-only であること。

## 完了契約

成功・失敗・中断のいずれでも、最後に次の 1 ファイルだけを書いてください。

`/Users/dm/orca/workspaces/HarnessHub/wt-13/eval-log/dev-graph/run-dev-graph-schedule/live-trial/20260730T054000Z-wt13-ci-schedule/out/status.json`

内容は `{"status":"PASS|FAIL|ERROR","scenario":"C15-OUT1-positive-ready-set-r16"}`。
`out/` には status.json 以外を書かず、最後は `DONE: <status>` の 1 行だけを報告して
ください。途中で人間へ質問せず、fixture 以外の repository を変更しないでください。
