# System task overlay: Hub 基盤 リファクタリング・データ移行 (N/A 判定)

## Machine-readable registration fields

- feature_package_id: feature-package/feat-hub-foundation (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-hub-foundation", "stage-1", "infrastructure", "refactoring-migration", "not-applicable"]
- related_nodes: ["feat-hub-foundation", "arch-harness-hub-infrastructure", "arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-security", "arch-harness-hub-dev-workflow"]
- parent_feature: feat-hub-foundation
- phase_ref: P08
- classification: confidence=0.85, reason="新規 scaffold feature のため refactor/migration の適用要否を判定し N/A 理由を機械可読に残す P08 タスク", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-hub-foundation/sys-hub-foundation-p08.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

feature-execution-package-contract.md §3 (P08 = refactoring/migration。不要でも「N/A: reason」を成果として実行する) に従い、feat-hub-foundation における refactoring・data migration・compatibility 対応の適用要否を判定する。この task 完了時点で、適用外である理由が機械可読に記録され、node 自体は 13-task exact-set の一員として存在している状態にする。

## 背景

feat-hub-foundation は既存実装を持たない新規 scaffold feature であり、P05 で作成する apps/hub・packages/* はすべて新規追加である。DB スキーマ実体は feat-domain-model-db の scope (goal-spec scope_out) であり、本 feature には移行対象のデータも存在しない。将来 Worker bundle サイズが 3MiB 予算へ接近した場合のコード分割・依存削減はリファクタリングに類するが、これは P09 (quality-assurance) の運用監視トリガーとして継続的に扱われるものであり、本 task package 生成時点では発生していない。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-hub-foundation, sys-hub-foundation-p07, arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security, arch-harness-hub-dev-workflow
- Entry gate: docs/features/feat-hub-foundation/acceptance-report.md で goal-spec acceptance 4 件が合格判定済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対

## Workstream applicability

- Frontend: N/A: 本 feature は新規 scaffold であり、既存 frontend 実装が存在しないためリファクタリング対象がない
- Backend: N/A: 本 feature は新規 scaffold であり、既存 backend 実装が存在しないためリファクタリング対象がない
- API: N/A: 本 feature は新規 scaffold であり、既存 API 契約が存在しないため migration/compatibility 対応の対象がない
- Data: N/A: DB スキーマ実体は feat-domain-model-db の scope (goal-spec scope_out) であり、本 feature には移行対象のデータが存在しない
- Infrastructure: N/A: 新規 pnpm workspace・Worker 構成はすべて P05 での新規作成であり、既存 infrastructure からの移行対象が存在しない。将来の bundle 予算超過対応は P09 の運用監視トリガーとして扱い、本 task では実施しない
- Security: N/A for migration: auth schema/policy migrationは行わない。hub-owned共通auth adapter・認可middleware境界は変更せず維持する
- Quality: applicable + change: 上記 N/A 判定の根拠を docs/features/feat-hub-foundation/refactoring-migration-note.md に記録する (対象物への変更なし)
- Documentation: applicable + change: docs/features/feat-hub-foundation/refactoring-migration-note.md を新規作成する
- Operations: N/A: 運用中の障害対応・トイル削減は qa-019 の日常運用範囲であり、本 task (新規 scaffold 完成直後の N/A 判定) の対象外

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-infrastructure, arch-harness-hub-frontend, arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security, arch-harness-hub-dev-workflow
- Deploy unit/environment: N/A: リファクタリング・移行が発生しないため対象デプロイ単位の変更はない
- Compatibility/migration/backfill: N/A: 新規 scaffold であり既存実装・既存データが存在しないため互換性・migration・backfill の対象がない

## 成果物

- Produced artifacts: docs/features/feat-hub-foundation/refactoring-migration-note.md (N/A 判定とその根拠、将来 bundle 予算超過時の対応方針への参照)
- Consumed artifacts: docs/features/feat-hub-foundation/acceptance-report.md, docs/features/feat-hub-foundation/architecture-decision-record.md
- Write scope/touches: docs/features/feat-hub-foundation/refactoring-migration-note.md

## Tracker publication and completion

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-hub-foundation-p08) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-hub-foundation-p08 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-hub-foundation-p08) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[sys-hub-foundation-p07] が完了するまで着手しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 実際のコードリファクタリング・データ移行の実施 (適用対象が存在しないため)
- 将来の bundle 予算超過対応そのもの (P09 の運用監視トリガーとして別途扱う)
- DB スキーマ実体の移行 (feat-domain-model-db の scope)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: docs/features/feat-hub-foundation/refactoring-migration-note.md に 9 workstream すべての N/A 判定理由が記録されていること

## Rollout and rollback

- Rollout: refactoring-migration-note.md を作成し、P09 (quality-assurance) へ引き継ぐ
- Rollback trigger and steps: 該当なし (N/A 判定のため対象物への変更が発生せず、ロールバック対象が存在しない)

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-hub-foundation.context.json` (`sha256:938ecf38d145496bba7a439b829d3934718b8f43b4f4628d8ba821594d17062d`)
- Phase responsibility: migration・互換性・refactor の適用要否を実行し、N/A でも根拠を残す。
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

## Normative implementation closure (2026-07-19)

This section is normative for P08 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

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

- System specification: system-spec/00-requirements-definition.md (D1, C1, C2)
- Architecture: arch-harness-hub-infrastructure (architecture/harness-hub-infrastructure.md), arch-harness-hub-frontend (architecture/harness-hub-frontend.md)
- Feature: feat-hub-foundation
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成しない
- Dependencies: sys-hub-foundation-p07
