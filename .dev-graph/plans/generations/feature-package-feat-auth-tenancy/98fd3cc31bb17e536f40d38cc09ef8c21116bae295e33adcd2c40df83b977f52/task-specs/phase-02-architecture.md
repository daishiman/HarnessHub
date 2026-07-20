# System task overlay: アーキテクチャ設計 — Auth.js adapter 境界・単一認可ミドルウェア・Device Flow・session 管理設計

## Machine-readable registration fields

- feature_package_id: feature-package/feat-auth-tenancy (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-auth-tenancy", "macro-feature", "security", "architecture-decision"]
- related_nodes: ["feat-auth-tenancy", "arch-harness-hub-security", "arch-harness-hub-backend"]
- parent_feature: feat-auth-tenancy
- phase_ref: P02
- classification: confidence=0.9, reason="Auth.js テナント別 OIDC 動的解決の adapter 境界設計・role 4 種の単一認可ミドルウェア設計・OAuth Device Flow 設計・session 管理設計・cross-feature 境界 (session_revocations/users スキーマ owner) 確定を行う P02 タスク", candidates=[{artifact_kind: task, confidence: 0.9, candidate_path: tasks/feat-auth-tenancy/sys-auth-tenancy-p02.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P01 で確定した要件ベースラインを実装可能なアーキテクチャへ具体化する。具体的には (1) Auth.js への依存を adapter 境界に閉じるインタフェース設計を確定し (D3 caveat)、(2) テナント別 OIDC の動的解決方式 (ログイン URL `/{tenant_slug}/signin` によるテナント先行確定、issuer/aud 厳密一致、nonce/state/PKCE S256、idp_subject 識別子) を確定し、(3) role 4 種 (provider-admin/workspace-admin/owner/member) の単調な認可マトリクスを単一ミドルウェアで判定する設計を確定し、(4) OAuth Device Authorization Flow (RFC 8628) のエンドポイント設計と OS 資格情報域保存方式を確定し、(5) JWT stateless session (maxAge 8h/updateAge 15 分) と session_revocations による緊急失効の参照方式を確定し、(6) goal-spec quality_constraints に含まれない cross-feature 境界 (session_revocations/users テーブルのスキーマ owner) を確定する。

## 背景

### Architecture decision: session_revocations テーブルおよび users テーブルのスキーマ owner は feat-domain-model-db である

features/feat-auth-tenancy.md および goal-spec.json は認可・セッション管理・Device Flow の実装を本 feature の scope_in とするが、これらが参照する永続化層のスキーマ定義自体の owner を明示しない。以下の証跡から owner を確定する。

1. **文書証跡 (直接引用)**: docs/backend-spec.md §2.2 (コアドメイン — 公開基盤、既存確定・不変) は `users` (id, tenant_id, idp_subject, email, name, department, salary, role(`provider-admin/workspace-admin/member`), status, last_login_at) と `session_revocations` (tenant_id PK, revoked_at) の両テーブルを、feat-domain-model-db の write_scope である `packages/db/schema/core/` 配下のコアドメイン 18 テーブルの一部として定義している。`.dev-graph/plans/feature-package-feat-domain-model-db/task-specs/phase-02-architecture.md` は既に「feat-domain-model-db が users テーブルおよびコアドメイン 18 テーブル全ての owner である」ことを 3 系統の証跡 (文書証跡・write_scope の構造的制約・アクセス制御責務の分離) とともに architecture decision として確定済みであり、session_revocations もこの 18 テーブルに含まれる (同 task の背景節「コアドメイン 18 テーブルの確定」に列挙済み)。
2. **write_scope の構造的制約**: team-lead 指示および本 feature の write_scope (apps/hub/src/ の feature 固有配下・packages/schemas/auth-tenancy/・docs/features/feat-auth-tenancy/) は `packages/db/schema/` 配下を明示的に不可侵と定める。単一 migration 系統 (feat-domain-model-db の quality_constraints: single-migration-pipeline-drizzle-repository-package) の下で、1 つの CREATE TABLE 文を複数 feature の write_scope にまたがって所有する仕組みは exact-13 契約に定義されていない。
3. **責務分離の整合**: 「誰が列を定義するか (スキーマ owner)」と「誰が読み書きロジックを実装するか (利用ロジック owner)」は別責務である。本 feature は認可ミドルウェア・auth adapter・Device Flow の実装者として、feat-domain-model-db が提供するリポジトリ層関数 (`session_revocations` の `read(tenant_id)`、`users` の `findByIdpSubject(tenant_id, idp_subject)` 等、いずれも feat-domain-model-db の P05 実装物) を**消費**する。本 feature は `packages/db/schema/core/` へ列追加・変更を一切行わない。

以上により、**session_revocations テーブルおよび users テーブルのスキーマ定義 (列・制約・migration) は feat-domain-model-db が唯一の owner であり、本 feature はその利用 (書込/参照ロジック) と認可ミドルウェア・auth adapter・Device Flow 実装のみを所有する consumer である** ことを確定する。本 feature が Device Flow で必要とする `publisher_tokens` / `device_authorizations` テーブルも同様に feat-domain-model-db が owner であり (docs/backend-spec.md §2.2)、本 feature はこれらのリポジトリ層関数の消費者として振る舞う。

### Architecture decision: role 4 種と users.role 列 3 値の分割線

docs/backend-spec.md §2.2 の `users` テーブル定義は role 列を `provider-admin/workspace-admin/member` の **3 値**とし、「owner は role 列ではなく `projects.owner_user_id` による関係 role (qa-005 の 4 role は認可判定時に合成)」と明記する。したがって、本 feature の認可ミドルウェアは (a) `users.role` (DB 保存値、3 値) と (b) 判定対象リソースに紐づく `projects.owner_user_id` の一致有無、の 2 情報から**実効 role** (member/owner/workspace-admin/provider-admin の 4 値、member, owner, workspace-admin, provider-admin の順に権限が強くなる単調な全順序) を都度合成する。owner は DB 上の恒久的な role ではなく「当該 Project に対してのみ有効な relational role」であるため、認可マトリクス (docs/backend-spec.md §3.3) の owner 列は「対象 Project」という注記付きで単調性を保つ。この合成ロジックは単一ミドルウェア内に閉じ、認可判定を複数箇所に散在させない (qa-020)。

### Auth.js adapter 境界設計 (D3 caveat)

Auth.js への直接依存は `apps/hub/src/lib/auth/adapter/` に閉じ、上位レイヤー (Route Handlers、認可ミドルウェア、UI) は Auth.js 固有の型・API を直接 import しない。adapter は (1) テナント別 OIDC provider 設定の動的解決 (`resolveTenantOidcConfig(tenant_slug) -> {issuer, client_id, ...}`、idp_connections テーブル [feat-domain-model-db owner] を参照)、(2) JWT callback (session claims: sub/tenant_id/role/status/iat/exp の最小集合を構成)、(3) OIDC 検証契約の実装 (issuer/aud 厳密一致、nonce/state、PKCE S256、email_verified=true のみ受理、JIT provisioning は role=member/status=active で自動昇格しない) を提供する内部インタフェースとして設計する。Auth.js のセキュリティ修正停止を Better Auth への移行トリガーとし、adapter 境界の交換のみで移行が完結する設計とする (Better Auth の移行ガイド成熟度は実装着手時に再確認する)。

### 単一認可ミドルウェア設計

`apps/hub/src/middleware/authorize.ts` (仮称) に認可判定を集約する単一ミドルウェアを設計する。判定は deny-by-default とし、(1) JWT cookie から claims (sub/tenant_id/role/status/iat) を取得、(2) session_revocations (KV/メモリキャッシュ TTL 60 秒経由) を参照し `iat` が `revoked_at` より前なら拒否、(3) リソースの tenant_id/workspace_id と claims.tenant_id の一致を強制 (row-level scope, D4)、(4) 対象リソースが Project 関連の場合 `projects.owner_user_id` との一致で owner 合成、(5) 認可マトリクス (docs/backend-spec.md §3.3) に基づき許可判定、の順で実行する。この表は単調でなければならず (member, owner, workspace-admin, provider-admin の順に権限が強くなる)、非単調な行を追加すると P09/P10 の検査で fail する。

### OAuth Device Authorization Flow 設計 (RFC 8628, qa-008)

docs/backend-spec.md §4.1 のエンドポイント一覧 (`POST /api/v1/device/code`, `POST /api/v1/device/token`, `POST /api/v1/device/approve`, `POST /api/v1/token/refresh`, `GET /api/v1/tokens`, `DELETE /api/v1/tokens/:id`) を `apps/hub/src/app/api/v1/device/` および `apps/hub/src/app/api/v1/token(s)/` 配下の Route Handlers として設計する。device_code TTL 10 分・user_code 8 文字 Crockford Base32 (5 回失敗で denied)・polling interval 5 秒・access token 15 分・refresh token 90 日 rotation + 再利用検知 (家族全失効) を数値契約として確定する。access/refresh token は `device_authorizations`/`publisher_tokens` (いずれも feat-domain-model-db owner) のリポジトリ層関数を通じて発行・検証する。Publisher/CLI 側の OS 資格情報域 (macOS Keychain / Windows Credential Manager) への保存は Publisher 実装 (別 feature) の責務であり、本 feature は token 発行・検証・失効 API のみを提供する。

### session 管理設計 (JWT + session_revocations)

Web セッションは Auth.js の JWT strategy を用い、cookie 名 `__Host-harness-hub.session` (HttpOnly/Secure/SameSite=Lax)、maxAge 8 時間、updateAge 15 分とする。role/status 変更は updateAge ごとの再発行時に jwt callback で DB 再読込され、最大 15 分の反映遅延を許容する。緊急失効 (退職・侵害) は session_revocations (feat-domain-model-db owner、tenant_id PK/revoked_at) を認可ミドルウェアが KV/メモリキャッシュ (TTL 60 秒) 経由で参照し、`JWT.iat` が `revoked_at` より前のトークンを即時拒否する設計とする。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-auth-tenancy, arch-harness-hub-security, arch-harness-hub-backend
- Entry gate: goal-spec.json の feature_context_digest が sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5 に一致し、confirmation_status=confirmed であること。加えて P01 の docs/features/feat-auth-tenancy/requirements-baseline.md が存在すること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: N/A: 本 feature はログイン UI 自体を新設しない (S07 テナント解決→IdP redirect の既存確定を踏襲。adapter 実装のみ)
- Backend: applicable + change: apps/hub/src/lib/auth (adapter)・apps/hub/src/middleware (認可)・apps/hub/src/app/api/v1/device・token(s) (Device Flow) のアーキテクチャを確定する (実装は P05)
- API: applicable + change: Device Flow エンドポイント (6 経路) と GET/POST /api/auth/[...nextauth] の契約を確定する
- Data: N/A: session_revocations/users/publisher_tokens/device_authorizations は feat-domain-model-db が owner。本 feature はリポジトリ層関数の消費契約のみを確定する
- Infrastructure: N/A: 新規インフラのプロビジョニングは行わない (既存の feat-hub-foundation 基盤・feat-domain-model-db の DB を利用)
- Security: applicable + change: role 4 種の単調な認可マトリクス設計・OIDC 検証契約・session 数値契約・緊急失効参照方式を確定する
- Quality: applicable + change: role 列 3 値と role 4 種概念の分割線を architecture decision として確定し quality_constraints の P02 必須解消事項を解消する
- Documentation: applicable + change: docs/features/feat-auth-tenancy/architecture-decision-record.md を新規作成する
- Operations: N/A: 運用手順の具体化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-security, arch-harness-hub-backend (D3/D4/I7/I8/G4, qa-005/qa-006/qa-008/qa-020/qa-036 を踏襲し、本 task で session_revocations/users スキーマ owner の architecture decision と role 3 値/4 値の分割線を追加する)
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: N/A: 本 task は設計確定のみで、packages/db/schema/ への変更を一切伴わない (不可侵)

## 成果物

- Produced artifacts: docs/features/feat-auth-tenancy/architecture-decision-record.md (Auth.js adapter 境界設計、単一認可ミドルウェア設計、Device Flow エンドポイント設計、session 管理設計、session_revocations/users スキーマ owner の architecture decision、role 3 値/4 値分割線の architecture decision を含む)
- Consumed artifacts: docs/features/feat-auth-tenancy/requirements-baseline.md, docs/backend-spec.md, system-spec/spec-state.json, .dev-graph/plans/feature-package-feat-domain-model-db/task-specs/phase-02-architecture.md
- Write scope/touches: docs/features/feat-auth-tenancy/architecture-decision-record.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-auth-tenancy-p02) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-auth-tenancy-p02 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-auth-tenancy-p02) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-AUTH-TENANCY-P01]。resource_scope (docs/features/feat-auth-tenancy/architecture-decision-record.md) は他 task と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- session_revocations/users/publisher_tokens/device_authorizations のスキーマ定義自体 (owner=feat-domain-model-db。本 feature はリポジトリ層関数の利用契約のみを確定する)
- 承認キュー/監査 UI (owner=feat-workspace-governance、Stage 2)
- PII ガード適用/係数管理 (owner=feat-user-org-admin)
- publish 状態機械 (owner=feat-publish-pipeline)
- 実装コード自体の作成 (apps/hub への実コード投入は P05)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: docs/features/feat-auth-tenancy/architecture-decision-record.md に (1) session_revocations/users スキーマ owner の architecture decision が 3 系統の証跡とともに明記されていること、(2) role 3 値/4 値分割線の architecture decision が明記されていること、(3) Auth.js adapter 境界・単一認可ミドルウェア・Device Flow・session 管理の各設計が記載されていること、の 3 点が確認できること

## Rollout and rollback

- Rollout: architecture-decision-record.md を作成し、P01 の requirements-baseline.md との整合を確認してから P03 (独立設計レビュー) へ引き継ぐ
- Rollback trigger and steps: feat-domain-model-db 側の write_scope が今後変更され本 architecture decision の前提 (session_revocations/users のスキーマ非重複) が崩れた場合、本 task の architecture decision を re-open し P02 を再実行する。再実行までは P03 以降の着手を保留する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-auth-tenancy.context.json` (`sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5`)
- Phase responsibility: 現行 architecture_refs と全 scope を実装境界・deploy unit・owner に割り当てる。
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

This section is normative for P02 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

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
- Detailed authoritative source: docs/backend-spec.md §1 (コード構造規約), §2.2 (users/session_revocations/publisher_tokens/device_authorizations 定義), §3.2 (認証 2 系統・数値契約), §3.3 (認可マトリクス), §4.1 (Device Flow エンドポイント)
- Architecture: arch-harness-hub-security, arch-harness-hub-backend
- Feature: feat-auth-tenancy
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-AUTH-TENANCY-P01
