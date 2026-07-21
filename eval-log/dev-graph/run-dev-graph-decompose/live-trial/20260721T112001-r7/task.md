# タスク: dev-graph:run-dev-graph-decompose blocker 修正後の正経路実走

隔離 fixture repo `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203525-wt-6/eval-log/dev-graph/live-trial-fixtures/20260721-r5-decompose` と前回 macro preview を入力にし、以下を実行してください:

Skill({skill: "dev-graph:run-dev-graph-decompose", args: "認証付きTODO APIをarchitecture、認証feature、TODO featureへマクロ分解する。TODOは認証に依存。全nodeはtracker_binding=none。 --repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203525-wt-6/eval-log/dev-graph/live-trial-fixtures/20260721-r5-decompose --dry-run"})

前回 fresh evaluator の blocker をすべて解消してください。具体的には、(1) architecture 1件 + feature 2件の全 node に schema 必須の `created_at` / `updated_at` を含め、3 node をまとめた一時 preview graph を `validate-graph-schema.py` で実検証して `schema_violation` / `missing_required_key` を0件にする、(2) macro preview の `validation.cycle_check` / `task_granularity_mixing` / `schema_validation` を実測 PASS に更新し、R6 dry-run publication preview に全 target・operation・input/output digest・local/Beads/GitHub/Projects の write_count=0 を記録する、(3) R2-plan の Agent macro verifier と、成果物・実コマンド receipt を読む別 Agent の独立監査を実際に起動し、transcript に残すことです。

feature + architecture DAG は循環なし、task 粒度混入なし、全 node draft、tracker publication 0、原 canonical graph digest 不変、feature を C02 add として直登録0を維持してください。preview 用一時 graph は eval-log 配下だけに置き、canonical `.dev-graph/state/graph.json` を変更しないでください。scenario ID は `decompose-macro-positive-r3` です。

処理が終了（成功・失敗・中断のいずれでも）したら:

1. `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203525-wt-6/eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260721T112001-r7/out/status.json` に完了マーカーを1ファイルだけ Write する。内容は `{"status":"PASS|FAIL|ERROR","scenario":"decompose-macro-positive"}` とする。
2. `DONE: <status>` と1行だけ報告する。

制約:
- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、上記 Agent fork・実 schema 検証・publication preview を省略しないこと。
- out/ には status.json 以外を書かないこと。中間生成物は fixture repo の eval-log に置くこと。
