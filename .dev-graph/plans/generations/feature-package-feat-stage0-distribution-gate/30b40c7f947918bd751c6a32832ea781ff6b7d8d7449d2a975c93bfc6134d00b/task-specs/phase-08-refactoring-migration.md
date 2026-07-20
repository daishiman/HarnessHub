# System task overlay: 検証 prototype 資産の整理 (N/A 判断を含む)

## Machine-readable registration fields

- feature_package_id: feature-package/feat-stage0-distribution-gate (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-stage0-distribution-gate", "macro-feature", "infrastructure", "refactor-migration"]
- related_nodes: ["feat-stage0-distribution-gate", "arch-harness-hub-infrastructure"]
- parent_feature: feat-stage0-distribution-gate
- phase_ref: P08
- classification: confidence=0.84, reason="本 feature は永続実装コードを持たないため、不採用経路の試作 artifact 整理と採用経路 artifact の引き継ぎ整理に読み替える required-node タスク", candidates=[{artifact_kind: task, confidence: 0.84, candidate_path: tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p08.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P07 で確定した受入結果に基づき、不採用と判定された経路の試作 artifact を整理 (削除または保留の判断) し、採用経路の artifact を P12 の runbook へ引き継ぐための最終整理を行う。本 feature は恒久的な実装コードや DB migration を持たないため、本 task は feature-execution-package-contract.md §3 が定める N/A-with-reason パターンとして適用される。

## 背景

feature-execution-package-contract.md の P08 (リファクタリング/マイグレーション) は、通常は既存コードの移植・DB migration・技術的負債解消を担う。しかし本 feature は Skill 配布経路の実機検証のみを scope_in とし、Hub 本体の実装や DB スキーマ変更を scope_out とするため、通常の意味でのリファクタリング/マイグレーション対象コードが存在しない。そのため本 task は、P05 で作成した 3 経路分の試作 artifact のうち P07 で不採用と判定された経路の扱い (削除するか、将来の再検証のために保留するかの判断) と、採用経路の artifact を P12 runbook へどう引き継ぐかの整理に読み替えて適用し、恒久コード移植や DB migration が本 feature の scope_out であることを明記する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-stage0-distribution-gate, arch-harness-hub-infrastructure
- Entry gate: docs/features/feat-stage0-distribution-gate/acceptance-record.md が P07 完了時点で存在すること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 feature は frontend 実装物を持たない
- Backend: N/A: 本 feature は Hub backend の変更を伴わない
- API: N/A: 本 feature は API 契約の新設を伴わない
- Data: N/A: 本 feature は永続データストアのスキーマ変更を伴わない。DB migration は scope_out である
- Infrastructure: applicable + change: 不採用経路の試作 artifact の整理判断 (削除/保留) を本 task で行う
- Security: N/A: セキュリティ観点の詳細検証は P09 で扱う
- Quality: applicable + change: 整理判断の根拠と、恒久コード移植/DB migration が scope_out であることを明記する
- Documentation: applicable + change: docs/features/feat-stage0-distribution-gate/refactoring-migration-note.md を新規作成する
- Operations: N/A: 運用手順の具体化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-infrastructure (P02 の architecture decision の正本参照)
- Deploy unit/environment: local-verification-only (整理作業のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 feature は DB migration や既存システムとの互換性維持対象コードを持たない

## 成果物

- Produced artifacts: docs/features/feat-stage0-distribution-gate/refactoring-migration-note.md (不採用経路 artifact の削除/保留判断、採用経路 artifact の P12 引き継ぎ整理、恒久コード移植/DB migration が scope_out であることの明記)
- Consumed artifacts: docs/features/feat-stage0-distribution-gate/acceptance-record.md, docs/features/feat-stage0-distribution-gate/verification-artifacts/
- Write scope/touches: docs/features/feat-stage0-distribution-gate/refactoring-migration-note.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-stage0-distribution-gate-p08) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-stage0-distribution-gate-p08 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-stage0-distribution-gate-p08) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-STAGE0-DISTRIBUTION-GATE-P07] のため P07 完了後に着手する。resource_scope (refactoring-migration-note.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- Hub 本体の実装 (goal-spec scope_out)
- 課金・商用配布 (goal-spec scope_out)
- DB migration・既存コードの移植 (本 feature は永続実装コードを持たないため対象外)
- 採用経路の runbook 具体化そのもの (本 task は引き継ぎ整理のみ。具体化は P12 で扱う)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: refactoring-migration-note.md に不採用経路の試作 artifact の削除/保留判断・採用経路 artifact の P12 runbook への引き継ぎ整理・恒久コード移植や DB migration が本 feature の scope_out であることの明記の 3 点が記載されていること

## Rollout and rollback

- Rollout: refactoring-migration-note.md を作成し P09 の品質保証へ引き継ぐ
- Rollback trigger and steps: 整理により採用経路の検証再現性が損なわれることが判明した場合、削除した artifact を復元し refactoring-migration-note.md に理由を記録した上で本 task を再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-stage0-distribution-gate.context.json` (`sha256:6b7340ade5290ee9e3c5bb63d22d3381684b28817303152c6240906ff050fb0a`)
- Phase responsibility: migration・互換性・refactor の適用要否を実行し、N/A でも根拠を残す。
- Purpose: Stage 1 へ投資する前に、Skill 配布の成立経路 (URL 型 marketplace / npm source / Bootstrap Installer) と Windows 実機 E2E を検証し、成立経路を確定する (仮説 H7)
- Goal: 最小 artifact で 2 経路以上の配布検証が完了し、採用経路が根拠付きで記録された状態
- Scope in (all items are in-scope for the package; this phase owns the subset matching its responsibility):
- URL 型 marketplace 検証
- npm source 検証 (公式サポート確認済み)
- Bootstrap Installer 試作
- Windows/macOS 実機 E2E
- 採用経路の決定記録
- Scope out:
- Hub 本体の実装
- 課金・商用配布
- Acceptance (P04/P06/P07/P10/P11 must preserve exact coverage):
- 2 経路以上の実機検証記録が存在する
- 採用経路が decision record として登録される
- Windows E2E が成功する
- Architecture/source refs:
- architecture/harness-hub-infrastructure.md
- specs/harness-hub-system-specification.md

This section is the current source closure and supersedes older counts or wording in this task when they conflict with the pinned feature context.

## 参照情報

- System specification: goal-spec.json scope_out (Hub 本体の実装, 課金・商用配布)
- Detailed authoritative source: docs/features/feat-stage0-distribution-gate/acceptance-record.md
- Architecture: arch-harness-hub-infrastructure (architecture/harness-hub-infrastructure.md)
- Feature: feat-stage0-distribution-gate
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-STAGE0-DISTRIBUTION-GATE-P07
