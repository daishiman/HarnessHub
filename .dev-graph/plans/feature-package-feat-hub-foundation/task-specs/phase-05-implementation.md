# System task overlay: Hub 基盤 実装 (scaffold・CI/CD・監視・SLO)

## Machine-readable registration fields

- feature_package_id: feature-package/feat-hub-foundation (13 task で共有)
- feature_context_digest: sha256:938ecf38d145496bba7a439b829d3934718b8f43b4f4628d8ba821594d17062d
- feature_acceptance: 4 items (A1-A4)
- quality_constraints: 9 items
- owners: ["daishiman"]
- tags: ["feat-hub-foundation", "stage-1", "infrastructure", "implementation"]
- related_nodes: ["feat-hub-foundation", "arch-harness-hub-infrastructure", "arch-harness-hub-frontend"]
- parent_feature: feat-hub-foundation
- phase_ref: P05
- classification: confidence=0.9, reason="P02 承認構成と P04 テスト設計に基づき pnpm monorepo scaffold・CI/CD・監視・SLO を実装する P05 タスク", candidates=[{artifact_kind: task, confidence: 0.9, candidate_path: tasks/sys-hub-foundation-p05.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P02 で確定した pnpm workspace 構成と P04 の test-first 受入契約に基づき、goal-spec の scope_in 全項目 (Next.js + TypeScript + pnpm monorepo scaffold、@opennextjs/cloudflare デプロイ、GitHub Actions CI/CD、/health + 外部死活監視、SLO ダッシュボード + bundle サイズ予算 CI) を依存順に実装する。この task 完了時点で、pnpm 強制 CI から wrangler deploy までが動作し、/health と SLO 計測の土台が稼働する状態にする。

## 背景

D1 決定により Hub は @opennextjs/cloudflare 経由で Cloudflare Workers 上に単一 Worker として実行され、無料枠 (10 万 req/日) 内で固定費ゼロ制約 (C2) を満たす。Cloudflare Workers Free プランの Worker サイズ上限は 3MiB (gzip 後) であり、CI での bundle サイズ計測が必須 (D1 caveat, docs/shared-layers.md §3)。qa-007 によりパッケージマネージャは pnpm に限定し npm を使用しない (packageManager フィールドで pin、CI で npm 混入検査)。qa-019 により可用性 SLO 99.5%/月 (許容停止 約 3.6 時間/月) を Workers logs/analytics と /health、外部死活監視、SLO ダッシュボード、エラーバジェットアラートで計測・運用する。本 task はこれらを個人運用制約 (C1) の下で一度に実装可能な最小構成で実現する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-hub-foundation, arch-harness-hub-infrastructure, arch-harness-hub-frontend, sys-hub-foundation-p04
- Entry gate: docs/features/feat-hub-foundation/test-design.md が作成済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対

## Workstream applicability

- Frontend: applicable + change: apps/hub に Next.js (App Router, TypeScript) の scaffold を実装する。初期実装範囲は共通レイアウトとエラー/縮退表示 (docs/system-design-overview.md 全体タスクマップ) のみとし、業務画面は scope 外
- Backend: applicable + change: apps/hub 内に /health route handler を実装する (状態コードとサービス稼働情報を返す最小実装)
- API: applicable + change: packages/schemas に zod schemas 基盤を実装する。本 task では /health レスポンススキーマのみを定義し、業務 API 契約は後続 feature の scope
- Data: N/A: packages/db は Drizzle 設定と repository 層の雛形ディレクトリのみを配置し、スキーマ定義は feat-domain-model-db の scope のため行わない
- Infrastructure: applicable + change: pnpm-workspace.yaml (apps/hub, packages/ui, packages/schemas, packages/inspection, packages/db, packages/estimation の 6 member を登録)、ルート package.json (packageManager フィールドで pnpm を pin)、wrangler.jsonc (Worker 設定)、open-next.config.ts (@opennextjs/cloudflare 設定)、.github/workflows/ci.yml (pnpm install から build/test/deploy までのパイプライン、npm 使用検知で fail、bundle 予算 3MiB チェックのステップを含む) を実装する
- Security: applicable + change: CI に npm 混入検知ステップ (package-lock.json 等の npm 由来ファイルが存在する場合に CI を fail させる) を実装する。認証・認可本体は feat-auth-tenancy
- Quality: applicable + change: bundle 予算チェック (Worker 3MiB 以内、gzip 後計測) を CI ステップとして実装する。axe a11y チェックは本 feature では実行導線の枠のみを CI に用意し、実際のチェック対象画面が増える後続 feature で有効化する
- Documentation: applicable + change: README.md に初期セットアップ手順 (pnpm install、wrangler へのログイン、開発サーバ起動) を追記する
- Operations: applicable + change: 外部死活監視 (無料枠のヘルスチェックサービスから /health を定期監視) の設定と、SLO ダッシュボード (無料枠、可用性 99.5% の実測表示) の構成を実装する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-infrastructure, arch-harness-hub-frontend, docs/features/feat-hub-foundation/architecture-decision-record.md
- Deploy unit/environment: cloudflare-workers/hub (単一 Worker、wrangler CLI でデプロイ)
- Compatibility/migration/backfill: N/A: 新規 scaffold であり既存実装が存在しないため互換性・migration・backfill の対象がない

## 成果物

- Produced artifacts: apps/hub/ (Next.js scaffold と /health route handler)、packages/ui/, packages/schemas/, packages/inspection/, packages/db/, packages/estimation/ (各パッケージの公開 contract)、pnpm-workspace.yaml、package.json、wrangler.jsonc、open-next.config.ts、.github/workflows/ci.yml、外部死活監視設定、SLO ダッシュボード設定
- Consumed artifacts: docs/features/feat-hub-foundation/architecture-decision-record.md, docs/features/feat-hub-foundation/test-design.md, docs/shared-layers.md
- Write scope/touches: apps/hub/, packages/ui/, packages/schemas/, packages/inspection/, packages/db/, packages/estimation/, pnpm-workspace.yaml, package.json, wrangler.jsonc, open-next.config.ts, .github/workflows/ci.yml, README.md

## Tracker publication and completion

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-hub-foundation-p05) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-hub-foundation-p05 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-hub-foundation-p05) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[sys-hub-foundation-p04] が完了するまで着手しない。write scope が広いため他 task の active lease と resource_scope が重複しないことを事前確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 業務ドメインロジックの実装 (goal-spec scope_out)
- 認証・認可の実装 (feat-auth-tenancy の scope)
- DB スキーマ実体の実装 (feat-domain-model-db の scope)
- axe a11y チェックの本格運用 (対象画面が増える後続 feature で有効化。本 task では導線枠のみ)

