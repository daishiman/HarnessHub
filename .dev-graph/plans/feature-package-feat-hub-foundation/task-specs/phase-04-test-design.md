# System task overlay: Hub 基盤 テスト設計 (test-first 受入契約)

## Machine-readable registration fields

- feature_package_id: feature-package/feat-hub-foundation (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-hub-foundation", "stage-1", "infrastructure", "test-design"]
- related_nodes: ["feat-hub-foundation", "arch-harness-hub-infrastructure", "arch-harness-hub-frontend"]
- parent_feature: feat-hub-foundation
- phase_ref: P04
- classification: confidence=0.88, reason="承認済み設計を根拠に P05 実装前の test-first 受入契約を定義する P04 タスク", candidates=[{artifact_kind: task, confidence: 0.88, candidate_path: tasks/sys-hub-foundation-p04.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P03 で承認された設計に基づき、P05 実装に先立って test-first の受入契約 (何が検証されれば feature acceptance を満たすか) を確定する。この task 完了時点で、CI 品質ゲート・bundle 予算・SLO 計測・/health 稼働のそれぞれについて、自動テストで検証可能な合否基準が定義されている状態にする。

## 背景

goal-spec の acceptance は「CI が test→deploy を完走する」「Worker bundle が 3MiB 以内で bundle 予算チェックが CI に存在する」「SLO 99.5% の計測と /health が稼働する」の 3 件であり、これらは実装前にテストシナリオとして具体化しておくことで、P05 実装と P06 テスト実行が同じ合否基準を共有できる。qa-018 は axe 自動チェックで検出可能な a11y 違反ゼロをリリース条件とし、docs/shared-layers.md §3 は pnpm 混入検査・axe・bundle 予算・Tenant 分離テスト・検査 pipeline 挙動同値テストを CI 品質ゲートとして列挙している。本 feature の scope では Tenant 分離テストと検査 pipeline 挙動同値テストは後続 feature 用の枠のみを用意する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-hub-foundation, arch-harness-hub-infrastructure, arch-harness-hub-frontend, sys-hub-foundation-p03
- Entry gate: docs/features/feat-hub-foundation/design-review-notes.md が承認済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対

## Workstream applicability

- Frontend: applicable + change: axe a11y 自動チェックのテストシナリオと Core Web Vitals (LCP 2.5 秒以内 / INP 200 ミリ秒以内 / CLS 0.1 以内) 計測手順を test-design.md に定義する (テスト設計のみ、実装コードなし)
- Backend: applicable + change: /health route handler のレスポンス契約 (状態コード・応答本文の必須項目) のテストケースを設計する
- API: applicable + change: /health API のレスポンススキーマ (zod schemas 経由) に対する contract テストケースを設計する
- Data: N/A: DB スキーマ実体は feat-domain-model-db の scope であり、本 task のテスト対象に含めない
- Infrastructure: applicable + change: Worker bundle サイズ (3MiB 以内、gzip 後) の計測テストと、pnpm 混入検査 (npm 使用時に CI を fail させる) のテストケースを設計する
- Security: applicable + change: npm 混入検知・secret 非保持境界 (C4) の最小限のセキュリティテスト観点を設計する (認証本体のテストは feat-auth-tenancy)
- Quality: applicable + change: docs/features/feat-hub-foundation/test-design.md を新規作成し、goal-spec acceptance 3 件を test-first 契約として定義する
- Documentation: applicable + change: test-design.md 作成
- Operations: applicable + change: SLO 99.5% 計測・エラーバジェットアラート・外部死活監視の疎通確認テスト (監視自体が正しく動作しているかの検証) を設計する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-infrastructure, arch-harness-hub-frontend, docs/features/feat-hub-foundation/architecture-decision-record.md
- Deploy unit/environment: cloudflare-workers/hub (テスト対象のデプロイ単位。本 task 自体はデプロイを行わない)
- Compatibility/migration/backfill: N/A: 新規 scaffold であり互換性・migration・backfill の対象がない

## 成果物

- Produced artifacts: docs/features/feat-hub-foundation/test-design.md (unit/contract/integration/e2e/security/performance 各テスト種別ごとの受入契約)、apps/hub/tests/ 配下に配置するテストケース一覧の設計 (テストコード実体は P05/P06 で作成)
- Consumed artifacts: docs/features/feat-hub-foundation/design-review-notes.md, docs/features/feat-hub-foundation/requirements-baseline.md, docs/shared-layers.md, system-spec/frontend.md
- Write scope/touches: docs/features/feat-hub-foundation/test-design.md, apps/hub/tests/

## Tracker publication and completion

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-hub-foundation-p04) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-hub-foundation-p04 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-hub-foundation-p04) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[sys-hub-foundation-p03] が完了するまで着手しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- テストコード実体の実装 (P05/P06 の scope)
- 業務ドメインロジックのテスト設計 (goal-spec scope_out)
- Tenant 分離テスト・検査 pipeline 挙動同値テストの内容確定 (本 feature では枠のみ用意し、内容確定は消費 feature の scope)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: docs/features/feat-hub-foundation/test-design.md に goal-spec acceptance 3 件それぞれに対応するテスト種別 (unit/contract/integration/e2e/security/performance) と合否基準が明記されていること

## Rollout and rollback

- Rollout: test-design.md を作成し、P05 実装へ引き継ぐ
- Rollback trigger and steps: P05 着手後に受入契約と実装可能性の乖離が判明した場合、test-design.md を修正し P04 を再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/frontend.md (qa-007, qa-018), system-spec/infrastructure.md (qa-003, qa-019)
- Architecture: arch-harness-hub-infrastructure (architecture/harness-hub-infrastructure.md), arch-harness-hub-frontend (architecture/harness-hub-frontend.md)
- Feature: feat-hub-foundation
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成しない
- Dependencies: sys-hub-foundation-p03
