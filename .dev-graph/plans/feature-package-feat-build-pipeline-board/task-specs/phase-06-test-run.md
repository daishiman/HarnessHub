# System task overlay: テスト実行 — 単体/結合/工程遷移認可/PublishRequest 整合/tenant 分離テストの実行と結果記録

## Machine-readable registration fields

- feature_package_id: feature-package/feat-build-pipeline-board (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-build-pipeline-board", "studio-extension", "build-pipeline-board", "test-run"]
- related_nodes: ["feat-build-pipeline-board", "arch-harness-hub-frontend", "arch-harness-hub-backend"]
- parent_feature: feat-build-pipeline-board
- phase_ref: P06
- classification: confidence=0.87, reason="P04 のテストスタブ (工程遷移 admin 限定/監査記録/PublishRequest 整合/tenant 分離/B9 共有認可表) を P05 実装に対して実行し結果を記録する P06 タスク", candidates=[{artifact_kind: task, confidence: 0.87, candidate_path: tasks/feat-build-pipeline-board/sys-build-pipeline-board-p06.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P04 で定義した 5 テストカテゴリ (工程遷移 admin 限定・監査記録・PublishRequest 整合・tenant 分離・B9 共有認可表) を P05 実装に対して実行し、結果を test-run-report.md に記録する。

## 背景

P05 の実装完了を受け、テストファースト設計 (P04) で定めた合否基準に対する実測結果を記録する必要がある。特に publish 工程が PublishRequest の状態と整合し二重状態を持たないこと (goal-spec acceptance 2 件目) は、実装後の結合テストで実測確認することが必須であり、単体テストのみでは担保しきれない領域として重点的に検証する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-build-pipeline-board, arch-harness-hub-frontend, arch-harness-hub-backend
- Entry gate: sys-build-pipeline-board-p05 の実装が完了し、pnpm build/test が成功していること。かつ .dev-graph/staging/goal-spec.json の feature_context_digest が sha256:eeed295d50359e11ac8aee84800def3ad3399cee866ab5b4dc2712116c9a4441 に一致し、features/feat-build-pipeline-board.md の confirmation_status が confirmed であること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: applicable + change: S13 パイプラインボードの表示 (7 stage 列・risk 表示) の結合テストを実行する
- Backend: applicable + change: builds REST ハンドラと工程遷移 API の結合テストを実行する
- API: N/A: API 契約自体は変更しない。契約準拠テストは backend/quality の一部として実行する
- Data: applicable + review: Build/build_stage_events の tenant 分離テストを実行し結果を記録する
- Infrastructure: N/A
- Security: applicable + change: 工程遷移 admin 限定・監査 event・PublishRequest 整合・B9 共有認可表のテストを実行する
- Quality: applicable + change: test-run-report.md に P04 定義の 5 テストカテゴリ全件の pass/fail 結果を記録する
- Documentation: applicable + change: docs/features/feat-build-pipeline-board/test-run-report.md を新規作成する
- Operations: N/A: 運用監視の具体化は P09/P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub (本 task はテスト実行のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task はテスト実行のみで実 migration は伴わない

## 成果物

- Produced artifacts: docs/features/feat-build-pipeline-board/test-run-report.md (5 テストカテゴリの pass/fail 結果)
- Consumed artifacts: apps/hub/src/features/build-pipeline-board/, apps/hub/src/features/build-pipeline-board/__tests__/, docs/features/feat-build-pipeline-board/test-design.md
- Write scope/touches: docs/features/feat-build-pipeline-board/test-run-report.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-build-pipeline-board-p06) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-build-pipeline-board-p06 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-build-pipeline-board-p06) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: sys-build-pipeline-board-p05 完了後に着手する。resource_scope (docs/features/feat-build-pipeline-board/test-run-report.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 実装コードの修正 (fail が生じた場合は P05 へ差し戻す)
- publish 状態機械自体の再テスト (既存 I2/I3 のテストスイートを流用参照するのみ)

## Verification and evidence

- Automated commands: `pnpm install --frozen-lockfile`, `pnpm --filter hub build`, `pnpm --filter hub test`, `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: test-run-report.md に P04 定義の 5 テストカテゴリ全件の pass/fail 結果が記録されていること

## Rollout and rollback

- Rollout: test-run-report.md を作成し、全件 pass を確認してから P07 受入へ引き継ぐ
- Rollback trigger and steps: fail が発生した場合、test-run-report.md に失敗詳細を記録し sys-build-pipeline-board-p05 を再実行対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/security.md (qa-025 SEC2/SEC6), system-spec/database.md (qa-032), system-spec/ui-ux.md (qa-021 S13)
- Detailed authoritative source: docs/backend-spec.md (§3.3 認可マトリクス, §3.8 監査対象, §5.3 Build 状態機械)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-build-pipeline-board
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-build-pipeline-board-p05
