# System task overlay: 受入 — goal-spec acceptance 3 項目の確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-metrics-tracking (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-metrics-tracking", "studio-extension", "metrics-tracking", "acceptance"]
- related_nodes: ["feat-metrics-tracking", "arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-frontend"]
- parent_feature: feat-metrics-tracking
- phase_ref: P07
- classification: confidence=0.87, reason="P06 で green 化したテスト結果を基に goal-spec acceptance 3 件の充足を確認する P07 受入タスク", candidates=[{artifact_kind: task, confidence: 0.87, candidate_path: tasks/feat-metrics-tracking/sys-metrics-tracking-p07.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

goal-spec の acceptance 3 件 (ingest 短命 token + 冪等キーで重複計上しない、金額換算がサーバ側のみで行われる、S09/S16 が rollup 由来のデータで描画され CWV good を維持する) が P05/P06 の成果物によって満たされていることを確認し、受入判定を記録する。

## 背景

P06 の test-run-results.md で quality_constraints 8 件のテストが green になったことを前提に、本 task はより上位の goal-spec acceptance 基準に照らして実際の動作を確認する。第一に、ingest エンドポイントへ同一 Idempotency-Key で複数回リクエストを送っても metrics_events に重複行が作成されないことを確認する。第二に、S09/S16 の画面や API レスポンスに時給・削減額などの金額情報がクライアント入力由来ではなくサーバ (Workers cron + packages/estimation) 由来であることを確認する。第三に、S09/S16 が `GET /api/v1/metrics/summary`・`GET /api/v1/metrics/rollups` の rollup 読取専用データで描画され、Core Web Vitals (LCP/INP/CLS) が good 閾値を維持することを Lighthouse 等の計測で確認する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-metrics-tracking, arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-frontend
- Entry gate: P06 の test-run-results.md で quality_constraints 8 件全てが pass 済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: applicable + change: S09/S16 の CWV 計測と rollup 由来描画の確認を行う
- Backend: applicable + change: ingest 重複防止とサーバ側金額換算の実動作確認を行う
- API: applicable + change: 3 endpoint の実レスポンスが acceptance 基準を満たすことを確認する
- Data: N/A: データスキーマ自体の変更は行わず、既存データに対する確認のみ
- Infrastructure: N/A: 既存デプロイ単位上での確認のみで変更を伴わない
- Security: applicable + change: サーバ側金額換算のみが行われクライアント申告が存在しないことをセキュリティ観点で確認する
- Quality: applicable + change: goal-spec acceptance 3 件の充足を quality gate として記録する
- Documentation: applicable + change: docs/features/feat-metrics-tracking/acceptance-record.md を新規作成する
- Operations: N/A: 運用手順の確認は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-frontend (P02 の設計に対する最終的な受入確認であり、既存 architecture doc は書き換えない)
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: N/A: 本 task は受入確認のみで実データ変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-metrics-tracking/acceptance-record.md (goal-spec acceptance 3 件それぞれの確認結果と証跡)
- Consumed artifacts: docs/features/feat-metrics-tracking/test-run-results.md, apps/hub/src/features/metrics-tracking/, apps/hub/src/app/ 配下の S09/S16 実装
- Write scope/touches: docs/features/feat-metrics-tracking/acceptance-record.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-metrics-tracking-p07) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-metrics-tracking-p07 として払い出す
- Worktree lease: graph_node_id (sys-metrics-tracking-p07) の worktree lease を claim し heartbeat 送出、完了時 release
- Parallel safety: depends_on=[sys-metrics-tracking-p06]。P06 完了後に着手する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 実装コードの修正 (acceptance 不充足時の修正は P05 への差し戻しで行う)
- リファクタリング・マイグレーション作業 (P08 で行う)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: docs/features/feat-metrics-tracking/acceptance-record.md に goal-spec acceptance 3 件全ての確認結果 (pass) と証跡が記載されていること

## Rollout and rollback

- Rollout: acceptance-record.md で 3 件全て pass を確認後 P08 のリファクタリング/マイグレーションへ引き継ぐ
- Rollback trigger and steps: acceptance 3 件のいずれかが不充足の場合、acceptance-record.md に理由を記録し P05 (実装) または P02 (設計) へ差し戻す

## Handoff

- Executor: system build route
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-metrics-tracking.context.json` (`sha256:64106cc96859b3755741efeb26321fd3746af1a823d0d7837d5b2147b41ee759`)
- Phase responsibility: 現行 context の acceptance 全件を P06 の実行証跡から判定する。
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

## 参照情報

- System specification: system-spec/00-requirements-definition.md (I10, D4), system-spec/spec-state.json qa_log (qa-021〜025, qa-031)
- Detailed authoritative source: docs/backend-spec.md (§2.3, §4.9, §8)
- Architecture: arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-frontend
- Feature: feat-metrics-tracking
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-metrics-tracking-p06
