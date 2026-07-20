# System task overlay: テストファースト設計 — tenant 分離・role 4 種認可・Device Flow・OIDC 検証契約・session 失効

## Machine-readable registration fields

- feature_package_id: feature-package/feat-auth-tenancy (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-auth-tenancy", "macro-feature", "security", "test-design"]
- related_nodes: ["feat-auth-tenancy", "arch-harness-hub-security", "arch-harness-hub-backend"]
- parent_feature: feat-auth-tenancy
- phase_ref: P04
- classification: confidence=0.87, reason="goal-spec の acceptance 3 件・quality_constraints 7 件を検証可能なテストケースへ写像するテストファースト設計 P04 タスク", candidates=[{artifact_kind: task, confidence: 0.87, candidate_path: tasks/feat-auth-tenancy/sys-auth-tenancy-p04.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P02/P03 で確定したアーキテクチャに基づき、実装 (P05) に先立ってテストケースを設計する。goal-spec の acceptance 3 件と quality_constraints 7 件のすべてを自動化可能なテストケースへ写像し、test-design.md として記録する。

## 背景

quality_constraints からテストケースを以下のとおり導出する。(1) tenant-oidc-dynamic-resolution-authjs-d3-qa005: `/{tenant_slug}/signin` で異なる tenant_slug を指定した場合に異なる OIDC provider 設定 (issuer/client_id) が解決されることを確認する結合テスト、および issuer/aud 不一致・nonce/state 欠落・PKCE 未使用リクエストが拒否されることを確認する OIDC 検証契約テスト。(2) role4-authorization-matrix-single-middleware-deny-by-default-sec2: role 4 種 (provider-admin/workspace-admin/owner/member) それぞれについて docs/backend-spec.md §3.3 の認可マトリクス全行を網羅する単体テスト (許可/拒否の両方を含む)、マトリクスに存在しない組み合わせがデフォルト拒否されることを確認する deny-by-default テスト、および認可判定が単一ミドルウェア以外に実装されていないことを確認する CI grep 検査。(3) device-flow-os-credential-token-revocation-qa008: RFC 8628 準拠の Device Flow E2E (device code 発行→user_code 入力→approve→token 交換→API 呼び出し成功) テスト、device_code TTL 10 分超過での失効テスト、user_code 5 回失敗での denied 遷移テスト、refresh token 再利用検知での家族全失効テスト。(4) auth-adapter-boundary-better-auth-migration-hedge-d3-qa020: `apps/hub/src/lib/auth/adapter/` 以外から Auth.js 固有 API が直接 import されていないことを確認する CI grep 検査。(5) tenant-workspace-row-level-scope-isolation-test-ci-d4: 2 tenant 同時稼働状態で異なる tenant のリクエストコンテキストから他 tenant の行が取得できないことを確認する分離テスト (CI 必須ゲート)。(6) no-hub-native-account-idp-delegation-i7: Hub 固有アカウント (パスワード保存等) が存在しないことを確認する静的検査、dev 専用 provider (Credentials/mock login/SKIP_AUTH 等の文字列) がコードに存在しないことを確認する CI grep 検査。(7) session-jwt-staleness-emergency-revocation-qa036: session_revocations に revoked_at を設定した場合に `iat` が `revoked_at` より前の既存 JWT が即時拒否されることを確認する緊急失効テスト、maxAge 8 時間/updateAge 15 分の数値契約テスト。

goal-spec の acceptance 3 件は (a) テナント越境アクセスが分離テストで 0 件であることの検証、(b) Device Flow の E2E (承認→token→失効) が成功することの検証、(c) Auth.js 依存が adapter 境界に隔離されていることの静的検査、として上記テストケース群のうち (5)/(3)/(4) がそれぞれ直接対応する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-auth-tenancy, arch-harness-hub-security, arch-harness-hub-backend
- Entry gate: goal-spec.json の feature_context_digest が sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5 に一致し、confirmation_status=confirmed であること。P03 の docs/features/feat-auth-tenancy/design-review-notes.md が承認判定を含むこと
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: N/A: 本 task はログイン UI 自体のテストを含まない (adapter/middleware/API のテスト設計に限定)
- Backend: applicable + change: apps/hub/src/lib/auth・apps/hub/src/middleware に対するテストケースを設計する
- API: applicable + change: Device Flow エンドポイント 6 経路の契約テストを設計する
- Data: N/A: session_revocations/users 等のスキーマテストは feat-domain-model-db の責務。本 feature はリポジトリ層関数の呼び出し結果に対するテストのみ設計する
- Infrastructure: N/A: 新規インフラ変更なし
- Security: applicable + change: OIDC 検証契約・role 4 種認可マトリクス・deny-by-default・session 緊急失効・dev 専用 provider 非存在検査のテストケースを設計する
- Quality: applicable + change: goal-spec acceptance 3 件と quality_constraints 7 件の全件をテストケースへ写像する
- Documentation: applicable + change: docs/features/feat-auth-tenancy/test-design.md を新規作成する
- Operations: N/A: 運用手順は本 task の対象外

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-security, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: N/A: 本 task はテスト設計のみで実装を伴わない

## 成果物

- Produced artifacts: docs/features/feat-auth-tenancy/test-design.md (quality_constraints 7 件 + acceptance 3 件をテストケースへ写像した一覧、テスト種別 [単体/結合/CI ゲート] とテストダブル方針を含む)
- Consumed artifacts: docs/features/feat-auth-tenancy/architecture-decision-record.md, docs/features/feat-auth-tenancy/design-review-notes.md, docs/backend-spec.md §3.3, §4.1
- Write scope/touches: docs/features/feat-auth-tenancy/test-design.md, apps/hub/src/__tests__/auth-tenancy/ (テストファイルの雛形配置。実装内容は含めず構造のみ)

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-auth-tenancy-p04) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-auth-tenancy-p04 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-auth-tenancy-p04) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-AUTH-TENANCY-P03]。resource_scope (docs/features/feat-auth-tenancy/test-design.md, apps/hub/src/__tests__/auth-tenancy/) は他 task と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- テストの実装コード自体 (テストダブルやアサーションの記述は P05/P06 で行う。本 task はテストケース一覧と雛形配置のみ)
- session_revocations/users スキーマ自体のテスト (owner=feat-domain-model-db が自身の P04 で設計する)
- Publisher/CLI 側の OS 資格情報域保存のテスト設計 (owner=Publisher 実装 feature)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: docs/features/feat-auth-tenancy/test-design.md に quality_constraints 7 件 + acceptance 3 件それぞれに対応するテストケースが最低 1 件ずつ記載されていること. Normative evidence: P04/P06 は server-side Device Flow と downstream token contract を別 test ID に分け、P10/P11 は auth 自身の証跡と publisher consumer evidence reference を混同せず記録する。

## Rollout and rollback

- Rollout: test-design.md を作成し、全 quality_constraints/acceptance のカバレッジを確認してから P05 (実装) へ引き継ぐ
- Rollback trigger and steps: quality_constraints のいずれかがテストケースへ写像できないと判明した場合、P02/P03 への差し戻しを記録し設計を見直す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-auth-tenancy.context.json` (`sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5`)
- Phase responsibility: 全 acceptance と品質制約を実装前のテストケースへ写像する。
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

This section is normative for P04 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

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
- Detailed authoritative source: docs/backend-spec.md §3.2, §3.3, §4.1
- Architecture: arch-harness-hub-security, arch-harness-hub-backend
- Feature: feat-auth-tenancy
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-AUTH-TENANCY-P03
