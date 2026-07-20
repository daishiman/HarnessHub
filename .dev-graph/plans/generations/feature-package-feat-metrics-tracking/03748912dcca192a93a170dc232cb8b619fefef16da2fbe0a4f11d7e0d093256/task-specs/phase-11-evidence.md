# System task overlay: エビデンス収集 — テスト結果・受入記録・最終レビュー記録の証跡集約

## Machine-readable registration fields

- feature_package_id: feature-package/feat-metrics-tracking (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-metrics-tracking", "studio-extension", "metrics-tracking", "evidence"]
- related_nodes: ["feat-metrics-tracking", "arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-frontend"]
- parent_feature: feat-metrics-tracking
- phase_ref: P11
- classification: confidence=0.84, reason="P01〜P10 の全成果物を証跡として一元集約し、リリース判断とドキュメント化 (P12/P13) に必要な evidence bundle を作成する P11 エビデンス収集タスク", candidates=[{artifact_kind: task, confidence: 0.84, candidate_path: tasks/feat-metrics-tracking/sys-metrics-tracking-p11.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P01〜P10 で作成された全成果物 (要件ベースライン・architecture decision・設計レビュー・テスト設計・実装・テスト結果・受入記録・マイグレーション記録・品質保証報告・最終レビュー記録) を証跡として一元集約し、evidence bundle を作成する。

## 背景

goal-spec の verification 節や quality_constraints は各 phase で個別に文書化されているが、リリース判断 (P13) や運用文書 (P12) の作成にあたっては、これらを横断的に参照できる単一の証跡集約点が必要である。本 task は各 phase 成果物への参照リンクと、試算エンジン owner 決定 (P02) が最終的にどう反映されたかのサマリ、quality_constraints 8 件の最終充足状況 (P10 final-review-record.md 由来) を含む evidence-summary.md を作成する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-metrics-tracking, arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-frontend
- Entry gate: P10 の final-review-record.md で quality_constraints 8 件全件充足が確定していること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: N/A: 本 task は証跡集約のみで frontend 実装物への変更を伴わない
- Backend: N/A: 本 task は証跡集約のみで backend 実装物への変更を伴わない
- API: N/A: 本 task は証跡集約のみで API 契約への変更を伴わない
- Data: N/A: 本 task は証跡集約のみでデータスキーマへの変更を伴わない
- Infrastructure: N/A: 本 task は証跡集約のみでインフラへの変更を伴わない
- Security: N/A: 本 task はセキュリティ設計の変更を伴わない (既存証跡の集約のみ)
- Quality: applicable + change: 全 phase 成果物を横断参照した evidence bundle を作成する
- Documentation: applicable + change: docs/features/feat-metrics-tracking/evidence-summary.md を新規作成する
- Operations: N/A: 運用手順の作成自体は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-frontend (証跡集約対象として参照するのみで既存 architecture doc は書き換えない)
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: N/A: 本 task は証跡集約のみで実データ変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-metrics-tracking/evidence-summary.md (P01〜P10 全成果物への参照リンクと quality_constraints 8 件の最終充足サマリ)
- Consumed artifacts: docs/features/feat-metrics-tracking/ 配下の P01〜P10 全成果物 (requirements-baseline.md, architecture-decision-record.md, design-review-notes.md, test-design.md, test-run-results.md, acceptance-record.md, refactoring-migration-note.md, quality-assurance-report.md, final-review-record.md)
- Write scope/touches: docs/features/feat-metrics-tracking/evidence-summary.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-metrics-tracking-p11) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-metrics-tracking-p11 として払い出す
- Worktree lease: graph_node_id (sys-metrics-tracking-p11) の worktree lease を claim し heartbeat 送出、完了時 release
- Parallel safety: depends_on=[sys-metrics-tracking-p10]。P10 完了後に着手する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 新規テスト・レビューの実施 (本 task は既存成果物の集約のみ)
- 運用文書・リリース作業 (P12/P13 で行う)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: docs/features/feat-metrics-tracking/evidence-summary.md に P01〜P10 全 10 成果物への参照リンクと quality_constraints 8 件の最終充足サマリが記載されていること. Normative evidence: hub-owned public contract、metrics/hearing両consumer contract test、duplicate implementation=0、server-only calculation、rollup/ingest evidenceを必須とする。

## Rollout and rollback

- Rollout: evidence-summary.md 作成後 P12 のドキュメント/運用へ引き継ぐ
- Rollback trigger and steps: 参照先成果物に欠落が見つかった場合、該当 phase へ差し戻し再生成を依頼する

## Handoff

- Executor: system build route
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-metrics-tracking.context.json` (`sha256:64106cc96859b3755741efeb26321fd3746af1a823d0d7837d5b2147b41ee759`)
- Phase responsibility: P06・P07・P09・P10 の証跡を source digest 付きで集約する。
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

This section is normative for P11 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-metrics-tracking.context.json; docs/shared-layers.md §2; docs/backend-spec.md §6.2; confirmed feat-hub-foundation shared-layer contract
- Effective phase contract: packages/estimation のpackage boundary/public contractは feat-hub-foundation が単一ownerとして確立し、metricsはformula/rollupというdomain logicを提供・消費する。共通package ownerをmetricsへ上書きしない。consumerはmetricsだけではなく hearingのsheetEstimateも含む。metricsEstimate/sheetEstimateは同じ純関数primitivesを参照し、クライアント金額計算を禁止する。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `packages/estimation/src/metrics.ts`
- `apps/hub/src/features/metrics-tracking/`
- Mandatory evidence: hub-owned public contract、metrics/hearing両consumer contract test、duplicate implementation=0、server-only calculation、rollup/ingest evidenceを必須とする。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: system-spec/00-requirements-definition.md (I10, D4), system-spec/spec-state.json qa_log (qa-021〜025, qa-031)
- Detailed authoritative source: docs/backend-spec.md (§2.3, §4.9, §6.2, §7, §8)
- Architecture: arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-frontend
- Feature: feat-metrics-tracking
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-metrics-tracking-p10
