# System task overlay: Hub 基盤 要件ベースライン確定

## Machine-readable registration fields

- feature_package_id: feature-package/feat-hub-foundation (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-hub-foundation", "stage-1", "infrastructure", "requirements-baseline"]
- related_nodes: ["feat-hub-foundation", "arch-harness-hub-infrastructure", "arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-security", "arch-harness-hub-dev-workflow"]
- parent_feature: feat-hub-foundation
- phase_ref: P01
- classification: confidence=0.92, reason="goal-spec (goal-spec.json) と features/feat-hub-foundation.md の purpose/goal/scope/acceptance を要件ベースラインへ確定転記する P01 タスク", candidates=[{artifact_kind: task, confidence: 0.92, candidate_path: tasks/feat-hub-foundation/sys-hub-foundation-p01.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

feat-hub-foundation の受入可能な要件ベースラインを確定し、以降の P02 以降の全 task が同一の合意事項 (スコープ・受入基準・品質制約) を参照できる状態にする。この task 完了時点で、goal-spec の purpose/goal/scope_in/scope_out/acceptance/quality_constraints が machine-verifiable な baseline 文書として固定される。

## 背景

Harness Hub は個人運用制約 (C1: 提供者1名+AI) と費用ゼロ制約 (C2: 固定費極小化、顧客 Workspace 数増加でも固定費非比例) の両立を前提にした基盤である。D1 決定 (system-spec/00-requirements-definition.md) により Hub 本体の hosting は Cloudflare Workers 一体型 (@opennextjs/cloudflare) に確定しており、qa-003 (system-spec/infrastructure.md) が hosting 構成、qa-019 が SLO 99.5%・エラーバジェット・監視・restore drill の運用要件、qa-007 (system-spec/frontend.md) が Next.js + TypeScript + pnpm の技術構成、qa-018 が WCAG 2.2 AA・Core Web Vitals good・bundle 予算の品質要件をそれぞれ確定している。これらの決定はどれも Hub の実行基盤そのものに関わるため、feat-hub-foundation が実装 owner になる (docs/shared-layers.md)。本 task は、実装に入る前に既に確定している要件を再解釈や欠落なく baseline 化し、後続タスクの手戻りを防ぐ。

## 前提条件

- Macro entry gate: `parent_feature.depends_on all done|closed`。canonical parent feature の現行depends_onを都度評価し、task edgeへ複製しない。

- Required spec/architecture/phase/task nodes: feat-hub-foundation, arch-harness-hub-infrastructure, arch-harness-hub-frontend, arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security, arch-harness-hub-dev-workflow
- Entry gate: goal-spec.json の feature_context_digest が sha256:06c97e2ee833b6bb42f76d38f2f133eededd1dc5422a75153f4d3a7a1c42111a に一致し、features/feat-hub-foundation.md の confirmation_status が confirmed であること。evaluation_status は本 task package 生成時点で pending であり、system-dev-plan-evaluator による C12 PASS 判定と C11 promotion を経て解決する
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は要件文書化のみで frontend 実装物 (Next.js コード) を変更しない。frontend 要件の具体化は P02 設計・P05 実装で行う
- Backend: N/A: 本 feature の backend 範囲は /health route handler のみであり、要件確定段階ではコード変更を伴わない
- API: N/A: API 契約の置き場と形状の確定は P02 の workstream 設計で行う。本 task は要件記述のみ
- Data: N/A: DB スキーマ実体は feat-domain-model-db の責務であり、feat-hub-foundation の scope 外 (goal-spec scope_out)
- Infrastructure: applicable + change: qa-003 (Cloudflare Workers 一体型 hosting・wrangler CLI デプロイ・R2 native binding・無料枠 10 万 req/日) と qa-019 (SLO 99.5%・エラーバジェット 0.5%・監視・restore drill) の要件を requirements-baseline.md へ確定記述する
- Security: applicable + boundary: テナント固有OIDC/role/Device Flow policyはfeat-auth-tenancyが所有する一方、本featureは共通auth adapter・deny-by-default認可middlewareのpackage境界/public contract/consumer contract testを所有する。新規secret値は保持しない
- Quality: applicable + change: goal-spec acceptance (CI が test→deploy を完走する / Worker bundle が 3MiB 以内で bundle 予算チェックが CI に存在する / SLO 99.5% の計測と /health が稼働する) を machine-verifiable な受入基準として requirements-baseline.md に固定する
- Documentation: applicable + change: docs/features/feat-hub-foundation/requirements-baseline.md を新規作成する
- Operations: N/A: 監視・運用手順の具体化は P12 (documentation-operations) と P13 (release-deploy) で行う。本 task は要件確定のみ

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-infrastructure, arch-harness-hub-frontend (D1: cf-workers-opennext 採用の正本参照), arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security, arch-harness-hub-dev-workflow
- Deploy unit/environment: cloudflare-workers/hub (D1 決定により Hub は単一 Worker。本 task は要件確定のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 新規 scaffold feature であり既存実装・既存データが存在しないため互換性・migration・backfill の対象がない

## 成果物

- Produced artifacts: docs/features/feat-hub-foundation/requirements-baseline.md (要件ベースライン文書。purpose/goal/scope_in/scope_out/acceptance/quality_constraints の確定転記と qa-003/qa-019/qa-007/qa-018 の紐付けを含む)
- Consumed artifacts: goal-spec.json, features/feat-hub-foundation.md, features/feat-hub-foundation.context.json, system-spec/00-requirements-definition.md, system-spec/infrastructure.md, system-spec/frontend.md, docs/shared-layers.md, docs/system-design-overview.md
- Write scope/touches: docs/features/feat-hub-foundation/requirements-baseline.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-hub-foundation-p01) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-hub-foundation-p01 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-hub-foundation-p01) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on が空のため他 task との着手順序制約はない。resource_scope (docs/features/feat-hub-foundation/requirements-baseline.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 業務ドメインロジックの要件定義 (goal-spec scope_out)
- テナント固有OIDC/role/Device Flow policyの要件定義 (feat-auth-tenancyのscope。共通auth adapter・認可middleware境界は本featureのscope_in)
- DB スキーマ実体の要件定義 (feat-domain-model-db の scope)
- 実装コードの作成 (本 task は要件確定のみ)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .` (C12 が本 task spec の 14 section・placeholder 不在・前方 DAG を検証する)
- Required evidence: docs/features/feat-hub-foundation/requirements-baseline.md に goal-spec acceptance 4 件 (CI test→deploy 完走 / Worker bundle 3MiB以内 / SLO 99.5%計測と/health稼働 / shared-layers登録済み共通層の単一package・境界・consumer参照) と quality_constraints 9 件 (C2-zero-cost, C1-solo-ops, worker-bundle-budget, pnpm-only-no-npm, slo-error-budget, cwv-good, wrangler-deploy, github-actions-ci, shared-layers-single-implementation-owner) が過不足なく転記されていること

## Rollout and rollback

- Rollout: requirements-baseline.md を作成し、feature-package.json の source_feature_digest と一致することを確認してから P02 へ引き継ぐ
- Rollback trigger and steps: goal-spec と features/feat-hub-foundation.md の内容不一致が判明した場合、requirements-baseline.md を作成前状態 (ファイル未作成) に戻し、goal-spec 側の再確定を dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-hub-foundation.context.json` (`sha256:938ecf38d145496bba7a439b829d3934718b8f43b4f4628d8ba821594d17062d`)
- Phase responsibility: 現行 context の purpose・goal・scope・acceptance を要件ベースラインへ全件固定する。
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

- Required responsibility: docs/shared-layers.md §1〜§3 と第4 acceptanceを要件ベースラインへ含める。
- Dependency rule: this phase consumes only earlier P01..P00 outputs; later phase documentation or evidence is never an entry prerequisite.

## Normative implementation closure (2026-07-19)

This section is normative for P01 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

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

- System specification: system-spec/00-requirements-definition.md (U8 C1/C2, D1), system-spec/infrastructure.md (qa-003, qa-019), system-spec/frontend.md (qa-007, qa-018)
- Architecture: arch-harness-hub-infrastructure (architecture/harness-hub-infrastructure.md), arch-harness-hub-frontend (architecture/harness-hub-frontend.md)
- Feature: feat-hub-foundation
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: なし (P01 は本 package の起点 task)
