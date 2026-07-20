# System task overlay: リリース/デプロイ — 本番 OIDC provider 反映と Device Flow スモークテスト

## Machine-readable registration fields

- feature_package_id: feature-package/feat-auth-tenancy (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-auth-tenancy", "macro-feature", "security", "release-deploy"]
- related_nodes: ["feat-auth-tenancy", "arch-harness-hub-security", "arch-harness-hub-backend"]
- parent_feature: feat-auth-tenancy
- phase_ref: P13
- classification: confidence=0.87, reason="本番 OIDC provider 設定を idp_connections へ反映し Device Flow E2E スモークテストを行う P13 タスク (required-node)", candidates=[{artifact_kind: task, confidence: 0.87, candidate_path: tasks/feat-auth-tenancy/sys-auth-tenancy-p13.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

本番環境の idp_connections (feat-domain-model-db owner のリポジトリ層関数経由) へテナント別 OIDC provider 設定を反映し、Auth.js adapter・単一認可ミドルウェア・Device Flow API を本番 Cloudflare Workers 環境へデプロイしたうえで、ログイン導線・認可判定・Device Flow E2E・session 緊急失効のスモークテストを実施し release-record.md として記録する。

## 背景

本 feature は control-plane DB のスキーマを持たないため、本番デプロイは feat-domain-model-db が P13 で確立した control-plane DB を前提条件とする。デプロイ手順は (1) 本番テナントの OIDC provider 設定 (issuer/client_id/client_secret) を idp_connections へ登録、(2) apps/hub の Auth.js adapter・認可ミドルウェア・Device Flow API を本番 Cloudflare Workers 環境へデプロイ、(3) Dev tenant の Google Workspace OIDC provider 登録確認、(4) スモークテスト (2 tenant でのログイン成功、role 4 種それぞれでの認可判定サンプル実行、Device Flow E2E [device code 発行→approve→token 交換→API 呼び出し成功→失効]、session_revocations 経由の緊急失効動作確認、dev 専用 provider 非存在の本番ビルド確認) の順で実施する。goal-spec の acceptance 3 項目 (テナント越境 0 件、Device Flow E2E 成功、Auth.js adapter 境界隔離) を本番環境で再確認し、デプロイ完了の最終判定とする。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-auth-tenancy, arch-harness-hub-security, arch-harness-hub-backend
- Entry gate: goal-spec.json の feature_context_digest が sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5 に一致し、confirmation_status=confirmed であること。P12 の docs/features/feat-auth-tenancy/runbook.md が存在すること。feat-domain-model-db の本番リリース (control-plane DB 確立) が完了していること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: applicable + change: 本番環境でのログイン導線 (テナント別 /{tenant_slug}/signin) のスモークテストを実施する
- Backend: applicable + change: apps/hub の本番デプロイとスモークテストを実施する
- API: applicable + change: Device Flow API 6 経路の本番スモークテストを実施する
- Data: N/A: 本 feature は control-plane DB のスキーマを持たない (feat-domain-model-db の本番リリースに依存)
- Infrastructure: applicable + change: 本番テナントの OIDC provider 設定を idp_connections へ反映する
- Security: applicable + change: role 4 種認可判定・session 緊急失効・dev provider 非存在を本番環境で確認する
- Quality: applicable + change: acceptance 3 項目を本番環境で再確認する
- Documentation: applicable + change: docs/features/feat-auth-tenancy/release-record.md を新規作成する
- Operations: applicable + change: runbook.md の緊急失効/token 棚卸し手順が本番環境で実行可能であることを確認する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-security, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub (本番テナントの OIDC provider 設定、apps/hub デプロイを対象とする)
- Compatibility/migration/backfill: N/A: 本 feature は packages/db/schema/ への変更を持たないため migration・backfill は発生しない

## 成果物

- Produced artifacts: docs/features/feat-auth-tenancy/release-record.md (OIDC provider 反映結果、apps/hub デプロイ結果、スモークテスト結果、acceptance 3 項目の本番再確認結果を含む)
- Consumed artifacts: docs/features/feat-auth-tenancy/runbook.md, docs/features/feat-auth-tenancy/evidence-summary.md, apps/hub/src/lib/auth/, apps/hub/src/lib/authz/, apps/hub/src/app/api/v1/device/
- Write scope/touches: docs/features/feat-auth-tenancy/release-record.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-auth-tenancy-p13) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-auth-tenancy-p13 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-auth-tenancy-p13) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-AUTH-TENANCY-P12]。resource_scope (docs/features/feat-auth-tenancy/release-record.md) は他 task と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- feat-domain-model-db 側の本番デプロイ (control-plane DB 確立は同 feature 自身の P13 の責務であり本 task の前提条件として消費するのみ)
- Publisher/CLI 側の OS 資格情報域反映 (owner=Publisher 実装 feature)
- 承認キュー/監査 UI のリリース (owner=feat-workspace-governance)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: docs/features/feat-auth-tenancy/release-record.md に OIDC provider 反映成功、apps/hub デプロイ成功、スモークテスト全項目 pass (ログイン、role 4 種認可判定、Device Flow E2E、session 緊急失効、dev provider 非存在) と acceptance 3 項目の本番再確認結果が記録されていること. Normative evidence: P04/P06 は server-side Device Flow と downstream token contract を別 test ID に分け、P10/P11 は auth 自身の証跡と publisher consumer evidence reference を混同せず記録する。

