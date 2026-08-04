# タスク: dev-graph:run-dev-graph-node の再実走 (scenario C02-OUT1-positive-mixed-artifacts)

この run は scenario C02-OUT1-positive-mixed-artifacts の充足を確認するものです。

以下を実行してください:

Skill({skill: "dev-graph:run-dev-graph-node", args: "add --repo-root /Users/dm/orca/workspaces/HarnessHub/wt-31/eval-log/dev-graph/live-trial-fixtures/wt31-qa121-node-r2 --input /Users/dm/orca/workspaces/HarnessHub/wt-31/eval-log/dev-graph/live-trial-fixtures/wt31-qa121-node-r2/mixed-artifacts.json"})

必ずこの Skill ツール呼出しで実行し、内部 script の直実行で代替しないでください。

## 検証順序

progress の V1〜V4 を pending で作り、V1、V2、V3、V4 の順に検証する。各検証の直後に
その 1 step だけを completed にして読み戻す。複数 step を一度に completed にしてはならない。

- V1: 5種類 (issue / task / specification / architecture / document) の正規 path と revision を実測する。
- V2: 入力 JSON から body を読み、保存 Markdown が body を byte-for-byte で含むことと、API 原文 `GET /api/v1/users`、`POST /api/v2/orders`、`items`、`line_items`、`X-API-Key`、`Authorization: Bearer`、`DELETE /api/v2/sessions/bulk` を確認する。
- V3: issue と architecture へ実差分を加えて連続更新する。`update-issue.json` と `update-architecture.json` は、**必ず Read で元 body を取得してから Write ツールで 1 ファイルずつ新規作成する**。各 JSON はトップレベルに `graph_node_id`、`patch`、元 body 全文へ更新節を加えた `body` を持つ。**Bash、heredoc、python、sed、perl、shell redirect で JSON を作成・更新してはならず、body や追加文を shell command へ埋め込んでもならない。** 作成後に両 JSON を Read し、`body` を確認してから `--input` へ渡す。両方の `operation=updated`、`body_source=from_input`、revision 増加、timestamp 変化、kind/path 整合、original body 保持を実測する。
- V4: C14 由来でない feature 直接登録を試し、拒否前後で revision と `features/` file count が不変であることを実測する。

## goal-seek 証跡

fixture の `eval-log/` に goal-spec、progress、intermediate.jsonl の3点を作る。Skill 実行前に
正しい original_goal hash を持つ intermediate 1行目を作り、各周回後は append-only にする。
未達 responsibility は少なくとも1回 Agent ツールで独立検証させる。完了時は pending 0、
全 evidence PASS、final_status PASS を読み戻す。

処理が終了したら:

1. `/Users/dm/orca/workspaces/HarnessHub/wt-31/eval-log/dev-graph/run-dev-graph-node/live-trial/20260802T041500Z-wt31-qa121-node-r2/out/status.json` に `{"status":"PASS|FAIL|ERROR","scenario":"C02-OUT1-positive-mixed-artifacts"}` を Write する。
2. 「DONE: <status>」と 1 行だけ報告する。

制約:

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。

## required_observations（scenario 正本の逐語転記）

1. all five artifacts are routed to canonical kind paths
2. frontmatter kind and stored path agree after a consecutive update
3. no feature is created outside the C14 macro-feature contract
