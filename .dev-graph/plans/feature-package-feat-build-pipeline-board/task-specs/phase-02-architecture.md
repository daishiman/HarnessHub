# System task overlay: アーキテクチャ設計 — Build スキーマ・S13 ボード構成・工程操作 API 契約・PublishRequest 接続設計

## Machine-readable registration fields

- feature_package_id: feature-package/feat-build-pipeline-board (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-build-pipeline-board", "studio-extension", "build-pipeline-board", "architecture"]
- related_nodes: ["feat-build-pipeline-board", "arch-harness-hub-frontend", "arch-harness-hub-backend"]
- parent_feature: feat-build-pipeline-board
- phase_ref: P02
- classification: confidence=0.9, reason="qa-024 の指示 (カラム定義の詳細設計は各 feature の P02 で行う) に従い Build エンティティのスキーマと S13 ボード構成・builds REST 資源契約・工程遷移 API・PublishRequest 接続契約を確定する P02 タスク", candidates=[{artifact_kind: task, confidence: 0.9, candidate_path: tasks/feat-build-pipeline-board/sys-build-pipeline-board-p02.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P01 で確定した要件ベースラインに基づき、Build エンティティ (7 stage・risk・tenant_id/workspace_id スコープ列) のカラム定義、S13 パイプラインボードの画面構成 (ステージボード共通部品の消費点)、builds REST 資源の zod スキーマ契約と認可単一ミドルウェア配下の role×操作許可表、工程遷移 API (admin 限定 + 監査 event)、publish 工程の PublishRequest 接続契約を確定し、P03 レビューと P05 実装の入力となる設計文書を作成する。

## 背景

docs/backend-spec.md §2.3 により builds テーブル (id, tenant_id, workspace_id, sheet_id, project_id, title, stage, risk, eta_date, assignee_user_id, publish_request_id, note) と build_stage_events テーブル (id, build_id, from_stage, to_stage, actor_user_id, created_at) が確定しており、D4 の row-level tenant scope 方針に従い tenant_id/workspace_id スコープ列を必須とする (system-spec/database.md qa-032, qa-024)。§4.4 により builds API は GET /api/v1/builds (member)・GET /api/v1/builds/:id (member)・POST /api/v1/builds (workspace-admin)・PATCH /api/v1/builds/:id (workspace-admin)・POST /api/v1/builds/:id/stage (workspace-admin) の 5 エンドポイントで構成され、§3.3 の認可マトリクスにより「builds 工程操作」は workspace-admin/provider-admin 限定 (member/owner は不可) と確定している (SEC2)。§5.3 の Build 状態機械は hearing→requirements→design→build→test→review→publish の隣接遷移のみを許可し、publish 遷移時は接続済み PublishRequest が Published であることを確認する (B4、既存 I2/I3 状態機械の再利用であり二重実装しない)。§3.8 の監査対象 action に build.stage_change が含まれる (SEC6)。qa-021/qa-022 により S13 の 7 工程ボードは design system の共通部品 (ステージボード) を消費するのみとし独自実装を行わない。新規 REST 資源群 (builds) は B1 の方針に従い zod スキーマ単一ソース (packages/schemas/) へ追加し認可単一ミドルウェア (deny-by-default) 配下に置く (qa-023)。工程操作の admin 権限判定は Yellow review (I8) の承認 queue と共通の認可表で扱う (B9, qa-023)。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-build-pipeline-board, arch-harness-hub-frontend, arch-harness-hub-backend
- Entry gate: sys-build-pipeline-board-p01 の requirements-baseline.md が作成済みで、goal-spec acceptance 3 件と quality_constraints 6 件の転記に過不足がないこと。かつ .dev-graph/staging/goal-spec.json の feature_context_digest が sha256:eeed295d50359e11ac8aee84800def3ad3399cee866ab5b4dc2712116c9a4441 に一致し、features/feat-build-pipeline-board.md の confirmation_status が confirmed であること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: applicable + change: S13 パイプラインボードの画面構成 (7 stage 列のグルーピング表示・risk 表示・閲覧 member/操作 admin) と、design system のステージボード共通部品の消費点を設計する
- Backend: applicable + change: builds REST 資源のハンドラ構成と、工程遷移 (POST /builds/:id/stage) の隣接遷移検証・PublishRequest 接続検証ロジックを設計する
- API: applicable + contract: builds REST 資源を zod スキーマ単一ソース (packages/schemas/build-pipeline-board/) へ追加する契約と、認可単一ミドルウェア配下の role×操作許可表 (閲覧 member 以上、起票/更新/工程操作 workspace-admin 以上) を確定する
- Data: applicable + migration: Build エンティティ (id・tenant_id・workspace_id・sheet_id・project_id・title・stage・risk・eta_date・assignee_user_id・publish_request_id・note) と build_stage_events (id・build_id・from_stage・to_stage・actor_user_id・created_at) のカラム一覧を確定する
- Infrastructure: N/A: デプロイ単位・CI/CD は feat-hub-foundation が既に確立しており、本 feature は追加インフラを新設しない
- Security: applicable + change: 工程遷移の admin 限定認可点 (SEC2)、build.stage_change 監査 event の記録点 (SEC6)、publish 遷移時の PublishRequest Published 確認点 (B4)、Build エンティティの tenant 分離強制点 (D4)、承認 queue (I8) と共通の認可表構造 (B9) を設計する
- Quality: applicable + change: P04 のテストスタブが参照できる合否基準 (工程遷移 admin 限定・監査記録・PublishRequest 整合・tenant 分離・共有認可表の一貫性) を設計文書内に明記する
- Documentation: applicable + change: docs/features/feat-build-pipeline-board/architecture-decision-record.md を新規作成する
- Operations: N/A: 工程操作監査運用・PublishRequest 接続監視の具体化は P09/P12 で行う。本 task は設計確定のみ

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend (D4/qa-021/qa-022/qa-023(B1/B9)/qa-024/qa-025(SEC2/SEC6)/B4/I2/I3 の正本参照)
- Deploy unit/environment: cloudflare-workers/hub (Hub は単一 Worker。本 task は設計確定のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は設計確定のみで、Build エンティティへの実 migration 適用は P05/P08 で行う

## 成果物

- Produced artifacts: docs/features/feat-build-pipeline-board/architecture-decision-record.md (Build/build_stage_events カラム一覧、S13 画面構成表、builds API 契約 (zod スキーマ配置・role×操作許可表)、工程遷移状態機械 (隣接遷移のみ)、publish 遷移の PublishRequest 接続契約、build.stage_change 監査 event 契約、B9 共有認可表構造を含む)
- Consumed artifacts: docs/features/feat-build-pipeline-board/requirements-baseline.md, docs/backend-spec.md, system-spec/database.md, system-spec/security.md, system-spec/backend.md, system-spec/frontend.md, system-spec/ui-ux.md, docs/screen-inventory.md, architecture/harness-hub-frontend.md, architecture/harness-hub-backend.md
- Write scope/touches: docs/features/feat-build-pipeline-board/architecture-decision-record.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-build-pipeline-board-p02) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-build-pipeline-board-p02 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-build-pipeline-board-p02) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: sys-build-pipeline-board-p01 完了後に着手する。resource_scope (docs/features/feat-build-pipeline-board/architecture-decision-record.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- ステージボード共通部品自体の設計・実装 (design system 共通部品。owner は feat-hub-foundation)
- publish 状態機械自体の再設計 (既存 I2/I3 を使用。goal-spec scope_out)
- 工程の自動遷移ロジックの設計 (goal-spec scope_out。手動運用から開始)
- 実装コードの作成 (本 task は設計確定のみ)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: architecture-decision-record.md に Build/build_stage_events カラム一覧、受入基準となる S13 画面構成表、builds API 契約、工程遷移状態機械、PublishRequest 接続契約、B9 共有認可表構造の明記が記載されていること

## Rollout and rollback

- Rollout: architecture-decision-record.md を作成し、P03 の独立設計レビューへ引き継ぐ
- Rollback trigger and steps: P03 レビューで設計案が却下された場合、architecture-decision-record.md へ却下理由を追記し、本 task を再実行して代替設計を再評価する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/database.md (qa-032), system-spec/security.md (qa-025 SEC2/SEC6), system-spec/backend.md (qa-033), system-spec/ui-ux.md (qa-021 S13), system-spec/frontend.md (qa-022), system-spec/00-requirements-definition.md (D4)
- Detailed authoritative source: docs/backend-spec.md (§2.3 builds/build_stage_events, §3.3 認可マトリクス, §3.8 監査対象, §4.4 builds API, §5.3 Build 状態機械), docs/screen-inventory.md (S13)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-build-pipeline-board
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-build-pipeline-board-p01
