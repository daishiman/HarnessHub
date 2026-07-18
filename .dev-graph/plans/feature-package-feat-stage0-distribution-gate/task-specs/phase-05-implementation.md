# System task overlay: 最小 skill package・marketplace.json・Bootstrap Installer 試作の作成

## Machine-readable registration fields

- feature_package_id: feature-package/feat-stage0-distribution-gate (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-stage0-distribution-gate", "macro-feature", "infrastructure", "implementation"]
- related_nodes: ["feat-stage0-distribution-gate", "arch-harness-hub-infrastructure"]
- parent_feature: feat-stage0-distribution-gate
- phase_ref: P05
- classification: confidence=0.85, reason="P02/P04 で確定した設計・検証ケースに基づき最小 skill package・marketplace.json・Bootstrap Installer 試作を作成する P05 実装タスク", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p05.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P04 の test-design.md に列挙された実機検証ケースを実行可能にするため、最小 skill package・URL 型 marketplace 用 marketplace.json・Bootstrap Installer 試作を C2 (無料枠内) で作成する。本 task の成果物は本番配布物ではなく、H7 検証のためだけに存在する使い捨て可能な最小構成の artifact である。

## 背景

本 feature は Hub 本体の実装を scope_out とする検証 feature であるため、P05 (実装) は通常の application-code 実装ではなく「検証を成立させるための最小限の artifact 一式」を意味する。具体的には、(1) marketplace.json から参照可能な最小構成の skill package (name/description/最小限の instructions のみを持つダミー相当の Skill) 、(2) URL 型 marketplace の native source 解決を検証するための marketplace.json (npm source を plugin 本体配布の外部 source として組み込む構成を含む)、(3) marketplace 機構を経由しない Bootstrap Installer 試作 (シェルスクリプト相当の展開手順) の 3 種を作成する。既存の installers/ 配下 (harness-creator kit 配布用) とは別の目的・別のスコープであるため、これらは既存の installers/ ディレクトリを変更せず、docs/features/feat-stage0-distribution-gate/verification-artifacts/ 配下に独立した検証専用ディレクトリとして新設する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-stage0-distribution-gate, arch-harness-hub-infrastructure
- Entry gate: docs/features/feat-stage0-distribution-gate/test-design.md が P04 完了時点で存在すること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は検証用 artifact 作成のみで frontend 実装物を変更しない
- Backend: N/A: 本 feature は Hub backend の変更を伴わない
- API: N/A: 本 feature は API 契約の新設を伴わない
- Data: N/A: 永続データストアのスキーマ変更を伴わない
- Infrastructure: applicable + change: 最小 skill package・marketplace.json・Bootstrap Installer 試作という 3 種の検証用 artifact を新規作成する
- Security: N/A: artifact のセキュリティ観点の詳細検証は P09 で扱う
- Quality: applicable + change: P04 の test-design.md に列挙された全検証ケースに対応する検証対象一式が揃っていることを implementation-notes.md に記載する
- Documentation: applicable + change: docs/features/feat-stage0-distribution-gate/implementation-notes.md を新規作成する
- Operations: N/A: 運用手順の具体化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-infrastructure (P02 の architecture decision の正本参照)
- Deploy unit/environment: local-verification-only (作成した artifact はローカル検証用であり cloudflare-workers/hub へはデプロイしない)
- Compatibility/migration/backfill: N/A: 本 feature は既存 installers/ (harness-creator kit 配布用) を変更しない別スコープの新規 artifact 作成である

## 成果物

- Produced artifacts: docs/features/feat-stage0-distribution-gate/verification-artifacts/minimal-skill-package/ (最小 skill package), docs/features/feat-stage0-distribution-gate/verification-artifacts/marketplace.json (URL 型 marketplace 用。npm source を plugin 本体配布の外部 source として組み込む構成を含む), docs/features/feat-stage0-distribution-gate/verification-artifacts/bootstrap-installer-prototype/ (Bootstrap Installer 試作), docs/features/feat-stage0-distribution-gate/implementation-notes.md (作成内容と P04 検証ケースとの対応関係)
- Consumed artifacts: docs/features/feat-stage0-distribution-gate/test-design.md, docs/features/feat-stage0-distribution-gate/architecture-decision-record.md, system-spec/fetched-references.json
- Write scope/touches: docs/features/feat-stage0-distribution-gate/verification-artifacts/minimal-skill-package/, docs/features/feat-stage0-distribution-gate/verification-artifacts/marketplace.json, docs/features/feat-stage0-distribution-gate/verification-artifacts/bootstrap-installer-prototype/, docs/features/feat-stage0-distribution-gate/implementation-notes.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-stage0-distribution-gate-p05) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-stage0-distribution-gate-p05 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-stage0-distribution-gate-p05) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-STAGE0-DISTRIBUTION-GATE-P04] のため P04 完了後に着手する。resource_scope (verification-artifacts/ 配下) が他 task の active lease や他 feature の write_scope (installers/ 等) と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- Hub 本体の実装 (goal-spec scope_out)
- 課金・商用配布 (goal-spec scope_out)
- 既存 installers/ ディレクトリ (harness-creator kit 配布用) の変更 (別スコープのため対象外)
- 実機での検証実行そのもの (本 task は artifact 作成のみ。実行は P06 で扱う)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: docs/features/feat-stage0-distribution-gate/verification-artifacts/ 配下に最小 skill package・marketplace.json・Bootstrap Installer 試作が作成され、implementation-notes.md に P04 の test-design.md に列挙された全検証ケースに対応する検証対象一式が揃っていることが記載されていること

## Rollout and rollback

- Rollout: verification-artifacts/ 一式と implementation-notes.md を作成し P06 のテスト実行へ引き継ぐ
- Rollback trigger and steps: 作成した artifact が P02 の architecture decision と矛盾する場合、該当 artifact を削除し P02 の設計に沿って再作成する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/fetched-references.json claude-code-plugins entry
- Detailed authoritative source: docs/features/feat-stage0-distribution-gate/test-design.md, docs/features/feat-stage0-distribution-gate/architecture-decision-record.md
- Architecture: arch-harness-hub-infrastructure (architecture/harness-hub-infrastructure.md)
- Feature: feat-stage0-distribution-gate
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-STAGE0-DISTRIBUTION-GATE-P04
