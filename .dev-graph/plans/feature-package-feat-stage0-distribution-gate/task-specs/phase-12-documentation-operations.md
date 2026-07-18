# System task overlay: 採用経路の onboarding/更新導線/障害時対応 runbook 確立

## Machine-readable registration fields

- feature_package_id: feature-package/feat-stage0-distribution-gate (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-stage0-distribution-gate", "macro-feature", "documentation", "operations"]
- related_nodes: ["feat-stage0-distribution-gate", "arch-harness-hub-infrastructure"]
- parent_feature: feat-stage0-distribution-gate
- phase_ref: P12
- classification: confidence=0.84, reason="採用経路の作者向け onboarding 手順・更新導線・障害時対応手順を runbook として確立する P12 文書化・運用タスク", candidates=[{artifact_kind: task, confidence: 0.84, candidate_path: tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p12.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P07 の受入結果に基づき確定した採用経路について、作者向けの onboarding 手順・marketplace/Bootstrap Installer の更新導線・障害時対応手順を runbook.md として確立する。この runbook は Stage 1 以降で Publisher が実際に Skill を配布する際の一次参照文書となる。

## 背景

H7 検証で採用が確定した経路 (URL 型 marketplace 経由の native source、または npm source を組み込んだ URL 型 marketplace、あるいは Bootstrap Installer) は、Stage 1 の Publisher + Thin Dual Catalog MVP で実際に運用される想定である。そのため、作者が初めて Skill を配布する際の onboarding 手順、Skill の更新があった際の導線 (marketplace の「更新あり」表示に基づく手動 update、または Bootstrap Installer の再実行)、配布時に問題が発生した場合の障害時対応手順 (切り戻し・再検証の判断基準を含む) を、P11 の証跡と整合する形で runbook 化する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-stage0-distribution-gate, arch-harness-hub-infrastructure
- Entry gate: docs/features/feat-stage0-distribution-gate/evidence-summary.md が P11 完了時点で存在すること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は文書化のみで frontend 実装物を変更しない
- Backend: N/A: 本 feature は Hub backend の変更を伴わない
- API: N/A: 本 feature は API 契約の新設を伴わない
- Data: N/A: 永続データストアのスキーマ変更を伴わない
- Infrastructure: N/A: 本 task は文書化のみでインフラ変更を伴わない
- Security: N/A: セキュリティ観点は P09 で保証済み
- Quality: applicable + change: runbook の内容が P06/P07 の実機検証結果と矛盾しないことを確認する
- Documentation: applicable + change: docs/features/feat-stage0-distribution-gate/runbook.md を新規作成する
- Operations: applicable + change: 採用経路の onboarding・更新導線・障害時対応の運用手順を確立する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-infrastructure (P02 の architecture decision の正本参照)
- Deploy unit/environment: local-verification-only (runbook 文書化のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は文書化のみで実コードへの変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-stage0-distribution-gate/runbook.md (採用経路の onboarding 手順・更新導線・障害時対応手順)
- Consumed artifacts: docs/features/feat-stage0-distribution-gate/evidence-summary.md, docs/features/feat-stage0-distribution-gate/test-run-results.md, system-spec/spec-state.json
- Write scope/touches: docs/features/feat-stage0-distribution-gate/runbook.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-stage0-distribution-gate-p12) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-stage0-distribution-gate-p12 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-stage0-distribution-gate-p12) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-STAGE0-DISTRIBUTION-GATE-P11] のため P11 完了後に着手する。resource_scope (runbook.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- Hub 本体の実装 (goal-spec scope_out)
- 課金・商用配布 (goal-spec scope_out)
- 採用経路の decision record 登録依頼そのもの (本 task は運用手順の確立のみ。登録依頼は P13 で扱う)
- Stage 1 系 feature の Publisher UI・承認キュー等の実装 (別 feature の責務)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: runbook.md に採用経路の作者向け onboarding 手順・更新導線 (手動 update)・障害時対応手順の 3 項目全てが記載されていること

## Rollout and rollback

- Rollout: runbook.md を作成し P13 のリリース/デプロイ (decision record 登録依頼と Stage 1 開始条件判定) へ引き継ぐ
- Rollback trigger and steps: runbook.md の手順が P06/P07 の実機検証結果と矛盾することが判明した場合、該当箇所を修正し本 task を再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/spec-state.json decisions[] (D1-D6 形式)
- Detailed authoritative source: docs/features/feat-stage0-distribution-gate/evidence-summary.md
- Architecture: arch-harness-hub-infrastructure (architecture/harness-hub-infrastructure.md)
- Feature: feat-stage0-distribution-gate
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-STAGE0-DISTRIBUTION-GATE-P11
