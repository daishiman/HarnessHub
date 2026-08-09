# タスク: dev-graph:run-dev-graph-status の実走 (scenario C18-OUT1-positive-read-only-status)

この run は scenario `C18-OUT1-positive-read-only-status` の充足を確認するものです。

FIXTURE = `/Users/dm/orca/workspaces/HarnessHub/wt-27-3/eval-log/dev-graph/run-dev-graph-status/live-trial/20260808T183313-wt27-c18-final/fixture-repo`

FIXTURE は**すでに用意済み**です (`plugins/dev-graph/tests/fixtures/build_live_trial_fixture.py --kind status`
が生成した正本形状)。作り直したり、内容を書き換えたりしないでください。同一 lifecycle state の
task node が 2 件あり、その間に前方依存が 1 本だけあります。

**この task.md を受け取った outer session 自身が、以下の全工程を連続して最後まで実行してください。
Skill 呼び出しが戻っても、親や利用者へ制御を返したり、途中報告で停止したりしてはいけません。
最後の完了マーカーを Write するまで、1 つのターンの中で走り切ってください。**

## required_observations (scenario 正本の逐語転記)

1. the reported status, closed_at and dependency edges equal the values stored in the graph store, compared field by field rather than by summary count
2. the dependent task is reported as blocked by its predecessor and the predecessor as ready
3. the run leaves graph, config, content and GitHub state unchanged

## 工程 1: skill の実走

次の Skill 呼び出しを最初の実行アクションにし、内部 script の直実行や Task / Agent への委譲で
skill 本体を代替しないでください。

Skill({skill: "dev-graph:run-dev-graph-status", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-27-3/eval-log/dev-graph/run-dev-graph-status/live-trial/20260808T183313-wt27-c18-final/fixture-repo"})

SKILL.md の手順どおり、C24 (`resolve-repo-context.py --mode read`) で `DEV_GRAPH_ROOT` を固定し、
C11 (`validate-graph-schema.py`) の read-only validation を通してから `status-graph.py` を実行して
ください。filter は AND のまま緩めないでください。gate が PASS した事実だけで完了申告することは
契約違反です。実際の検索 report を得てください。

## 工程 2: 検証

1. skill が返した report の各 node について、`graph_node_id` / `status` / `closed_at` /
   `depends_on` / `dependents` を、`.dev-graph/state/graph.json` に格納された実値と
   **フィールド単位で 1 対 1 に突き合わせて**示す。「2 件とも一致」のような件数サマリでは
   不十分で、各フィールドの report 側実値と graph store 側実値を並べて示すこと。
   結果を `<FIXTURE>/eval-log/status-report.json` へ保存すること。
2. 後続 task が先行 task によって blocked と報告され、先行 task が ready と報告されることを示す。
   どちらの node がどちらであるかを node id で明示し、その判定根拠となる依存辺の向き
   (`depends_on` / `dependents` の実値) を示すこと。2 件の lifecycle state が同一であることも
   示し、ready/blocked の差が status ではなく依存辺から導かれていることを明らかにすること。
   結果を `<FIXTURE>/eval-log/readiness-comparison.json` へ保存すること。
3. この run が graph / config / content / GitHub の状態を一切変更していないことを示す。
   skill 実行**前後**で `.dev-graph/state/graph.json`・`.dev-graph/config.json`・
   `tasks/` 配下の node markdown の SHA-256 を取得し、前後の実値を並べて同一であることを示すこと
   (「read-only のはず」ではなく実測ハッシュを根拠にすること)。あわせて `git status --porcelain`
   を FIXTURE 内で実行し、`eval-log/` 配下以外に差分が出ていないことを示すこと。GitHub / `gh` /
   Beads コマンドが 1 度も呼ばれていないことも明示すること。
   結果を `<FIXTURE>/eval-log/side-effect-audit.json` へ保存すること。

## 工程 3: goal_seek 配線 (必須)

`run-dev-graph-status` は `goal_seek` を宣言します。SKILL.md の「ゴールシーク配線」節に従い、
FIXTURE の `eval-log/` に次の 3 点を出力してください。

- `<FIXTURE>/eval-log/run-dev-graph-status-goal-spec.json`
- `<FIXTURE>/eval-log/run-dev-graph-status-progress.json`
- `<FIXTURE>/eval-log/run-dev-graph-status-intermediate.jsonl`

`intermediate.jsonl` は必須 6 キー (`original_goal` / `original_goal_hash` / `current_goal_snapshot` /
`delta_from_original` / `merged_directive_for_next` / `drift_signal`) を持ち、
1 行目を Skill 実行前に作成し、検証後の 2 行目だけを append してください。
2 行を後からまとめて書くこと、既存行の上書き、hash 不一致の書換えは禁止です。
`original_goal_hash` は `goal-spec.json` の `original_goal` 正本文の UTF-8 SHA-256 実値にしてください。
SKILL.md「ゴールシーク検証」節の検査スクリプトを実際に実行して通過を確認してください。

## 完了報告

全検証後、
`/Users/dm/orca/workspaces/HarnessHub/wt-27-3/eval-log/dev-graph/run-dev-graph-status/live-trial/20260808T183313-wt27-c18-final/out/status.json`
に完了マーカーを 1 ファイルだけ Write してください。

```json
{"status": "PASS|FAIL|ERROR", "scenario": "C18-OUT1-positive-read-only-status"}
```

その後、「DONE: <status>」と 1 行だけ報告してください。

## 制約

- 途中で人間に質問せず最後まで自走すること (`AskUserQuestion` は使わない)。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと (中間生成物は FIXTURE 内の `eval-log/` へ)。
- 被験 repository は FIXTURE だけ。HarnessHub 本体のファイルを変更しないこと。
- 実 GitHub API / `gh` / 実 Beads へアクセスしないこと。
- fixture の graph store・config・node markdown を手作業で書き換えないこと
  (status は read-only。`eval-log/` 以外へ書き込んではならない)。
- writer / sync / render 系の skill・script を呼び出さないこと。
