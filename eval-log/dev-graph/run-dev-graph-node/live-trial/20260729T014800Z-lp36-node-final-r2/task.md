# タスク: dev-graph:run-dev-graph-node の最終実走（再試験）

scenario は `C02-OUT1-positive-mixed-artifacts` です。被験 fixture は次の初期化済み独立
Git repository です。

`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/live-trial-fixtures/node-lp36-final-r2`

管理対象 graph/config/content root を手で直接編集してはいけません。次の Skill 呼出しを
必ず使い、内部 script の直実行で代替しないでください。

Skill({skill: "dev-graph:run-dev-graph-node", args: "add --repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/live-trial-fixtures/node-lp36-final-r2 --input /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/live-trial-fixtures/node-lp36-final-r2/mixed-artifacts.json"})

## goal-seek 契約

SKILL.md の original_goal を使い、fixture の `eval-log/` に goal-spec、progress、
intermediate.jsonl の 3 点を作成してください。intermediate の 1 行目は Skill の
artifact 書込み前に新規作成し、実行後は正しい JSON の 2 行目だけを file mode `a`
（append）で追加してください。各行には `original_goal`、`original_goal_hash`、
`current_goal_snapshot`、`delta_from_original`、`merged_directive_for_next`、
`drift_signal` の 6 キーが必要です。

重要: JSON は shell の `printf` や文字列エスケープで組み立てず、Python の
`json.dumps(..., ensure_ascii=False)` で生成して追記してください。`!` を含む表現は
避け、たとえば `updated_at differs from created_at` と記録します。追記後に誤りを
見つけても既存行を Edit / Update / 全体上書きしてはいけません。その場合は FAIL と
してください。progress は各検証後に completed / PASS と実測 evidence へ更新し、
完了時に pending と evidence null を残さないでください。

## 必須検証

1. `mixed-artifacts.json` の 5 種類（issue / task / specification / architecture /
   document）を一括登録し、全件が正規 kind path に保存されること。
2. 原文本文が保存 Markdown に byte-for-byte の連続文字列として残り、
   `GET /api/v1/users`、`POST /api/v2/orders`、`items`、`line_items`、`X-API-Key`、
   `Authorization: Bearer`、`DELETE /api/v2/sessions/bulk` も保持されること。
3. artifact_kind が異なる 2 件へ実差分を加えて同じ node を Skill で連続更新し、2 件とも
   `operation=updated`、revision 増加、作成時刻と更新時刻の相違、kind/path 整合、
   original body 維持を実測すること。noop なら FAIL。
4. C14 macro contract 由来でない feature 直接登録を Skill で試し、fail-closed で拒否され、
   拒否前後で revision と `features/` のファイル数が増えないこと。

## 完了契約

成功・失敗・中断のいずれでも、最後に次の 1 ファイルだけを書いてください。

`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/run-dev-graph-node/live-trial/20260729T014800Z-lp36-node-final-r2/out/status.json`

内容は `{"status":"PASS|FAIL|ERROR","scenario":"C02-OUT1-positive-mixed-artifacts"}`。
`out/` には status.json 以外を書かず、最後は `DONE: <status>` の 1 行だけを報告して
ください。途中で人間へ質問せず、fixture 以外の repository を変更しないでください。
