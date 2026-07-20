# System task overlay: 独立最終レビュー — quality_constraints 7件・acceptance 3件の最終確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-dual-catalog-web (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-dual-catalog-web", "macro-feature", "quality", "final-review"]
- related_nodes: ["feat-dual-catalog-web"]
- parent_feature: feat-dual-catalog-web
- phase_ref: P10
- classification: confidence=0.83, reason="quality_constraints 7件・acceptance 3件の最終確認を独立観点で行うP10最終レビュータスク", candidates=[{artifact_kind: task, confidence: 0.83, candidate_path: tasks/feat-dual-catalog-web/sys-dual-catalog-web-p10.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P01 requirements-baseline.md から P09 quality-assurance-report.md までの全成果物を通観し、goal-spec の quality_constraints 7 件と acceptance 3 件が最終的に満たされていることを、実装担当者本人以外の独立観点で確認し、final-review-record.md へ記録する。

## 背景

system-task-spec-template.md が定める P10 (final-review) は、P03 (design-review) が実装着手前の設計妥当性を確認するのに対し、実装・テスト・受入・品質保証の全工程が完了した後にリリース可否を最終判断する役割を持つ。本 feature では、cross-feature 境界 (feat-publish-pipeline・feat-stage0-distribution-gate・feat-auth-tenancy) の消費が正しく行われ、責務越境がないことも本レビューの確認対象に含める。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-dual-catalog-web
- Entry gate: P09 (docs/features/feat-dual-catalog-web/quality-assurance-report.md) が作成済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は最終レビューのみで frontend 実装物を変更しない
- Backend: N/A: 本 task は最終レビューのみで backend 実装物を変更しない
- API: N/A: 本 task は最終レビューのみで API 契約を変更しない
- Data: N/A: 本 feature は独自ドメインテーブルを新設しない
- Infrastructure: N/A: 本 task は最終レビューのみでインフラ変更を伴わない
- Security: applicable + control: cross-feature 境界の責務越境がないことを確認する
- Quality: applicable + tests/gates: quality_constraints 7件・acceptance 3件の最終確認を行う
- Documentation: applicable + change: docs/features/feat-dual-catalog-web/final-review-record.md を新規作成する
- Operations: N/A: 運用手順の具体化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: N/A: 本 task は最終レビューのみで新たな architecture decision を伴わない
- Deploy unit/environment: cloudflare-workers/hub (本 task は最終レビューのみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は最終レビューのみで実コードへの変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-dual-catalog-web/final-review-record.md (quality_constraints 7件・acceptance 3件の最終確認結果)
- Consumed artifacts: docs/features/feat-dual-catalog-web/requirements-baseline.md, docs/features/feat-dual-catalog-web/acceptance-record.md, docs/features/feat-dual-catalog-web/quality-assurance-report.md
- Write scope/touches: docs/features/feat-dual-catalog-web/final-review-record.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-dual-catalog-web-p10) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-dual-catalog-web-p10 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-dual-catalog-web-p10) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-DUAL-CATALOG-WEB-P09] であり P09 完了後に着手する。resource_scope (docs/features/feat-dual-catalog-web/final-review-record.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 指摘事項の実装修正そのもの (本 task はレビューと記録のみ。修正は該当フェーズへ差し戻す)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: final-review-record.md に quality_constraints 7件・acceptance 3件全ての最終確認結果 (問題なし) が記載されていること

## Rollout and rollback

- Rollout: final-review-record.md を作成し、全項目問題なしを確認してから P11 (再現可能な証跡) へ引き継ぐ
- Rollback trigger and steps: 重大な指摘がある場合、final-review-record.md に理由を記録し該当する P02/P05/P08/P09 のいずれかへ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-dual-catalog-web.context.json` (`sha256:a0c5f78ef31fc345184884f4f48f60b0c9b2e5beaae7d9a83c0f789d13a6e9d3`)
- Phase responsibility: 全 acceptance、scope、品質制約の最終充足を独立にレビューする。
- Purpose: 利用者・管理者が Skill/WebApp を発見・導入できる dual catalog UI と配布出口 (marketplace 出力 / Bootstrap Installer 連携) を、WCAG 2.2 AA + CWV good (qa-018) の品質で提供する
- Goal: 2 社の顧客 Workspace が同時にカタログを閲覧・導入でき (U5)、a11y/速度の品質ゲートが CI で強制される状態
- Scope in (all items are in-scope for the package; this phase owns the subset matching its responsibility):
- dual catalog 閲覧 UI (レスポンシブ)
- publish 状況表示 (ポーリング)
- marketplace.json 出力 + 採用配布経路連携
- axe 自動チェック CI
- CWV 計測 (LCP/INP/CLS)
- Scope out:
- 承認キュー UI (Stage 2)
- native アプリ
- Acceptance (P04/P06/P07/P10/P11 must preserve exact coverage):
- axe 検出可能違反 0 がリリース条件として CI に存在する
- CWV 全指標 good を実測で満たす
- 導入済み Skill が Hub 停止中も動作継続する (§6.1 縮退)
- Architecture/source refs:
- architecture/harness-hub-frontend.md
- architecture/harness-hub-backend.md
- specs/harness-hub-system-specification.md

This section is the current source closure and supersedes older counts or wording in this task when they conflict with the pinned feature context.

## 参照情報

- System specification: goal-spec.json
- Detailed authoritative source: docs/features/feat-dual-catalog-web/requirements-baseline.md
- Architecture: N/A: 本 task は最終レビューのみで architecture 参照を新たに追加しない
- Feature: feat-dual-catalog-web
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-DUAL-CATALOG-WEB-P09
