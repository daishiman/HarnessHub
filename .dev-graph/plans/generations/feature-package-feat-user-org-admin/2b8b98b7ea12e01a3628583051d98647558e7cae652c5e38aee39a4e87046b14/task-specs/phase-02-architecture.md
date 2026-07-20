# System task overlay: アーキテクチャ設計 — User拡張/TenantCoefficient スキーマ・PII ガード/通知ディスパッチ接続点の設計

## Machine-readable registration fields

- feature_package_id: feature-package/feat-user-org-admin (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-user-org-admin", "studio-extension", "security", "architecture"]
- related_nodes: ["feat-user-org-admin", "arch-harness-hub-security", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
- parent_feature: feat-user-org-admin
- phase_ref: P02
- classification: confidence=0.9, reason="qa-024 の指示 (カラム定義の詳細設計は各 feature の P02 で行う) に従い TenantCoefficient/User 拡張のスキーマと共通層接続点を確定する P02 タスク", candidates=[{artifact_kind: task, confidence: 0.9, candidate_path: tasks/feat-user-org-admin/sys-user-org-admin-p02.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

S17/S18 の画面構成・API 契約・User 拡張 (department/salary) と TenantCoefficient エンティティのカラム設計・PII ガード共通層と通知ディスパッチ共通層への接続点を確定し、P05 実装が迷いなく着手できる設計成果物を作る。

## 背景

qa-024 は『カラム定義の詳細設計は各 feature の P02 で行う』と定めており、TenantCoefficient (annualHours・分/回・削減率) と User 拡張 (department・salary) のカラム設計は本 task の責務である。全新規テーブルは tenant_id/workspace_id スコープ列を 必須とする (D4)。salary は PII 列として admin 限定読取・一般 API 非公開・export マスクで扱う (qa-025 SEC4)。docs/shared-layers.md §2 は PII ガード (SEC4) と通知ディスパッチ (B8) を共通層として feat-hub-foundation が実装 owner になると定めており、本 feature はこれらを『使う』設計に徹し、共通層そのものを再発明しない。同 §1 は KPI カード/チャート共通 UI 部品の消費 feature に user-org-admin を明記しており、S17 の個別ダッシュボードはこの共通部品を利用する設計とする。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-user-org-admin, sys-user-org-admin-p01
- Entry gate: docs/features/feat-user-org-admin/requirements-baseline.md が P01 で作成済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: applicable + change: S17 (ユーザー管理 + 個別ダッシュボード)・S18 (アカウント設定) の画面構成と、共通 UI (KPI カード/チャート、フォーム部品、状態チップ) の再利用方針を確定する (docs/shared-layers.md §1)
- Backend: applicable + change: S17/S18 の API ハンドラ構成 (role 認可・PII ガード・通知ディスパッチ呼び出し・監査 event 記録) を確定する
- API: applicable + change: zod schemas 単一ソース (packages/schemas/) 配下に user-org-admin 専用の入出力契約を追加する設計を確定する (qa-009 準拠)
- Data: applicable + change: TenantCoefficient (annualHours・分/回・削減率) と User 拡張 (department・salary) のカラム設計、tenant_id/workspace_id スコープ列必須化 (D4) を確定する (qa-024)
- Infrastructure: N/A: デプロイ単位・CI/CD は feat-hub-foundation が既に確立しており、本 feature は追加インフラを新設しない
- Security: applicable + change: salary の admin 限定表示・一般 API 非公開・export マスク・読取監査 (SEC4) と、role 4 種 (qa-005) に基づく新規 API 群の認可設計 (SEC2) を確定する
- Quality: applicable + change: S17/S18 の axe a11y 検査対象範囲と CI 品質ゲートへの組込み方針を確定する
- Documentation: applicable + change: docs/features/feat-user-org-admin/architecture-decision-record.md を新規作成する
- Operations: N/A: 運用手順の具体化は P12 で行う。本 task は設計確定のみ

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-security, arch-harness-hub-backend, arch-harness-hub-frontend
- Deploy unit/environment: cloudflare-workers/hub (feat-hub-foundation が確立した既存 Worker 上に S17/S18 を追加する。本 task は設計確定のみでデプロイは行わない)
- Compatibility/migration/backfill: User テーブルへの department/salary 列追加は既存行に対する後方互換な列追加 (nullable もしくは既定値付き) として設計し、既存データを破壊しない。TenantCoefficient は新規テーブルであり移行対象データは存在しない。列追加・新規テーブルの migration 適用手順は P08 で扱う

## 成果物

- Produced artifacts: docs/features/feat-user-org-admin/architecture-decision-record.md (S17/S18 画面構成、API 契約方針、TenantCoefficient/User 拡張カラム設計、PII ガード/通知ディスパッチ接続点の設計記録)
- Consumed artifacts: docs/features/feat-user-org-admin/requirements-baseline.md, system-spec/database.md, system-spec/security.md, docs/shared-layers.md, docs/screen-inventory.md, architecture/harness-hub-security.md, architecture/harness-hub-backend.md, architecture/harness-hub-frontend.md
- Write scope/touches: docs/features/feat-user-org-admin/architecture-decision-record.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-user-org-admin-p02) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-user-org-admin-p02 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-user-org-admin-p02) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[sys-user-org-admin-p01] が完了するまで着手しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- PII ガード共通層・通知ディスパッチ共通層・検査 pipeline 自体の再設計 (feat-hub-foundation が実装 owner。docs/shared-layers.md §5)
- Auth.js アダプタ・認可ミドルウェア自体の設計変更 (feat-auth-tenancy の scope)
- Tenant/Workspace/Project/TargetChannel/Release 等の既存中核エンティティのスキーマ変更 (feat-domain-model-db の scope)
- 試算エンジン (annualHours・分/回・削減率を用いた実際の削減時間/削減額計算) の設計 (feat-metrics-tracking の scope。本 feature は係数の保存・管理のみを担う)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: docs/features/feat-user-org-admin/architecture-decision-record.md に TenantCoefficient/User 拡張のカラム一覧、PII ガード適用列 (salary) の明記、通知ディスパッチ共通層の呼び出しインタフェース、S17/S18 の画面構成表が記載されている

## Rollout and rollback

- Rollout: architecture-decision-record.md を作成し、P03 の独立設計レビューへ引き継ぐ
- Rollback trigger and steps: P03 レビューで設計案が却下された場合、architecture-decision-record.md へ却下理由を追記し、本 task を再実行して代替設計を再評価する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-user-org-admin.context.json` (`sha256:4271086e4eacd8a7327ab3fc9b9e080b2d024ac66858b2a4965d0afbda33a265`)
- Phase responsibility: 現行 architecture_refs と全 scope を実装境界・deploy unit・owner に割り当てる。
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

- Required responsibility: /legal を認証済み全roleから閲覧可能な静的routeとして設計し、salary/PII policyとの境界を明示する。
- Dependency rule: this phase consumes only earlier P01..P01 outputs; later phase documentation or evidence is never an entry prerequisite.

## Normative implementation closure (2026-07-19)

This section is normative for P02 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-user-org-admin.context.json; docs/frontend-spec.md S17/S18//legal; docs/security-spec.md PII/a11y contracts
- Effective phase contract: 現行 quality_constraints は legal-static-page-all-users を含む9件である。P01で9 IDをexact-set転記し、P04/P06は/legalの全role access・非ログイン方針・静的内容・axe=0・salary/PII非露出を検証する。P07/P09/P10/P11は第3 acceptanceと第9制約を同じevidence IDで追跡し、P05で実装、P12で内容更新owner、P13でroute smokeを確認する。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `apps/hub/src/app/legal/`
- `apps/hub/src/app/legal/__tests__/`
- Mandatory evidence: quality constraint 9 ID exact-set、current context digest、/legal role matrix、axe report、PII non-exposure、release smokeを必須とする。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: system-spec/database.md (qa-024), system-spec/security.md (qa-025 SEC2/SEC4), system-spec/backend.md (qa-023 B8/B10), docs/shared-layers.md §1/§2
- Architecture: arch-harness-hub-security (architecture/harness-hub-security.md), arch-harness-hub-backend (architecture/harness-hub-backend.md), arch-harness-hub-frontend (architecture/harness-hub-frontend.md)
- Feature: feat-user-org-admin
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-user-org-admin-p01
