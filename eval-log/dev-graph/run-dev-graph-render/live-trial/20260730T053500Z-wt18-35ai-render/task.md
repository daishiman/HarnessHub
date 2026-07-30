# タスク: dev-graph:run-dev-graph-render の実走 (scenario C05-OUT1-positive-feature-progress)

この run は scenario C05-OUT1-positive-feature-progress の充足を確認するものです。

被験 fixture は `/Users/dm/orca/workspaces/HarnessHub/wt-18/eval-log/dev-graph/live-trial-fixtures/wt18-35ai-render` にある dev-graph 初期化済みの独立 Git repository です。

## required_observations（scenario 正本の逐語転記）

1. the rendered HTML and CSS open with no additional runtime dependency and the SVG graph is displayed
2. the progress denominator equals the registration receipt applied_count and expected_count, which the renderer already refuses to render when they disagree
3. the progress numerator equals the number of child tasks whose status is done or closed, recomputed independently from the graph store rather than read back from the receipt
4. the rendered subject corresponds to the source_digest recorded in the registration receipt

以下を実行してください:

Skill({skill: "dev-graph:run-dev-graph-render", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-18/eval-log/dev-graph/live-trial-fixtures/wt18-35ai-render"})

被験 skill の実行は必ず上記 Skill ツール呼出しで行ってください。`plugins/dev-graph/scripts/` 配下の script を Bash から直接実行して skill 本体を代替してはいけません。goal-seek 配線の書き出しと、skill 実行後の独立した検証に限り Write/Bash を使用できます。

## registration receipt を使う正例の実行条件

本 scenario は registration receipt との相互検証が実際に作動した正例を確認します。次の receipt と scope を使ってください。

- receipt: `/Users/dm/orca/workspaces/HarnessHub/wt-18/eval-log/dev-graph/live-trial-fixtures/wt18-35ai-render/system-plan/LT-FEATURE-001/dev-graph-registration-receipt.json`
- scope: `LT-FEATURE-001`

生成 HTML、`render-metadata`、renderer receipt のすべてで `registration_verification.status=verified` を確認してください。HTML には目視可能な `Registration verification: VERIFIED` があり、receipt の `source_digest` が 1 件以上現れることも実測してください。

`--registration-receipt` を省略した探索的 render は有効ですが、その場合は `not_performed` になり、本 scenario の正例にはなりません。

## goal-seek 配線の必須履行

`run-dev-graph-render` は `goal_seek` を宣言します。SKILL.md の `## ゴールシーク実行` に従い、fixture の `eval-log/` へ次の 3 点をすべて書き出してください。

- `run-dev-graph-render-goal-spec.json`
- `run-dev-graph-render-progress.json`
- `run-dev-graph-render-intermediate.jsonl`

`intermediate.jsonl` は実行途中の証拠です。skill 実行前に original goal とその UTF-8 SHA-256 を持つ最初の行を新規作成し、skill 実行と検証後に結果を持つ 2 行目だけを末尾追加してください。2 行を後からまとめて書いたり、既存行を上書きしたりしてはいけません。

処理が終了（成功・失敗・中断のいずれでも）したら:

1. `/Users/dm/orca/workspaces/HarnessHub/wt-18/eval-log/dev-graph/run-dev-graph-render/live-trial/20260730T053500Z-wt18-35ai-render/out/status.json` に完了マーカーを 1 ファイルだけ Write する。内容:
   `{"status": "PASS|FAIL|ERROR", "scenario": "C05-OUT1-positive-feature-progress"}`
2. 「DONE: <status>」と 1 行だけ報告する。

制約:

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。
