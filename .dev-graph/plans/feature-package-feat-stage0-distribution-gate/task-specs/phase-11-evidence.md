# System task overlay: P06/P07/P09/P10 の証跡集約と再現手順の確立

## Machine-readable registration fields

- feature_package_id: feature-package/feat-stage0-distribution-gate (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-stage0-distribution-gate", "macro-feature", "quality", "evidence"]
- related_nodes: ["feat-stage0-distribution-gate", "arch-harness-hub-infrastructure"]
- parent_feature: feat-stage0-distribution-gate
- phase_ref: P11
- classification: confidence=0.84, reason="P06/P07/P09/P10 の実機検証証跡を集約し将来の Stage 1 着手判断者が再現可能な形で保存する P11 証跡タスク", candidates=[{artifact_kind: task, confidence: 0.84, candidate_path: tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p11.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P06 (テスト実行)・P07 (受入)・P09 (品質保証)・P10 (最終レビュー) で得られた実機検証証跡を集約し、第三者 (将来の Stage 1 着手判断者) が再現可能な形で evidence-summary.md に保存する。

## 背景

Stage 0 technical gate (H7) の判定結果は一度きりの検証で終わらせるのではなく、後から Stage 1 着手判断者が「なぜその経路が採用されたのか」「どの実機でどう検証したのか」を再現・追跡できる必要がある。本 task は quality_constraints 8 件それぞれについて、対応する実機検証手順・確認コマンド・実際の結果を一箇所にまとめ、単なる結果の要約ではなく再現手順として機能する形式で記録する。npm-source-official-support-changelog-recheck-claude-code-plugins のような時間経過で前提が変化しうる項目については、再検証が必要になった際の再照合手順も含める。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-stage0-distribution-gate, arch-harness-hub-infrastructure
- Entry gate: docs/features/feat-stage0-distribution-gate/final-review-record.md が P10 完了時点で存在すること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は証跡集約のみで frontend 実装物を変更しない
- Backend: N/A: 本 feature は Hub backend の変更を伴わない
- API: N/A: 本 feature は API 契約の新設を伴わない
- Data: N/A: 永続データストアのスキーマ変更を伴わない
- Infrastructure: N/A: 本 task は集約のみでインフラ変更を伴わない
- Security: N/A: セキュリティ観点は P09 で保証済みであり、本 task はその証跡を集約するのみ
- Quality: applicable + change: quality_constraints 8 件それぞれの再現手順と結果を evidence-summary.md に集約する
- Documentation: applicable + change: docs/features/feat-stage0-distribution-gate/evidence-summary.md を新規作成する
- Operations: N/A: 運用手順の具体化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-infrastructure (P02 の architecture decision の正本参照)
- Deploy unit/environment: local-verification-only (証跡集約のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は証跡集約のみで実コードへの変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-stage0-distribution-gate/evidence-summary.md (quality_constraints 8 件の再現手順と結果の集約)
- Consumed artifacts: docs/features/feat-stage0-distribution-gate/test-run-results.md, docs/features/feat-stage0-distribution-gate/acceptance-record.md, docs/features/feat-stage0-distribution-gate/quality-assurance-report.md, docs/features/feat-stage0-distribution-gate/final-review-record.md
- Write scope/touches: docs/features/feat-stage0-distribution-gate/evidence-summary.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-stage0-distribution-gate-p11) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-stage0-distribution-gate-p11 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-stage0-distribution-gate-p11) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-STAGE0-DISTRIBUTION-GATE-P10] のため P10 完了後に着手する。resource_scope (evidence-summary.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- Hub 本体の実装 (goal-spec scope_out)
- 課金・商用配布 (goal-spec scope_out)
- 証跡の再取得・再検証そのもの (欠落や矛盾があれば該当 phase へ差し戻す。本 task は集約のみ)
- runbook としての onboarding/更新導線/障害時対応手順の具体化 (本 task は再現手順としての証跡集約のみ。運用手順化は P12 で扱う)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: evidence-summary.md に quality_constraints 8 件それぞれの再現手順 (実機検証手順・確認コマンド) と対応する結果が記載されていること

## Rollout and rollback

- Rollout: evidence-summary.md を作成し P12 の文書化・runbook 作成へ引き継ぐ
- Rollback trigger and steps: 集約対象の証跡に欠落・矛盾が見つかった場合、該当する P06/P07/P09/P10 へ差し戻し再取得を依頼する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: .dev-graph/staging/goal-spec.json quality_constraints (8 件)
- Detailed authoritative source: docs/features/feat-stage0-distribution-gate/final-review-record.md
- Architecture: arch-harness-hub-infrastructure (architecture/harness-hub-infrastructure.md)
- Feature: feat-stage0-distribution-gate
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-STAGE0-DISTRIBUTION-GATE-P10
