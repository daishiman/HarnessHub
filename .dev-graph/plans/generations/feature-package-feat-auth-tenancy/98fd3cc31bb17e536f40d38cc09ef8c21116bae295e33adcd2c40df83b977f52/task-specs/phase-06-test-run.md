# System task overlay: テスト実行 — tenant 分離・role 4 種認可・Device Flow・OIDC 検証契約・session 失効

## Machine-readable registration fields

- feature_package_id: feature-package/feat-auth-tenancy (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-auth-tenancy", "macro-feature", "security", "test-execution"]
- related_nodes: ["feat-auth-tenancy", "arch-harness-hub-security", "arch-harness-hub-backend"]
- parent_feature: feat-auth-tenancy
- phase_ref: P06
- classification: confidence=0.87, reason="P04 で設計したテストケースを P05 の実装に対して実行し結果を記録する P06 タスク", candidates=[{artifact_kind: task, confidence: 0.87, candidate_path: tasks/feat-auth-tenancy/sys-auth-tenancy-p06.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P04 の test-design.md に列挙された全テストケースを P05 の実装に対して実行し、結果 (pass/fail・カバレッジ・失敗時の是正記録) を test-run-results.md に記録する。

## 背景

goal-spec の quality_constraints 7 件と acceptance 3 件はいずれも実行可能なテストとして検証されなければ受入判定 (P07) に進めない。特にテナント分離テスト (2 tenant 同時稼働状態での他 tenant 行の非到達性、CI 必須ゲート)、Device Flow E2E テスト (承認→token→失効)、Auth.js adapter 境界の静的検査は goal-spec の acceptance 3 件に直接対応するため優先的に実行し、失敗があれば P05 へ差し戻す。role 4 種認可マトリクスの全行網羅テストと deny-by-default テストは docs/backend-spec.md §3.3 の 18 行を漏れなくカバーしていることを確認する。OIDC 検証契約テスト (issuer/aud 不一致・nonce/state 欠落・PKCE 未使用の拒否確認) と session 緊急失効テストは security workstream の中核的な正当性証明として実行する。dev 専用 provider 非存在の CI grep 検査は本番/開発環境の認証経路一致を保証するため必須ゲートとして扱う。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-auth-tenancy, arch-harness-hub-security, arch-harness-hub-backend
- Entry gate: goal-spec.json の feature_context_digest が sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5 に一致し、confirmation_status=confirmed であること。P05 の apps/hub 実装が存在すること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: applicable + change: apps/hub/src/app/[tenant_slug]/signin/ のログイン導線テストを実行する
- Backend: applicable + change: apps/hub/src/lib/auth・apps/hub/src/lib/authz に対するテストを実行する
- API: applicable + change: Device Flow API 6 経路の契約テストを実行する
- Data: N/A: スキーマテストは feat-domain-model-db の責務。本 feature はリポジトリ層関数呼び出し結果に対するテストのみ実行する
- Infrastructure: N/A: 新規インフラ変更なし
- Security: applicable + change: OIDC 検証契約・role 4 種認可マトリクス・deny-by-default・session 緊急失効・dev 専用 provider 非存在検査を実行する
- Quality: applicable + change: quality_constraints 7 件 + acceptance 3 件のテスト結果を記録する
- Documentation: applicable + change: docs/features/feat-auth-tenancy/test-run-results.md を新規作成する
- Operations: N/A: 運用手順の検証は本 task の対象外 (P12 で扱う)

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-security, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: N/A: 本 task はテスト実行のみ

## 成果物

- Produced artifacts: docs/features/feat-auth-tenancy/test-run-results.md (P04 の全テストケースに対する実行結果、失敗時の是正記録を含む)
- Consumed artifacts: docs/features/feat-auth-tenancy/test-design.md, apps/hub/src/__tests__/auth-tenancy/, apps/hub/src/lib/auth/, apps/hub/src/lib/authz/, apps/hub/src/app/api/v1/device/, apps/hub/src/app/api/v1/token(s)/
- Write scope/touches: docs/features/feat-auth-tenancy/test-run-results.md, apps/hub/src/__tests__/auth-tenancy/ (実行に伴うテストコード補完)

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-auth-tenancy-p06) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-auth-tenancy-p06 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-auth-tenancy-p06) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-AUTH-TENANCY-P05]。resource_scope (docs/features/feat-auth-tenancy/test-run-results.md, apps/hub/src/__tests__/auth-tenancy/) は他 task と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- テスト失敗の恒久修正 (再実装が必要な場合は P05 へ差し戻し、本 task は結果記録と差し戻し判断のみ)
- session_revocations/users スキーマ自体のテスト実行 (owner=feat-domain-model-db が自身の P06 で実行する)
- Publisher/CLI 側の OS 資格情報域保存のテスト実行 (owner=Publisher 実装 feature)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: docs/features/feat-auth-tenancy/test-run-results.md に P04 の全テストケースの実行結果 (pass/fail) が記録され、fail が残っていないこと. Normative evidence: P04/P06 は server-side Device Flow と downstream token contract を別 test ID に分け、P10/P11 は auth 自身の証跡と publisher consumer evidence reference を混同せず記録する。

## Rollout and rollback

- Rollout: test-run-results.md で全テストケースが pass したことを確認してから P07 (受入) へ引き継ぐ
- Rollback trigger and steps: いずれかのテストケースが fail した場合、P05 へ差し戻し実装を修正したうえで本 task を再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-auth-tenancy.context.json` (`sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5`)
- Phase responsibility: P05 の実装に対して P04 の全テストを実行し、再現可能な結果を残す。
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

This section is normative for P06 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

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
- Dependencies: SYS-AUTH-TENANCY-P05
