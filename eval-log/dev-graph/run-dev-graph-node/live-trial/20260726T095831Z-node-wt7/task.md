# タスク: dev-graph:run-dev-graph-node の実走再試験 (scenario C02-OUT1-positive-mixed-artifacts)

被験 fixture は `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-005248-wt-7/eval-log/dev-graph/live-trial-fixtures/node-wt7-r1` にある dev-graph 初期化済みの独立 Git repository です。
`plugins/dev-graph/tests/fixtures/build_live_trial_fixture.py --kind node` が生成した正本 fixture であり、内容を書き換えてはいけません。

以下を実行してください:

Skill({skill: "dev-graph:run-dev-graph-node", args: "add --repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-005248-wt-7/eval-log/dev-graph/live-trial-fixtures/node-wt7-r1 --input /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-005248-wt-7/eval-log/dev-graph/live-trial-fixtures/node-wt7-r1/mixed-artifacts.json"})

**被験 skill の実行は必ず上記 Skill ツール呼出しで行うこと。** `plugins/dev-graph/scripts/` 配下の script を Bash から直接実行して skill 本体を代替してはならない。goal-seek 配線の書き出しに限り Write/Bash を使ってよいが、skill 本体の処理は Skill 呼出しに委ねること。

## 既知 blocker の再発防止 (違反は FAIL)

過去の試行で、入力 JSON を `python3 -c "..."` のシェル文字列として組み立てたため原文中のバッククォートが command substitution として実行され、API 識別子が欠落した。この再試験では次を厳守すること。

1. 原文本文を Bash command、Python `-c`、heredoc、`printf`、`echo` の文字列へ転記・埋込みしない。バッククォートを含む原文を shell source に載せない。
2. node 入力を作る必要がある場合は、Write ツールで安全な一時 script file を作り、その script が `mixed-artifacts.json` を `json.load` して各 `body` を変数から取得する。原文を人手で再入力しない。
3. 各 node の `body` は `artifact["body"]` の完全な原文をそのまま含め、不足 template section は末尾へ追記する。原文の削除・置換・再構成をしない。
4. apply 後、`mixed-artifacts.json` の各 original body が対応する保存 Markdown の本文に完全な連続文字列として 1 回以上含まれることを、ファイルを読み込む検証 script の実出力で確認する。
5. API 仕様については、原文にある `` `GET /api/v1/users` ``、`` `POST /api/v2/orders` ``、`` `items` ``、`` `line_items` ``、`` `X-API-Key` ``、`` `Authorization: Bearer` ``、`` `DELETE /api/v2/sessions/bulk` `` が保存後もすべて存在することを実測する。command-not-found 等の shell error が 1 件でも出た場合は修正前の生成物を使わず、fixture を汚した時点で status=FAIL とする。

## goal-seek 配線の必須履行 (省略禁止)

`run-dev-graph-node` は `goal_seek` を宣言します。SKILL.md の `## ゴールシーク実行` に従い、`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-005248-wt-7/eval-log/dev-graph/live-trial-fixtures/node-wt7-r1/eval-log/` へ 3 点セット (`run-dev-graph-node-goal-spec.json` / `run-dev-graph-node-progress.json` / `run-dev-graph-node-intermediate.jsonl`、intermediate は必須 6 キー) をすべて書き出してください。

`intermediate.jsonl` は実行途中の証拠です。次を厳守してください:

1. skill 実行前に SKILL.md の original_goal を goal-spec へ書き、その同じ文字列から UTF-8 SHA-256 を計算する。
2. skill 実行前に、計算済みの正しい hash を持つ最初の intermediate 行を新規作成する。
3. skill 実行と検証後に、結果を持つ2行目だけを append（末尾追加）する。
4. 2行を後からまとめて書かない。既存行の Edit / Update / 全体上書きはしない。hash 検証に失敗した場合は書き換えず FAIL とする。

## 成功条件 (すべて実測値で示すこと)

- all five artifacts are routed to canonical kind paths
- all five original bodies are preserved byte-for-byte inside their stored Markdown bodies
- frontmatter kind and stored path agree after a consecutive update
- no feature is created outside the C14 macro-feature contract
- goal-seek 3 点セットがすべて書き出され、intermediate は実行時系列どおりの append-only である

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-005248-wt-7/eval-log/dev-graph/run-dev-graph-node/live-trial/20260726T095831Z-node-wt7/out/status.json` に完了マーカーを 1 ファイルだけ Write する。内容:
   `{"status": "PASS|FAIL|ERROR", "scenario": "C02-OUT1-positive-mixed-artifacts"}`
2. 「DONE: <status>」と 1 行だけ報告する。

制約:

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。
