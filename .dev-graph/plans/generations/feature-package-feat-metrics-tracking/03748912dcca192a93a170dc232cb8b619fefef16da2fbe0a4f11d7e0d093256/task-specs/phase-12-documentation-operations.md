# System task overlay: ドキュメント/運用 — ingest/rollup cron 運用・Turso 使用量監視・異常検知通知・S09/S16 運用手順の runbook 作成

## Machine-readable registration fields

- feature_package_id: feature-package/feat-metrics-tracking (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-metrics-tracking", "studio-extension", "metrics-tracking", "documentation-operations"]
- related_nodes: ["feat-metrics-tracking", "arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-frontend"]
- parent_feature: feat-metrics-tracking
- phase_ref: P12
- classification: confidence=0.83, reason="P11 の evidence bundle を踏まえ、ingest/rollup cron 運用・Turso 使用量監視・異常検知通知・S09/S16 の運用 runbook を作成する P12 ドキュメント/運用タスク", candidates=[{artifact_kind: task, confidence: 0.83, candidate_path: tasks/feat-metrics-tracking/sys-metrics-tracking-p12.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

Workers cron (日次事前集計・週次確定・Turso 使用量日次監視・実行回数異常検知) の運用手順、S09/S16 の運用 (障害時の rollup 再実行手順を含む) を runbook として文書化し、運用チームが参照できる状態にする。

## 背景

`metrics_events` は無期限 DB 保持とする決定 (2026-07-17 ユーザー決定、90 日 R2 退避案不採用) に伴い、Turso 使用量日次監視 cron (無料枠閾値超過で admin 通知) と、ユーザー別実行回数が過去 4 週中央値の 10 倍超で `metrics.anomaly` 通知を出す日次異常検知 cron (ブロックしない) が運用に組み込まれている (qa-031)。本 task はこれらの cron の実行スケジュール・通知先・閾値・対応手順 (無料枠圧迫時は保持期間導入を R4-reopen で再検討する等) を runbook 化する。また週次 rollup が失敗した場合の再実行手順、S09/S16 のダッシュボードで異常な値 (欠損・急変) が観測された際の一次切り分け手順も文書化する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-metrics-tracking, arch-harness-hub-backend
- Entry gate: P11 の evidence-summary.md が確定済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: N/A: 本 task は運用文書化のみで frontend 実装物への変更を伴わない
- Backend: N/A: 本 task は運用文書化のみで backend 実装物への変更を伴わない
- API: N/A: 本 task は運用文書化のみで API 契約への変更を伴わない
- Data: N/A: 本 task は運用文書化のみでデータスキーマへの変更を伴わない
- Infrastructure: N/A: 既存 Cloudflare Workers cron 基盤を前提とした運用文書化であり新設を伴わない
- Security: N/A: 本 task は運用文書化のみでセキュリティ設計への変更を伴わない
- Quality: N/A: 本 task は品質ゲート自体の追加を行わない (P09 で完結済み)
- Documentation: applicable + change: docs/features/feat-metrics-tracking/runbook.md を新規作成する
- Operations: applicable + change: cron 運用手順・監視閾値・異常検知対応・rollup 再実行手順を確定する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-backend (Workers cron のスケジュール構成を運用視点で参照する。既存 architecture doc は書き換えない)
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: N/A: 本 task は運用文書化のみで実データ変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-metrics-tracking/runbook.md (cron 運用手順、Turso 使用量監視閾値・通知先、異常検知 `metrics.anomaly` 対応手順、週次 rollup 再実行手順、S09/S16 一次切り分け手順)
- Consumed artifacts: docs/features/feat-metrics-tracking/evidence-summary.md, docs/backend-spec.md (§7, §8)
- Write scope/touches: docs/features/feat-metrics-tracking/runbook.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-metrics-tracking-p12) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-metrics-tracking-p12 として払い出す
- Worktree lease: graph_node_id (sys-metrics-tracking-p12) の worktree lease を claim し heartbeat 送出、完了時 release
- Parallel safety: depends_on=[sys-metrics-tracking-p11]。P11 完了後に着手する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- cron 実装自体の変更 (P05 で完結済み、本 task は運用文書化のみ)
- 保持期間導入の実施判断 (R4-reopen として別途扱う。本 task は再検討条件の記録のみ)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: docs/features/feat-metrics-tracking/runbook.md に cron 運用手順・監視閾値・異常検知対応・rollup 再実行手順が過不足なく記載されていること

## Rollout and rollback

- Rollout: runbook.md 作成後 P13 のリリース/デプロイへ引き継ぐ
- Rollback trigger and steps: 運用手順に重大な欠落が見つかった場合、runbook.md を修正し P11 の evidence bundle との整合を再確認する

## Handoff

- Executor: system build route
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-metrics-tracking.context.json` (`sha256:64106cc96859b3755741efeb26321fd3746af1a823d0d7837d5b2147b41ee759`)
- Phase responsibility: 検証済み実装の運用・runbook・handover を文書化し、先行 phase の前提にしない。
- Purpose: 導入ハーネスの利用実態と削減効果 (G5) を可視化するため、実行ログ ingest (B2: 短命 token・冪等キー・回数のみ)・週次 rollup (B3: Workers cron)・試算エンジン共通層 (サーバ側係数換算) と S09/S16 ダッシュボードを提供する (I10)
- Goal: 実行ログがサーバ側で信頼可能に集計され (SEC5)、S09 ダッシュボード・S16 利用/削減効果・S17 個別集計が週次 rollup から描画される状態
- Scope in (all items are in-scope for the package; this phase owns the subset matching its responsibility):
- MetricsEvent/MetricsRollup エンティティ + ingest API (B2)
- Workers cron 週次 rollup (B3)
- 試算エンジン純関数 (時給=年収÷annualHours・分/回・削減率、単一実装)
- S09 ダッシュボード (KPI/推移/完了率/ランキング/部門別)
- S16 利用・削減効果 (ハーネス別・週次)
- チャート共通部品の消費 (bundle 3MiB 予算内)
- Scope out:
- クライアント側での金額換算・自己申告 (SEC5 で禁止)
- 外部 BI 連携
- Acceptance (P04/P06/P07/P10/P11 must preserve exact coverage):
- ingest が短命 token + 冪等キーで保護され重複計上しない
- 金額換算がサーバ側のみで行われる (クライアント申告は回数のみ)
- S09/S16 が rollup 由来のデータで描画され CWV good を維持する
- Architecture/source refs:
- architecture/harness-hub-backend.md
- architecture/harness-hub-data.md
- architecture/harness-hub-frontend.md
- specs/harness-hub-system-specification.md

This section is the current source closure and supersedes older counts or wording in this task when they conflict with the pinned feature context.

## Normative implementation closure (2026-07-19)

This section is normative for P12 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-metrics-tracking.context.json; docs/shared-layers.md §2; docs/backend-spec.md §6.2; confirmed feat-hub-foundation shared-layer contract
- Effective phase contract: packages/estimation のpackage boundary/public contractは feat-hub-foundation が単一ownerとして確立し、metricsはformula/rollupというdomain logicを提供・消費する。共通package ownerをmetricsへ上書きしない。consumerはmetricsだけではなく hearingのsheetEstimateも含む。metricsEstimate/sheetEstimateは同じ純関数primitivesを参照し、クライアント金額計算を禁止する。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `packages/estimation/src/metrics.ts`
- `apps/hub/src/features/metrics-tracking/`
- Mandatory evidence: hub-owned public contract、metrics/hearing両consumer contract test、duplicate implementation=0、server-only calculation、rollup/ingest evidenceを必須とする。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: system-spec/spec-state.json qa_log (qa-031)
- Detailed authoritative source: docs/backend-spec.md (§7, §8)
- Architecture: arch-harness-hub-backend
- Feature: feat-metrics-tracking
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-metrics-tracking-p11
