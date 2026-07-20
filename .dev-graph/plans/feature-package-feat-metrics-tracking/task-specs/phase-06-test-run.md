# System task overlay: テスト実行 — ingest 冪等性・rollup 事前集計・試算エンジン単体・tenant 分離・dim=user 認可・bundle 予算テストの実行と結果記録

## Machine-readable registration fields

- feature_package_id: feature-package/feat-metrics-tracking (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-metrics-tracking", "studio-extension", "metrics-tracking", "test-run"]
- related_nodes: ["feat-metrics-tracking", "arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-frontend"]
- parent_feature: feat-metrics-tracking
- phase_ref: P06
- classification: confidence=0.86, reason="P05 の実装に対して P04 のテストスタブを実行し quality_constraints 8 件の充足状況を機械的に確認する P06 テスト実行タスク", candidates=[{artifact_kind: task, confidence: 0.86, candidate_path: tasks/feat-metrics-tracking/sys-metrics-tracking-p06.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P05 の実装に対して P04 で作成したテストスタブ (ingest 冪等性・rollup 事前集計・試算エンジン単体・tenant 分離・dim=user 認可・bundle 予算・S17 契約・異常検知 cron) を実行し、全て green であることを確認して結果を記録する。

## 背景

本 task は実装 (P05) とテスト設計 (P04) の橋渡しとして、実際にテストランナーを実行し失敗があれば内容を記録して P05 へ差し戻す。ingest の冪等性テストでは同一 Idempotency-Key での再送が 200 で冪等応答し重複計上しないことを確認する。rollup 事前集計テストでは summary/rollups API が生イベントをオンライン集計せず rollup テーブルのみを読むことを確認する。試算エンジン単体テストでは packages/estimation の純関数が tenant_coefficients の annualHours/minutes_per_run/sheet_reduction_rate を正しく反映することを確認する。tenant 分離テストでは他テナントの metrics_events/metrics_rollups へのクロステナントアクセスが拒否されることを確認する。dim=user 認可テストでは member ロールが dim=user の金額換算にアクセスできないことを確認する。bundle 予算テストでは S09/S16 の Worker bundle サイズが 3MiB を超えないことを確認する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-metrics-tracking, arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-frontend
- Entry gate: P05 の実装が完了し worktree 上でビルド可能な状態であること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: applicable + change: S09/S16 の bundle 予算テストと表示専用 UI テストを実行する
- Backend: applicable + change: ingest/rollup/試算エンジン/異常検知 cron のテストを実行する
- API: applicable + change: 3 endpoint の契約テストを実行する
- Data: applicable + change: tenant 分離テストと UNIQUE 制約テストを実行する
- Infrastructure: N/A: 既存 CI 基盤上でテストを実行し追加インフラを新設しない
- Security: applicable + change: 短命 token 失効・Idempotency-Key TTL 経過・dim=user 認可のセキュリティテストを実行する
- Quality: applicable + change: quality_constraints 8 件全てに対応するテスト結果を集約する
- Documentation: applicable + change: docs/features/feat-metrics-tracking/test-run-results.md を新規作成する
- Operations: applicable + change: Turso 使用量監視 cron と異常検知 cron のテストを実行する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-frontend (P02 の設計に対する実装の適合性をテストで検証する)
- Deploy unit/environment: cloudflare-workers/hub (worktree 上のローカル/CI 環境でテストを実行する)
- Compatibility/migration/backfill: N/A: 本 task はテスト実行のみで実データ変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-metrics-tracking/test-run-results.md (quality_constraints 8 件それぞれの pass/fail 結果と失敗時の原因記録)
- Consumed artifacts: apps/hub/src/features/metrics-tracking/__tests__/, apps/hub/src/features/metrics-tracking/, packages/estimation/, packages/schemas/metrics-tracking/, packages/db/schema/metrics-tracking/
- Write scope/touches: docs/features/feat-metrics-tracking/test-run-results.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-metrics-tracking-p06) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-metrics-tracking-p06 として払い出す
- Worktree lease: graph_node_id (sys-metrics-tracking-p06) の worktree lease を claim し heartbeat 送出、完了時 release
- Parallel safety: depends_on=[sys-metrics-tracking-p05]。P05 完了後に着手する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 実装コードの修正 (テスト失敗時の修正は P05 への差し戻しで行い、本 task 自体はコード修正を行わない)
- goal-spec acceptance 3 件の最終受入判定 (P07 で行う)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: docs/features/feat-metrics-tracking/test-run-results.md に quality_constraints 8 件全ての pass 結果が記録されていること (fail が残る場合は P05 への差し戻し理由が明記されていること)

## Rollout and rollback

- Rollout: 全テスト green を確認後 P07 の受入へ引き継ぐ
- Rollback trigger and steps: いずれかのテストが fail した場合、test-run-results.md に原因を記録し P05 (実装) へ差し戻す

## Handoff

- Executor: system build route
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/00-requirements-definition.md (I10, D4), system-spec/spec-state.json qa_log (qa-021〜025, qa-031)
- Detailed authoritative source: docs/backend-spec.md (§2.3, §3.3, §4.9, §7, §8)
- Architecture: arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-frontend
- Feature: feat-metrics-tracking
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-metrics-tracking-p05
