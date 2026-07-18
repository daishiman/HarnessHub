# System task overlay: C1 (体制)・C2 (コストゼロ)・H7 fail-closed ゲートの品質保証

## Machine-readable registration fields

- feature_package_id: feature-package/feat-stage0-distribution-gate (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-stage0-distribution-gate", "macro-feature", "quality", "quality-assurance"]
- related_nodes: ["feat-stage0-distribution-gate", "arch-harness-hub-infrastructure"]
- parent_feature: feat-stage0-distribution-gate
- phase_ref: P09
- classification: confidence=0.85, reason="solo-operator-ai-assisted-verification-c1・cost-zero-verification-within-free-tier-c2・h7-unresolved-blocks-stage1-fail-closed-gate の 3 件の非機能要件を保証する P09 品質保証タスク", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p09.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

quality_constraints のうち solo-operator-ai-assisted-verification-c1 (検証体制)・cost-zero-verification-within-free-tier-c2 (検証費用)・h7-unresolved-blocks-stage1-fail-closed-gate (fail-closed ゲート条件) の 3 件を機械的に保証し、quality-assurance-report.md として確定する。

## 背景

これら 3 件は個々の経路検証結果ではなく、検証プロセス全体の性質を保証する非機能要件である。C1 は検証体制が提供者 1 名 + AI (Claude Code / Codex) のみで完結していることを、C2 は検証 (試作・実機 E2E を含む) にかかった費用が有償プラン契約を伴わない無料枠内でゼロ円であったことを、それぞれ P05/P06 の実施記録から確認する。h7-unresolved-blocks-stage1-fail-closed-gate は、H7 が Stage 0 で成立確認されない限り Stage 1 (Publisher + Thin Dual Catalog MVP) へ進めないという fail-closed ゲート条件が、P07 の acceptance-record.md の判定結果と整合した形で明記されていることを確認する。この 3 件は P10 の独立最終レビューにおいて再確認される前提条件でもある。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-stage0-distribution-gate, arch-harness-hub-infrastructure
- Entry gate: docs/features/feat-stage0-distribution-gate/refactoring-migration-note.md が P08 完了時点で存在すること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は品質保証のみで frontend 実装物を変更しない
- Backend: N/A: 本 feature は Hub backend の変更を伴わない
- API: N/A: 本 feature は API 契約の新設を伴わない
- Data: N/A: 永続データストアのスキーマ変更を伴わない
- Infrastructure: N/A: 本 task は保証確認のみでインフラ変更を伴わない
- Security: applicable + change: 検証体制 (C1) が提供者 1 名 + AI のみで完結し、外部への機密情報流出等のリスクがないことを確認する
- Quality: applicable + change: C1・C2・h7-unresolved-blocks-stage1-fail-closed-gate の 3 件の保証結果を quality-assurance-report.md に記録する
- Documentation: applicable + change: docs/features/feat-stage0-distribution-gate/quality-assurance-report.md を新規作成する
- Operations: applicable + change: fail-closed ゲート条件が Stage 1 系 feature の着手判断にどう作用するかを記録する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-infrastructure (P02 の architecture decision の正本参照)
- Deploy unit/environment: local-verification-only (品質保証確認のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は保証確認のみで実コードへの変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-stage0-distribution-gate/quality-assurance-report.md (C1・C2・fail-closed ゲート条件の保証結果)
- Consumed artifacts: docs/features/feat-stage0-distribution-gate/refactoring-migration-note.md, docs/features/feat-stage0-distribution-gate/acceptance-record.md, system-spec/00-requirements-definition.md
- Write scope/touches: docs/features/feat-stage0-distribution-gate/quality-assurance-report.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-stage0-distribution-gate-p09) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-stage0-distribution-gate-p09 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-stage0-distribution-gate-p09) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-STAGE0-DISTRIBUTION-GATE-P08] のため P08 完了後に着手する。resource_scope (quality-assurance-report.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- Hub 本体の実装 (goal-spec scope_out)
- 課金・商用配布 (goal-spec scope_out)
- 個々の経路検証結果の再判定 (P07 で確定済み。本 task は非機能要件の保証のみ)
- Stage 1 系 feature の着手そのもの (本 task は判定条件の記録のみ。実際の着手判断は Stage 1 側の feature が行う)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: quality-assurance-report.md に (1) 検証体制が提供者 1 名 + AI のみで完結した記録 (C1) (2) 検証にかかった費用が無料枠内でゼロ円であった記録 (C2) (3) H7 未成立時に Stage 1 着手を機械的に止める fail-closed ゲート条件の明記 の 3 件全ての結果が記載されていること

## Rollout and rollback

- Rollout: quality-assurance-report.md を作成し P10 の独立最終レビューへ引き継ぐ
- Rollback trigger and steps: 検証費用が無料枠を超過した、または体制が提供者 1 名 + AI の範囲を超えたことが判明した場合、quality-assurance-report.md に原因を記録し P05/P06 の実施方法を是正した上で本 task を再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/00-requirements-definition.md U8 制約 (C1, C2), I9 (Stage 0 technical gate と Stage 1 開始条件)
- Detailed authoritative source: docs/features/feat-stage0-distribution-gate/acceptance-record.md
- Architecture: arch-harness-hub-infrastructure (architecture/harness-hub-infrastructure.md)
- Feature: feat-stage0-distribution-gate
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-STAGE0-DISTRIBUTION-GATE-P08
