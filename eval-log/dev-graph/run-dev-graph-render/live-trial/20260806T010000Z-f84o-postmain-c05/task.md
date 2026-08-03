# タスク: dev-graph:run-dev-graph-render の実走 (scenario C05-OUT1-positive-feature-progress)

この run は scenario `C05-OUT1-positive-feature-progress` の充足を確認するものです。

FIXTURE = `/Users/dm/orca/workspaces/HarnessHub/wt-29-2/eval-log/dev-graph/run-dev-graph-render/live-trial/20260806T010000Z-f84o-postmain-c05/fixture-repo`

FIXTURE は**すでに用意済み**です (`plugins/dev-graph/tests/fixtures/build_live_trial_fixture.py --kind render`
が生成した正本形状。feature 1 件 + exact-13 P01..P13 task set + 登録受領書があり、
子タスクは一部だけ完了している)。作り直さず、`.dev-graph/` 配下も書き換えないでください。

**この task.md を受け取った outer session 自身が、以下の全工程を連続して最後まで実行してください。
Skill 呼び出しが戻っても、親や利用者へ制御を返したり、途中報告で停止したりしてはいけません。
最後の完了マーカーを Write するまで、1 つのターンの中で走り切ってください。**

## required_observations (scenario 正本の逐語転記)

1. the rendered HTML and CSS open with no additional runtime dependency and the SVG graph is displayed
2. the progress denominator equals the registration receipt applied_count and expected_count, which the renderer already refuses to render when they disagree
3. the progress numerator equals the number of child tasks whose status is done or closed, recomputed independently from the graph store rather than read back from the receipt
4. the rendered subject corresponds to the source_digest recorded in the registration receipt

## 工程 1: 実走

次の Skill 呼び出しを最初の実行アクションにし、内部 script の直実行や Task / Agent への委譲で
skill 本体を代替しないでください。

Skill({skill: "dev-graph:run-dev-graph-render", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-29-2/eval-log/dev-graph/run-dev-graph-render/live-trial/20260806T010000Z-f84o-postmain-c05/fixture-repo"})

## 工程 2: 検証

1. 生成された HTML / CSS を実ファイルとして開き、**外部 CDN / JS ランタイム / ネットワーク取得に
   依存していないこと**を実ファイル本文の参照 (`http://` / `https://` / `<script src=`) で確認し、
   SVG グラフが埋め込まれて表示対象になっていることを確認する。
2. 進捗の**分母**が登録受領書 (`system-plan/LT-FEATURE-001/dev-graph-registration-receipt.json`) の
   `applied_count` および `expected_count` と一致することを確認する。
3. 進捗の**分子**を、受領書からの読み戻しではなく `.dev-graph/state/graph.json` から
   **独立に再計算**して求め (親 feature `LT-FEATURE-001` の子タスクのうち `status` が
   `done` または `closed` のもの)、レンダリング結果の分子と一致することを確認する。
   分子と分母が実際に異なる値であること (取り違えが起きていないこと) も明示する。
4. 描画対象が受領書の `source_digest` に対応していることを確認する。

判定は「件数が合った」ではなく、どの値をどこから取ってどう突き合わせたかを示すこと。

## 工程 3: goal_seek 配線 (必須)

`run-dev-graph-render` は `goal_seek` を宣言します。SKILL.md の該当節に従い、
FIXTURE の `eval-log/` に次の 3 点を出力してください。

- `<FIXTURE>/eval-log/run-dev-graph-render-goal-spec.json`
- `<FIXTURE>/eval-log/run-dev-graph-render-progress.json`
- `<FIXTURE>/eval-log/run-dev-graph-render-intermediate.jsonl`

`intermediate.jsonl` は必須 6 キー (`original_goal` / `original_goal_hash` / `current_goal_snapshot` /
`delta_from_original` / `merged_directive_for_next` / `drift_signal`) を持ち、
1 行目を Skill 実行前に作成し、検証後の 2 行目だけを append してください。
2 行を後からまとめて書くこと、既存行の上書き、hash 不一致の書換えは禁止です。
`original_goal_hash` は正本文の UTF-8 SHA-256 実値にしてください。

## 完了報告

全検証後、
`/Users/dm/orca/workspaces/HarnessHub/wt-29-2/eval-log/dev-graph/run-dev-graph-render/live-trial/20260806T010000Z-f84o-postmain-c05/out/status.json`
に完了マーカーを 1 ファイルだけ Write してください。

```json
{"status": "PASS|FAIL|ERROR", "scenario": "C05-OUT1-positive-feature-progress"}
```

その後、「DONE: <status>」と 1 行だけ報告してください。

## 制約

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。
- 被験 repository は FIXTURE だけ。HarnessHub 本体のファイルを変更しないこと。
- graph store と受領書は読み取り専用として扱い、書き換えないこと。
