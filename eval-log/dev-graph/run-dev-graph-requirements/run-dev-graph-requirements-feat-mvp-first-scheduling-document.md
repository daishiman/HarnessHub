# 実装要件定義書: feat-mvp-first-scheduling (MVP ファースト優先度選定)

- 生成: 2026-07-23T13:10:00Z / snapshot: `sha256:45ddb06c63b891e576ef42ece9b74f650d33ec8505e05ffbb6ce6b4caf195edb` (graph_revision 429 で再発行、supersedes sha256:ee11f5a9…)
- handoff target: task-graph / package: `feature-package/feat-mvp-first-scheduling` (generation `55a34fe2a628…`)

## 要件の出所 (lineage)

- 確定仕様: `system-spec/dev-workflow.md` qa-069 — dev-graph/beads (bd) のタスク優先度選定を「目的 (何のために作るか)・背景 (どういう経緯か)・MVP (今必要な動くもの)」3軸の MVP ファースト基準へ組み替える。既確定の CI/CD・quality gate 要件 (qa-066) は維持する。
- architecture: `architecture/harness-hub-dev-workflow.md` (source_digest 43336931…・completeness evaluator PASS 2026-07-23)
- feature: `features/feat-mvp-first-scheduling.md` (confirmed/pass, plan evaluator C1..C4 PASS)

## 実装要件 (要約)

1. **MVP 判断軸 metadata**: feature/task node に MVP 適合度 (目的・背景・MVP 直結度) を表現する metadata を追加し、`validate-graph-schema.py` PASS で登録可能にする。
2. **MVP 適合第一ソートキー**: `plugins/dev-graph/scripts/schedule-graph.py` の着手候補算出で、MVP 適合を辞書順 (node_id) より優先する第一ソートキーへ昇格する。
3. **bd ready 整合**: `plugins/dev-graph/scripts/bd-bridge.py` の ready 候補順序を同じ MVP-first 基準へ整合させる。
4. **繰り延べ規則**: 品質・再現性強化系タスクは MVP 成立後へ繰り延べる規則を選定ロジックに実装する (品質ゲート自体の緩和は scope 外)。
5. **選定 receipt**: なぜそのタスクが先かの判断根拠 (目的・背景・MVP 適合) を receipt として出力する。
6. **冪等性**: 同一入力での選定 batch と順序が再現されること。

## スコープ外 (変更禁止)

- bd CLI 本体 / CI・CD・quality gate 要件 (qa-066) の緩和・削除 / dev-graph 新 verb / 既存 task 資産の一括書換 / Hub 本体機能 (Web/API/DB)

## 実行単位

P01..P13 exact-13 package (`.dev-graph/plans/generations/feature-package-feat-mvp-first-scheduling/55a34fe2a62841c0175b568204b4a1fde8e1fd04d1c0496bb4e0444e3cf86387`) の task projections:
- `tasks/feat-mvp-first-scheduling/sys-mvp-first-scheduling-p01.md`
- `tasks/feat-mvp-first-scheduling/sys-mvp-first-scheduling-p02.md`
- `tasks/feat-mvp-first-scheduling/sys-mvp-first-scheduling-p03.md`
- `tasks/feat-mvp-first-scheduling/sys-mvp-first-scheduling-p04.md`
- `tasks/feat-mvp-first-scheduling/sys-mvp-first-scheduling-p05.md`
- `tasks/feat-mvp-first-scheduling/sys-mvp-first-scheduling-p06.md`
- `tasks/feat-mvp-first-scheduling/sys-mvp-first-scheduling-p07.md`
- `tasks/feat-mvp-first-scheduling/sys-mvp-first-scheduling-p08.md`
- `tasks/feat-mvp-first-scheduling/sys-mvp-first-scheduling-p09.md`
- `tasks/feat-mvp-first-scheduling/sys-mvp-first-scheduling-p10.md`
- `tasks/feat-mvp-first-scheduling/sys-mvp-first-scheduling-p11.md`
- `tasks/feat-mvp-first-scheduling/sys-mvp-first-scheduling-p12.md`
- `tasks/feat-mvp-first-scheduling/sys-mvp-first-scheduling-p13.md`

## 受入 (feature acceptance)

- MVP 適合度を持つ task と品質先行 task が混在する入力で、next が MVP 適合 task を先に選定する
- 同一入力で next を再実行しても選定 batch と順序が一致する (冪等)
- MVP 判断軸 metadata を持つ node が validate-graph-schema.py PASS で登録できる
- 選定 receipt に 目的・背景・MVP 適合の判断根拠が記録される
- qa-066 由来の既存品質ゲートの検査が非退行である

## 品質ゲート

四 gate (C11 schema / C02 saved state / source digest / validate-system-plan) を同一 snapshot で PASS 済み。実装フェーズは各 task spec の Automated commands・Required evidence・inner goal-seek (system-task-goal-seek/v1) に従う。
