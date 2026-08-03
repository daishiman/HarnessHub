# タスク: dev-graph:run-dev-graph-requirements の実走 (scenario C04-OUT1-positive-ready-handoff)

この run は scenario `C04-OUT1-positive-ready-handoff` の充足を確認するものです。

FIXTURE = `/Users/dm/orca/workspaces/HarnessHub/wt-29-2/eval-log/dev-graph/run-dev-graph-requirements/live-trial/20260806T010000Z-f84o-postmain-c04/fixture-repo`

FIXTURE は**すでに用意済み**です (`plugins/dev-graph/tests/fixtures/build_live_trial_fixture.py --kind requirements`
が生成した正本形状。feature `F-LIVE-001` が confirmed / evaluation-pass / readiness-complete で、
`system-plan/F-LIVE-001/` に P01..P13 の exact-13 package が置かれている)。
作り直さず、package や graph store を手作業で書き換えないでください。

**この task.md を受け取った outer session 自身が、以下の全工程を連続して最後まで実行してください。
Skill 呼び出しが戻っても、親や利用者へ制御を返したり、途中報告で停止したりしてはいけません。
最後の完了マーカーを Write するまで、1 つのターンの中で走り切ってください。**

## required_observations (scenario 正本の逐語転記)

1. a capability-build task-graph handoff is emitted for the exact-13 package
2. the handoff remains bound to the feature and source digest
3. the requirements skill generates no implementation source file

## 工程 1: 実走

次の Skill 呼び出しを最初の実行アクションにし、内部 script の直実行や Task / Agent への委譲で
skill 本体を代替しないでください。package は fixture 内 `system-plan/F-LIVE-001/` を skill が解決します。

Skill({skill: "dev-graph:run-dev-graph-requirements", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-29-2/eval-log/dev-graph/run-dev-graph-requirements/live-trial/20260806T010000Z-f84o-postmain-c04/fixture-repo --feature-id F-LIVE-001"})

## 工程 2: 実走前後のファイル一覧記録 (observation 3 に必須)

Skill を呼ぶ**前に** FIXTURE 配下の全ファイル一覧を記録し、実走後に再取得して差分を取ってください。
observation 3 は「実装ソースファイルを 1 件も生成していない」ことなので、
「生成されたファイルが全て handoff / 計画成果物であって実装コードではない」ことを
差分の各エントリについて示す必要があります。「無かったはず」という主張だけにしないこと。

## 工程 3: 検証

1. exact-13 package (P01..P13) に対して capability-build の task-graph handoff が出力されたことを、
   実ファイルの内容 (13 phase が揃っていること) で確認する。件数だけでなく phase_ref の集合が
   P01..P13 と完全一致することを示すこと。
2. handoff が feature (`F-LIVE-001`) と source digest に束縛され続けていることを確認する。
   digest は package 側の記録値と handoff 側の記録値を実際に突き合わせ、値そのものを示すこと。
3. 工程 2 の差分から、実装ソースファイル (アプリケーションコード) が 1 件も生成されていないことを確認する。

## 工程 4: goal_seek 配線 (必須)

`run-dev-graph-requirements` は `goal_seek` を宣言します。SKILL.md の該当節に従い、
FIXTURE の `eval-log/` に次の 3 点を出力してください。

- `<FIXTURE>/eval-log/run-dev-graph-requirements-goal-spec.json`
- `<FIXTURE>/eval-log/run-dev-graph-requirements-progress.json`
- `<FIXTURE>/eval-log/run-dev-graph-requirements-intermediate.jsonl`

`intermediate.jsonl` は必須 6 キー (`original_goal` / `original_goal_hash` / `current_goal_snapshot` /
`delta_from_original` / `merged_directive_for_next` / `drift_signal`) を持ち、
1 行目を Skill 実行前に作成し、検証後の 2 行目だけを append してください。
2 行を後からまとめて書くこと、既存行の上書き、hash 不一致の書換えは禁止です。
`original_goal_hash` は正本文の UTF-8 SHA-256 実値にしてください。

## 完了報告

全検証後、
`/Users/dm/orca/workspaces/HarnessHub/wt-29-2/eval-log/dev-graph/run-dev-graph-requirements/live-trial/20260806T010000Z-f84o-postmain-c04/out/status.json`
に完了マーカーを 1 ファイルだけ Write してください。

```json
{"status": "PASS|FAIL|ERROR", "scenario": "C04-OUT1-positive-ready-handoff"}
```

その後、「DONE: <status>」と 1 行だけ報告してください。

## 制約

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。
- 被験 repository は FIXTURE だけ。HarnessHub 本体のファイルを変更しないこと。
- FIXTURE root には skill が作る正規成果物以外を作らないこと。
