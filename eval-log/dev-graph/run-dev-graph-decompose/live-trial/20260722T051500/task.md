# タスク: dev-graph:run-dev-graph-decompose 正経路の実走

以下を実行してください:

Skill({skill: "dev-graph:run-dev-graph-decompose", args: "認証付きTODO APIをarchitecture、認証feature、TODO featureへマクロ分解する。TODOは認証に依存。全nodeはtracker_binding=none。 --repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-231540-wt-1/eval-log/dev-graph/live-trial-fixtures/decompose --dry-run"})

feature+architecture DAGが循環なし、task粒度混入なし、全node draft preview、外部write 0、原graph digest不変であることを検証してください。featureを通常C02 addとして直登録していないことも確認してください。

`--dry-run` の実走です。いかなるスクリプトも非 dry-run モードで実行しないでください。ファイルを書いてから削除する形での回避も禁止です (書いた時点で「write 0 件」を満たしません)。コマンドが期待どおりに動かない場合も、出力を書き換えず、そのまま次へ進んでください。

1. `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-231540-wt-1/eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260722T051500/out/status.json` だけに `{"status":"PASS|FAIL|ERROR","scenario":"decompose-macro-positive"}` をWriteする。
2. `DONE: <status>` と1行だけ報告する。

途中で人間に質問せず最後まで自走し、skillの手順を省略しないこと。out/に中間成果物を書かないこと。
