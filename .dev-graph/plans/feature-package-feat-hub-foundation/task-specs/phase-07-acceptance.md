# System task overlay: Hub 基盤 feature 受入判定

## Machine-readable registration fields

- feature_package_id: feature-package/feat-hub-foundation (13 task で共有)
- feature_context_digest: sha256:938ecf38d145496bba7a439b829d3934718b8f43b4f4628d8ba821594d17062d
- feature_acceptance: 4 items (A1-A4)
- quality_constraints: 9 items
- owners: ["daishiman"]
- tags: ["feat-hub-foundation", "stage-1", "infrastructure", "acceptance"]
- related_nodes: ["feat-hub-foundation", "arch-harness-hub-infrastructure", "arch-harness-hub-frontend"]
- parent_feature: feat-hub-foundation
- phase_ref: P07
- classification: confidence=0.88, reason="P06 のテスト実行結果を goal-spec acceptance と突合し feature 受入可否を判定する P07 タスク", candidates=[{artifact_kind: task, confidence: 0.88, candidate_path: tasks/sys-hub-foundation-p07.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P06 のテスト実行結果を goal-spec の acceptance 4 件 (A1 CI test→deploy / A2 Worker bundle 3MiB / A3 SLO 99.5% と /health / A4 共通層の単一実装と consumer contract) と突合し、feature 単位の受入可否を判定する。この task 完了時点で、feature-execution-package-contract.md §7 が定める「P07/P10/P11 の evidence から feature acceptance が満たされた」という完了条件のうち P07 分の判定材料が揃っている状態にする。

## 背景

feature-execution-package-contract.md §7 は「featureを doneへ roll upできるのは、登録receiptがexact 13を証明し、そのP01..P13全taskがdoneで、feature acceptanceがP07/P10/P11のevidenceから満たされた場合だけ」と定めており、P07 はその第一段階の purpose-derived acceptance 判定を担う。goal-spec の acceptance 文言をそのまま機械可読な合否リストへ変換し、P06 のテスト結果と対照する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-hub-foundation, arch-harness-hub-infrastructure, arch-harness-hub-frontend, sys-hub-foundation-p06
- Entry gate: P06 のテスト実行結果 (CI run ログ、bundle サイズレポート、/health 応答ログ) が揃っていること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対

## Workstream applicability

- Frontend: N/A: P06 のテスト結果に対する判定記録のみを行い、対象物への変更は行わない
- Backend: N/A: P06 のテスト結果に対する判定記録のみを行い、対象物への変更は行わない
- API: N/A: P06 のテスト結果に対する判定記録のみを行い、対象物への変更は行わない
- Data: N/A: DB スキーマ実体は feat-domain-model-db の scope であり、本 task の判定対象に含めない
- Infrastructure: applicable + change: 「CI が test→deploy を完走する」「Worker bundle が 3MiB 以内で bundle 予算チェックが CI に存在する」の 2 件を P06 の CI run ログと bundle サイズレポートから判定し、acceptance-report.md に記録する (対象物への変更なし)
- Security: N/A: 認証・認可は feat-auth-tenancy の scope であり、本 feature の受入判定に含めない
- Quality: applicable + change: acceptance-report.md の新規作成、4 件の acceptance (A1-A4) すべての合否を記録する
- Documentation: applicable + change: docs/features/feat-hub-foundation/acceptance-report.md を新規作成する
- Operations: applicable + change: 「SLO 99.5% の計測と /health が稼働する」を P06 の外部死活監視疎通確認と SLO ダッシュボード実測値表示から判定し、acceptance-report.md に記録する (対象物への変更なし)

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-infrastructure, arch-harness-hub-frontend
- Deploy unit/environment: cloudflare-workers/hub (判定対象。本 task 自体はデプロイ単位を変更しない)
- Compatibility/migration/backfill: N/A: 新規 scaffold であり互換性・migration・backfill の対象がない

## 成果物

- Produced artifacts: docs/features/feat-hub-foundation/acceptance-report.md (goal-spec acceptance 4 件それぞれの合否判定と根拠)
- Consumed artifacts: P06 の CI run ログ、bundle サイズレポート、/health 応答ログ、.dev-graph/staging/goal-spec.json
- Write scope/touches: docs/features/feat-hub-foundation/acceptance-report.md

## Tracker publication and completion

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-hub-foundation-p07) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-hub-foundation-p07 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-hub-foundation-p07) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[sys-hub-foundation-p06] が完了するまで着手しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 不合格判定時の恒久修正 (該当する P05/P06 へ差し戻して修正する)
- 業務ドメインロジックの受入判定 (goal-spec scope_out)
- 最終独立レビュー (P10 の scope)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: acceptance-report.md に goal-spec acceptance 4 件 (A1-A4) それぞれの合否 (合格/不合格) と根拠となる P06 の証跡パスが明記されていること

## Rollout and rollback

- Rollout: acceptance-report.md で全 4 件が合格と判定された場合、P08 (refactoring-migration) へ引き継ぐ
- Rollback trigger and steps: 1 件でも不合格の場合、不合格項目の根本原因が P05 (実装) か P06 (テスト) のどちらにあるかを acceptance-report.md に記録し、該当 task を再実行対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/00-requirements-definition.md (D1, C1, C2), system-spec/infrastructure.md (qa-003, qa-019), system-spec/frontend.md (qa-007, qa-018)
- Architecture: arch-harness-hub-infrastructure (architecture/harness-hub-infrastructure.md), arch-harness-hub-frontend (architecture/harness-hub-frontend.md)
- Feature: feat-hub-foundation
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成しない
- Dependencies: sys-hub-foundation-p06
