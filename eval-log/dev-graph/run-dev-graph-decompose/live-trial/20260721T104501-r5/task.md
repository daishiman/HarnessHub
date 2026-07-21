# タスク: dev-graph:run-dev-graph-decompose 正経路の実走

この作業ツリー内の `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203525-wt-6/eval-log/dev-graph/live-trial-fixtures/20260721-r5-decompose` に、外部 write を行わない隔離 fixture repo を準備して以下を実行してください:

Skill({skill: "dev-graph:run-dev-graph-decompose", args: "認証付きTODO APIをarchitecture、認証feature、TODO featureへマクロ分解する。TODOは認証に依存。全nodeはtracker_binding=none。 --repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203525-wt-6/eval-log/dev-graph/live-trial-fixtures/20260721-r5-decompose --dry-run"})

feature + architecture DAG が循環なし、task 粒度混入なし、全 node draft preview、外部 write 0、原 graph digest 不変であることを検証してください。feature を通常 C02 add として直登録していないことも確認してください。scenario ID は `decompose-macro-positive-r3` です。

処理が終了（成功・失敗・中断のいずれでも）したら:

1. `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203525-wt-6/eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260721T104501-r5/out/status.json` に完了マーカーを1ファイルだけ Write する。内容は `{"status":"PASS|FAIL|ERROR","scenario":"decompose-macro-positive"}` とする。
2. `DONE: <status>` と1行だけ報告する。

制約:
- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。中間生成物は fixture repo に置くこと。
