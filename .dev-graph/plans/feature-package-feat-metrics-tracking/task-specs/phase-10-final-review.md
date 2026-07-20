# System task overlay: 最終独立レビュー — quality_constraints 8 件の充足判定

## Machine-readable registration fields

- feature_package_id: feature-package/feat-metrics-tracking (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-metrics-tracking", "studio-extension", "metrics-tracking", "final-review"]
- related_nodes: ["feat-metrics-tracking", "arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-frontend"]
- parent_feature: feat-metrics-tracking
- phase_ref: P10
- classification: confidence=0.86, reason="P09 の品質保証結果を基に quality_constraints 8 件全件の最終充足判定を実装者から独立した視点で行う P10 最終独立レビュータスク", candidates=[{artifact_kind: task, confidence: 0.86, candidate_path: tasks/feat-metrics-tracking/sys-metrics-tracking-p10.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P09 の品質保証結果、P07 の受入結果、P03 の設計レビュー結果を踏まえ、goal-spec の quality_constraints 8 件全件の充足を実装者から独立した視点で最終判定し、リリース (P13) 判断の根拠を確定する。

## 背景

本 task は P01〜P09 の各成果物 (requirements-baseline.md, architecture-decision-record.md, design-review-notes.md, test-design.md, test-run-results.md, acceptance-record.md, refactoring-migration-note.md, quality-assurance-report.md) を横断的に参照し、quality_constraints 8 件 (metrics-ingest-short-token-idempotency-count-only-b2-sec5, metrics-rollup-cron-server-conversion-b3, estimation-engine-single-pure-function-owner-unresolved [P02 で確定済み], tenant-coefficients-scope-audit-d4, dashboard-s09-s16-rollup-read-only-authz-sec4, frontend-chart-bundle-budget-server-estimate-display-only-qa022, s17-individual-metrics-supplied-to-user-org-admin-boundary, metrics-retention-indefinite-usage-monitoring-anomaly-detection) それぞれについて、charter 上の記述と実装結果が一致するかを独立レビュー観点で再確認する。特に P02 で確定した試算エンジン owner 決定が、実装 (P05) 以降で一貫して守られていること (packages/estimation が feat-metrics-tracking 配下に実装され、S17 側が rollup 読取のみで試算エンジンを直接呼び出していないこと) を最終確認する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-metrics-tracking, arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-frontend
- Entry gate: P09 の quality-assurance-report.md で CI 品質ゲート全項目が pass 済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: applicable + change: S09/S16 の quality_constraints (qa-022) 充足の最終確認を行う
- Backend: applicable + change: ingest/rollup/試算エンジンの quality_constraints (b2-sec5, b3) 充足の最終確認を行う
- API: applicable + change: 3 endpoint の認可マトリクス (SEC4) 充足の最終確認を行う
- Data: applicable + change: tenant 分離 (D4) 充足の最終確認を行う
- Infrastructure: N/A: 本 task はレビューのみでインフラ変更を伴わない
- Security: applicable + change: SEC4/SEC5/SEC6 関連 quality_constraints の最終確認を行う
- Quality: applicable + change: quality_constraints 8 件全件の充足判定を記録する
- Documentation: applicable + change: docs/features/feat-metrics-tracking/final-review-record.md を新規作成する
- Operations: applicable + change: 保持/監視/異常検知 (metrics-retention-indefinite-usage-monitoring-anomaly-detection) の最終確認を行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-frontend (P02〜P09 の全成果物を横断的にレビューする。既存 architecture doc は書き換えない)
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: N/A: 本 task はレビューのみで実データ変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-metrics-tracking/final-review-record.md (quality_constraints 8 件全件の最終充足判定)
- Consumed artifacts: docs/features/feat-metrics-tracking/requirements-baseline.md, architecture-decision-record.md, design-review-notes.md, test-design.md, test-run-results.md, acceptance-record.md, refactoring-migration-note.md, quality-assurance-report.md
- Write scope/touches: docs/features/feat-metrics-tracking/final-review-record.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-metrics-tracking-p10) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-metrics-tracking-p10 として払い出す
- Worktree lease: graph_node_id (sys-metrics-tracking-p10) の worktree lease を claim し heartbeat 送出、完了時 release
- Parallel safety: depends_on=[sys-metrics-tracking-p09]。P09 完了後に着手する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 実装コードの修正 (不充足が判明した場合は該当 phase へ差し戻す)
- エビデンス収集自体 (P11 で行う)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: docs/features/feat-metrics-tracking/final-review-record.md に quality_constraints 8 件全件の充足判定 (充足) が記載されていること

## Rollout and rollback

- Rollout: quality_constraints 8 件全件充足を確認後 P11 のエビデンス収集へ引き継ぐ
- Rollback trigger and steps: いずれかの quality_constraint が不充足と判定された場合、final-review-record.md に理由を記録し該当する P02/P05/P09 へ差し戻す

## Handoff

- Executor: system build route
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/00-requirements-definition.md (I10, D4), system-spec/spec-state.json qa_log (qa-021〜025, qa-031)
- Detailed authoritative source: docs/backend-spec.md (§2.3, §3.3, §4.9, §6.2, §7, §8), docs/shared-layers.md (§2, §5)
- Architecture: arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-frontend
- Feature: feat-metrics-tracking
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-metrics-tracking-p09
