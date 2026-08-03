# タスク: dev-graph:run-dev-graph-schedule の実走 (scenario C15-OUT1-positive-ready-set-r16)

この run は scenario `C15-OUT1-positive-ready-set-r16` の充足を確認するものです。

FIXTURE = `/Users/dm/orca/workspaces/HarnessHub/wt-29-2/eval-log/dev-graph/run-dev-graph-schedule/live-trial/20260806T010000Z-f84o-postmain-c15/fixture-repo`

FIXTURE は**すでに用意済み**です (`plugins/dev-graph/tests/fixtures/build_live_trial_fixture.py --kind schedule`
が生成した正本形状。task 6 件・resource_scope 重複ペア 1 組・未充足依存 1 本・
active lease 1 件・stale lease 1 件を含む)。作り直さず、`.dev-graph/` や lease 台帳も
書き換えないでください。

**この task.md を受け取った outer session 自身が、以下の全工程を連続して最後まで実行してください。
Skill 呼び出しが戻っても、親や利用者へ制御を返したり、途中報告で停止したりしてはいけません。
最後の完了マーカーを Write するまで、1 つのターンの中で走り切ってください。**

## required_observations (scenario 正本の逐語転記)

1. the overlapping resource_scope pair is never placed in the same batch
2. the blocked task is excluded from the ready set and the reason is reported
3. the active lease suppresses its task while the stale lease is reclaimed
4. batches respect --max-parallel and suggested_branch and worktree claim commands stay unique

## 工程 1: 実走

次の Skill 呼び出しを最初の実行アクションにし、内部 script の直実行や Task / Agent への委譲で
skill 本体を代替しないでください。

Skill({skill: "dev-graph:run-dev-graph-schedule", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-29-2/eval-log/dev-graph/run-dev-graph-schedule/live-trial/20260806T010000Z-f84o-postmain-c15/fixture-repo --max-parallel 2"})

## 工程 2: 検証

1. `resource_scope` が重複するタスクの組が、出力されたどのバッチでも**同一バッチに入っていない**ことを、
   バッチごとの scope 集合を実際に突き合わせて確認する。どのペアが重複ペアだったかを graph store の
   `resource_scope` から独立に同定してから比較すること。
2. 未充足依存を持つタスクが ready 集合から除外され、**除外理由が報告されている**ことを確認する。
   「件数が減った」ではなく、どのタスクがどの依存によって除外されたかを示すこと。
3. active lease を持つタスクが抑止され、期限切れ (stale) lease を持つタスクは回収されて
   ready 側に現れることを確認する。両者が同じ「lease あり」で潰れていないことを示すこと。
4. 各バッチのサイズが `--max-parallel 2` を超えないこと、ready タスクごとの `suggested_branch` と
   worktree claim コマンドが**すべて一意**であることを、実際に集合化して重複 0 件を確認する。

## 工程 3: goal_seek 配線 (必須)

`run-dev-graph-schedule` は `goal_seek` を宣言します。SKILL.md の該当節に従い、
FIXTURE の `eval-log/` に次の 3 点を出力してください。

- `<FIXTURE>/eval-log/run-dev-graph-schedule-goal-spec.json`
- `<FIXTURE>/eval-log/run-dev-graph-schedule-progress.json`
- `<FIXTURE>/eval-log/run-dev-graph-schedule-intermediate.jsonl`

`intermediate.jsonl` は必須 6 キー (`original_goal` / `original_goal_hash` / `current_goal_snapshot` /
`delta_from_original` / `merged_directive_for_next` / `drift_signal`) を持ち、
1 行目を Skill 実行前に作成し、検証後の 2 行目だけを append してください。
2 行を後からまとめて書くこと、既存行の上書き、hash 不一致の書換えは禁止です。
`original_goal_hash` は正本文の UTF-8 SHA-256 実値にしてください。

## 完了報告

全検証後、
`/Users/dm/orca/workspaces/HarnessHub/wt-29-2/eval-log/dev-graph/run-dev-graph-schedule/live-trial/20260806T010000Z-f84o-postmain-c15/out/status.json`
に完了マーカーを 1 ファイルだけ Write してください。

```json
{"status": "PASS|FAIL|ERROR", "scenario": "C15-OUT1-positive-ready-set-r16"}
```

その後、「DONE: <status>」と 1 行だけ報告してください。

## 制約

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。
- 被験 repository は FIXTURE だけ。HarnessHub 本体のファイルを変更しないこと。
- lease 台帳・graph store を手作業で書き換えないこと (skill が行う更新のみ許容)。
