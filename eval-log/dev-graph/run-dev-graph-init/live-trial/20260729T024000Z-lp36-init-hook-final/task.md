# タスク: dev-graph:run-dev-graph-init の共有 hook 更新後実走

scenario は `C01-OUT1-positive-idempotence-r17` です。被験 fixture は次の未初期化の独立
Git repository です。

`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/live-trial-fixtures/init-lp36-hook-final`

outer session 自身が次の工程を連続実行し、1 回目の Skill 後も停止しないでください。

1. Skill({skill: "dev-graph:run-dev-graph-init", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/live-trial-fixtures/init-lp36-hook-final --hook-source plugin"})
2. 生成された canonical template 1 件だけを Edit し、識別文字列を本文へ加えて
   SHA-256 を記録する。
3. C02 `upsert-node.py` の正規 writer で通常 node 1 件を登録し、空 graph の真空合格を防ぐ。
4. 同じ Skill 呼出しを outer session からもう一度実行する。

必須観測:

- 1 回目が 6 content root、routing policy、graph store を作成する。
- 2 回目が同じ Skill を再起動し、planned changes 0 を報告する。
- between-pass で編集した template の SHA-256 が 2 回目後も不変。
- plugin hook source の receipt または rejection 診断が記録される。
- config の絶対 path、token、GitHub node ID が 0 件。
- C11 が node 1 件以上の graph に PASS する。

SKILL.md の original_goal を使い、fixture の `eval-log/` に goal-spec、progress、
intermediate.jsonl の 3 点を作ってください。intermediate の 1 行目は最初の Skill
実行前、2 行目は全検証後に Python `json.dumps` と file mode `a` で追記し、既存行を
置換しないでください。各行は必須 6 キーと正しい original_goal_hash を持ち、progress
に pending / evidence null を残さないでください。

成功・失敗・中断のいずれでも最後に次の 1 ファイルだけを書きます。

`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/run-dev-graph-init/live-trial/20260729T024000Z-lp36-init-hook-final/out/status.json`

内容は `{"status":"PASS|FAIL|ERROR","scenario":"C01-OUT1-positive-idempotence-r17"}`。
最後は `DONE: <status>` の 1 行だけを報告し、fixture 以外を変更しないでください。
