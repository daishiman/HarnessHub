# タスク: dev-graph:run-dev-graph-node の実走 (C02-OUT1 mixed artifacts)

被験 fixture は `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/live-trial-fixtures/node-wt11` にある dev-graph 初期化済みの独立 Git repository です (graph_revision=0 の空 graph、content roots は issues/tasks/specs/architecture/docs/features/system-spec)。

以下を実行してください:

Skill({skill: "dev-graph:run-dev-graph-node", args: "upsert --repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/live-trial-fixtures/node-wt11 --input /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/live-trial-fixtures/node-wt11/mixed-artifacts.json"})

## goal-seek 配線を最初に正しく作る

被験 skill の frontmatter は `goal_seek` を宣言しています。SKILL.md の `original_goal` を使い、Skill 実行の最初の周回で fixture の `eval-log/` 配下へ次の 3 点を作成してください。

- `run-dev-graph-node-goal-spec.json`
- `run-dev-graph-node-progress.json`
- `run-dev-graph-node-intermediate.jsonl`

`intermediate.jsonl` の 1 行目には次の 6 キーを**最初からすべて**含めます。

- `original_goal`
- `original_goal_hash` (`sha256(original_goal.encode("utf-8")).hexdigest()`)
- `current_goal_snapshot`
- `delta_from_original`
- `merged_directive_for_next`
- `drift_signal`

1 行目を書いた直後、被験 skill の artifact 書込み前に
`plugins/harness-creator/skills/run-skill-live-trial/scripts/validate-goal-seek-evidence.py`
を実行し、必須キーと hash が正しいことを確認してください。progress もこの時点で作ります。

実行・検証後は同じ 6 キーを持つ 2 行目だけをファイル末尾へ append してください。`intermediate.jsonl` は既存行の Edit・Write・置換・全体上書き・`open(..., "w")` を一切禁止します。形式を誤った場合は修正上書きせず status=FAIL としてください。2 行目追加後に同じ validator を再実行し、2 rows・valid=true を確認してください。

## artifact 実行順

1. `mixed-artifacts.json` を `json.load` し、原文 body を変数から取得して 5 artifact の node 入力を作る。原文を Bash、Python `-c`、heredoc、`printf`、`echo` に転記しない。
2. 5 artifact を dry-run 後に apply し、issue / task / specification / architecture / document の正規 path へ保存する。
3. **初回 apply 完了後**に同じ issue node 入力をもう一度 apply する。初回前の dry-run は代用不可。
4. 2 回目が `operation=noop`、`idempotent=true`、`write_count=0` で、保存 Markdown SHA-256・graph revision・graph SHA-256 が前後同一であることを実測する。
5. 5 原文 body の完全な連続文字列保持、frontmatter kind/path と graph の一致、feature が 0 件であることを検証する。
6. `GET /api/v1/users`、`POST /api/v2/orders`、`items`、`line_items`、`X-API-Key`、`Authorization: Bearer`、`DELETE /api/v2/sessions/bulk` が保存後も存在することを実測する。

## 成功条件

- 5 artifact が正規 path に入り、全 original body が byte-for-byte で保持される
- apply 後の同一 issue 再適用が真の no-op になる
- frontmatter / graph / path が再適用後も一致する
- C14 契約外の feature が作られない
- goal-seek 3 点セットが有効で、intermediate は 1 行目作成後に 2 行目だけを append した履歴である

## 終了時の報告

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/run-dev-graph-node/live-trial/20260728T013202Z-node-wt11/out/status.json に完了マーカーを 1 ファイルだけ Write する。内容:
   {"status": "PASS|FAIL|ERROR", "scenario": "C02-OUT1-positive-mixed-artifacts"}
2. 「DONE: <status>」と 1 行だけ報告する。

制約:
- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと (中間生成物は skill 側の出力先 (WORK_DIR 外) へ — out/ に中間 Write させると poll が DONE 偽陽性を起こす)。
