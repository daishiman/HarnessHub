# System task overlay: 2 経路以上の実機検証記録と Windows E2E 成功の受入確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-stage0-distribution-gate (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-stage0-distribution-gate", "macro-feature", "quality", "acceptance"]
- related_nodes: ["feat-stage0-distribution-gate", "arch-harness-hub-infrastructure"]
- parent_feature: feat-stage0-distribution-gate
- phase_ref: P07
- classification: confidence=0.87, reason="P06 の実機検証結果を基に goal-spec acceptance 3 件の充足を確認する P07 受入タスク", candidates=[{artifact_kind: task, confidence: 0.87, candidate_path: tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p07.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P06 の test-run-results.md に記録された実機検証結果を基に、goal-spec の acceptance 3 件 (2 経路以上の実機検証記録が存在する・採用経路が decision record として登録される・Windows E2E が成功する) の充足状況を確認し、acceptance-record.md として確定する。

## 背景

本 feature の受入は Stage 1 開始条件の判定材料そのものであるため、機械的に確認可能な形で記録する必要がある。「採用経路が decision record として登録される」については、実際の system-spec/spec-state.json decisions[] への書込は C01 writer コンポーネントが所有するため、本 task の時点では P13 で登録依頼を確定させる計画が存在することを条件付き pass として記録し、最終的な登録完了は P13 で確認する。「2 経路以上の実機検証記録が存在する」「Windows E2E が成功する」の 2 件は P06 の記録から直接判定できる。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-stage0-distribution-gate, arch-harness-hub-infrastructure
- Entry gate: docs/features/feat-stage0-distribution-gate/test-run-results.md が P06 完了時点で存在すること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は受入判定のみで frontend 実装物を変更しない
- Backend: N/A: 本 feature は Hub backend の変更を伴わない
- API: N/A: 本 feature は API 契約の新設を伴わない
- Data: N/A: 永続データストアのスキーマ変更を伴わない
- Infrastructure: N/A: 本 task は判定のみでインフラ変更を伴わない
- Security: N/A: セキュリティ観点の詳細検証は P09 で扱う
- Quality: applicable + change: goal-spec acceptance 3 件の充足状況を acceptance-record.md に確定記録する
- Documentation: applicable + change: docs/features/feat-stage0-distribution-gate/acceptance-record.md を新規作成する
- Operations: N/A: 運用手順の具体化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-infrastructure (P02 の architecture decision の正本参照)
- Deploy unit/environment: local-verification-only (受入判定のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は判定のみで実コードへの変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-stage0-distribution-gate/acceptance-record.md (acceptance 3 件の確認結果と証跡へのリンク)
- Consumed artifacts: docs/features/feat-stage0-distribution-gate/test-run-results.md, features/feat-stage0-distribution-gate.context.json, .dev-graph/staging/goal-spec.json
- Write scope/touches: docs/features/feat-stage0-distribution-gate/acceptance-record.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-stage0-distribution-gate-p07) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-stage0-distribution-gate-p07 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-stage0-distribution-gate-p07) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-STAGE0-DISTRIBUTION-GATE-P06] のため P06 完了後に着手する。resource_scope (acceptance-record.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- Hub 本体の実装 (goal-spec scope_out)
- 課金・商用配布 (goal-spec scope_out)
- decision record の system-spec/spec-state.json decisions[] への実書込 (owner=C01 writer コンポーネント。登録依頼の確定は P13 で扱う)
- 実機での検証実行そのもの (本 task は判定のみ。実行は P06 で完了済み)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: acceptance-record.md に「2 経路以上の実機検証記録が存在する」「採用経路が decision record として登録される (登録依頼は P13 で確定)」「Windows E2E が成功する」の 3 件の確認結果 (pass) と証跡へのリンクが記載されていること

## Rollout and rollback

- Rollout: acceptance-record.md を作成し P08 のリファクタリング/マイグレーションへ引き継ぐ
- Rollback trigger and steps: acceptance 3 件のいずれかが不充足の場合、acceptance-record.md に理由を記録し P06 (テスト実行) または P05 (実装) へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: .dev-graph/staging/goal-spec.json acceptance (3 件)
- Detailed authoritative source: docs/features/feat-stage0-distribution-gate/test-run-results.md
- Architecture: arch-harness-hub-infrastructure (architecture/harness-hub-infrastructure.md)
- Feature: feat-stage0-distribution-gate
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-STAGE0-DISTRIBUTION-GATE-P06
