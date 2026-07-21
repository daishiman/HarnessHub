# System task overlay: Hub 基盤 最終独立レビュー

## Machine-readable registration fields

- feature_package_id: feature-package/feat-hub-foundation (13 task で共有)
- feature_context_digest: sha256:938ecf38d145496bba7a439b829d3934718b8f43b4f4628d8ba821594d17062d
- feature_acceptance: 4 items (A1-A4)
- quality_constraints: 9 items
- owners: ["daishiman"]
- tags: ["feat-hub-foundation", "stage-1", "infrastructure", "final-review"]
- related_nodes: ["feat-hub-foundation", "arch-harness-hub-infrastructure", "arch-harness-hub-frontend"]
- parent_feature: feat-hub-foundation
- phase_ref: P10
- classification: confidence=0.87, reason="P01〜P09 の成果物一式を goal-spec と付随制約に対して独立して再点検する P10 タスク", candidates=[{artifact_kind: task, confidence: 0.87, candidate_path: tasks/sys-hub-foundation-p10.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P01 requirements-baseline から P09 quality-assurance-report までの全成果物を、goal-spec (digest: sha256:938ecf38d145496bba7a439b829d3934718b8f43b4f4628d8ba821594d17062d) と quality_constraints 9 件に対して独立した視点で再点検する。この task 完了時点で、feature-execution-package-contract.md §7 の完了条件のうち P10 分の evidence が揃っている状態にする。

## 背景

P03 (design-review) は P02 の設計判断のみを対象とした早期レビューであり、P07 (acceptance) は goal-spec acceptance 4 件を対象とした受入判定である。P10 はこれらとは異なり、実装・テスト・受入・N/A 判定・品質保証まで完了した後の feature 全体を対象に、quality_constraints 9 件 (C2-zero-cost, C1-solo-ops, worker-bundle-budget, pnpm-only-no-npm, slo-error-budget, cwv-good, wrangler-deploy, github-actions-ci, shared-layers-single-implementation-owner) すべてが最終成果物に反映されているかを独立してレビューする。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-hub-foundation, arch-harness-hub-infrastructure, arch-harness-hub-frontend, sys-hub-foundation-p09
- Entry gate: docs/features/feat-hub-foundation/quality-assurance-report.md が作成済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対

## Workstream applicability

- Frontend: N/A: 成果物一式に対するレビューのみを行い、対象物への変更は行わない
- Backend: N/A: 成果物一式に対するレビューのみを行い、対象物への変更は行わない
- API: N/A: 成果物一式に対するレビューのみを行い、対象物への変更は行わない
- Data: N/A: DB スキーマ実体は feat-domain-model-db の scope であり、本 task のレビュー対象に含めない
- Infrastructure: N/A: レビューのみを行い、対象物 (wrangler.jsonc, ci.yml 等) への変更は行わない。不備発見時は差し戻しのみ行う
- Security: N/A: レビューのみを行い、対象物への変更は行わない
- Quality: applicable + change: docs/features/feat-hub-foundation/final-review-notes.md を新規作成し、quality_constraints 9 件それぞれの充足状況を記録する
- Documentation: applicable + change: final-review-notes.md 作成
- Operations: N/A: レビューのみを行い、対象物への変更は行わない

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-infrastructure, arch-harness-hub-frontend
- Deploy unit/environment: cloudflare-workers/hub (レビュー対象。本 task 自体はデプロイ単位を変更しない)
- Compatibility/migration/backfill: N/A: 新規 scaffold であり互換性・migration・backfill の対象がない

## 成果物

- Produced artifacts: docs/features/feat-hub-foundation/final-review-notes.md (quality_constraints 9 件の充足状況、P01〜P09 成果物の整合性確認結果)
- Consumed artifacts: docs/features/feat-hub-foundation/ 配下の P01〜P09 全成果物、.dev-graph/staging/goal-spec.json
- Write scope/touches: docs/features/feat-hub-foundation/final-review-notes.md

## Tracker publication and completion

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-hub-foundation-p10) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-hub-foundation-p10 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-hub-foundation-p10) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[sys-hub-foundation-p09] が完了するまで着手しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- レビューで発見した不備の恒久修正 (該当する P02〜P09 の task へ差し戻して修正する)
- 業務ドメインロジックのレビュー (goal-spec scope_out)
- evidence の証跡収集そのもの (P11 の scope)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: final-review-notes.md に quality_constraints 9 件それぞれの充足状況 (充足/不足) と根拠が明記されていること

## Rollout and rollback

- Rollout: final-review-notes.md で全 9 件の quality_constraints が充足と判定された場合、P11 (evidence) へ引き継ぐ
- Rollback trigger and steps: 1 件でも不足の場合、不足箇所が生じた原因 task (P02〜P09 のいずれか) を final-review-notes.md に記録し、該当 task を再実行対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/00-requirements-definition.md (C1, C2, D1), system-spec/infrastructure.md (qa-003, qa-019), system-spec/frontend.md (qa-007, qa-018)
- Architecture: arch-harness-hub-infrastructure (architecture/harness-hub-infrastructure.md), arch-harness-hub-frontend (architecture/harness-hub-frontend.md)
- Feature: feat-hub-foundation
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成しない
- Dependencies: sys-hub-foundation-p09
