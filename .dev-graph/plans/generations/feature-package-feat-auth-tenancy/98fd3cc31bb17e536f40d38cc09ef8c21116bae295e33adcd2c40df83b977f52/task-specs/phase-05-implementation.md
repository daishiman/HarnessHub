# System task overlay: 実装 — Auth.js adapter・単一認可ミドルウェア・Device Flow API・session 管理

## Machine-readable registration fields

- feature_package_id: feature-package/feat-auth-tenancy (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-auth-tenancy", "macro-feature", "security", "implementation"]
- related_nodes: ["feat-auth-tenancy", "arch-harness-hub-security", "arch-harness-hub-backend"]
- parent_feature: feat-auth-tenancy
- phase_ref: P05
- classification: confidence=0.9, reason="P02/P04 で確定した設計・テストケースに基づき apps/hub の auth adapter・認可ミドルウェア・Device Flow API・session 管理を実装する P05 タスク", candidates=[{artifact_kind: task, confidence: 0.9, candidate_path: tasks/feat-auth-tenancy/sys-auth-tenancy-p05.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P02 の architecture-decision-record.md と P04 の test-design.md に基づき、apps/hub に Auth.js adapter・テナント別 OIDC 動的解決・単一認可ミドルウェア・OAuth Device Flow API・JWT session 管理・緊急失効参照ロジックを実装する。packages/db/schema/ 配下の変更は一切行わず、feat-domain-model-db が提供するリポジトリ層関数の消費のみを行う。

## 背景

実装は P02 の architecture decision に厳密に従う。`apps/hub/src/lib/auth/adapter/` に Auth.js への依存を隔離し、`resolveTenantOidcConfig(tenant_slug)` (idp_connections リポジトリ関数を呼び出しテナント別 issuer/client_id を解決)、jwt callback (sub/tenant_id/role/status/iat/exp の最小 claims 構成)、OIDC 検証契約 (issuer/aud 厳密一致、nonce/state 検証、PKCE S256、email_verified=true のみ受理、JIT provisioning は role=member/status=active で自動昇格しない) を実装する。上位レイヤー (`apps/hub/src/app/`, `apps/hub/src/middleware.ts`) は adapter が公開する型・関数のみを import し、Auth.js 固有の型を直接参照しない。`apps/hub/src/lib/authz/` に単一認可ミドルウェアを実装し、(1) JWT claims 取得、(2) session_revocations リポジトリ関数 (feat-domain-model-db 提供) を KV/メモリキャッシュ (TTL 60 秒) 経由で参照し `iat` が `revoked_at` より前なら即時拒否、(3) tenant_id/workspace_id の row-level scope 強制、(4) `projects.owner_user_id` リポジトリ関数との一致による owner 合成、(5) docs/backend-spec.md §3.3 の認可マトリクスに基づく単調な (member, owner, workspace-admin, provider-admin の順に権限が強くなる) deny-by-default 判定、を実装する。`apps/hub/src/app/api/v1/device/code/`, `/device/token/`, `/device/approve/`, `apps/hub/src/app/api/v1/token/refresh/`, `apps/hub/src/app/api/v1/tokens/` に Device Flow API (RFC 8628) を実装し、device_code TTL 10 分・user_code 8 文字 Crockford Base32 (5 回失敗で denied)・polling interval 5 秒・access token 15 分・refresh token 90 日 rotation + 再利用検知 (家族全失効) の数値契約を適用する。token 発行・検証は publisher_tokens/device_authorizations リポジトリ関数 (feat-domain-model-db 提供) を経由する。`apps/hub/src/app/[tenant_slug]/signin/` にテナント先行確定のログイン導線を実装する。`apps/hub/src/middleware.ts` に単一認可ミドルウェアを Next.js middleware として配線し、cookie 名 `__Host-harness-hub.session` (HttpOnly/Secure/SameSite=Lax)、maxAge 8 時間、updateAge 15 分の JWT session を構成する。CSRF 対策として SameSite=Lax に加え全 state-changing リクエストの Origin 検査を実装する。`packages/schemas/auth-tenancy/` に Device Flow API の zod スキーマ (OpenAPI 生成の入力) を実装する。dev 専用 provider (Credentials/mock login/SKIP_AUTH 等) はコードに一切追加せず、Dev tenant の OIDC provider として提供者の Google Workspace を本番と同一経路で登録する設計とする。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-auth-tenancy, arch-harness-hub-security, arch-harness-hub-backend
- Entry gate: goal-spec.json の feature_context_digest が sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5 に一致し、confirmation_status=confirmed であること。P04 の docs/features/feat-auth-tenancy/test-design.md が存在すること。feat-domain-model-db の session_revocations/users/publisher_tokens/device_authorizations リポジトリ層関数が利用可能であること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: applicable + change: apps/hub/src/app/[tenant_slug]/signin/ のログイン導線を実装する
- Backend: applicable + change: apps/hub/src/lib/auth (adapter)・apps/hub/src/lib/authz (認可ミドルウェア)・apps/hub/src/middleware.ts を実装する
- API: applicable + change: Device Flow API 6 経路と GET/POST /api/auth/[...nextauth] を実装する
- Data: N/A: packages/db/schema/ への変更は行わない。リポジトリ層関数の消費のみ
- Infrastructure: N/A: 新規インフラのプロビジョニングは行わない
- Security: applicable + change: OIDC 検証契約・role 4 種認可マトリクス・deny-by-default・session 緊急失効・CSRF 対策・dev 専用 provider 非存在を実装する
- Quality: applicable + change: P04 のテストケース一覧に対応する実装対象を過不足なく実装する
- Documentation: N/A: 本 task はコード実装が中心であり文書更新は伴わない
- Operations: N/A: 運用手順の実装は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-security, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: N/A: 本 task はコード実装のみで packages/db/schema/ への変更を伴わない

## 成果物

- Produced artifacts: apps/hub/src/lib/auth/ (Auth.js adapter, テナント別 OIDC 動的解決), apps/hub/src/lib/authz/ (単一認可ミドルウェア), apps/hub/src/app/api/auth/[...nextauth]/, apps/hub/src/app/api/v1/device/ (code/token/approve), apps/hub/src/app/api/v1/token/refresh/, apps/hub/src/app/api/v1/tokens/, apps/hub/src/app/[tenant_slug]/signin/, apps/hub/src/middleware.ts, packages/schemas/auth-tenancy/, packages/schemas/auth-tenancy/, apps/hub/src/app/api/v1/device/, apps/hub/src/app/api/v1/token/ (normative implementation artifacts)
- Consumed artifacts: docs/features/feat-auth-tenancy/architecture-decision-record.md, docs/features/feat-auth-tenancy/test-design.md, docs/backend-spec.md §3.2/§3.3/§4.1, feat-domain-model-db の packages/db/repository/ (session_revocations/users/publisher_tokens/device_authorizations)
- Write scope/touches: apps/hub/src/lib/auth/, apps/hub/src/lib/authz/, apps/hub/src/app/api/auth/, apps/hub/src/app/api/v1/device/, apps/hub/src/app/api/v1/token/, apps/hub/src/app/api/v1/tokens/, apps/hub/src/app/[tenant_slug]/signin/, apps/hub/src/middleware.ts, packages/schemas/auth-tenancy/ (packages/db/schema/ 配下は対象外), packages/schemas/auth-tenancy/, apps/hub/src/app/api/v1/device/, apps/hub/src/app/api/v1/token/

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-auth-tenancy-p05) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-auth-tenancy-p05 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-auth-tenancy-p05) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-AUTH-TENANCY-P04]。resource_scope (apps/hub/src/lib/auth, apps/hub/src/lib/authz, apps/hub/src/app/api/auth, apps/hub/src/app/api/v1/device, apps/hub/src/app/api/v1/token(s), apps/hub/src/app/[tenant_slug]/signin, apps/hub/src/middleware.ts, packages/schemas/auth-tenancy) は他 task と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- session_revocations/users/publisher_tokens/device_authorizations のスキーマ定義・migration (owner=feat-domain-model-db)
- 承認キュー/監査 UI の実装 (owner=feat-workspace-governance)
- PII ガード適用/係数管理の実装 (owner=feat-user-org-admin)
- publish 状態機械の実装 (owner=feat-publish-pipeline)
- Publisher/CLI 側の OS 資格情報域保存の実装 (owner=Publisher 実装 feature)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: apps/hub/src/lib/auth/, apps/hub/src/lib/authz/, apps/hub/src/app/api/v1/device/, apps/hub/src/app/api/v1/token(s)/, apps/hub/src/app/[tenant_slug]/signin/, apps/hub/src/middleware.ts, packages/schemas/auth-tenancy/ が実装され、P04 の test-design.md に列挙された全テストケースに対応する実装対象が揃っていること. Normative evidence: P04/P06 は server-side Device Flow と downstream token contract を別 test ID に分け、P10/P11 は auth 自身の証跡と publisher consumer evidence reference を混同せず記録する。

## Rollout and rollback

- Rollout: apps/hub の実装を完了し、Auth.js 依存が adapter 境界に隔離されていることを確認してから P06 (テスト実行) へ引き継ぐ
- Rollback trigger and steps: 実装が P02 の architecture decision と矛盾する場合 (例: 認可判定が middleware 以外に混入した場合、Auth.js 固有 API が adapter 境界外から import された場合)、該当コードを削除し P02 の設計に沿って再実装する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-auth-tenancy.context.json` (`sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5`)
- Phase responsibility: P04 を先行条件として現行 scope_in を実装し、scope_out を混入させない。
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

This section is normative for P05 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

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
- Detailed authoritative source: docs/backend-spec.md §3.2 (認証 2 系統・数値契約), §3.3 (認可マトリクス), §4.1 (Device Flow エンドポイント)
- Architecture: arch-harness-hub-security, arch-harness-hub-backend
- Feature: feat-auth-tenancy
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-AUTH-TENANCY-P04