## Verification and evidence

- Automated commands: `pnpm install --frozen-lockfile` / `pnpm --filter hub build` / `pnpm --filter hub test` / bundle サイズ計測コマンド (wrangler の bundle 解析出力を 3MiB 予算と比較するステップ) / `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: .github/workflows/ci.yml が pnpm install から build/test/bundle チェックまでを実行すること、/health route handler が実装され開発環境で 200 応答を返すこと、外部死活監視と SLO ダッシュボードの設定ファイルが存在すること

## Rollout and rollback

- Rollout: pnpm-workspace.yaml と apps/hub の scaffold を先に実装し、CI ワークフロー・監視設定を段階的に追加する。各段階で `pnpm --filter hub build` を通してから次段階へ進む
- Rollback trigger and steps: bundle サイズが 3MiB を恒常的に超過する場合、コード分割・依存削減で対処し、それでも解消しない場合は Workers Paid ($5/月) への移行と C2 制約の再交渉を dev-graph へ差し戻す (system-spec/00-requirements-definition.md D1 caveat)。CI が壊れた場合は直前のコミットへ revert する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/00-requirements-definition.md (D1, C1, C2), system-spec/infrastructure.md (qa-003, qa-019), system-spec/frontend.md (qa-007, qa-018)
- Architecture: arch-harness-hub-infrastructure (architecture/harness-hub-infrastructure.md), arch-harness-hub-frontend (architecture/harness-hub-frontend.md)
- Feature: feat-hub-foundation
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成しない
- Dependencies: sys-hub-foundation-p04
