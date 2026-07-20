# System task overlay: 品質保証 — CI 品質ゲート (tenant 分離・認可・bundle 予算・監査・cron) の確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-metrics-tracking (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-metrics-tracking", "studio-extension", "metrics-tracking", "quality-assurance"]
- related_nodes: ["feat-metrics-tracking", "arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-frontend"]
- parent_feature: feat-metrics-tracking
- phase_ref: P09
- classification: confidence=0.85, reason="P08 のマイグレーション適用後、CI 品質ゲート (tenant 分離 CI 必須・認可マトリクス・bundle 予算・監査 event・cron 動作) を最終確認する P09 品質保証タスク", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-metrics-tracking/sys-metrics-tracking-p09.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P08 完了後の実装全体に対して CI 品質ゲート (tenant 分離テスト必須実行・dim=user 認可マトリクス・bundle 3MiB 予算・tenant_coefficients 変更監査 event・Workers cron 動作) を確認し、リリース判定前の品質基準を満たしていることを記録する。

## 背景

D4/qa-024 は metrics_events/metrics_rollups を含む Studio 拡張の新規テーブルが tenant_id スコープ列必須でリポジトリ層に WHERE 句を強制注入し、分離テストを CI 必須とすると定める。本 task は分離テストが CI パイプラインに組み込まれ実際に実行されることを確認する。dim=user の金額換算 admin 限定 (SEC4) が本番相当環境でも機能することを確認する。S09/S16 の Worker bundle が 3MiB 予算内であることを最終ビルドで再確認する。tenant_coefficients の係数変更時に監査 event (B10/SEC6) が発生することを確認する (係数の保存自体は feat-user-org-admin 管轄だが、本 feature の rollup cron が読み取る際の監査可視性を含めて確認する)。Workers cron (日次事前集計・週次確定・Turso 使用量日次監視・異常検知) が想定通りスケジュール実行されることを確認する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-metrics-tracking, arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-frontend
- Entry gate: P08 の refactoring-migration-note.md でマイグレーション適用と後方互換性確認が完了していること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: applicable + change: S09/S16 の bundle 予算最終確認を行う
- Backend: applicable + change: ingest/rollup/試算エンジンの CI 品質ゲート確認を行う
- API: applicable + change: 3 endpoint の認可マトリクス最終確認を行う
- Data: applicable + change: tenant 分離テストの CI 必須実行確認を行う
- Infrastructure: N/A: 既存 CI パイプラインを利用し追加インフラを新設しない
- Security: applicable + change: dim=user admin 限定・監査 event 発生の最終確認を行う
- Quality: applicable + change: CI 品質ゲート全体の pass 状況を記録する
- Documentation: applicable + change: docs/features/feat-metrics-tracking/quality-assurance-report.md を新規作成する
- Operations: applicable + change: Workers cron のスケジュール実行確認を行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-frontend (P02 で確定した設計に対する品質確認であり既存 architecture doc は書き換えない)
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: N/A: 本 task は品質確認のみで実データ変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-metrics-tracking/quality-assurance-report.md (CI 品質ゲート確認結果)
- Consumed artifacts: docs/features/feat-metrics-tracking/refactoring-migration-note.md, apps/hub/src/features/metrics-tracking/, packages/estimation/
- Write scope/touches: docs/features/feat-metrics-tracking/quality-assurance-report.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-metrics-tracking-p09) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-metrics-tracking-p09 として払い出す
- Worktree lease: graph_node_id (sys-metrics-tracking-p09) の worktree lease を claim し heartbeat 送出、完了時 release
- Parallel safety: depends_on=[sys-metrics-tracking-p08]。P08 完了後に着手する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 実装コードの修正 (品質ゲート不合格時の修正は P05 への差し戻しで行う)
- 最終独立レビュー自体 (P10 で行う)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: docs/features/feat-metrics-tracking/quality-assurance-report.md に CI 品質ゲート (tenant 分離・認可マトリクス・bundle 予算・監査 event・cron) の全項目 pass が記載されていること

## Rollout and rollback

- Rollout: 品質ゲート全項目 pass を確認後 P10 の最終独立レビューへ引き継ぐ
- Rollback trigger and steps: いずれかの品質ゲート項目が fail した場合、quality-assurance-report.md に原因を記録し該当する P05/P08 へ差し戻す

## Handoff

- Executor: system build route
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/00-requirements-definition.md (D4), system-spec/spec-state.json qa_log (qa-021, qa-022, qa-024, qa-025)
- Detailed authoritative source: docs/backend-spec.md (§2.3, §3.3, §7, §8)
- Architecture: arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-frontend
- Feature: feat-metrics-tracking
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-metrics-tracking-p08
