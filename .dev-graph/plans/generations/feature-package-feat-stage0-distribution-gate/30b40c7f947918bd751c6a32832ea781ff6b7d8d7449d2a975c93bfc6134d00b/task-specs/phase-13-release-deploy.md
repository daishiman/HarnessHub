# System task overlay: 採用経路の decision record C01 writer登録と Stage 1 開始条件判定

## Machine-readable registration fields

- feature_package_id: feature-package/feat-stage0-distribution-gate (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-stage0-distribution-gate", "macro-feature", "operations", "release-deploy"]
- related_nodes: ["feat-stage0-distribution-gate", "arch-harness-hub-infrastructure"]
- parent_feature: feat-stage0-distribution-gate
- phase_ref: P13
- classification: confidence=0.85, reason="本 feature は Hub 本体を持たないため実デプロイを行わない。採用経路の decision record C01 writer登録確定と Stage 1 開始条件判定に適用される release-deploy タスク", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p13.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

本 feature の最終 task として、採用経路の decision record C01 writer登録要求・適用receiptを確定し (実際の system-spec/spec-state.json decisions[] への書込は C01 writer コンポーネントが所有する)、H7 の成立結果に基づく Stage 1 開始条件の判定結果を release-record.md として確定する。

## 背景

本 feature は Hub 本体のデプロイを持たない検証 feature であるため、P13 (リリース/デプロイ) は通常の意味でのデプロイ作業ではなく、(1) Hub 本体の実デプロイが N/A であることの close-out 判断、(2) 採用経路の decision record C01 writer登録要求・適用receipt (id/question/status/options/評価軸/確定根拠。system-spec/spec-state.json decisions[] の既存形式 D1-D6 に倣う) の確定、(3) H7 (Skill 配布の成立経路) が Stage 0 で成立確認されたかどうかに基づく Stage 1 開始条件の判定、という 3 点を扱う feature-execution-package-contract.md の適用パターンとして実施する。H7 が不成立と判定された場合は fail-closed として Stage 1 系 feature の着手を保留する判断を明記する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-stage0-distribution-gate, arch-harness-hub-infrastructure
- Entry gate: docs/features/feat-stage0-distribution-gate/runbook.md が P12 完了時点で存在すること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 feature は frontend 実装物を持たない
- Backend: N/A: 本 feature は Hub backend の変更を伴わない
- API: N/A: 本 feature は API 契約の新設を伴わない
- Data: N/A: system-spec/spec-state.json decisions[] へのwrite authorityはC01単一writerに維持し、本taskはwriterを実行してstatus=applied receipt・decision exact lookup・after digestを取得する
- Infrastructure: N/A: 本 feature は cloudflare-workers/hub 等への追加インフラ新設を伴わない
- Security: N/A: セキュリティ観点は P09 で保証済み
- Quality: applicable + change: Stage 1 開始条件 (H7 成立) の判定結果を release-record.md に確定記録する
- Documentation: applicable + change: docs/features/feat-stage0-distribution-gate/release-record.md を新規作成する
- Operations: applicable + change: 採用経路の decision record C01 writer登録要求・適用receiptを確定し、C01 writer への引き渡し内容として整理する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-infrastructure (P02 の architecture decision の正本参照)
- Deploy unit/environment: N/A: 本 feature は Hub 本体の実デプロイを持たないため、cloudflare-workers/hub への deploy unit 割当は行わない
- Compatibility/migration/backfill: N/A: 本 task はC01 writer登録確定と判定のみで実コードへの変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-stage0-distribution-gate/release-record.md (Hub 本体実デプロイ N/A の close-out 判断、採用経路の decision record C01 writer登録要求・適用receipt、Stage 1 開始条件の判定結果), .dev-graph/cache/stage0-decision-registration-request.json, .dev-graph/cache/stage0-decision-registration-receipt.json, .dev-graph/cache/stage0-stage1-gate-receipt.json
- Consumed artifacts: docs/features/feat-stage0-distribution-gate/runbook.md, docs/features/feat-stage0-distribution-gate/acceptance-record.md, system-spec/spec-state.json, features/feat-stage0-distribution-gate.md
- Write scope/touches: docs/features/feat-stage0-distribution-gate/release-record.md, .dev-graph/cache/stage0-decision-registration-request.json, .dev-graph/cache/stage0-decision-registration-receipt.json, .dev-graph/cache/stage0-stage1-gate-receipt.json

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
- system-spec/spec-state.json decisions[] へのC01 writer内部実装の変更（scope out）。本taskはwriter実行とapplied receipt検証を担う
- Stage 1 系 feature 自体の起票・着手 (本taskはStage1実装を行わないが、Publisher/Dual Catalogのfeature depends_on登録とtracker edge parityを完了させる)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: release-record.md に N/A: 本 feature は Hub 本体の実デプロイを持たないため実デプロイなし、という close-out 判断、採用経路の decision record C01 writer登録要求・適用receipt (id/question/status/options/評価軸/確定根拠。system-spec/spec-state.json decisions[] への実書込は C01 writer 経由)、および Stage 1 開始条件 (H7 成立) の判定結果の 3 点が記載されていること. Normative evidence: 2経路実機記録、Windows/macOS E2E、C01 writer receipt、decision exact lookup、Publisher/Dual Catalog feature dependency、Beads edge parityを必須とする。

## Rollout and rollback

- Rollout: release-record.md を作成し、C01 writer への decision record C01 writer登録を発行し、Stage 1 開始条件の判定結果を dev-graph へ引き渡す
- Rollback trigger and steps: Stage 1 開始条件 (H7 成立) が満たされないと判定された場合、release-record.md に不成立理由を記録し、fail-closed として Stage 1 系 feature の着手を保留する。decision record C01 writer登録が C01 writerがstatus=appliedを返さない場合は P07 (受入) へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-stage0-distribution-gate.context.json` (`sha256:6b7340ade5290ee9e3c5bb63d22d3381684b28817303152c6240906ff050fb0a`)
- Phase responsibility: release/deploy/close-out と rollback 証跡を残し、N/A でも理由を確定する。
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

## Normative implementation closure (2026-07-19)

This section is normative for P13 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-stage0-distribution-gate.context.json; system-spec/spec-state.json decisions[] writer contract; H7 fail-closed contract
- Effective phase contract: P07は『P13で登録予定』をpass根拠にできない。採用経路decisionがC01単一writerへ登録され、writer receiptのstatus=applied、decision id/digest、spec-state after digestが確認されるまでP07/P10/P13とfeature完了をfail-closedにする。Stage1のPublisherとThin Dual Catalog双方のparent feature depends_onへ本featureを登録し、Beads edge parityまで確認する。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `.dev-graph/cache/stage0-decision-registration-request.json`
- `.dev-graph/cache/stage0-decision-registration-receipt.json`
- `.dev-graph/cache/stage0-stage1-gate-receipt.json`
- Mandatory evidence: 2経路実機記録、Windows/macOS E2E、C01 writer receipt、decision exact lookup、Publisher/Dual Catalog feature dependency、Beads edge parityを必須とする。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: system-spec/spec-state.json decisions[] (D1-D6 形式), system-spec/00-requirements-definition.md I9 (Stage 1 開始条件)
- Detailed authoritative source: docs/features/feat-stage0-distribution-gate/runbook.md, docs/features/feat-stage0-distribution-gate/acceptance-record.md
- Architecture: arch-harness-hub-infrastructure (architecture/harness-hub-infrastructure.md)
- Feature: feat-stage0-distribution-gate
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-STAGE0-DISTRIBUTION-GATE-P12
