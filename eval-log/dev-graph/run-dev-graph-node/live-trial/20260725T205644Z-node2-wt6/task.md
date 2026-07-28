# タスク: dev-graph:run-dev-graph-node の実走再試験 (scenario C02-OUT1-positive-mixed-artifacts)

被験 fixture は `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-002450-wt-6/eval-log/dev-graph/live-trial-fixtures/node-wt6` にある dev-graph 初期化済みの独立 Git repository です。
`plugins/dev-graph/tests/fixtures/build_live_trial_fixture.py --kind node` が生成した正本 fixture であり、内容を書き換えてはいけません。

## 最重要 — Skill ツールの起動が本 trial の測定対象

被験 skill の実行は必ず **Skill ツール呼出し**で行ってください。`plugins/dev-graph/scripts/` 配下の script を Bash から直接実行して skill 本体を代替した場合、成果物が正しくても trial は launch=FAIL として破棄されます。goal-seek 配線の書き出しと検証用の読取りに限り Write/Bash を使ってよいが、skill 本体の処理は Skill 呼出しに委ねること。

## 第 1 段: 5 artifact 混在入力の一括登録

Skill({skill: "dev-graph:run-dev-graph-node", args: "add --repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-002450-wt-6/eval-log/dev-graph/live-trial-fixtures/node-wt6 --input /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-002450-wt-6/eval-log/dev-graph/live-trial-fixtures/node-wt6/mixed-artifacts.json"})

### 既知 blocker の再発防止 (違反は FAIL)

過去の試行で、入力 JSON を `python3 -c "..."` のシェル文字列として組み立てたため原文中のバッククォートが command substitution として実行され、API 識別子が欠落した。この再試験では次を厳守すること。

1. 原文本文を Bash command、Python `-c`、heredoc、`printf`、`echo` の文字列へ転記・埋込みしない。バッククォートを含む原文を shell source に載せない。
2. node 入力を作る必要がある場合は、Write ツールで安全な一時 script file を作り、その script が `mixed-artifacts.json` を `json.load` して各 `body` を変数から取得する。原文を人手で再入力しない。
3. 各 node の `body` は `artifact["body"]` の完全な原文をそのまま含め、不足 template section は末尾へ追記する。原文の削除・置換・再構成をしない。
4. apply 後、`mixed-artifacts.json` の各 original body が対応する保存 Markdown の本文に完全な連続文字列として 1 回以上含まれることを、ファイルを読み込む検証 script の実出力で確認する。
5. API 仕様については、原文にある `` `GET /api/v1/users` ``、`` `POST /api/v2/orders` ``、`` `items` ``、`` `line_items` ``、`` `X-API-Key` ``、`` `Authorization: Bearer` ``、`` `DELETE /api/v2/sessions/bulk` `` が保存後もすべて存在することを実測する。command-not-found 等の shell error が 1 件でも出た場合は修正前の生成物を使わず、fixture を汚した時点で status=FAIL とする。

第 1 段の完了時に、次を実測して記録してください (後段の比較に使う)。

- `.dev-graph/state/graph.json` の `graph_revision` の値。
- 登録された各 node の `graph_node_id` / `file_path` / `updated_at`。

## 第 2 段: 内容差分のある連続更新 (省略禁止 — 省略は FAIL)

OUT1 は「連続更新後も frontmatter/path 整合性が維持される」ことを求めます。**同一入力の再投入 (operation=noop) は冪等性の確認であって連続更新ではありません。** 次を必ず実行してください。

1. 第 1 段で登録された node のうち **`artifact_kind` が異なる 2 件** を選ぶ (例: issue 系 1 件と architecture 系 1 件)。
2. その 2 件それぞれについて、**本文に実際の差分が出る変更**を加えた入力を作り、同じ `graph_node_id` に対して skill を再実行する。本文変更は原文末尾への追記で構わないが、追記した文字列を記録すること。
3. 各更新について次を実測する。
   - skill の出力する `operation` が `updated` であること (`noop` なら差分が出ていないので手順 2 をやり直す)。
   - `graph_revision` が更新前より **増加**していること。
   - 更新後の `updated_at` が `created_at` と **異なる**こと。
   - frontmatter の `artifact_kind` と実際の保存 path が更新後も整合していること (kind に対応する canonical directory から動いていないこと)。
   - 第 1 段で確認した original body が更新後も完全な連続文字列として保存 Markdown に残っていること。

**この第 2 段を実施せずに第 3 段へ進んではいけません。** `operation=updated` を 2 件とも実測できていない場合は status=FAIL としてください。

## 第 3 段: feature 直接登録の fail-closed 確認 (肯定側観測を必ず作ること)

OUT1 は「feature は C14 macro contract からのみ登録する」ことを求めます。入力に feature が 1 件も無い状態で「feature 0 件」を確認しても、gate が作動した証拠にはなりません (検査対象が空集合)。**gate を実際に踏んでください。**

1. `artifact_kind` が `feature` の node を 1 件だけ含む入力 JSON を Write ツールで作る (C14 macro contract 由来ではない、直接登録の入力)。
2. その入力で skill を再実行し、**登録が fail-closed で拒否される**ことを実測する。
3. 次を記録する。
   - skill / script が返した終了コードとエラーメッセージの原文。
   - 拒否後に `.dev-graph/state/graph.json` の `graph_revision` が **増えていない**こと。
   - `features/` 配下に新規ファイルが **作られていない**こと。

拒否されず feature が登録されてしまった場合は、それが OUT1 違反の実観測なので status=FAIL とし、観測値をそのまま報告してください (取り繕わないこと)。

## goal-seek 配線の必須履行 (省略禁止)

`run-dev-graph-node` は `goal_seek` を宣言します。SKILL.md の `## ゴールシーク実行` に従い、`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-002450-wt-6/eval-log/dev-graph/live-trial-fixtures/node-wt6/eval-log/` へ 3 点セット (`run-dev-graph-node-goal-spec.json` / `run-dev-graph-node-progress.json` / `run-dev-graph-node-intermediate.jsonl`、intermediate は必須 6 キー) をすべて書き出してください。

`intermediate.jsonl` は実行途中の証拠です。次を厳守してください:

1. skill 実行前に SKILL.md の original_goal を goal-spec へ書き、その同じ文字列から UTF-8 SHA-256 を計算する。
2. skill 実行前に、計算済みの正しい hash を持つ最初の intermediate 行を新規作成する。
3. skill 実行と検証後に、結果を持つ2行目だけを append（末尾追加）する。
4. 2行を後からまとめて書かない。既存行の Edit / Update / 全体上書きはしない。hash 検証に失敗した場合は書き換えず FAIL とする。

## 成功条件 (すべて実測値で示すこと)

- all five artifacts are routed to canonical kind paths
- all five original bodies are preserved byte-for-byte inside their stored Markdown bodies
- frontmatter kind and stored path agree after a consecutive update — **`operation=updated` を 2 件実測し、`graph_revision` の増加を数値で示すこと**
- no feature is created outside the C14 macro-feature contract — **feature 直接登録を実際に試み、fail-closed で拒否された観測値を示すこと**
- goal-seek 3 点セットがすべて書き出され、intermediate は実行時系列どおりの append-only である

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-002450-wt-6/eval-log/dev-graph/run-dev-graph-node/live-trial/20260725T205644Z-node2-wt6/out/status.json` に完了マーカーを 1 ファイルだけ Write する。内容:
   `{"status": "PASS|FAIL|ERROR", "scenario": "C02-OUT1-positive-mixed-artifacts"}`
2. 「DONE: <status>」と 1 行だけ報告する。

制約:

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。
