# System task overlay: Hub 基盤 最終独立レビュー

## Machine-readable registration fields

- feature_package_id: feature-package/feat-hub-foundation (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-hub-foundation", "stage-1", "infrastructure", "final-review"]
- related_nodes: ["feat-hub-foundation", "arch-harness-hub-infrastructure", "arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-security", "arch-harness-hub-dev-workflow"]
- parent_feature: feat-hub-foundation
- phase_ref: P10
- classification: confidence=0.87, reason="P01〜P09 の成果物一式を goal-spec と付随制約に対して独立して再点検する P10 タスク", candidates=[{artifact_kind: task, confidence: 0.87, candidate_path: tasks/feat-hub-foundation/sys-hub-foundation-p10.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P01 requirements-baseline から P09 quality-assurance-report までの全成果物を、goal-spec (digest: sha256:06c97e2ee833b6bb42f76d38f2f133eededd1dc5422a75153f4d3a7a1c42111a) と quality_constraints 9 件に対して独立した視点で再点検する。この task 完了時点で、feature-execution-package-contract.md §7 の完了条件のうち P10 分の evidence が揃っている状態にする。

## 背景

P03 (design-review) は P02 の設計判断のみを対象とした早期レビューであり、P07 (acceptance) は goal-spec acceptance 4 件のみを対象とした受入判定である。P10 はこれらとは異なり、実装・テスト・受入・N/A 判定・品質保証まで完了した後の feature 全体を対象に、quality_constraints 9 件 (C2-zero-cost, C1-solo-ops, worker-bundle-budget, pnpm-only-no-npm, slo-error-budget, cwv-good, wrangler-deploy, github-actions-ci, shared-layers-single-implementation-owner) すべてが最終成果物に反映されているかを独立してレビューする。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-hub-foundation, arch-harness-hub-infrastructure, arch-harness-hub-frontend, sys-hub-foundation-p09, arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security, arch-harness-hub-dev-workflow
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

- Architecture decisions: arch-harness-hub-infrastructure, arch-harness-hub-frontend, arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security, arch-harness-hub-dev-workflow
- Deploy unit/environment: cloudflare-workers/hub (レビュー対象。本 task 自体はデプロイ単位を変更しない)
- Compatibility/migration/backfill: N/A: 新規 scaffold であり互換性・migration・backfill の対象がない

## 成果物

- Produced artifacts: docs/features/feat-hub-foundation/final-review-notes.md (quality_constraints 9 件の充足状況、P01〜P09 成果物の整合性確認結果)
- Consumed artifacts: docs/features/feat-hub-foundation/ 配下の P01〜P09 全成果物、goal-spec.json
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

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: final-review-notes.md に quality_constraints 9 件それぞれの充足状況 (充足/不足) と根拠が明記されていること. Normative evidence: 全登録共通層のowner/public API/consumer一覧、consumer contract tests、duplicate implementation scan=0、CI/bundle/SLO/healthの4 acceptance証跡を必須とする。

## Rollout and rollback

- Rollout: final-review-notes.md で全 8 件の quality_constraints が充足と判定された場合、P11 (evidence) へ引き継ぐ
- Rollback trigger and steps: 1 件でも不足の場合、不足箇所が生じた原因 task (P02〜P09 のいずれか) を final-review-notes.md に記録し、該当 task を再実行対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-hub-foundation.context.json` (`sha256:938ecf38d145496bba7a439b829d3934718b8f43b4f4628d8ba821594d17062d`)
- Phase responsibility: 全 acceptance、scope、品質制約の最終充足を独立にレビューする。
- Purpose: 費用ゼロ制約 (C2) 下で Hub の実行基盤 (Cloudflare Workers 一体型 + OpenNext) と CI/CD・監視・SLO 運用の土台を確立する
- Goal: pnpm 強制 CI → wrangler deploy が自動化され、/health・監視・SLO 99.5% 計測が稼働し、Worker 3MiB 予算内で Next.js と共通層の単一実装が動作する状態
- Scope in (all items are in-scope for the package; this phase owns the subset matching its responsibility):
- Next.js + TypeScript + pnpm monorepo scaffold
- @opennextjs/cloudflare デプロイ
- GitHub Actions CI/CD (npm 混入 fail)
- /health + 外部死活監視
- SLO ダッシュボード + bundle サイズ予算 CI
- docs/shared-layers.md §1〜§3 の共通 UI・backend・CI/CD/運用層の実装 owner と package 境界
- Scope out:
- 業務ドメインロジック
- テナント固有の OIDC/role/Device Flow policy (共通 auth adapter・認可 MW の package 境界のみ対象)
- Acceptance (P04/P06/P07/P10/P11 must preserve exact coverage):
- CI が test→deploy を完走する
- Worker bundle が 3MiB 以内で bundle 予算チェックが CI に存在する
- SLO 99.5% の計測と /health が稼働する
- shared-layers 登録済み共通層が単一 package/境界に実装され、消費 feature が同じ実装を参照する
- Architecture/source refs:
- architecture/harness-hub-infrastructure.md
- architecture/harness-hub-frontend.md
- architecture/harness-hub-backend.md
- architecture/harness-hub-data.md
- architecture/harness-hub-security.md
- architecture/harness-hub-dev-workflow.md
- specs/harness-hub-system-specification.md

This section is the current source closure and supersedes older counts or wording in this task when they conflict with the pinned feature context.

## Current phase closure

- Required responsibility: 4 acceptance と shared-layers全登録行のowner/consumer evidenceを最終レビューする。
- Dependency rule: this phase consumes only earlier P01..P09 outputs; later phase documentation or evidence is never an entry prerequisite.

## Normative implementation closure (2026-07-19)

This section is normative for P10 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-hub-foundation.context.json; docs/shared-layers.md §1-§3; architecture/harness-hub-{frontend,backend,data,security,infrastructure,dev-workflow}.md
- Effective phase contract: acceptanceは4件、quality_constraintsは9件。P05は雛形だけでなく、packages/ui・packages/schemas・packages/inspection・packages/estimation、auth adapter/認可middleware、audit/AiJob/Notification/PII共通adapterの公開contract実体、CI/運用共通境界を単一ownerとして実装する。domain-specific logicはconsumer featureに残す。P04/P06/P07/P09/P10/P11は複数consumer contract testと重複実装detector=0を第4 acceptanceとして実判定する。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `packages/ui/`
- `packages/schemas/`
- `packages/inspection/`
- `packages/estimation/`
- `apps/hub/src/shared/`
- `apps/hub/src/middleware/`
- `.github/workflows/ci.yml`
- Mandatory evidence: 全登録共通層のowner/public API/consumer一覧、consumer contract tests、duplicate implementation scan=0、CI/bundle/SLO/healthの4 acceptance証跡を必須とする。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: system-spec/00-requirements-definition.md (C1, C2, D1), system-spec/infrastructure.md (qa-003, qa-019), system-spec/frontend.md (qa-007, qa-018)
- Architecture: arch-harness-hub-infrastructure (architecture/harness-hub-infrastructure.md), arch-harness-hub-frontend (architecture/harness-hub-frontend.md)
- Feature: feat-hub-foundation
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成しない
- Dependencies: sys-hub-foundation-p09
