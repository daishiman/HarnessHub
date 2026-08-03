# タスク: dev-graph:run-dev-graph-node の実走 (scenario C02-OUT1-positive-mixed-artifacts)

この run は scenario `C02-OUT1-positive-mixed-artifacts` の充足を確認するものです。

FIXTURE = `/Users/dm/orca/workspaces/HarnessHub/wt-29-2/eval-log/dev-graph/run-dev-graph-node/live-trial/20260806T010000Z-f84o-postmain-c02/fixture-repo`

FIXTURE は**すでに用意済み**です (`plugins/dev-graph/tests/fixtures/build_live_trial_fixture.py --kind node`
が生成した正本形状)。作り直さないでください。`<FIXTURE>/mixed-artifacts.json` には
**分類前の成果物素材が 5 件** (`title` / `body` / `tags` のみ) 入っています。
`artifact_kind` も `graph_node_id` も意図的に与えられていません。skill が本文から分類し、
正規 path を決めるところまでが受け入れ対象です。

**この task.md を受け取った outer session 自身が、以下の全工程を連続して最後まで実行してください。
Skill 呼び出しが戻っても、親や利用者へ制御を返したり、途中報告で停止したりしてはいけません。
最後の完了マーカーを Write するまで、1 つのターンの中で走り切ってください。**

## required_observations (scenario 正本の逐語転記)

1. all five artifacts are routed to canonical kind paths
2. frontmatter kind and stored path agree after a consecutive update
3. no feature is created outside the C14 macro-feature contract

## 工程 1: 1 回目の実走 (5 件の追加)

次の Skill 呼び出しを最初の実行アクションにし、内部 script の直実行や Task / Agent への委譲で
skill 本体を代替しないでください。

Skill({skill: "dev-graph:run-dev-graph-node", args: "add --repo-root /Users/dm/orca/workspaces/HarnessHub/wt-29-2/eval-log/dev-graph/run-dev-graph-node/live-trial/20260806T010000Z-f84o-postmain-c02/fixture-repo --input /Users/dm/orca/workspaces/HarnessHub/wt-29-2/eval-log/dev-graph/run-dev-graph-node/live-trial/20260806T010000Z-f84o-postmain-c02/fixture-repo/mixed-artifacts.json"})

素材の複製が必要なときは `<FIXTURE>/inputs/` を使ってください (この用途で用意された staging です)。
graph と artifact は C02 の正規 writer 以外で書かないこと。

## 工程 2: 連続更新 (observation 2 に必須)

1 回目の登録が終わったら、**同じ skill をもう一度使って** 5 件それぞれを 1 回更新してください
(例: `title` の末尾に ` (updated)` を加える等)。`artifact_kind` と格納 path は変えないこと。
これは「連続更新の後でも frontmatter の kind と格納 path が一致し続ける」ことを見る工程です。
`Write` / `Edit` / shell redirect で artifact や graph を直接書き換えないこと。

## 工程 3: 検証

1. 5 件が正規 root へ写像されたことを実 path で確認する
   (issue→`issues/`、task→`tasks/`、specification→`specs/`、architecture→`architecture/`、document→`docs/`)。
   素材 5 件がそれぞれどの kind へ分類され、なぜその kind なのかを本文の根拠とともに示すこと。
2. 更新後の各 artifact の frontmatter の kind と、graph store の `artifact_kind` / `file_path`、
   および実ファイルの格納先が一致していることを **5 件すべてについて** 確認する。
3. graph store に `artifact_kind=feature` のノードが 1 件も作られていないこと
   (C14 macro-feature 契約の外で feature を作っていないこと) を確認する。

## 工程 4: goal_seek 配線 (必須)

`run-dev-graph-node` は `goal_seek` を宣言します。SKILL.md の該当節に従い、
FIXTURE の `eval-log/` に次の 3 点を出力してください。

- `<FIXTURE>/eval-log/run-dev-graph-node-goal-spec.json`
- `<FIXTURE>/eval-log/run-dev-graph-node-progress.json`
- `<FIXTURE>/eval-log/run-dev-graph-node-intermediate.jsonl`

`intermediate.jsonl` は必須 6 キー (`original_goal` / `original_goal_hash` / `current_goal_snapshot` /
`delta_from_original` / `merged_directive_for_next` / `drift_signal`) を持ち、
1 行目を Skill 実行前に作成し、検証後の 2 行目だけを append してください。
2 行を後からまとめて書くこと、既存行の上書き、hash 不一致の書換えは禁止です。
`original_goal_hash` は正本文の UTF-8 SHA-256 実値にしてください。

## 完了報告

全検証後、
`/Users/dm/orca/workspaces/HarnessHub/wt-29-2/eval-log/dev-graph/run-dev-graph-node/live-trial/20260806T010000Z-f84o-postmain-c02/out/status.json`
に完了マーカーを 1 ファイルだけ Write してください。

```json
{"status": "PASS|FAIL|ERROR", "scenario": "C02-OUT1-positive-mixed-artifacts"}
```

その後、「DONE: <status>」と 1 行だけ報告してください。

## 制約

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。
- 被験 repository は FIXTURE だけ。HarnessHub 本体のファイルを変更しないこと。
- FIXTURE root には skill が作る正規ディレクトリ以外を作らない。
