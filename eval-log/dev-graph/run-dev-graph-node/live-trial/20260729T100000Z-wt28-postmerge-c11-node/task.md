# タスク: dev-graph:run-dev-graph-node の実走

scenario は `C02-OUT1-positive-mixed-artifacts` です。

被験 fixture は次の独立 Git repository です。

`/Users/dm/orca/workspaces/HarnessHub/wt-28/eval-log/dev-graph/live-trial-fixtures/wt28-postmerge-node`

管理対象 graph/config/content root を手で直接編集してはいけません。

以下を実行してください:

Skill({skill: "dev-graph:run-dev-graph-node", args: "add --repo-root /Users/dm/orca/workspaces/HarnessHub/wt-28/eval-log/dev-graph/live-trial-fixtures/wt28-postmerge-node --input /Users/dm/orca/workspaces/HarnessHub/wt-28/eval-log/dev-graph/live-trial-fixtures/wt28-postmerge-node/mixed-artifacts.json"})

必ずこの Skill ツール呼出しで実行し、内部 script の直実行で代替しないでください。

## 必須検証

1. `mixed-artifacts.json` の5種類 (issue / task / specification / architecture / document) を
   一括登録し、各 node の正規 path と graph revision を実測する。
2. 原文本文は JSON ファイルから読み、shell source へ埋め込まない。各 original body が保存 Markdown
   に byte-for-byte の連続文字列として残ることを検査する。API 原文
   `GET /api/v1/users`、`POST /api/v2/orders`、`items`、`line_items`、`X-API-Key`、
   `Authorization: Bearer`、`DELETE /api/v2/sessions/bulk` も残ること。
3. artifact_kind が異なる2件へ実差分を加えて同じ node を Skill で連続更新する。2件とも
   `operation=updated`、revision 増加、`updated_at != created_at`、kind/path 整合、
   original body 維持を実測する。noop なら FAIL。
4. C14 macro contract 由来でない feature 直接登録を Skill で試し、fail-closed で拒否されること、
   拒否前後で revision と `features/` のファイル数が増えないことを実測する。

## goal-seek 証跡

被験 SKILL.md の original_goal を使い、fixture の `eval-log/` に次の3点を作ってください。

- `run-dev-graph-node-goal-spec.json`
- `run-dev-graph-node-progress.json`
- `run-dev-graph-node-intermediate.jsonl`

Skill 実行前に正しい original_goal hash を持つ intermediate 1行目を新規作成し、検証後に
2行目だけ append します。各行の必須6キー (`original_goal`、`original_goal_hash`、
`current_goal_snapshot`、`delta_from_original`、`merged_directive_for_next`、`drift_signal`)
を満たしてください。

`progress.json` は計画を置くだけでは不足です。各検証が終わるたびに対応 step を
`completed` へ更新し、criterion/checklist ごとの実測 evidence を記録してください。
完了時は pending step が0件で、全 criterion が PASS、overall/final status が PASS であることを
読み戻して確認してください。全 step が pending のままなら、機能検証が通っていても status=FAIL とします。

## 完了契約

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. `/Users/dm/orca/workspaces/HarnessHub/wt-28/eval-log/dev-graph/run-dev-graph-node/live-trial/20260729T100000Z-wt28-postmerge-c11-node/out/status.json`
   に完了マーカーを 1 ファイルだけ Write する。内容:
   `{"status": "PASS|FAIL|ERROR", "scenario": "C02-OUT1-positive-mixed-artifacts"}`
2. 「DONE: <status>」と 1 行だけ報告する。

制約:
- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと (中間生成物は fixture 側 (WORK_DIR 外) へ — out/ に中間 Write させると poll が DONE 偽陽性を起こす)。

## scenario 契約

scenario_id: `C02-OUT1-positive-mixed-artifacts`

## required_observations（scenario 正本の逐語転記）

1. all five artifacts are routed to canonical kind paths
2. frontmatter kind and stored path agree after a consecutive update
3. no feature is created outside the C14 macro-feature contract
