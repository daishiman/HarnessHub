# System task overlay: 認証・マルチテナント基盤 (Auth.js OIDC + row-level scope + Device Flow) 要件ベースライン確定

## Machine-readable registration fields

- feature_package_id: feature-package/feat-auth-tenancy (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-auth-tenancy", "macro-feature", "security", "requirements-baseline"]
- related_nodes: ["feat-auth-tenancy", "arch-harness-hub-security", "arch-harness-hub-backend"]
- parent_feature: feat-auth-tenancy
- phase_ref: P01
- classification: confidence=0.91, reason="goal-spec (.dev-graph/staging/goal-spec.json) と features/feat-auth-tenancy.md の purpose/goal/scope/acceptance/quality_constraints を要件ベースラインへ確定転記する P01 タスク", candidates=[{artifact_kind: task, confidence: 0.91, candidate_path: tasks/feat-auth-tenancy/sys-auth-tenancy-p01.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

feat-auth-tenancy の受入可能な要件ベースラインを確定し、以降の P02 以降の全 task が同一の合意事項 (Auth.js テナント別 OIDC 動的解決の adapter 境界隔離、role 4 種の単一ミドルウェア認可、OAuth Device Authorization Flow + OS 資格情報域保存、JWT stateless session + session_revocations 緊急失効、tenant/workspace row-level scope 強制) を参照できる状態にする。この task 完了時点で、goal-spec の purpose/goal/scope_in 5 件/scope_out 2 件/acceptance 3 件/quality_constraints 7 件が machine-verifiable な baseline 文書として固定される。

## 背景

Harness Hub の認証・認可基盤は Auth.js (旧 NextAuth) + テナント別 OIDC を採用し、Tenant ごとに顧客既存 IdP (Google Workspace / Microsoft Entra ID) の OIDC 設定を動的解決する (system-spec/spec-state.json qa-005、system-spec/00-requirements-definition.md D3 confirmed)。Hub 独自のアカウント基盤・パスワード保存は作らず、マルチ Workspace 論理分離と顧客既存 IdP/SSO への認証委譲を行う (I7)。role は provider-admin/workspace-admin/owner/member の 4 種とし、実効 role を全順序 (member, owner, workspace-admin, provider-admin の順に権限が強くなる単調な全順序) の単一値として扱う単調な認可マトリクスを単一ミドルウェアで判定する (deny-by-default, SEC2, docs/backend-spec.md §3.3)。Publisher/CLI/AI worker は OAuth Device Authorization Flow (RFC 8628 準拠) で認証し、短命 access token (15 分) + refresh token (90 日 rotation + 再利用検知) を OS の資格情報域 (macOS Keychain / Windows Credential Manager) に保存する (qa-008、docs/backend-spec.md §4.1)。Web セッションは JWT (stateless) で maxAge 8 時間 / updateAge 15 分とし、role/status 変更の反映が最大 15 分遅延することを許容する一方、緊急失効 (退職・侵害) は session_revocations テーブルにより即時とする (qa-036)。マルチテナント論理分離は row-level-scope 方式 (単一 DB + tenant_id/workspace_id スコープ列 + アプリ層強制) を D4 が確定しており、全 API で Tenant/Workspace スコープを強制し分離テストを CI 必須とする。Auth.js への依存は adapter 境界に閉じ、Auth.js が Better Auth 傘下入りを公式告知していることへの移行に備える (D3 caveat、qa-020)。

本 task は上記の確定要件を再解釈や欠落なく baseline 化するとともに、goal-spec の quality_constraints には含まれない **cross-feature 境界の未確定事項** を上流未解決事項として本 baseline に明記し、P02 の必須解消事項として引き継ぐ。具体的には、session_revocations テーブルおよび users テーブルの**スキーマ定義**は feat-domain-model-db が packages/db/schema/core/ で所有する既存確定 (`.dev-graph/plans/feature-package-feat-domain-model-db/task-specs/phase-02-architecture.md` の architecture decision) であり、本 feature はこれらのテーブルへの**利用 (書込/参照ロジック)** と認可ミドルウェア・auth adapter・Device Flow の実装のみを所有する consumer である。加えて、docs/backend-spec.md §2.2 の `users` テーブル定義は role 列を `provider-admin/workspace-admin/member` の 3 値としており、goal-spec/features/feat-auth-tenancy.md が要求する 4 種の role (owner を含む) との差分は「owner は role 列ではなく `projects.owner_user_id` による関係 role であり、認可判定時に合成される」という設計上の分割線が存在する。この分割線の確定は P02 の architecture decision として引き継ぐ。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-auth-tenancy, arch-harness-hub-security, arch-harness-hub-backend
- Entry gate: .dev-graph/staging/goal-spec.json の feature_context_digest が sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5 に一致し、features/feat-auth-tenancy.md の confirmation_status が confirmed であること。evaluation_status は本 task package 生成時点で pending であり、system-dev-plan-evaluator による C12 PASS 判定と C11 promotion を経て解決する
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は要件文書化のみで frontend 実装物を変更しない (ログイン画面自体は S07 の既存確定を踏襲し、本 feature は IdP redirect の adapter 側のみを扱う)
- Backend: N/A: 本 task は要件文書化のみで backend 実装物 (apps/hub/src/lib/auth 等) を変更しない
- API: N/A: Device Flow エンドポイント (POST /api/v1/device/code 等) の契約詳細は P02 で定義する。本 task は要件記述のみ
- Data: N/A: session_revocations/users テーブルは feat-domain-model-db が owner であり、本 feature はスキーマを変更しない。利用ロジックの詳細設計は P02 で行う
- Infrastructure: N/A: デプロイ単位・CI/CD は feat-hub-foundation が既に確立しており、本 feature は追加インフラを新設しない
- Security: applicable + change: tenant-oidc-dynamic-resolution-authjs-d3-qa005・role4-authorization-matrix-single-middleware-deny-by-default-sec2・device-flow-os-credential-token-revocation-qa008・auth-adapter-boundary-better-auth-migration-hedge-d3-qa020・tenant-workspace-row-level-scope-isolation-test-ci-d4・no-hub-native-account-idp-delegation-i7・session-jwt-staleness-emergency-revocation-qa036 の 7 件の quality_constraints を要件ベースラインへ確定記述する
- Quality: applicable + change: goal-spec acceptance 3 件と quality_constraints 7 件を machine-verifiable な受入基準として requirements-baseline.md に固定する。role 列 3 値と概念上の role 4 種の分割線を P02 必須解消事項として明記する
- Documentation: applicable + change: docs/features/feat-auth-tenancy/requirements-baseline.md を新規作成する
- Operations: N/A: token 失効導線・session_revocations 運用の具体化は P12 で行う。本 task は要件確定のみ

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-security, arch-harness-hub-backend (features/feat-auth-tenancy.md architecture_refs の正本参照。D3/D4/I7/I8/G4 と qa-005/qa-006/qa-008/qa-020/qa-036 を含む)
- Deploy unit/environment: cloudflare-workers/hub (apps/hub は Hub Worker にバンドルされる。本 task は要件確定のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は要件確定のみで実コードへの変更を伴わない (実変更は P05 で扱う)

## 成果物

- Produced artifacts: docs/features/feat-auth-tenancy/requirements-baseline.md (要件ベースライン文書。purpose/goal/scope_in 5 件/scope_out 2 件/acceptance 3 件/quality_constraints 7 件の確定転記、および role 列 3 値と role 4 種概念の分割線・session_revocations/users スキーマ所有権の cross-feature 境界を P02 必須解消事項として明記した記載を含む)
- Consumed artifacts: .dev-graph/staging/goal-spec.json, features/feat-auth-tenancy.md, features/feat-auth-tenancy.context.json, system-spec/00-requirements-definition.md, system-spec/spec-state.json, docs/backend-spec.md, .dev-graph/plans/feature-package-feat-domain-model-db/task-specs/phase-02-architecture.md
- Write scope/touches: docs/features/feat-auth-tenancy/requirements-baseline.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-auth-tenancy-p01) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-auth-tenancy-p01 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-auth-tenancy-p01) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on が空のため他 task との着手順序制約はない。resource_scope (docs/features/feat-auth-tenancy/requirements-baseline.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- コアドメインスキーマ定義 (owner=feat-domain-model-db。users/session_revocations 含む全テーブルの列定義)
- 承認キュー/監査 UI (owner=feat-workspace-governance、Stage 2)
- PII ガード適用/係数管理 (owner=feat-user-org-admin)
- publish 状態機械 (owner=feat-publish-pipeline)
- 実装コードの作成 (本 task は要件確定のみ)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: docs/features/feat-auth-tenancy/requirements-baseline.md に goal-spec acceptance 3 件と quality_constraints 7 件 (tenant-oidc-dynamic-resolution-authjs-d3-qa005, role4-authorization-matrix-single-middleware-deny-by-default-sec2, device-flow-os-credential-token-revocation-qa008, auth-adapter-boundary-better-auth-migration-hedge-d3-qa020, tenant-workspace-row-level-scope-isolation-test-ci-d4, no-hub-native-account-idp-delegation-i7, session-jwt-staleness-emergency-revocation-qa036) が過不足なく転記されていること

## Rollout and rollback

- Rollout: requirements-baseline.md を作成し、feature-package.json の source_feature_digest と一致することを確認してから P02 へ引き継ぐ
- Rollback trigger and steps: goal-spec と features/feat-auth-tenancy.md の内容不一致が判明した場合、requirements-baseline.md を作成前状態 (ファイル未作成) に戻し、goal-spec 側の再確定を dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/00-requirements-definition.md (D3, D4, I7, I8, G4), system-spec/spec-state.json qa_log (qa-005, qa-006, qa-008, qa-020, qa-036)
- Detailed authoritative source: docs/backend-spec.md (§1 コード構造規約, §2.2 session_revocations/users, §3.2 認証 2 系統, §3.3 認可マトリクス, §4.1 Device Flow エンドポイント)
- Architecture: arch-harness-hub-security (architecture/harness-hub-security.md), arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-auth-tenancy
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: なし (P01 は本 package の起点 task)
