# System task overlay: Hub 基盤 運用ドキュメント整備

## Machine-readable registration fields

- feature_package_id: feature-package/feat-hub-foundation (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-hub-foundation", "stage-1", "infrastructure", "documentation-operations"]
- related_nodes: ["feat-hub-foundation", "arch-harness-hub-infrastructure", "arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-security", "arch-harness-hub-dev-workflow"]
- parent_feature: feat-hub-foundation
- phase_ref: P12
- classification: confidence=0.87, reason="P13 の本番デプロイに先立ち運用 runbook と利用者向けドキュメントを整備する P12 タスク", candidates=[{artifact_kind: task, confidence: 0.87, candidate_path: tasks/feat-hub-foundation/sys-hub-foundation-p12.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

C1 (単独運用者が長期的に低運用負荷で回せる) を満たすため、Hub 基盤の運用手順を runbook として整備し、README.md の初期セットアップ手順を最終形へ更新する。この task 完了時点で、P13 の本番デプロイと、デプロイ後の日常運用 (障害対応、エラーバジェット運用、restore drill) が runbook 一つで完結できる状態にする。

## 背景

qa-019 は月間エラーバジェット 0.5% 消費時の新規公開機能凍結運用と、四半期ごとの restore drill を求めている。これらは P09 で readiness を確認済みだが、実際の運用時に単独運用者が迷わず実行できるよう、手順を runbook として文書化する必要がある。P05 で README.md に追記した初期セットアップ手順は開発環境構築のみを対象としており、本 task で本番運用手順を追加する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-hub-foundation, arch-harness-hub-infrastructure, arch-harness-hub-frontend, sys-hub-foundation-p11, arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security, arch-harness-hub-dev-workflow
- Entry gate: docs/features/feat-hub-foundation/evidence/index.md が作成済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対

## Workstream applicability

- Frontend: N/A: 運用ドキュメント整備のみを行い、frontend 実装物への変更は行わない
- Backend: N/A: 運用ドキュメント整備のみを行い、backend 実装物への変更は行わない
- API: N/A: 運用ドキュメント整備のみを行い、API 実装物への変更は行わない
- Data: N/A: DB スキーマ実体は feat-domain-model-db の scope であり、本 task の対象に含めない
- Infrastructure: applicable + change: wrangler deploy コマンド、ロールバック手順 (直前バージョンへの revert) を runbook.md に記録する (対象物 (wrangler.jsonc 等) への変更なし)
- Security: applicable + documentation: hub-owned共通auth adapter・認可middleware境界、tenant固有policy owner、consumer向け運用契約をrunbookへ記載する
- Quality: applicable + change: bundle 予算超過時の対応手順 (コード分割・依存削減、Workers Paid 移行検討) を runbook.md に記録する
- Documentation: applicable + change: docs/features/feat-hub-foundation/runbook.md を新規作成し、README.md の本番運用セクションを更新する
- Operations: applicable + change: エラーバジェット消費時の新規公開機能凍結手順、四半期 restore drill の実施手順、/health 障害時の一次対応手順を runbook.md に記録する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-infrastructure, arch-harness-hub-frontend, arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security, arch-harness-hub-dev-workflow
- Deploy unit/environment: cloudflare-workers/hub (runbook の対象。本 task 自体はデプロイ単位を変更しない)
- Compatibility/migration/backfill: N/A: 新規 scaffold であり互換性・migration・backfill の対象がない

## 成果物

- Produced artifacts: docs/features/feat-hub-foundation/runbook.md (デプロイ・ロールバック・障害対応・エラーバジェット運用・restore drill の各手順)、README.md の本番運用セクション追記
- Consumed artifacts: docs/features/feat-hub-foundation/quality-assurance-report.md, docs/features/feat-hub-foundation/evidence/index.md
- Write scope/touches: docs/features/feat-hub-foundation/runbook.md, README.md

## Tracker publication and completion

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-hub-foundation-p12) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-hub-foundation-p12 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-hub-foundation-p12) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[sys-hub-foundation-p11] が完了するまで着手しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 業務ドメインロジックの運用ドキュメント (goal-spec scope_out)
- 認証・認可の運用手順 (feat-auth-tenancy の scope)
- 実際のデプロイ実行 (P13 の scope)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: runbook.md にデプロイ・ロールバック・障害対応・エラーバジェット運用・restore drill の 5 手順すべてが記載されていること

## Rollout and rollback

- Rollout: runbook.md と README.md 更新を完了した後、P13 (release-deploy) へ引き継ぐ
- Rollback trigger and steps: runbook.md の記載内容が P09 の readiness 確認結果と矛盾する場合、矛盾箇所を記録した上で sys-hub-foundation-p09 を再確認対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-hub-foundation.context.json` (`sha256:938ecf38d145496bba7a439b829d3934718b8f43b4f4628d8ba821594d17062d`)
- Phase responsibility: 検証済み実装の運用・runbook・handover を文書化し、先行 phase の前提にしない。
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

- Required responsibility: 共通層の変更管理、consumer再テスト、owner境界をrunbook/handoverへ含める。
- Dependency rule: this phase consumes only earlier P01..P11 outputs; later phase documentation or evidence is never an entry prerequisite.

## Normative implementation closure (2026-07-19)

This section is normative for P12 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

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

- System specification: system-spec/00-requirements-definition.md (C1), system-spec/infrastructure.md (qa-003, qa-019)
- Architecture: arch-harness-hub-infrastructure (architecture/harness-hub-infrastructure.md), arch-harness-hub-frontend (architecture/harness-hub-frontend.md)
- Feature: feat-hub-foundation
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成しない
- Dependencies: sys-hub-foundation-p11
