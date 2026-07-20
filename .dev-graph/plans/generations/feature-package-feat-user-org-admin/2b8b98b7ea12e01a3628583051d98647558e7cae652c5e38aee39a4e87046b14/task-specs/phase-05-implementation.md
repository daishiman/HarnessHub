# System task overlay: 実装 — S17/S18 画面, User拡張/TenantCoefficient API, PIIガード適用, 通知ディスパッチ接続

## Machine-readable registration fields

- feature_package_id: feature-package/feat-user-org-admin (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-user-org-admin", "studio-extension", "security", "implementation"]
- related_nodes: ["feat-user-org-admin", "arch-harness-hub-security", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
- parent_feature: feat-user-org-admin
- phase_ref: P05
- classification: confidence=0.9, reason="P02 承認設計と P04 テスト設計に基づき S17/S18・User拡張/TenantCoefficient・PIIガード・通知ディスパッチ接続を実装する P05 タスク", candidates=[{artifact_kind: task, confidence: 0.9, candidate_path: tasks/feat-user-org-admin/sys-user-org-admin-p05.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P02 承認設計と P04 テスト設計に基づき、S17 (ユーザー管理+個別ダッシュボード)・S18 (アカウント設定) の画面、User拡張/TenantCoefficient の API とスキーマ、PII ガードの適用、通知ディスパッチ共通層への接続を実装する。

## 背景

B10 (qa-023) はユーザー管理の backend 実装として role 4 種統合・係数設定・PII ガード具備を求めており、B8 (qa-023) は通知ディスパッチを アプリ内通知を正本としメールは共通層経由の Resend Free 送信と定める。本 task はこれらを実コードへ落とし込む。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-user-org-admin, sys-user-org-admin-p04
- Entry gate: docs/features/feat-user-org-admin/test-design.md が P04 で作成済みであり、テストスタブが揃っていること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: applicable + change: apps/hub/src/app/(dashboard)/users/ (S17) と apps/hub/src/app/(dashboard)/account/ (S18) の画面を実装し、共通 UI (KPI カード/チャート、フォーム部品、状態チップ) を再利用する
- Backend: applicable + change: apps/hub/src/features/user-org-admin/ 配下に role 認可・PII ガード適用・通知ディスパッチ共通層呼び出し・監査 event 記録を行う API ハンドラを実装する
- API: applicable + change: packages/schemas/user-org-admin/ に zod schemas を追加し、単一ソースとして API 入出力を検証する (qa-009)
- Data: applicable + change: packages/db/schema/user-org-admin/ に TenantCoefficient テーブルと User 拡張列 (department/salary) の Drizzle スキーマを実装する。tenant_id/workspace_id スコープ列を必須とする (D4)
- Infrastructure: N/A: feat-hub-foundation が確立済みの apps/hub Worker・CI/CD 上に実装を追加するのみで、新規デプロイ単位・CI 設定ファイルは作成しない
- Security: applicable + change: salary を admin 限定表示・一般 API 非公開・export マスクで扱う PII ガードを適用し (SEC4)、role 4 種 (qa-005) に基づく認可を全 API に適用する (SEC2)。通知ディスパッチは env-binding API key のみを使用しテナント内宛先限定・PII 非混入を守る (SEC9)
- Quality: applicable + change: axe 自動チェックが CI 上で S17/S18 に適用されるようテストを実装物に組み込む
- Documentation: N/A: 実装コードのドキュメント化は P12 で行う。本 task は実装のみ
- Operations: N/A: 運用手順の具体化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-security, arch-harness-hub-backend, arch-harness-hub-frontend
- Deploy unit/environment: cloudflare-workers/hub (feat-hub-foundation が確立した既存 Worker へ S17/S18 とその API を追加する)
- Compatibility/migration/backfill: User テーブルへの department/salary 列追加は既存行を破壊しない後方互換な列追加として実装する (P02 の設計に従う)。TenantCoefficient は新規テーブルであり既存データへの影響はない。実際の migration 適用と後方互換性の確認は P08 で行う

## 成果物

- Produced artifacts: apps/hub/src/app/(dashboard)/users/ (S17 実装), apps/hub/src/app/(dashboard)/account/ (S18 実装), apps/hub/src/features/user-org-admin/ (API ハンドラ・PII ガード適用・通知ディスパッチ接続・監査 event 記録), packages/schemas/user-org-admin/ (zod schemas), packages/db/schema/user-org-admin/ (TenantCoefficient・User 拡張列の Drizzle スキーマ), apps/hub/src/app/legal/, apps/hub/src/app/legal/__tests__/ (normative implementation artifacts)
- Consumed artifacts: docs/features/feat-user-org-admin/architecture-decision-record.md, docs/features/feat-user-org-admin/test-design.md, docs/shared-layers.md, packages/ui/, packages/schemas/, packages/db/
- Write scope/touches: apps/hub/src/app/(dashboard)/users/, apps/hub/src/app/(dashboard)/account/, apps/hub/src/features/user-org-admin/, packages/schemas/user-org-admin/, packages/db/schema/user-org-admin/, apps/hub/src/app/legal/, apps/hub/src/app/legal/__tests__/

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-user-org-admin-p05) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-user-org-admin-p05 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-user-org-admin-p05) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[sys-user-org-admin-p04] が完了するまで着手しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- PII ガード共通層・通知ディスパッチ共通層自体の実装変更 (feat-hub-foundation の write_scope。本 feature は共通層を呼び出すだけで再実装しない)
- Auth.js アダプタ・認可ミドルウェア自体の実装変更 (feat-auth-tenancy の write_scope)
- Tenant/Workspace/Project/TargetChannel/Release 等の既存中核エンティティ実装 (feat-domain-model-db の write_scope)
- 試算エンジン (annualHours・分/回・削減率を用いた実際の削減時間/削減額計算) の実装 (feat-metrics-tracking の scope)
- .github/workflows/ci.yml・wrangler.jsonc・pnpm-workspace.yaml 等の共有リポジトリ設定変更 (feat-hub-foundation の write_scope)

## Verification and evidence

- Automated commands: `pnpm install --frozen-lockfile`, `pnpm --filter hub build`, `pnpm --filter hub test`, `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: P04 のテストスタブが実装と接続され、salary 非露出・監査記録・axe a11y の 3 テストカテゴリがそれぞれ実行可能な状態になっている. Normative evidence: quality constraint 9 ID exact-set、current context digest、/legal role matrix、axe report、PII non-exposure、release smokeを必須とする。

## Rollout and rollback

- Rollout: 実装物を P06 (test-run) へ引き継ぐ
- Rollback trigger and steps: 実装が P02 設計と乖離した場合、乖離箇所を記録し P02 または P05 のどちらを修正するかを判断した上で dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-user-org-admin.context.json` (`sha256:4271086e4eacd8a7327ab3fc9b9e080b2d024ac66858b2a4965d0afbda33a265`)
- Phase responsibility: P04 を先行条件として現行 scope_in を実装し、scope_out を混入させない。
- Purpose: ユーザー管理 (S17) とアカウント設定 (S18) を提供し、role 管理 (qa-005 の 4 role と統合)・年収→時給換算の係数設定 (PII: admin 限定・API 非公開・export マスク = SEC4)・通知設定 (D6 Resend)・規約公開を確立する (I14)
- Goal: workspace-admin がユーザーの role・部門・年収係数を管理でき、salary が PII ガード (admin 限定表示・読取監査・export マスク) 下にあり、通知設定が通知ディスパッチ共通層と接続され、全利用者が規約・ポリシーを参照できる状態
- Scope in (all items are in-scope for the package; this phase owns the subset matching its responsibility):
- S17 ユーザー管理 + 個別ダッシュボード
- S18 アカウント設定 (プロフィール/通知/表示)
- S18 配下の /legal 規約・ポリシー静的ページ (全利用者が閲覧可能)
- User 拡張 (department/salary) + TenantCoefficient エンティティ
- PII ガード共通層 (salary の admin 限定・監査・export マスク)
- 通知設定と D6 (Resend) 通知ディスパッチの接続
- Scope out:
- 認証方式の変更 (D3 の IdP 委譲を維持。パスワード/2FA 自前実装は不採用)
- role 体系の再設計 (qa-005 の 4 role を維持)
- Acceptance (P04/P06/P07/P10/P11 must preserve exact coverage):
- salary が admin 以外の API/画面/export に露出しない (分離テスト + 監査記録)
- 係数変更が監査 event に記録される (SEC6)
- S17/S18 と /legal が axe 違反 0 で動作し、/legal は全利用者が閲覧できる
- Architecture/source refs:
- architecture/harness-hub-security.md
- architecture/harness-hub-backend.md
- architecture/harness-hub-frontend.md
- specs/harness-hub-system-specification.md

This section is the current source closure and supersedes older counts or wording in this task when they conflict with the pinned feature context.

## Current phase closure

- Required responsibility: S17/S18とともに /legal 規約・ポリシー静的ページを実装し、salary/係数情報を含めない。
- Dependency rule: this phase consumes only earlier P01..P04 outputs; later phase documentation or evidence is never an entry prerequisite.

## Normative implementation closure (2026-07-19)

This section is normative for P05 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-user-org-admin.context.json; docs/frontend-spec.md S17/S18//legal; docs/security-spec.md PII/a11y contracts
- Effective phase contract: 現行 quality_constraints は legal-static-page-all-users を含む9件である。P01で9 IDをexact-set転記し、P04/P06は/legalの全role access・非ログイン方針・静的内容・axe=0・salary/PII非露出を検証する。P07/P09/P10/P11は第3 acceptanceと第9制約を同じevidence IDで追跡し、P05で実装、P12で内容更新owner、P13でroute smokeを確認する。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `apps/hub/src/app/legal/`
- `apps/hub/src/app/legal/__tests__/`
- Mandatory evidence: quality constraint 9 ID exact-set、current context digest、/legal role matrix、axe report、PII non-exposure、release smokeを必須とする。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: system-spec/backend.md (qa-023 B8/B10), system-spec/security.md (qa-025 SEC2/SEC4/SEC9), system-spec/database.md (qa-024), system-spec/00-requirements-definition.md (D6)
- Architecture: arch-harness-hub-security (architecture/harness-hub-security.md), arch-harness-hub-backend (architecture/harness-hub-backend.md), arch-harness-hub-frontend (architecture/harness-hub-frontend.md)
- Feature: feat-user-org-admin
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-user-org-admin-p04
