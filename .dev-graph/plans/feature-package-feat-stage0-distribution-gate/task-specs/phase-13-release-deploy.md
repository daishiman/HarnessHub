# System task overlay: 採用経路の decision record 登録依頼と Stage 1 開始条件判定

## Machine-readable registration fields

- feature_package_id: feature-package/feat-stage0-distribution-gate (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-stage0-distribution-gate", "macro-feature", "operations", "release-deploy"]
- related_nodes: ["feat-stage0-distribution-gate", "arch-harness-hub-infrastructure"]
- parent_feature: feat-stage0-distribution-gate
- phase_ref: P13
- classification: confidence=0.85, reason="本 feature は Hub 本体を持たないため実デプロイを行わない。採用経路の decision record 登録依頼確定と Stage 1 開始条件判定に適用される release-deploy タスク", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p13.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

本 feature の最終 task として、採用経路の decision record 登録依頼内容を確定し (実際の system-spec/spec-state.json decisions[] への書込は C01 writer コンポーネントが所有する)、H7 の成立結果に基づく Stage 1 開始条件の判定結果を release-record.md として確定する。

## 背景

本 feature は Hub 本体のデプロイを持たない検証 feature であるため、P13 (リリース/デプロイ) は通常の意味でのデプロイ作業ではなく、(1) Hub 本体の実デプロイが N/A であることの close-out 判断、(2) 採用経路の decision record 登録依頼内容 (id/question/status/options/評価軸/確定根拠。system-spec/spec-state.json decisions[] の既存形式 D1-D6 に倣う) の確定、(3) H7 (Skill 配布の成立経路) が Stage 0 で成立確認されたかどうかに基づく Stage 1 開始条件の判定、という 3 点を扱う feature-execution-package-contract.md の適用パターンとして実施する。H7 が不成立と判定された場合は fail-closed として Stage 1 系 feature の着手を保留する判断を明記する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-stage0-distribution-gate, arch-harness-hub-infrastructure
- Entry gate: docs/features/feat-stage0-distribution-gate/runbook.md が P12 完了時点で存在すること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 feature は frontend 実装物を持たない
- Backend: N/A: 本 feature は Hub backend の変更を伴わない
- API: N/A: 本 feature は API 契約の新設を伴わない
- Data: N/A: system-spec/spec-state.json decisions[] への実書込は C01 writer コンポーネントが所有し、本 task は登録依頼内容の確定のみを行う
- Infrastructure: N/A: 本 feature は cloudflare-workers/hub 等への追加インフラ新設を伴わない
- Security: N/A: セキュリティ観点は P09 で保証済み
- Quality: applicable + change: Stage 1 開始条件 (H7 成立) の判定結果を release-record.md に確定記録する
- Documentation: applicable + change: docs/features/feat-stage0-distribution-gate/release-record.md を新規作成する
- Operations: applicable + change: 採用経路の decision record 登録依頼内容を確定し、C01 writer への引き渡し内容として整理する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-infrastructure (P02 の architecture decision の正本参照)
- Deploy unit/environment: N/A: 本 feature は Hub 本体の実デプロイを持たないため、cloudflare-workers/hub への deploy unit 割当は行わない
- Compatibility/migration/backfill: N/A: 本 task は登録依頼確定と判定のみで実コードへの変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-stage0-distribution-gate/release-record.md (Hub 本体実デプロイ N/A の close-out 判断、採用経路の decision record 登録依頼内容、Stage 1 開始条件の判定結果)
- Consumed artifacts: docs/features/feat-stage0-distribution-gate/runbook.md, docs/features/feat-stage0-distribution-gate/acceptance-record.md, system-spec/spec-state.json, features/feat-stage0-distribution-gate.md
- Write scope/touches: docs/features/feat-stage0-distribution-gate/release-record.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-stage0-distribution-gate-p13) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-stage0-distribution-gate-p13 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-stage0-distribution-gate-p13) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-STAGE0-DISTRIBUTION-GATE-P12] のため P12 完了後に着手する。resource_scope (release-record.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- Hub 本体の実装 (goal-spec scope_out)
- 課金・商用配布 (goal-spec scope_out)
- system-spec/spec-state.json decisions[] への実書込 (owner=C01 writer コンポーネント。本 task は登録依頼内容の確定と引き渡しのみを行う)
- Stage 1 系 feature 自体の起票・着手 (本 task は開始条件の判定のみ。実際の起票は dev-graph が別途行う)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: release-record.md に N/A: 本 feature は Hub 本体の実デプロイを持たないため実デプロイなし、という close-out 判断、採用経路の decision record 登録依頼内容 (id/question/status/options/評価軸/確定根拠。system-spec/spec-state.json decisions[] への実書込は C01 writer 経由)、および Stage 1 開始条件 (H7 成立) の判定結果の 3 点が記載されていること

## Rollout and rollback

- Rollout: release-record.md を作成し、C01 writer への decision record 登録依頼を発行し、Stage 1 開始条件の判定結果を dev-graph へ引き渡す
- Rollback trigger and steps: Stage 1 開始条件 (H7 成立) が満たされないと判定された場合、release-record.md に不成立理由を記録し、fail-closed として Stage 1 系 feature の着手を保留する。decision record 登録依頼が C01 writer 側で却下された場合は P07 (受入) へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/spec-state.json decisions[] (D1-D6 形式), system-spec/00-requirements-definition.md I9 (Stage 1 開始条件)
- Detailed authoritative source: docs/features/feat-stage0-distribution-gate/runbook.md, docs/features/feat-stage0-distribution-gate/acceptance-record.md
- Architecture: arch-harness-hub-infrastructure (architecture/harness-hub-infrastructure.md)
- Feature: feat-stage0-distribution-gate
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-STAGE0-DISTRIBUTION-GATE-P12
