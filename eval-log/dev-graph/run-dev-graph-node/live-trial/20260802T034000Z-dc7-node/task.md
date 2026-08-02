# タスク: dev-graph:run-dev-graph-node の最終実走 (scenario C02-OUT1-positive-mixed-artifacts)

この run は scenario C02-OUT1-positive-mixed-artifacts の充足を確認するものです。

被験 fixture は独立 Git repository
`/Users/dm/orca/workspaces/HarnessHub/wt-33/eval-log/dev-graph/live-trial-fixtures/dc7-node-20260802`
です。管理対象 graph/config/content root を手で直接編集してはいけません。

以下を実行してください:

Skill({skill: "dev-graph:run-dev-graph-node", args: "add --repo-root /Users/dm/orca/workspaces/HarnessHub/wt-33/eval-log/dev-graph/live-trial-fixtures/dc7-node-20260802 --input /Users/dm/orca/workspaces/HarnessHub/wt-33/eval-log/dev-graph/live-trial-fixtures/dc7-node-20260802/mixed-artifacts.json"})

必ずこの Skill ツール呼出しで実行し、内部 script の直実行で代替しないでください。

## 検証順序と進捗更新の厳格契約

最初に progress の V1〜V4 を全て pending で作る。以後は次の順序を守る。

1. V1 の登録・配置だけを検証する。
2. **V2 の検証コマンドを一つも実行する前に** progress ファイルを Edit し、V1 だけを `completed` にする。V2〜V4 は pending のまま保存し、読み戻して確認する。
3. V2 の本文保持と API 文字列だけを検証する。
4. **更新 JSON の作成や V3 の処理を始める前に** progress ファイルを Edit し、V2 だけを `completed` にする。V3〜V4 は pending のまま保存し、読み戻して確認する。
5. V3 の連続更新を検証し、直後に V3 だけを `completed` にする。
6. V4 の feature 拒否を検証し、直後に V4 を `completed`、`final_status` を `PASS` にする。

V1 と V2、V2 と V3、または複数 step を同じ Edit 呼び出しでまとめて completed にしてはならない。transcript 上で各検証と直後の単独 progress 更新が確認できなければ FAIL とする。

## 必須検証

- V1: `mixed-artifacts.json` の5種類 (issue / task / specification / architecture / document) を一括登録し、各 node の正規 path と graph revision を実測する。
- V2: 原文本文を入力 JSON ファイルからプログラムで読み、各 original body が保存 Markdown に byte-for-byte の連続文字列として残ることを検査する。本文を shell のコマンド文字列、`python3 -c`、heredoc へ埋め込んではならない。API 原文 `GET /api/v1/users`、`POST /api/v2/orders`、`items`、`line_items`、`X-API-Key`、`Authorization: Bearer`、`DELETE /api/v2/sessions/bulk` も確認する。
- V3: artifact_kind が異なる issue と architecture へ実差分を加えて連続更新する。fixture 内に `update-issue.json` と `update-architecture.json` を Write し、各 JSON はトップレベルに `graph_node_id`、`patch`、`body` を必ず持つ。`body` は `mixed-artifacts.json` の対応 artifact の body をファイルから読み取った完全な原文に、更新を示す末尾節を加えた文字列とする。`body` を省略して既存 Markdown の暗黙保持に頼ること、本文を shell コマンドへ埋め込むことは禁止。両 JSON を Read して `body` が存在することを確認後、その JSON を `--input` へ渡す。両方が `operation=updated`、`body_source=from_input`、revision 増加、`updated_at != created_at`、kind/path 整合、元の original body 維持となることを実測する。
- V4: C14 macro contract 由来でない feature 直接登録を試し、fail-closed で拒否され、拒否前後で revision と `features/` のファイル数が増えないことを実測する。

## goal-seek 証跡

被験 SKILL.md の original_goal を使い、fixture の `eval-log/` に次の3点を作る。

- `run-dev-graph-node-goal-spec.json`
- `run-dev-graph-node-progress.json`
- `run-dev-graph-node-intermediate.jsonl`

Skill 実行前に正しい original_goal hash を持つ intermediate 1行目を作り、各周回後は新しい行だけ append する。各行は必須6キー (`original_goal`、`original_goal_hash`、`current_goal_snapshot`、`delta_from_original`、`merged_directive_for_next`、`drift_signal`) を満たす。

`goal_seek.fork: subagent` の契約どおり、未達 responsibility の prompt を読み、少なくとも1回は `Agent` ツールで分離 context に fork して検証させる。トップレベルだけの自己検証で代替しない。

完了時は pending step が0件、全 evidence result が `PASS`、`final_status` が `PASS` であることを読み戻す。

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. `/Users/dm/orca/workspaces/HarnessHub/wt-33/eval-log/dev-graph/run-dev-graph-node/live-trial/20260802T034000Z-dc7-node/out/status.json` に完了マーカーを 1 ファイルだけ Writeする。内容:
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
