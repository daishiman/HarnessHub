# System task overlay: quality_constraints 8 件・acceptance 3 件に対応する実機検証ケースの設計

## Machine-readable registration fields

- feature_package_id: feature-package/feat-stage0-distribution-gate (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-stage0-distribution-gate", "macro-feature", "quality", "test-design"]
- related_nodes: ["feat-stage0-distribution-gate", "arch-harness-hub-infrastructure"]
- parent_feature: feat-stage0-distribution-gate
- phase_ref: P04
- classification: confidence=0.87, reason="quality_constraints 8 件と acceptance 3 件を実機検証ケースへ写像する P04 テストファースト設計タスク", candidates=[{artifact_kind: task, confidence: 0.87, candidate_path: tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p04.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P03 のレビューを経た architecture decision に基づき、goal-spec の quality_constraints 8 件と acceptance 3 件のそれぞれに対応する実機検証ケース (macOS/Windows 別チェックリストを含む) を test-design.md として設計する。この設計が P06 のテスト実行における唯一の検証基準となる。

## 背景

本 feature は実装物ではなく検証記録が成果物であるため、テストファースト設計は「何を実装する前にテストを書くか」ではなく「何を実機検証すれば H7 が成立したと判定できるか」を先に定義する形で適用する。quality_constraints の中には stage0-two-path-distribution-technical-gate-h7-qa003 (2 経路以上の成立検証) のように直接検証可能なものと、cost-zero-verification-within-free-tier-c2・solo-operator-ai-assisted-verification-c1 のように検証プロセス自体の性質を確認するものが混在するため、それぞれに適した検証ケース (実機操作手順、確認コマンド、期待結果、macOS/Windows どちらで実施するか) を個別に設計する。npm-source-official-support-changelog-recheck-claude-code-plugins に対応するケースには、検証実行直前の code.claude.com changelog 再照合手順を含める。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-stage0-distribution-gate, arch-harness-hub-infrastructure
- Entry gate: docs/features/feat-stage0-distribution-gate/design-review-notes.md が P03 完了時点で存在し、重大な指摘がない状態であること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は検証ケース設計のみで frontend 実装物を変更しない
- Backend: N/A: 本 feature は Hub backend の変更を伴わない
- API: N/A: 本 feature は API 契約の新設を伴わない
- Data: N/A: 永続データストアのスキーマ変更を伴わない
- Infrastructure: applicable + change: 3 経路それぞれの実機検証手順 (marketplace 追加操作・npm source 経由の plugin 解決確認・Bootstrap Installer 実行) をケースとして具体化する
- Security: N/A: セキュリティ観点の詳細検証は P09 で扱う
- Quality: applicable + change: quality_constraints 8 件と acceptance 3 件全てに対応する実機検証ケースを設計し、test-design.md に記録する
- Documentation: applicable + change: docs/features/feat-stage0-distribution-gate/test-design.md を新規作成する
- Operations: N/A: 運用手順の具体化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-infrastructure (P02/P03 で確定・レビュー済みの architecture decision の正本参照)
- Deploy unit/environment: local-verification-only (テスト設計のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は検証ケース設計のみで実コードへの変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-stage0-distribution-gate/test-design.md (quality_constraints 8 件・acceptance 3 件に対応する実機検証ケース一覧。macOS/Windows 別チェックリストを含む)
- Consumed artifacts: docs/features/feat-stage0-distribution-gate/design-review-notes.md, .dev-graph/staging/goal-spec.json
- Write scope/touches: docs/features/feat-stage0-distribution-gate/test-design.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-stage0-distribution-gate-p04) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-stage0-distribution-gate-p04 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-stage0-distribution-gate-p04) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-STAGE0-DISTRIBUTION-GATE-P03] のため P03 完了後に着手する。resource_scope (test-design.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- Hub 本体の実装 (goal-spec scope_out)
- 課金・商用配布 (goal-spec scope_out)
- 検証用 artifact の実作成 (本 task はケース設計のみ。実作成は P05 で扱う)
- 実機での検証実行そのもの (本 task はケース設計のみ。実行は P06 で扱う)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: test-design.md に quality_constraints 8 件と acceptance 3 件全てに対応する実機検証ケース (macOS/Windows 別チェックリストを含む) が記載されていること

## Rollout and rollback

- Rollout: test-design.md を作成し P05 の実装 (検証用 artifact 作成) へ引き継ぐ
- Rollback trigger and steps: quality_constraints と検証ケースの対応漏れが判明した場合、test-design.md の対応表を修正し不足カテゴリを追加する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: .dev-graph/staging/goal-spec.json quality_constraints (8 件), acceptance (3 件)
- Detailed authoritative source: docs/features/feat-stage0-distribution-gate/design-review-notes.md
- Architecture: arch-harness-hub-infrastructure (architecture/harness-hub-infrastructure.md)
- Feature: feat-stage0-distribution-gate
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-STAGE0-DISTRIBUTION-GATE-P03
