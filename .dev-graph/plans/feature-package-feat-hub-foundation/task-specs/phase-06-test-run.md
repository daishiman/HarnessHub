# System task overlay: Hub 基盤 テスト実行

## Machine-readable registration fields

- feature_package_id: feature-package/feat-hub-foundation (13 task で共有)
- feature_context_digest: sha256:938ecf38d145496bba7a439b829d3934718b8f43b4f4628d8ba821594d17062d
- feature_acceptance: 4 items (A1-A4)
- quality_constraints: 9 items
- owners: ["daishiman"]
- tags: ["feat-hub-foundation", "stage-1", "infrastructure", "test-run"]
- related_nodes: ["feat-hub-foundation", "arch-harness-hub-infrastructure", "arch-harness-hub-frontend"]
- parent_feature: feat-hub-foundation
- phase_ref: P06
- classification: confidence=0.88, reason="P04 test-design.md の受入契約に従って P05 実装物を実行検証する P06 タスク", candidates=[{artifact_kind: task, confidence: 0.88, candidate_path: tasks/sys-hub-foundation-p06.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P04 で定義した test-first 受入契約に従い、P05 で実装した scaffold・CI/CD・監視・SLO の各要素を実行検証する。この task 完了時点で、unit/contract/integration/e2e/security/performance の各テスト種別が実行され、結果が記録されている状態にする。

## 背景

goal-spec の acceptance (CI が test→deploy を完走する、Worker bundle が 3MiB 以内、SLO 99.5% の計測と /health が稼働する) は、実装しただけでは受入条件を満たさず、実際に CI パイプラインが動作し bundle 予算チェックが機能し /health が応答することを実行して確認する必要がある。qa-018 の CWV good (LCP 2.5 秒以内 / INP 200 ミリ秒以内 / CLS 0.1 以内) も計測を伴う検証項目である。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-hub-foundation, arch-harness-hub-infrastructure, arch-harness-hub-frontend, sys-hub-foundation-p05
- Entry gate: apps/hub の scaffold、.github/workflows/ci.yml、外部死活監視・SLO ダッシュボード設定が実装済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対

## Workstream applicability

- Frontend: applicable + change: Next.js scaffold のビルドとレンダリングを実行検証し、Core Web Vitals (LCP/INP/CLS) の初期計測結果を確認する
- Backend: applicable + change: /health route handler を実行し、状態コードと応答本文が契約通りであることを確認する
- API: applicable + change: /health レスポンススキーマに対する contract テストを実行する
- Data: N/A: DB スキーマ実体は feat-domain-model-db の scope であり、本 task のテスト対象に含めない
- Infrastructure: applicable + change: .github/workflows/ci.yml を実行し、pnpm install から build/test/bundle チェックまでが green で完走することを確認する。npm 混入検査ステップが実際に npm 由来ファイルを検知して fail することも確認する
- Security: applicable + change: npm 混入検知テストを実行し、意図的な npm 混入シナリオで CI が fail することを確認する
- Quality: applicable + change: bundle サイズ計測を実行し、Worker bundle が 3MiB 以内であることを確認する
- Documentation: N/A: テスト実行結果の証跡化は P11 (evidence) で行う。本 task はテスト実行そのものを担う
- Operations: applicable + change: /health への外部死活監視の疎通確認と、SLO ダッシュボードが実測値を表示できることを実行検証する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-infrastructure, arch-harness-hub-frontend
- Deploy unit/environment: cloudflare-workers/hub (テスト対象。本 task では開発/CI 環境上での検証を行い、本番デプロイは P13 で行う)
- Compatibility/migration/backfill: N/A: 新規 scaffold であり互換性・migration・backfill の対象がない

## 成果物

- Produced artifacts: apps/hub/tests/ 配下のテスト実行結果 (ビルドログ、bundle サイズレポート、/health 応答ログ)、.github/workflows/ci.yml の実行結果 (CI run)
- Consumed artifacts: apps/hub/, packages/schemas/, .github/workflows/ci.yml, docs/features/feat-hub-foundation/test-design.md
- Write scope/touches: apps/hub/tests/, .github/workflows/ci.yml

## Tracker publication and completion

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-hub-foundation-p06) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-hub-foundation-p06 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-hub-foundation-p06) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[sys-hub-foundation-p05] が完了するまで着手しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- テストで発見した不具合の恒久修正 (P05 へ差し戻して修正する)
- 業務ドメインロジックのテスト実行 (goal-spec scope_out)
- テスト結果の証跡化・報告書作成 (P11 の scope)

## Verification and evidence

- Automated commands: `pnpm install --frozen-lockfile` / `pnpm --filter hub build` / `pnpm --filter hub test` / CI ワークフローの手動トリガー実行 (`gh workflow run ci.yml` 相当) / `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: CI run が green で完走したログ、bundle サイズ計測結果が 3MiB 以内であるレポート、/health 応答ログ

## Rollout and rollback

- Rollout: unit テストから contract/integration、最後に e2e/security/performance の順にテストを実行し、各段階で failure が出た場合は P05 へ差し戻す
- Rollback trigger and steps: CI が red の場合、失敗ステップのログを記録し sys-hub-foundation-p05 を再実行対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/frontend.md (qa-007, qa-018), system-spec/infrastructure.md (qa-003, qa-019)
- Architecture: arch-harness-hub-infrastructure (architecture/harness-hub-infrastructure.md), arch-harness-hub-frontend (architecture/harness-hub-frontend.md)
- Feature: feat-hub-foundation
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成しない
- Dependencies: sys-hub-foundation-p05
