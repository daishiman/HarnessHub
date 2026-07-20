# System task overlay: 検証方式・artifact 構成・実機 E2E 手順の独立設計レビュー

## Machine-readable registration fields

- feature_package_id: feature-package/feat-stage0-distribution-gate (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-stage0-distribution-gate", "macro-feature", "quality", "design-review"]
- related_nodes: ["feat-stage0-distribution-gate", "arch-harness-hub-infrastructure"]
- parent_feature: feat-stage0-distribution-gate
- phase_ref: P03
- classification: confidence=0.87, reason="P02 の architecture decision を P02 実行者から独立した視点で検証する P03 レビュータスク", candidates=[{artifact_kind: task, confidence: 0.87, candidate_path: tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p03.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P02 で確定した 5 件の architecture decision (URL 型 marketplace 検証方式・npm source の source type としての検証方式・Bootstrap Installer 試作方式・macOS/Windows 実機 E2E 手順・decision record 登録経路) を、設計立案者とは独立した視点でレビューし、qa-001 (作者環境 macOS+Windows 限定) と C1/C2 (体制・コスト制約) との整合性を確認する。

## 背景

Stage 0 technical gate (H7) は Stage 1 投資判断の前提となる fail-closed ゲートであるため、検証方式そのものに設計上の見落としがあれば H7 の判定結果自体が信頼できなくなる。本 task は、P02 の architecture decision が (a) 3 経路それぞれについて実機検証で成立/不成立を判定可能な具体性を持つか (b) macOS/Windows 実機 E2E 手順が qa-001 の対象環境限定と整合しているか (c) 検証体制・費用が C1 (提供者 1 名 + AI) / C2 (無料枠内) に収まる設計になっているか (d) 採用経路の decision record 登録経路が system-spec/spec-state.json decisions[] の既存形式と整合しているか、を第三者的に検証する。指摘があれば P02 へ差し戻し、なければ P04 のテストファースト設計へ引き継ぐ。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-stage0-distribution-gate, arch-harness-hub-infrastructure
- Entry gate: docs/features/feat-stage0-distribution-gate/architecture-decision-record.md が P02 完了時点で存在すること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task はレビューのみで frontend 実装物を変更しない
- Backend: N/A: 本 feature は Hub backend の変更を伴わない
- API: N/A: 本 feature は API 契約の新設を伴わない
- Data: N/A: 永続データストアのスキーマ変更を伴わない
- Infrastructure: applicable + change: 3 経路検証方式の実行可能性 (実機で成立/不成立を判定できる具体性) をレビューする
- Security: N/A: セキュリティ観点の詳細検証は P09 で扱う
- Quality: applicable + change: qa-001 (作者環境 macOS+Windows 限定) と C1/C2 (体制・コスト制約) との整合性をレビューし、design-review-notes.md に記録する
- Documentation: applicable + change: docs/features/feat-stage0-distribution-gate/design-review-notes.md を新規作成する
- Operations: N/A: 運用手順の具体化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-infrastructure (P02 の architecture decision の正本参照)
- Deploy unit/environment: local-verification-only (レビューのみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task はレビューのみで実コードへの変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-stage0-distribution-gate/design-review-notes.md (P02 の 5 件の architecture decision 全ての妥当性検証結果)
- Consumed artifacts: docs/features/feat-stage0-distribution-gate/architecture-decision-record.md, .dev-graph/staging/goal-spec.json
- Write scope/touches: docs/features/feat-stage0-distribution-gate/design-review-notes.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-stage0-distribution-gate-p03) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-stage0-distribution-gate-p03 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-stage0-distribution-gate-p03) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-STAGE0-DISTRIBUTION-GATE-P02] のため P02 完了後に着手する。resource_scope (design-review-notes.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- Hub 本体の実装 (goal-spec scope_out)
- 課金・商用配布 (goal-spec scope_out)
- architecture decision 自体の再設計 (指摘事項は P02 へ差し戻し、本 task はレビューのみを担う)
- 実機での検証実行そのもの (本 task はレビューのみ。実行は P06 で扱う)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: design-review-notes.md に P02 の 5 件の architecture decision 全ての妥当性検証結果 (作者環境 macOS+Windows 限定 [qa-001] との整合、C1/C2 制約適合を含む) が記載されていること

## Rollout and rollback

- Rollout: design-review-notes.md を作成し P04 のテストファースト設計へ引き継ぐ
- Rollback trigger and steps: 3 経路検証方式または E2E 手順に重大な指摘が見つかった場合、design-review-notes.md に指摘内容を記録し P02 へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/spec-state.json qa_log (qa-001), system-spec/00-requirements-definition.md U8 制約 (C1, C2)
- Detailed authoritative source: docs/features/feat-stage0-distribution-gate/architecture-decision-record.md
- Architecture: arch-harness-hub-infrastructure (architecture/harness-hub-infrastructure.md)
- Feature: feat-stage0-distribution-gate
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-STAGE0-DISTRIBUTION-GATE-P02
