# タスク: dev-graph:run-dev-graph-render の実走 (scenario C05-OUT1-positive-feature-progress)

この run は scenario `C05-OUT1-positive-feature-progress` の充足を確認するものです。

FIXTURE = `/Users/dm/orca/workspaces/HarnessHub/wt-27-3/eval-log/dev-graph/run-dev-graph-render/live-trial/20260808T183311-wt27-c05-final/fixture-repo`

FIXTURE は**すでに用意済み**です (`plugins/dev-graph/tests/fixtures/build_live_trial_fixture.py --kind render`
が生成した正本形状)。作り直さないでください。feature `LT-FEATURE-001` は exact-13 (P01..P13) の
子 task を持ち、そのうち一部だけが完了状態です。immutable な registration receipt は FIXTURE 内
`system-plan/LT-FEATURE-001/dev-graph-registration-receipt.json` にあります。

**この task.md を受け取った outer session 自身が、以下の全工程を連続して最後まで実行してください。
Skill 呼び出しが戻っても、親や利用者へ制御を返したり、途中報告で停止したりしてはいけません。
最後の完了マーカーを Write するまで、1 つのターンの中で走り切ってください。**

## required_observations (scenario 正本の逐語転記)

1. the rendered HTML and CSS open with no additional runtime dependency and the SVG graph is displayed
2. the progress denominator equals the registration receipt applied_count and expected_count, which the renderer already refuses to render when they disagree
3. the progress numerator equals the number of child tasks whose status is done or closed, recomputed independently from the graph store rather than read back from the receipt
4. the rendered subject corresponds to the source_digest recorded in the registration receipt

## 工程 1: skill の実走

次の Skill 呼び出しを最初の実行アクションにし、内部 script の直実行や Task / Agent への委譲で
skill 本体を代替しないでください。

Skill({skill: "dev-graph:run-dev-graph-render", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-27-3/eval-log/dev-graph/run-dev-graph-render/live-trial/20260808T183311-wt27-c05-final/fixture-repo"})

SKILL.md の手順どおり、C24 (`resolve-repo-context.py --mode read`) で `DEV_GRAPH_ROOT` を固定し、
C11 (`validate-graph-schema.py`) で graph/scope を検証してから `render-graph-html.py` を実行して
ください。`--registration-receipt` は skill の repo context 解決の一部として FIXTURE 内の
`system-plan/LT-FEATURE-001/dev-graph-registration-receipt.json` を渡し、照合状態が
`not_performed` のまま完了申告しないでください (scenario は receipt 照合ありの positive run です)。
出力先は FIXTURE 内の既定 path (`.dev-graph/render/index.html`) に限定してください。

gate が PASS した事実だけで完了申告することは契約違反です。実 HTML を emit してください。

## 工程 2: 検証

1. 生成 HTML に外部 `script` / `link` / CDN / npm 参照が 0 件であることを、実ファイルを走査して
   件数で示す。あわせて HTML 内に SVG 要素と inline CSS/JS が実在することを示す。
   「ゼロ依存のはず」ではなく、実際の走査結果を根拠にすること。
2. 描画された feature progress の**分母 Y** が、registration receipt の `applied_count` および
   `expected_count` と一致することを示す。receipt の両値と HTML 上の分母の実値を並べて示すこと。
   renderer は両者が食い違うときは HTML を書かない実装であることも確認すること。
3. 描画された feature progress の**分子 X** が、graph store 上で status が `done` または `closed`
   である子 task の件数と一致することを示す。receipt から読み戻すのではなく、
   `.dev-graph/state/graph.json` を独立に集計して件数を出し、HTML 上の X と突き合わせること。
   X と分母 Y が異なる値であること (部分完了) も明示すること。
4. 描画対象が registration receipt の `source_digest` に対応していることを示す。receipt の
   `source_digest` の実値と、graph node 側 `source_lineage.source_digest` の実値、および
   renderer receipt / render-metadata が記録した照合結果を突き合わせ、
   `registration_verification.status` の実値 (`verified` / `partial` / `not_performed`) を示すこと。

## 工程 3: goal_seek 配線 (必須)

`run-dev-graph-render` は `goal_seek` を宣言します。SKILL.md の「ゴールシーク配線」節に従い、
FIXTURE の `eval-log/` に次の 3 点を出力してください。

- `<FIXTURE>/eval-log/run-dev-graph-render-goal-spec.json`
- `<FIXTURE>/eval-log/run-dev-graph-render-progress.json`
- `<FIXTURE>/eval-log/run-dev-graph-render-intermediate.jsonl`

`intermediate.jsonl` は必須 6 キー (`original_goal` / `original_goal_hash` / `current_goal_snapshot` /
`delta_from_original` / `merged_directive_for_next` / `drift_signal`) を持ち、
1 行目を Skill 実行前に作成し、検証後の 2 行目だけを append してください。
2 行を後からまとめて書くこと、既存行の上書き、hash 不一致の書換えは禁止です。
`original_goal_hash` は `goal-spec.json` の `original_goal` 正本文の UTF-8 SHA-256 実値にしてください。
SKILL.md「ゴールシーク検証」節の検査スクリプトを実際に実行して通過を確認してください。

## 完了報告

全検証後、
`/Users/dm/orca/workspaces/HarnessHub/wt-27-3/eval-log/dev-graph/run-dev-graph-render/live-trial/20260808T183311-wt27-c05-final/out/status.json`
に完了マーカーを 1 ファイルだけ Write してください。

```json
{"status": "PASS|FAIL|ERROR", "scenario": "C05-OUT1-positive-feature-progress"}
```

その後、「DONE: <status>」と 1 行だけ報告してください。

## 制約

- 途中で人間に質問せず最後まで自走すること (`AskUserQuestion` は使わない)。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと (中間生成物は skill 側の出力先である FIXTURE 内へ)。
- 被験 repository は FIXTURE だけ。HarnessHub 本体のファイルを変更しないこと。
- 実 GitHub API / `gh` / 実 Beads へアクセスしないこと。
- fixture の graph store・package・registration receipt を手作業で書き換えないこと
  (render は read-only。graph/content 本体を変更してはならない)。
- HTML 生成に外部 CDN / npm bundle / 外部 script・link を混入させないこと。
