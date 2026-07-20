# System task overlay: Hub 基盤 本番リリース・デプロイ

## Machine-readable registration fields

- feature_package_id: feature-package/feat-hub-foundation (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-hub-foundation", "stage-1", "infrastructure", "release-deploy"]
- related_nodes: ["feat-hub-foundation", "arch-harness-hub-infrastructure", "arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-security", "arch-harness-hub-dev-workflow"]
- parent_feature: feat-hub-foundation
- phase_ref: P13
- classification: confidence=0.9, reason="P12 の runbook に従い wrangler CLI で Hub を Cloudflare Workers 本番環境へデプロイする P13 タスク", candidates=[{artifact_kind: task, confidence: 0.9, candidate_path: tasks/feat-hub-foundation/sys-hub-foundation-p13.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P12 の runbook に従い、goal-spec acceptance「CI が test→deploy まで完走する」を満たす形で、Hub 基盤を Cloudflare Workers 本番環境へ wrangler CLI 経由でデプロイする。この task 完了時点で、.github/workflows/ci.yml の deploy ステップが本番へ到達し、/health が本番 URL 上で応答し、外部死活監視と SLO ダッシュボードが本番稼働を計測している状態にする。goal-spec の acceptance 4 件のうち、本番環境での実現は本 task が担う (P07 は CI/開発環境での判定)。

## 背景

D1 決定により Hub は @opennextjs/cloudflare 経由で単一 Cloudflare Worker として wrangler CLI からデプロイされる。P05〜P11 は開発・CI 環境での実装・検証・証跡収集を担い、P12 は運用手順を整備したが、本番環境への実際のデプロイはまだ実行されていない。feature-execution-package-contract.md §3 は P13 を release/deploy として位置づけ、本 feature では実装スコープに本番デプロイが明確に含まれる (N/A 判定ではなく実タスク) ため、P08 とは異なり本 task は成果物を伴う実行タスクとする。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-hub-foundation, arch-harness-hub-infrastructure, arch-harness-hub-frontend, sys-hub-foundation-p12, arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security, arch-harness-hub-dev-workflow
- Entry gate: docs/features/feat-hub-foundation/runbook.md が作成済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対

## Workstream applicability

- Frontend: applicable + change: apps/hub の本番ビルド成果物を Cloudflare Workers へデプロイする (実装内容自体は P05 のものをそのまま反映)
- Backend: applicable + change: /health route handler を本番環境で稼働させる
- API: N/A: 業務 API 契約は scope 外 (後続 feature)
- Data: N/A: DB スキーマ実体は feat-domain-model-db の scope であり、本 task のデプロイ対象に含めない
- Infrastructure: applicable + change: .github/workflows/ci.yml の deploy ステップを本番向けに有効化し、wrangler CLI (wrangler.jsonc の設定) 経由で本番 Worker をデプロイする
- Security: applicable + change: 本番デプロイに必要な wrangler API token 等の secret を GitHub Actions の暗号化 secret として設定する (secret の値自体は本 task の成果物に含めない、C4 に従い保持しない)
- Quality: applicable + change: 本番デプロイ後の bundle サイズが 3MiB 以内であることを最終確認する
- Documentation: applicable + change: docs/features/feat-hub-foundation/release-notes.md を新規作成する
- Operations: applicable + change: 外部死活監視と SLO ダッシュボードを本番 URL に対して有効化し、本番稼働の計測を開始する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-infrastructure, arch-harness-hub-frontend, arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security, arch-harness-hub-dev-workflow
- Deploy unit/environment: cloudflare-workers/hub (本番環境、wrangler CLI 経由デプロイ)
- Compatibility/migration/backfill: N/A: 新規 scaffold の初回リリースであり互換性・migration・backfill の対象がない

## 成果物

- Produced artifacts: docs/features/feat-hub-foundation/release-notes.md (デプロイ日時、Worker バージョン、本番 URL、初回稼働確認結果)、.github/workflows/ci.yml の deploy ステップ本番有効化
- Consumed artifacts: docs/features/feat-hub-foundation/runbook.md, apps/hub/, wrangler.jsonc, open-next.config.ts
- Write scope/touches: .github/workflows/ci.yml, docs/features/feat-hub-foundation/release-notes.md

## Tracker publication and completion

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-hub-foundation-p13) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-hub-foundation-p13 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-hub-foundation-p13) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[sys-hub-foundation-p12] が完了するまで着手しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 業務ドメインロジックのリリース (goal-spec scope_out)
- 認証・認可のリリース (feat-auth-tenancy の scope)
- 本番デプロイ後の恒常的な運用監視そのもの (P12 runbook に基づき日常運用として継続、本 task は初回デプロイと稼働確認のみ)

## Verification and evidence

- Automated commands: runbook.md 記載の wrangler deploy コマンド (`wrangler deploy` 相当) / 本番 /health への疎通確認 / `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: release-notes.md にデプロイ日時・Worker バージョン・本番 URL・/health 初回応答・bundle サイズ最終値が記録されていること. Normative evidence: 全登録共通層のowner/public API/consumer一覧、consumer contract tests、duplicate implementation scan=0、CI/bundle/SLO/healthの4 acceptance証跡を必須とする。

## Rollout and rollback

- Rollout: CI の deploy ステップから本番デプロイを実行し、成功後に /health と外部死活監視・SLO ダッシュボードの本番稼働を確認する
- Rollback trigger and steps: 本番デプロイ後に /health が異常応答を返す場合、runbook.md 記載のロールバック手順 (直前バージョンへの wrangler rollback) を実行し、実行結果を release-notes.md に記録する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-hub-foundation.context.json` (`sha256:938ecf38d145496bba7a439b829d3934718b8f43b4f4628d8ba821594d17062d`)
- Phase responsibility: release/deploy/close-out と rollback 証跡を残し、N/A でも理由を確定する。
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

- Required responsibility: Hub本体と共通packageを同一release closureで公開し、consumer参照のsmoke evidenceを残す。
- Dependency rule: this phase consumes only earlier P01..P12 outputs; later phase documentation or evidence is never an entry prerequisite.

## Normative implementation closure (2026-07-19)

This section is normative for P13 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

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

- System specification: system-spec/00-requirements-definition.md (D1, C1, C2), system-spec/infrastructure.md (qa-003, qa-019), system-spec/frontend.md (qa-007, qa-018)
- Architecture: arch-harness-hub-infrastructure (architecture/harness-hub-infrastructure.md), arch-harness-hub-frontend (architecture/harness-hub-frontend.md)
- Feature: feat-hub-foundation
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成しない
- Dependencies: sys-hub-foundation-p12
