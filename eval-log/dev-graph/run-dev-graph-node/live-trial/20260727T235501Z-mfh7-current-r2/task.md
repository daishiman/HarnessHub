# タスク: dev-graph:run-dev-graph-node の実走再試験 r2

scenario は `C02-OUT1-positive-mixed-artifacts` です。前回は機能検証自体に通りましたが、
`run-dev-graph-node-progress.json` の全 step が `pending` のままで、goal-seek の完了証拠に
ならなかったため不合格でした。今回は機能検証に加えて進捗証跡も完了させてください。

被験 fixture は次の独立 Git repository です。

`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-011205-wt-2/eval-log/dev-graph/live-trial-fixtures/node-mfh7-current-r2`

管理対象 graph/config/content root を手で直接編集してはいけません。

## 被験 Skill

必ず次の Skill ツール呼出しで実行し、内部 script の直実行で代替しないでください。

Skill({skill: "dev-graph:run-dev-graph-node", args: "add --repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-011205-wt-2/eval-log/dev-graph/live-trial-fixtures/node-mfh7-current-r2 --input /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-011205-wt-2/eval-log/dev-graph/live-trial-fixtures/node-mfh7-current-r2/mixed-artifacts.json"})

## 必須検証

1. `mixed-artifacts.json` の5種類を一括登録し、各 node の正規 path と graph revision を実測する。
2. 原文本文は JSON ファイルから読み、shell source へ埋め込まない。各 original body が保存 Markdown
   に byte-for-byte の連続文字列として残ることを検査する。API 原文
   `GET /api/v1/users`、`POST /api/v2/orders`、`items`、`line_items`、`X-API-Key`、
   `Authorization: Bearer`、`DELETE /api/v2/sessions/bulk` も残ること。
3. artifact_kind が異なる2件へ実差分を加えて同じ node を Skill で連続更新する。2件とも
   `operation=updated`、revision 増加、`updated_at != created_at`、kind/path 整合、
   original body 維持を実測する。noop なら FAIL。
4. C14 macro contract 由来でない feature 直接登録を Skill で試し、fail-closed で拒否されること、
   拒否前後で revision と `features/` のファイル数が増えないことを実測する。

## goal-seek 証跡（前回 blocker の再発防止）

SKILL.md の original_goal を使い、fixture の `eval-log/` に次の3点を作ってください。

- `run-dev-graph-node-goal-spec.json`
- `run-dev-graph-node-progress.json`
- `run-dev-graph-node-intermediate.jsonl`

Skill 実行前に正しい original_goal hash を持つ intermediate 1行目を新規作成し、検証後に
2行目だけ append します。各行の必須6キーを満たしてください。

`progress.json` は計画を置くだけでは不足です。各検証が終わるたびに対応 step を
`completed` へ更新し、criterion/checklist ごとの実測 evidence を記録してください。
完了時は pending step が0件で、全 criterion が PASS、overall/final status が PASS であることを
読み戻して確認してください。全 step が pending のままなら、機能検証が通っていても status=FAIL とします。

## 完了契約

処理が終了（成功・失敗・中断のいずれでも）したら、次の1ファイルだけを書いてください。

`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-011205-wt-2/eval-log/dev-graph/run-dev-graph-node/live-trial/20260727T235501Z-mfh7-current-r2/out/status.json`

内容は `{"status":"PASS|FAIL|ERROR","scenario":"C02-OUT1-positive-mixed-artifacts"}` とし、
最後は「DONE: <status>」の1行だけ報告してください。

制約:

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- `out/` には `status.json` 以外を書かないこと。
