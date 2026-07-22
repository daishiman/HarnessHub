# タスク: dev-graph:run-dev-graph-requirements 正経路の実走

fixture repo には、confirmed/pass/readiness-complete の feature、C19 由来 system-spec/architecture lineage、system-dev-planner 由来 P01..P13 exact 13 task package が正本 schema と validator で準備済みです(feature-id は `F-LIVE-001`、package は `system-plan/F-LIVE-001/package.json`)。共通 parent_feature/feature_package_id・前方 dependency・source digest・C11 readiness digest が一致していることを前提に、以下を実行してください:

Skill({skill: "dev-graph:run-dev-graph-requirements", args: "handoff --repo-root /private/tmp/claude-501/-Users-dm-dev-dev------HarnessHub--worktrees-task-20260722-041945-wt-4/de1ca9e4-7ac6-43b6-ae03-3033bff4f758/scratchpad/ltfix/requirements --feature-id F-LIVE-001 --package /private/tmp/claude-501/-Users-dm-dev-dev------HarnessHub--worktrees-task-20260722-041945-wt-4/de1ca9e4-7ac6-43b6-ae03-3033bff4f758/scratchpad/ltfix/requirements/system-plan/F-LIVE-001/package.json"})

handoff が実在して capability-build/task-graph 向け要件・13 task・lineage/digest を持ち、本 skill が実装 code を1件も生成していないことを検証してください。system plan validator と C11 が exit0 でなければ PASS にしないでください。scenario ID は `C04-OUT1-positive-ready-handoff` です。

1. `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260722-041945-wt-4/eval-log/dev-graph/run-dev-graph-requirements/live-trial/20260722T235959-hh6cv/out/status.json` だけに `{"status":"PASS|FAIL|ERROR","scenario":"requirements-positive-handoff"}` をWriteする。
2. `DONE: <status>` と1行だけ報告する。

途中で人間に質問せず最後まで自走し、skillの手順に忠実に従い人手の追加判断・省略をしないこと。out/に中間成果物を書かないこと。
