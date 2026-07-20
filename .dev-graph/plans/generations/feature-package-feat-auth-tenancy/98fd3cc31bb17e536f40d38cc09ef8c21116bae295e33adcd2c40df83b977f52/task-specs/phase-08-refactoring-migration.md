# System task overlay: リファクタリング/マイグレーション — adapter 境界の最終整理・dev 専用 provider 非存在 CI 検査確立

## Machine-readable registration fields

- feature_package_id: feature-package/feat-auth-tenancy (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-auth-tenancy", "macro-feature", "security", "refactor-migration"]
- related_nodes: ["feat-auth-tenancy", "arch-harness-hub-security", "arch-harness-hub-backend"]
- parent_feature: feat-auth-tenancy
- phase_ref: P08
- classification: confidence=0.85, reason="本 feature は packages/db/schema/ を write_scope に持たないため DB migration 生成を伴わない。P08 は Auth.js adapter 境界の最終リファクタリングと dev 専用 provider 非存在の CI 検査確立に読み替える required-node タスク", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-auth-tenancy/sys-auth-tenancy-p08.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

本 feature は packages/db/schema/ 配下を write_scope に持たず (session_revocations/users/publisher_tokens/device_authorizations のスキーマ owner は feat-domain-model-db)、DB migration の生成・適用対象を持たない。したがって本 task は前例 (feat-domain-model-db の P08) の migration 生成に相当する処理を、(1) P05 で実装した Auth.js adapter 境界の最終リファクタリング (境界外からの Auth.js 固有 API 参照が残存していないかの是正)、(2) dev 専用 provider (Credentials/mock login/SKIP_AUTH 等) がコードに存在しないことを恒久的に保証する CI 検査の確立、(3) Dev tenant の OIDC provider として提供者の Google Workspace を本番と同一経路で登録するための設定手順整理、に読み替えて実施する。

## 背景

qa-036 の「開発/デモ環境の認証」要件は、dev 専用 provider をコードに存在させず CI で文字列出現を禁止検査すること、提供者の Google Workspace を Dev tenant OIDC provider として登録し本番と同一経路を使うことを要求する。本 task はこの要件を恒久的な CI ゲートとして確立する唯一の task であり、P05 で実装した検査を再実行可能な形 (`.github/workflows/` 相当または既存 CI 構成への組み込み) に固定する。あわせて、P05/P06 で判明した Auth.js adapter 境界の軽微な逸脱 (例: import 経路の整理漏れ) があれば本 task で是正する。本 feature は control-plane DB のスキーマ変更を一切伴わないため、既存データへの後方互換性・backfill の考慮は前例と異なり構造的に発生しない。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-auth-tenancy, arch-harness-hub-security, arch-harness-hub-backend
- Entry gate: goal-spec.json の feature_context_digest が sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5 に一致し、confirmation_status=confirmed であること。P07 の docs/features/feat-auth-tenancy/acceptance-record.md が全項目 pass を記録していること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: N/A: 本 task は UI の変更を伴わない
- Backend: applicable + change: apps/hub/src/lib/auth/adapter/ 境界の最終リファクタリングを行う
- API: N/A: エンドポイント契約自体の変更は伴わない
- Data: N/A: 本 feature は packages/db/schema/ への変更を一切行わない (feat-domain-model-db が owner)
- Infrastructure: N/A: 新規インフラのプロビジョニングは行わない
- Security: applicable + change: dev 専用 provider 非存在の CI 検査を恒久ゲートとして確立する
- Quality: applicable + change: no-hub-native-account-idp-delegation-i7 の恒久的な充足を CI ゲートで保証する
- Documentation: applicable + change: docs/features/feat-auth-tenancy/refactoring-migration-note.md を新規作成する (Dev tenant OIDC 設定手順を含む)
- Operations: N/A: 運用手順の確定は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-security, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: N/A: 本 feature は packages/db/schema/ を write_scope に持たないため migration 生成・適用の対象がなく、後方互換性・backfill は構造的に N/A

## 成果物

- Produced artifacts: docs/features/feat-auth-tenancy/refactoring-migration-note.md (adapter 境界是正記録、dev 専用 provider 非存在 CI 検査の設定内容、Dev tenant OIDC 登録手順を含む)、CI 検査設定 (dev 専用 provider 文字列禁止検査、adapter 境界外 Auth.js import 禁止検査)
- Consumed artifacts: docs/features/feat-auth-tenancy/test-run-results.md, docs/features/feat-auth-tenancy/acceptance-record.md, apps/hub/src/lib/auth/
- Write scope/touches: apps/hub/src/lib/auth/, docs/features/feat-auth-tenancy/refactoring-migration-note.md (CI 検査設定ファイルは共有 CI 構成の不可侵範囲外である feature 固有チェックスクリプトに限定)

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-auth-tenancy-p08) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-auth-tenancy-p08 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-auth-tenancy-p08) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-AUTH-TENANCY-P07]。resource_scope (apps/hub/src/lib/auth/, docs/features/feat-auth-tenancy/refactoring-migration-note.md) は他 task と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- packages/db/schema/ への migration 生成・適用 (owner=feat-domain-model-db。本 feature は永続化スキーマを持たない)
- 共有 CI パイプライン本体の変更 (共有 CI は不可侵。本 task は feature 固有チェックスクリプトの追加のみ)
- Publisher/CLI 側の OS 資格情報域保存に関する変更 (owner=Publisher 実装 feature)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: docs/features/feat-auth-tenancy/refactoring-migration-note.md に adapter 境界是正記録・CI 検査設定内容・Dev tenant OIDC 登録手順の 3 点が記載されていること

## Rollout and rollback

- Rollout: adapter 境界の最終リファクタリングと CI 検査確立を完了し、refactoring-migration-note.md を確認してから P09 (品質保証) へ引き継ぐ
- Rollback trigger and steps: CI 検査導入により既存の正当な import が誤検知される場合、検査ルールを是正し本 task を再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-auth-tenancy.context.json` (`sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5`)
- Phase responsibility: migration・互換性・refactor の適用要否を実行し、N/A でも根拠を残す。
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

This section is normative for P08 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

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
- Detailed authoritative source: docs/backend-spec.md §3.2
- Architecture: arch-harness-hub-security, arch-harness-hub-backend
- Feature: feat-auth-tenancy
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-AUTH-TENANCY-P07
