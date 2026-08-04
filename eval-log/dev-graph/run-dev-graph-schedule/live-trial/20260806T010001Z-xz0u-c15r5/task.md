# タスク: dev-graph:run-dev-graph-schedule の実走 (scenario C15-OUT1-positive-ready-set-r16)

この run は scenario `C15-OUT1-positive-ready-set-r16` の fresh acceptance です。

FIXTURE = `/Users/dm/orca/workspaces/HarnessHub/wt-24-2/eval-log/dev-graph/run-dev-graph-schedule/live-trial/20260806T010001Z-xz0u-c15r5/fixture-repo`

## 最初の実行アクション（絶対条件）

**この task.md を読む Read の直後、次の literal Skill 呼び出しをあなたの次の tool call にしてください。**
Skill の前に Bash、Read、Write、Edit、Task、Agent、Glob、Grep を一度でも呼ぶと、この試行は
無効です。fixture を先に確認したり、実行計画を説明したりしてはいけません。

Skill({skill: "dev-graph:run-dev-graph-schedule", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-24-2/eval-log/dev-graph/run-dev-graph-schedule/live-trial/20260806T010001Z-xz0u-c15r5/fixture-repo --max-parallel 2"})

その Skill が戻った後だけ、以下の検証を実行してください。FIXTURE はすでに
`build_live_trial_fixture.py --kind schedule` で作成済みです。作り直さず、graph store と
lease 台帳を手作業で書き換えないでください。

## required_observations (scenario 正本の逐語転記)

1. the overlapping resource_scope pair is never placed in the same batch
2. the blocked task is excluded from the ready set and the reason is reported
3. the active lease suppresses its task while the stale lease is reclaimed
4. batches respect --max-parallel and suggested_branch and worktree claim commands stay unique

## Skill 後の独立検証

1. graph store の `resource_scope` から重複ペアを独立に同定し、その二者が同じ batch に
   いないことを確認する。
2. 未充足依存を持つ task が ready から除外され、task と `blocking_depends_on` を含む理由が
   report にあることを確認する。
3. active lease task は抑止、stale lease task は reclaim され ready 側にあることを確認する。
4. batch size が 2 以下で、ready task の `suggested_branch` と worktree claim command が
   すべて一意であることを集合比較で確認する。

## goal_seek 配線

Skill が戻った直後に作成する 1 行と、上記検証後に append した 1 行だけからなる次の成果物を
FIXTURE の `eval-log/` に作成してください。最初の行を作る前に独立検証を始めてはいけません。

- `run-dev-graph-schedule-goal-spec.json`
- `run-dev-graph-schedule-progress.json`
- `run-dev-graph-schedule-intermediate.jsonl`

各 intermediate 行は `original_goal`、`original_goal_hash`、`current_goal_snapshot`、
`delta_from_original`、`merged_directive_for_next`、`drift_signal` を持ち、hash は
original_goal の UTF-8 SHA-256 実値にしてください。2 行を後からまとめて書いたり、
既存行を上書きしたりしてはいけません。

## 完了

途中で人間に質問・報告せず、skill の手順に忠実に最後まで自走してください。全検証後、
`/Users/dm/orca/workspaces/HarnessHub/wt-24-2/eval-log/dev-graph/run-dev-graph-schedule/live-trial/20260806T010001Z-xz0u-c15r5/out/status.json`
へこの 1 ファイルだけを Write してください。

```json
{"status": "PASS|FAIL|ERROR", "scenario": "C15-OUT1-positive-ready-set-r16"}
```

最後に `DONE: <status>` とだけ報告してください。HarnessHub 本体、実 GitHub、実 Beads は変更禁止です。
