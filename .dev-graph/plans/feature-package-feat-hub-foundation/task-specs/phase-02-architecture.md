# System task overlay: Hub 基盤 アーキテクチャ・workstream 設計 (pnpm monorepo 構成確定)

## Machine-readable registration fields

- feature_package_id: feature-package/feat-hub-foundation (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-hub-foundation", "stage-1", "infrastructure", "architecture", "monorepo"]
- related_nodes: ["feat-hub-foundation", "arch-harness-hub-infrastructure", "arch-harness-hub-frontend"]
- parent_feature: feat-hub-foundation
- phase_ref: P02
- classification: confidence=0.9, reason="pnpm workspace 構成 (apps/hub + packages/ui,schemas,inspection,db) と Cloudflare Workers デプロイ単位を比較検討し確定する P02 タスク", candidates=[{artifact_kind: task, confidence: 0.9, candidate_path: tasks/sys-hub-foundation-p02.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

feat-hub-foundation の frontend/backend/API/data/infrastructure/security workstream 設計を確定し、特に docs/shared-layers.md §4 が「要ユーザー確認」としていた pnpm workspace 構成 (apps/hub + packages/ui,schemas,inspection,db) を、本 task の設計判断として比較検討し確定する。この task 完了時点で、後続の P03 独立設計レビューが評価できる具体的なディレクトリ構成・デプロイ単位・共通層境界が揃っている状態にする。

## 背景

docs/shared-layers.md は共通 UI (design system)・共通バックエンド層 (zod schemas 単一ソース、認可ミドルウェア、auth adapter、repository 層、検査 pipeline、監査 event logger) の実装 owner を feat-hub-foundation に一元化しており、docs/system-design-overview.md の全体タスクマップでも feat-hub-foundation は「共通層すべての実装 owner」と位置付けられている。共通層をパッケージ境界で強制する構成案 (§4) は「確定は feat-hub-foundation の P02/P03 で行う」と明記されており、本 task がその確定責任を負う。D1 決定 (system-spec/00-requirements-definition.md) により Hub は単一 Worker (@opennextjs/cloudflare) で UI + API を同居させる構成が確定済みであり、これを分割しない理由は C1 (個人運用) と D1 そのものである (docs/system-design-overview.md §1)。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-hub-foundation, arch-harness-hub-infrastructure, arch-harness-hub-frontend, sys-hub-foundation-p01
- Entry gate: P01 (docs/features/feat-hub-foundation/requirements-baseline.md) が作成済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対

## Workstream applicability

- Frontend: applicable + change: Next.js App Router (@opennextjs/cloudflare 上で Workers 上 SSR) のディレクトリ構成を apps/hub 配下に確定する
- Backend: applicable + change: /health route handler と API 基盤の配置を apps/hub 内に確定する (業務ドメイン backend は対象外)
- API: applicable + change: zod schemas を単一ソースとする packages/schemas の置き場と、API 入出力検証・型・OpenAPI 生成の責務境界を確定する (契約内容自体は後続 feature)
- Data: N/A: DB スキーマ実体は feat-domain-model-db の scope。本 task は packages/db (Drizzle schema + repository 層) のディレクトリ置き場のみを確定し、スキーマ内容は定義しない
- Infrastructure: applicable + change: 【設計判断】pnpm workspace 構成の比較検討と確定。比較対象 (a) 単一 apps/hub のみでパッケージ分割なし (b) docs/shared-layers.md §4 提案の apps/hub + packages/ui,schemas,inspection,db の 5 パッケージ構成 (c) さらに機能ドメイン単位まで細分化した多パッケージ構成。判断: (b) を採用する。理由は docs/system-design-overview.md 全体タスクマップが design system・zod schemas・検査 pipeline・repository 層のそれぞれについて 2 feature 以上の消費者を示しており (例: 検査 pipeline は feat-publish-pipeline と feat-publisher-plugin の双方が消費、zod schemas は feat-domain-model-db と feat-auth-tenancy が消費)、docs/shared-layers.md §5 の「共通層に第 3 の利用者が現れたときに初めて共通化する」という早すぎる抽象化の禁止原則に照らしても既に共通化の閾値を満たしているため。(a) は共通層の境界をコードレベルで強制できず認可漏れ等の qa-020/qa-006 リスクを高める。(c) は C1 (個人開発の認知負荷) に反する過剰な層分割であり qa-020 で明示的に採らないとされている。plugins/publisher/ は feat-publisher-plugin の scope のためディレクトリ予約のみ行い実装しない
- Security: applicable + change: 認可ミドルウェア (単一層、Tenant/Workspace スコープ強制 deny-by-default) の配置境界を apps/hub 内にアーキテクチャ上予約する。実装本体は feat-auth-tenancy
- Quality: applicable + change: CI 品質ゲート (pnpm 混入検査 / axe a11y 導線枠 / bundle 予算 Worker 3MiB / Tenant 分離テスト枠 / 検査 pipeline 挙動同値テスト枠) の設計を docs/shared-layers.md §3 に沿って確定する
- Documentation: applicable + change: docs/features/feat-hub-foundation/architecture-decision-record.md を新規作成する
- Operations: applicable + change: /health + Workers logs/analytics + 外部死活監視 + SLO ダッシュボード + エラーバジェットアラートの構成要素配置を確定する (qa-019)

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-infrastructure, arch-harness-hub-frontend。本 task で新たに確定する設計判断は docs/features/feat-hub-foundation/architecture-decision-record.md に記録し、確定後 dev-graph の architecture ノードへ反映する (docs/shared-layers.md §5)
- Deploy unit/environment: cloudflare-workers/hub (単一 Worker。UI + API 同居、D1 決定。分割しない)
- Compatibility/migration/backfill: N/A: 新規 scaffold であり既存実装が存在しないため互換性・migration・backfill の対象がない

## 成果物

- Produced artifacts: docs/features/feat-hub-foundation/architecture-decision-record.md (pnpm workspace 構成の比較検討結果と確定構成を含む)、pnpm-workspace.yaml の設計内容 (apps/hub, packages/ui, packages/schemas, packages/inspection, packages/db を workspace member として列挙する設計)、package.json ルート定義の設計内容 (packageManager フィールドで pnpm を pin する設計)
- Consumed artifacts: docs/features/feat-hub-foundation/requirements-baseline.md, docs/shared-layers.md, docs/system-design-overview.md, arch-harness-hub-infrastructure, arch-harness-hub-frontend
- Write scope/touches: docs/features/feat-hub-foundation/architecture-decision-record.md, pnpm-workspace.yaml, package.json

## Tracker publication and completion

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-hub-foundation-p02) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-hub-foundation-p02 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-hub-foundation-p02) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[sys-hub-foundation-p01] が完了するまで着手しない。resource_scope が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- packages/db のスキーマ内容確定 (feat-domain-model-db の scope)
- 認可ミドルウェアの実装本体 (feat-auth-tenancy の scope)
- plugins/publisher/ の実装内容確定 (feat-publisher-plugin の scope)
- 業務ドメイン API 契約の内容確定 (後続 feature の scope)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: docs/features/feat-hub-foundation/architecture-decision-record.md に (a)(b)(c) の比較表と (b) 採用理由、apps/hub と packages/{ui,schemas,inspection,db} の各責務境界が記載されていること

## Rollout and rollback

- Rollout: architecture-decision-record.md を作成し、P03 独立設計レビューへ引き継ぐ
- Rollback trigger and steps: P03 レビューで構成案が却下された場合、architecture-decision-record.md へ却下理由を追記し、本 task を再実行して代替構成 (a) または (c) を再評価する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/00-requirements-definition.md (D1), system-spec/infrastructure.md (qa-003, qa-019), system-spec/frontend.md (qa-007, qa-018)
- Architecture: arch-harness-hub-infrastructure (architecture/harness-hub-infrastructure.md), arch-harness-hub-frontend (architecture/harness-hub-frontend.md)
- Feature: feat-hub-foundation
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成しない
- Dependencies: sys-hub-foundation-p01
