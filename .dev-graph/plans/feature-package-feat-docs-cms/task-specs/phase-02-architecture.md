# System task overlay: アーキテクチャ設計 — Doc スキーマ・S15 画面構成・B7 API 契約・AI 下書きキュー契約の設計

## Machine-readable registration fields

- feature_package_id: feature-package/feat-docs-cms (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-docs-cms", "studio-extension", "docs-cms", "architecture"]
- related_nodes: ["feat-docs-cms", "arch-harness-hub-frontend", "arch-harness-hub-backend"]
- parent_feature: feat-docs-cms
- phase_ref: P02
- classification: confidence=0.9, reason="qa-024 の指示 (カラム定義の詳細設計は各 feature の P02 で行う) に従い Doc エンティティ (scope=common/tenant) のスキーマと S15 画面構成・B7 REST 資源契約・AI 下書きキュー (doc kind) 契約を確定する P02 タスク", candidates=[{artifact_kind: task, confidence: 0.9, candidate_path: tasks/feat-docs-cms/sys-docs-cms-p02.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P01 で確定した要件ベースラインに基づき、Doc エンティティ (scope=common/tenant・Markdown 本文・tenant_id/workspace_id スコープ列) のカラム定義、S15 一覧/閲覧/編集の画面構成、B7 REST 資源の zod スキーマ契約と認可単一ミドルウェア配下の role×操作許可表、AI 下書きキュー (AiJob の doc kind) の投入/受領契約を確定し、P03 レビューと P05 実装の入力となる設計文書を作成する。

## 背景

qa-024 により Doc エンティティが scope=common (全テナント共有) / tenant (テナント限定) の値を持つことが確定しており、D4 の row-level tenant scope 方針に従い全新規テーブルへ tenant_id/workspace_id スコープ列を必須とする。qa-023 の B7 でドキュメント CMS の common/tenant スコープが確定し、新規 REST 資源群は B1 の方針 (zod スキーマ単一ソースへ追加し認可単一ミドルウェア deny-by-default 配下に置く) に従う。qa-021 (S15) により一覧/閲覧/編集のうち編集は admin 限定であることが確定しており、qa-025 SEC2 の role×操作許可表と整合させる。doc の AI 下書き生成 (I13) は D5 確定の pull 型キューを用い、qa-025 SEC8 により pull/書戻し認可を Device Flow token 保有者に限定し job payload に secret を含めない。Markdown 本文は qa-021/qa-022/shared-layers.md §1 で確定した design system の共通レンダラ + エディタ (XSS sanitize) を消費するのみとし、本 feature 側で独自実装を行わない。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-docs-cms, arch-harness-hub-frontend, arch-harness-hub-backend
- Entry gate: sys-docs-cms-p01 の requirements-baseline.md が作成済みで、goal-spec acceptance 3 件と quality_constraints 8 件の転記に過不足がないこと
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: applicable + change: S15 一覧/閲覧/編集画面の構成 (閲覧 member・編集 admin) と、design system の Markdown レンダラ + エディタ共通部品の消費点を設計する
- Backend: applicable + change: Doc REST 資源のハンドラ構成と、AI 下書きキュー (AiJob doc kind) の投入/受領 API 構成を設計する
- API: applicable + contract: B7 の Doc REST 資源を zod スキーマ単一ソース (packages/schemas/docs-cms/) へ追加する契約と、認可単一ミドルウェア配下の role×操作許可表 (閲覧 member、編集 admin) を確定する
- Data: applicable + migration: Doc エンティティ (id・scope・tenant_id/workspace_id・title・body_markdown・status・created_by/updated_by・created_at/updated_at 等) のカラム一覧と、common scope 時の tenant_id 扱い (アプリ層で全テナント可視と強制する規則) を確定する
- Infrastructure: N/A: デプロイ単位・CI/CD は feat-hub-foundation が既に確立しており、本 feature は追加インフラを新設しない
- Security: applicable + change: tenant スコープ doc の分離強制点、doc 編集 admin 限定の認可表反映点、AI キュー pull/書戻しの Device Flow token 認可点、job payload の secret 非包含規則、doc 編集監査 event (SEC6) の記録点を設計する
- Quality: applicable + change: P04 のテストスタブが参照できる合否基準 (tenant 分離・XSS sanitize・admin 限定編集・監査記録・AI キュー契約) を設計文書内に明記する
- Documentation: applicable + change: docs/features/feat-docs-cms/architecture-decision-record.md を新規作成する
- Operations: N/A: AI キュー滞留監視・通知運用の具体化は P09/P12 で行う。本 task は設計確定のみ

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend (D4/D5/qa-021/qa-022/qa-023(B1/B7)/qa-024/qa-025(SEC2/SEC6/SEC7/SEC8) の正本参照)
- Deploy unit/environment: cloudflare-workers/hub (Hub は単一 Worker。本 task は設計確定のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は設計確定のみで、Doc エンティティへの実 migration 適用は P05/P08 で行う

## 成果物

- Produced artifacts: docs/features/feat-docs-cms/architecture-decision-record.md (Doc カラム一覧、S15 画面構成表、B7 API 契約 (zod スキーマ配置・role×操作許可表)、AI 下書きキュー (doc kind) の投入/受領契約、doc 編集監査 event 契約を含む)
- Consumed artifacts: docs/features/feat-docs-cms/requirements-baseline.md, system-spec/database.md, system-spec/security.md, system-spec/backend.md, system-spec/frontend.md, system-spec/ui-ux.md, docs/shared-layers.md, docs/screen-inventory.md, architecture/harness-hub-frontend.md, architecture/harness-hub-backend.md
- Write scope/touches: docs/features/feat-docs-cms/architecture-decision-record.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-docs-cms-p02) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-docs-cms-p02 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-docs-cms-p02) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: sys-docs-cms-p01 完了後に着手する。resource_scope (docs/features/feat-docs-cms/architecture-decision-record.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- Markdown レンダラ/エディタ部品自体の設計・実装 (design system 共通部品。owner は feat-hub-foundation)
- AI 実行基盤のサーバ側設計 (D5 で不採用)
- AiJob キュー共通層自体の一般化設計 (上流論点。goal-spec scope_out に含まれる論点であり、本 task は doc kind の投入/受領契約のみを扱う)
- 実装コードの作成 (本 task は設計確定のみ)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: architecture-decision-record.md に Doc カラム一覧、受入基準となる S15 画面構成表、B7 API 契約、AI キュー doc kind 契約、AiJob 共通層汎化の未解決論点の明記が記載されていること

## Rollout and rollback

- Rollout: architecture-decision-record.md を作成し、P03 の独立設計レビューへ引き継ぐ
- Rollback trigger and steps: P03 レビューで設計案が却下された場合、architecture-decision-record.md へ却下理由を追記し、本 task を再実行して代替設計を再評価する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/database.md (qa-024), system-spec/security.md (qa-025 SEC2/SEC6/SEC7/SEC8), system-spec/backend.md (qa-023 B1/B7), system-spec/ui-ux.md (qa-021 S15), system-spec/frontend.md (qa-022), docs/shared-layers.md, docs/screen-inventory.md
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-docs-cms
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-docs-cms-p01