## Rollout and rollback

- Rollout: release-record.md で全スモークテスト pass と acceptance 3 項目達成を確認し、本 feature のリリース完了を確定する
- Rollback trigger and steps: デプロイまたはスモークテストのいずれかが失敗した場合、直前の apps/hub デプロイをロールバックしたうえで、P05 または P09 へ差し戻し是正する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-auth-tenancy.context.json` (`sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5`)
- Phase responsibility: release/deploy/close-out と rollback 証跡を残し、N/A でも理由を確定する。
- Purpose: テナント別 OIDC (Auth.js) と role 4 種、全 API への Tenant/Workspace スコープ強制 (D4 row-level-scope)、Publisher 向け OAuth Device Flow を確立する
- Goal: 2 テナント同時稼働で認可の越境が分離テストにより 0 件と証明され、Device Flow で token 取得・失効が動作する状態
- Scope in (all items are in-scope for the package; this phase owns the subset matching its responsibility):
- Auth.js マルチテナント OIDC 動的解決
- role: provider-admin/workspace-admin/owner/member
- 認可の単一ミドルウェア集約
- OAuth Device Flow + token 失効導線
- テナント分離テスト
- Scope out:
- 承認キュー (Stage 2)
- 監査 UI (Stage 2)
- Acceptance (P04/P06/P07/P10/P11 must preserve exact coverage):
- テナント越境アクセスが分離テストで 0 件
- Device Flow の E2E (承認→token→失効) が成功する
- Auth.js 依存が adapter 境界に隔離されている (D3 caveat)
- Architecture/source refs:
- architecture/harness-hub-security.md
- architecture/harness-hub-backend.md
- specs/harness-hub-system-specification.md

This section is the current source closure and supersedes older counts or wording in this task when they conflict with the pinned feature context.

## Normative implementation closure (2026-07-19)

This section is normative for P13 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-auth-tenancy.context.json; docs/backend-spec.md §3.2; docs/security-spec.md §2.2; system-spec/backend.md qa-010/qa-059
- Effective phase contract: 本 package が所有するのは Hub 側 Device Authorization Flow（code/approve/token、短命 access token、refresh rotation/reuse detection、本人・管理者失効）である。OS 資格情報保存は feat-publisher-plugin が所有する consumer 実装であり、auth package は保存 API を実装したと偽らず、token response/rotation/revocation の公開 contract と downstream evidence key を提供する。Device Flow acceptance は Hub E2E（承認→発行→rotation→失効）で判定し、macOS Keychain/Windows Credential Manager は publisher package の E2E evidence を相互参照する。循環依存は作らない。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `packages/schemas/auth-tenancy/`
- `apps/hub/src/app/api/v1/device/`
- `apps/hub/src/app/api/v1/token/`
- Mandatory evidence: P04/P06 は server-side Device Flow と downstream token contract を別 test ID に分け、P10/P11 は auth 自身の証跡と publisher consumer evidence reference を混同せず記録する。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: system-spec/00-requirements-definition.md (D3, D4, I7, I8, G4), system-spec/spec-state.json qa_log (qa-005, qa-006, qa-008, qa-020, qa-036)
- Detailed authoritative source: docs/features/feat-auth-tenancy/runbook.md, docs/backend-spec.md §3.2, §4.1
- Architecture: arch-harness-hub-security, arch-harness-hub-backend
- Feature: feat-auth-tenancy
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-AUTH-TENANCY-P12
