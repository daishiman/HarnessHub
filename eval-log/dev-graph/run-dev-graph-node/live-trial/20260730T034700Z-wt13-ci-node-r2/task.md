# タスク: dev-graph:run-dev-graph-node の実走 (scenario C02-OUT1-positive-mixed-artifacts)

この run は scenario C02-OUT1-positive-mixed-artifacts の充足を確認するものです。

被験 fixture は独立 Git repository
`/Users/dm/orca/workspaces/HarnessHub/wt-13/eval-log/dev-graph/live-trial-fixtures/wt13-ci-node-r2-20260730`
です。管理対象 graph/config/content root を手で直接編集してはいけません。

以下を実行してください:

Skill({skill: "dev-graph:run-dev-graph-node", args: "add --repo-root /Users/dm/orca/workspaces/HarnessHub/wt-13/eval-log/dev-graph/live-trial-fixtures/wt13-ci-node-r2-20260730 --input /Users/dm/orca/workspaces/HarnessHub/wt-13/eval-log/dev-graph/live-trial-fixtures/wt13-ci-node-r2-20260730/mixed-artifacts.json"})

必ずこの Skill ツール呼出しで実行し、内部 script の直実行で代替しないでください。

## 必須検証

1. `mixed-artifacts.json` の5種類 (issue / task / specification / architecture / document) を一括登録し、各 node の正規 path と graph revision を実測する。
2. 原文本文は入力 JSON ファイルからプログラムで読み込む。本文や更新本文を shell の `python3 -c`、heredoc、コマンド文字列へ埋め込んではならない。各 original body が保存 Markdown に byte-for-byte の連続文字列として残り、`GET /api/v1/users`、`POST /api/v2/orders`、`items`、`line_items`、`X-API-Key`、`Authorization: Bearer`、`DELETE /api/v2/sessions/bulk` も残ることを検査する。
3. artifact_kind が異なる2件へ実差分を加えて同じ node を Skill で連続更新する。更新入力は fixture 内の JSON ファイルとして先に Write し、本文はその JSON ファイルから読ませる。2件とも `operation=updated`、revision 増加、`updated_at != created_at`、kind/path 整合、original body 維持を実測する。noop なら FAIL。
4. C14 macro contract 由来でない feature 直接登録を Skill で試し、fail-closed で拒否されること、拒否前後で revision と `features/` のファイル数が増えないことを実測する。

## goal-seek 証跡

被験 SKILL.md の original_goal を使い、fixture の `eval-log/` に次の3点を作る。

- `run-dev-graph-node-goal-spec.json`
- `run-dev-graph-node-progress.json`
- `run-dev-graph-node-intermediate.jsonl`

Skill 実行前に正しい original_goal hash を持つ intermediate 1行目を作り、各周回後は新しい行だけ append する。各行は必須6キー (`original_goal`、`original_goal_hash`、`current_goal_snapshot`、`delta_from_original`、`merged_directive_for_next`、`drift_signal`) を満たす。

`goal_seek.fork: subagent` の契約どおり、未達 responsibility の prompt を読み、少なくとも1回は `Agent` ツールで分離 context に fork して検証させること。トップレベルだけの自己検証で代替してはならない。

`progress.json` は、各検証が終わるたびに直ちに対応 step だけを `completed` へ更新し、その criterion/checklist の実測 evidence を記録する。全検証後に一度だけまとめて更新してはならない。完了時は pending step が0件、全 criterion が `PASS`、`final_status` が `PASS` であることを読み戻して確認する。`overall_status` を記録する場合も `completed` ではなく `PASS` とする。

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. `/Users/dm/orca/workspaces/HarnessHub/wt-13/eval-log/dev-graph/run-dev-graph-node/live-trial/20260730T034700Z-wt13-ci-node-r2/out/status.json` に完了マーカーを 1 ファイルだけ Writeする。内容:
   `{"status": "PASS|FAIL|ERROR", "scenario": "C02-OUT1-positive-mixed-artifacts"}`
2. 「DONE: <status>」と 1 行だけ報告する。

制約:

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。

## required_observations（scenario 正本の逐語転記）

1. all five artifacts are routed to canonical kind paths
2. frontmatter kind and stored path agree after a consecutive update
3. no feature is created outside the C14 macro-feature contract
