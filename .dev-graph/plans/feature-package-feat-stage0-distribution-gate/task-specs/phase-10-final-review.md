# System task overlay: quality_constraints 8 件・acceptance 3 件の独立最終レビュー

## Machine-readable registration fields

- feature_package_id: feature-package/feat-stage0-distribution-gate (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-stage0-distribution-gate", "macro-feature", "quality", "final-review"]
- related_nodes: ["feat-stage0-distribution-gate", "arch-harness-hub-infrastructure"]
- parent_feature: feat-stage0-distribution-gate
- phase_ref: P10
- classification: confidence=0.86, reason="P03 の設計時レビューとは独立して実機検証完了後の quality_constraints 8 件・acceptance 3 件を最終確認する P10 独立最終レビュータスク", candidates=[{artifact_kind: task, confidence: 0.86, candidate_path: tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p10.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P01〜P09 を通じて確定・実行・保証されてきた quality_constraints 8 件と acceptance 3 件の全体を、設計時レビュー (P03) とは独立した最終確認として通し確認し、final-review-record.md として確定する。ここで問題がなければ P11 の証跡集約へ進む。

## 背景

P03 の独立設計レビューは実機検証実行前の「設計の妥当性」を対象としていたのに対し、P10 は実機検証・受入・品質保証まで完了した後の「結果全体の整合性」を対象とする、性質の異なる独立レビューである。本 task では、goal-spec の 8 件の quality_constraints (stage0-two-path-distribution-technical-gate-h7-qa003, stage0-technical-gate-h3-h6-h7-stage1-entry-condition-i9, author-environment-macos-windows-linux-out-of-scope-qa001, npm-source-official-support-changelog-recheck-claude-code-plugins, cost-zero-verification-within-free-tier-c2, solo-operator-ai-assisted-verification-c1, h7-unresolved-blocks-stage1-fail-closed-gate, adopted-path-decision-record-registration-spec-state-decisions) と acceptance 3 件それぞれについて、P01〜P09 の各成果物に一貫した根拠が存在するかを最終確認する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-stage0-distribution-gate, arch-harness-hub-infrastructure
- Entry gate: docs/features/feat-stage0-distribution-gate/quality-assurance-report.md が P09 完了時点で存在すること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は最終レビューのみで frontend 実装物を変更しない
- Backend: N/A: 本 feature は Hub backend の変更を伴わない
- API: N/A: 本 feature は API 契約の新設を伴わない
- Data: N/A: 永続データストアのスキーマ変更を伴わない
- Infrastructure: N/A: 本 task はレビューのみでインフラ変更を伴わない
- Security: N/A: セキュリティ観点は P09 で保証済みであり、本 task はその結果の整合性を確認するのみ
- Quality: applicable + change: quality_constraints 8 件・acceptance 3 件全ての最終確認結果を final-review-record.md に記録する
- Documentation: applicable + change: docs/features/feat-stage0-distribution-gate/final-review-record.md を新規作成する
- Operations: N/A: 運用手順の具体化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-infrastructure (P02 の architecture decision の正本参照)
- Deploy unit/environment: local-verification-only (レビューのみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task はレビューのみで実コードへの変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-stage0-distribution-gate/final-review-record.md (quality_constraints 8 件・acceptance 3 件全ての最終確認結果)
- Consumed artifacts: docs/features/feat-stage0-distribution-gate/quality-assurance-report.md, docs/features/feat-stage0-distribution-gate/acceptance-record.md, .dev-graph/staging/goal-spec.json
- Write scope/touches: docs/features/feat-stage0-distribution-gate/final-review-record.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-stage0-distribution-gate-p10) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-stage0-distribution-gate-p10 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-stage0-distribution-gate-p10) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-STAGE0-DISTRIBUTION-GATE-P09] のため P09 完了後に着手する。resource_scope (final-review-record.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- Hub 本体の実装 (goal-spec scope_out)
- 課金・商用配布 (goal-spec scope_out)
- 実機検証の再実行そのもの (指摘があれば該当 phase へ差し戻す。本 task はレビューのみ)
- 証跡の集約作業そのもの (本 task はレビューのみ。集約は P11 で扱う)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: final-review-record.md に quality_constraints 8 件・acceptance 3 件全ての最終確認結果 (問題なし) が記載されていること

## Rollout and rollback

- Rollout: final-review-record.md を作成し P11 の証跡集約へ引き継ぐ
- Rollback trigger and steps: 重大な指摘がある場合、final-review-record.md に理由を記録し該当する P02/P05/P06/P09 のいずれかへ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: .dev-graph/staging/goal-spec.json quality_constraints (8 件), acceptance (3 件)
- Detailed authoritative source: docs/features/feat-stage0-distribution-gate/quality-assurance-report.md
- Architecture: arch-harness-hub-infrastructure (architecture/harness-hub-infrastructure.md)
- Feature: feat-stage0-distribution-gate
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-STAGE0-DISTRIBUTION-GATE-P09
