# System task overlay: リリース/デプロイ — Cloudflare Workers 本番反映とスモークテスト

## Machine-readable registration fields

- feature_package_id: feature-package/feat-metrics-tracking (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-metrics-tracking", "studio-extension", "metrics-tracking", "release-deploy"]
- related_nodes: ["feat-metrics-tracking", "arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-frontend"]
- parent_feature: feat-metrics-tracking
- phase_ref: P13
- classification: confidence=0.85, reason="P12 の runbook を前提に、MetricsEvent/MetricsRollup スキーマ・ingest/rollup/summary API・Workers cron・S09/S16 画面を本番 Cloudflare Workers 環境へ反映しスモークテストで疎通確認する P13 リリース/デプロイタスク (required-node、N/A 許容)", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-metrics-tracking/sys-metrics-tracking-p13.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P01〜P12 で確定・実装・検証・文書化した MetricsEvent/MetricsRollup スキーマ・ingest/summary/rollups API・Workers cron 週次 rollup・試算エンジン純関数・S09/S16 画面を本番 Cloudflare Workers 環境へ反映し、スモークテストで疎通を確認する。

## 背景

本 feature のデプロイ単位は既存の Hub Worker (cloudflare-workers/hub) であり、新規インフラを追加しない。マイグレーション (P08) 適用後、ingest エンドポイント疎通・Workers cron (日次事前集計・週次確定・Turso 使用量監視・異常検知) の初回実行確認・S09/S16 画面の到達性・`metrics.anomaly` 通知の疎通をスモークテスト項目とする。リリース後は P12 の runbook.md に記載した監視体制が実際に機能することを確認する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-metrics-tracking, arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-frontend
- Entry gate: P12 の runbook.md が確定済みであること、P10 の final-review-record.md で quality_constraints 8 件全件充足が確定していること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: applicable + change: S09/S16 画面の本番反映と到達性スモークテストを行う
- Backend: applicable + change: ingest/summary/rollups API と Workers cron の本番反映を行う
- API: applicable + change: 3 endpoint の本番疎通スモークテストを行う
- Data: applicable + change: metrics_events/metrics_rollups マイグレーションの本番適用を行う
- Infrastructure: applicable + change: Hub Worker (cloudflare-workers/hub) への本番デプロイを行う
- Security: applicable + change: 本番環境での短命 token・Idempotency-Key・dim=user 認可の疎通確認を行う
- Quality: applicable + change: スモークテスト結果を記録する
- Documentation: applicable + change: docs/features/feat-metrics-tracking/release-record.md を新規作成する
- Operations: applicable + change: cron 初回実行確認・監視体制稼働確認を行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-frontend (P01〜P12 で確定した設計をそのまま本番反映する。既存 architecture doc は書き換えない)
- Deploy unit/environment: cloudflare-workers/hub (本番環境)
- Compatibility/migration/backfill: P08 で生成したマイグレーションを本番へ適用する。新規テーブル追加のみで既存テーブルへの破壊的変更なし

## 成果物

- Produced artifacts: docs/features/feat-metrics-tracking/release-record.md (本番反映内容・スモークテスト結果・cron 初回実行確認結果)
- Consumed artifacts: docs/features/feat-metrics-tracking/runbook.md, docs/features/feat-metrics-tracking/final-review-record.md, packages/db/schema/metrics-tracking/ のマイグレーションファイル
- Write scope/touches: docs/features/feat-metrics-tracking/release-record.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-metrics-tracking-p13) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-metrics-tracking-p13 として払い出す
- Worktree lease: graph_node_id (sys-metrics-tracking-p13) の worktree lease を claim し heartbeat 送出、完了時 release
- Parallel safety: depends_on=[sys-metrics-tracking-p12]。P12 完了後に着手する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 新機能の追加・設計変更 (本 task はリリース作業のみ)
- 外部 BI 連携の展開 (goal-spec scope_out)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: docs/features/feat-metrics-tracking/release-record.md に本番反映内容とスモークテスト結果 (ingest 疎通・cron 初回実行・S09/S16 到達性・metrics.anomaly 通知疎通) が pass として記載されていること

## Rollout and rollback

- Rollout: マイグレーション適用後 Hub Worker へ本番デプロイし、スモークテスト全項目 pass を確認して release-record.md に記録する
- Rollback trigger and steps: スモークテストが fail した場合、直前の Worker デプロイへロールバックし、マイグレーションが可逆であれば取り消し、release-record.md に原因と対応を記録して P05/P08 へ差し戻す

## Handoff

- Executor: system build route
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/00-requirements-definition.md (I10, D4), system-spec/spec-state.json qa_log (qa-021〜025, qa-031)
- Detailed authoritative source: docs/backend-spec.md (§2.3, §4.9, §7, §8)
- Architecture: arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-frontend
- Feature: feat-metrics-tracking
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-metrics-tracking-p12
