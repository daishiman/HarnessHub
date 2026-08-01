# タスク: dev-graph:run-dev-graph-node の実走再試験

scenario は `C02-OUT1-positive-mixed-artifacts` です。被験 fixture は次の独立 Git repository です。

`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-011205-wt-2/eval-log/dev-graph/live-trial-fixtures/node-mfh7-current`

fixture は `plugins/dev-graph/tests/fixtures/build_live_trial_fixture.py --kind node` で生成済みです。管理対象 graph/config/content root を手で直接編集してはいけません。

## 被験 Skill

被験 skill の処理は必ず次の Skill ツール呼出しで行ってください。内部 script を Bash から直接実行して代替してはいけません。

Skill({skill: "dev-graph:run-dev-graph-node", args: "add --repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-011205-wt-2/eval-log/dev-graph/live-trial-fixtures/node-mfh7-current --input /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-011205-wt-2/eval-log/dev-graph/live-trial-fixtures/node-mfh7-current/mixed-artifacts.json"})

## 必須検証

1. `mixed-artifacts.json` の5種類を一括登録し、各 `graph_node_id`、保存 path、`graph_revision`、`created_at`、`updated_at` を記録する。
2. 原文本文を shell source、`python3 -c`、heredoc、`printf`、`echo` に埋め込まない。入力は JSON をファイルから `json.load` して扱う。各 original body が保存 Markdown に byte-for-byte の連続文字列として残ることを検査する。API 原文の `GET /api/v1/users`、`POST /api/v2/orders`、`items`、`line_items`、`X-API-Key`、`Authorization: Bearer`、`DELETE /api/v2/sessions/bulk` も残ること。
3. artifact_kind が異なる2件へ原文末尾の実差分を加え、同じ node を Skill で連続更新する。各 `operation=updated`、`graph_revision` 増加、`updated_at != created_at`、kind/path 整合、original body 維持を実測する。noop のままなら FAIL。
4. C14 macro contract 由来でない `feature` 直接登録を Skill で試し、fail-closed で拒否されること、拒否前後で `graph_revision` が増えず `features/` にファイルが増えないことを実測する。拒否されなければ FAIL。

## goal-seek 配線

`run-dev-graph-node` の SKILL.md にある original_goal を使い、fixture の `eval-log/` に次の3点を作る。

- `run-dev-graph-node-goal-spec.json`
- `run-dev-graph-node-progress.json`
- `run-dev-graph-node-intermediate.jsonl`

original_goal の UTF-8 SHA-256 を使い、Skill 実行前に intermediate の最初の行を新規作成し、検証後に2行目だけ append する。各行は `original_goal`、`original_goal_hash`、`current_goal_snapshot`、`delta_from_original`、`merged_directive_for_next`、`drift_signal` を持つ。2行を後からまとめて書いたり既存行を上書きしたりしない。

## 完了契約

処理が終了（成功・失敗・中断のいずれでも）したら、次の1ファイルだけを書いてください。

`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-011205-wt-2/eval-log/dev-graph/run-dev-graph-node/live-trial/20260727T234208Z-mfh7-current/out/status.json`

内容は `{"status":"PASS|FAIL|ERROR","scenario":"C02-OUT1-positive-mixed-artifacts"}` とし、最後は「DONE: <status>」の1行だけ報告してください。

制約:

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- `out/` には `status.json` 以外を書かないこと。
