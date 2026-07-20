# System task overlay: エビデンス収集 — 再現可能な検証証跡の集約

## Machine-readable registration fields

- feature_package_id: feature-package/feat-build-pipeline-board (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-build-pipeline-board", "studio-extension", "build-pipeline-board", "evidence"]
- related_nodes: ["feat-build-pipeline-board", "arch-harness-hub-frontend", "arch-harness-hub-backend"]
- parent_feature: feat-build-pipeline-board
- phase_ref: P11
- classification: confidence=0.84, reason="P06/P07/P09/P10 の検証結果を再現可能な証跡として索引化する P11 タスク", candidates=[{artifact_kind: task, confidence: 0.84, candidate_path: tasks/feat-build-pipeline-board/sys-build-pipeline-board-p11.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P06/P07/P09/P10 の検証結果 (テスト実行結果・受入判定・品質保証結果・最終レビュー結果) を再現可能な証跡として索引化し、docs/features/feat-build-pipeline-board/evidence/ 配下に集約する。

## 背景

feature-execution-package-contract.md はエビデンス収集 (P11) を必須工程と定めており、各成果物への参照と再実行コマンドを索引化することで、後続の監査・トラブルシューティング時に検証結果を再現可能にする。本 feature では特に工程遷移 admin 限定監査 (SEC2/SEC6) と PublishRequest 整合 (B4) の検証証跡が監査対応上重要である。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-build-pipeline-board, arch-harness-hub-frontend, arch-harness-hub-backend
- Entry gate: sys-build-pipeline-board-p10 の final-review-notes.md で quality_constraints 6 件全件の充足判定が記録済みであること。かつ .dev-graph/staging/goal-spec.json の feature_context_digest が sha256:eeed295d50359e11ac8aee84800def3ad3399cee866ab5b4dc2712116c9a4441 に一致し、features/feat-build-pipeline-board.md の confirmation_status が confirmed であること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task はエビデンス索引化のみで frontend 実装物を変更しない
- Backend: N/A: 本 task はエビデンス索引化のみで backend 実装物を変更しない
- API: N/A
- Data: N/A
- Infrastructure: N/A
- Security: applicable + review: 工程遷移 admin 限定監査 (SEC2/SEC6) と PublishRequest 整合 (B4) の証跡が index.md から辿れることを確認する
- Quality: applicable + change: evidence/index.md から P06/P07/P09/P10 の各成果物へのリンクと再実行コマンドを索引化する
- Documentation: applicable + change: docs/features/feat-build-pipeline-board/evidence/ を新規作成する
- Operations: N/A

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub (本 task はエビデンス索引化のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task はエビデンス索引化のみで実 migration は伴わない

## 成果物

- Produced artifacts: docs/features/feat-build-pipeline-board/evidence/index.md (P06/P07/P09/P10 成果物への参照と再実行コマンドの索引)
- Consumed artifacts: docs/features/feat-build-pipeline-board/test-run-report.md, docs/features/feat-build-pipeline-board/acceptance-report.md, docs/features/feat-build-pipeline-board/quality-assurance-report.md, docs/features/feat-build-pipeline-board/final-review-notes.md
- Write scope/touches: docs/features/feat-build-pipeline-board/evidence/

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-build-pipeline-board-p11) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-build-pipeline-board-p11 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-build-pipeline-board-p11) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: sys-build-pipeline-board-p10 完了後に着手する。write_scope (docs/features/feat-build-pipeline-board/evidence/) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 新規検証の実施 (本 task は既存成果物の索引化のみを行う)
- 実装コードの修正

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: evidence/index.md から P06/P07/P09/P10 の各成果物へのリンクと、それぞれの再実行コマンドが辿れること

## Rollout and rollback

- Rollout: evidence/index.md を作成し、P12 ドキュメント/運用へ引き継ぐ
- Rollback trigger and steps: 参照先成果物が未整合 (欠落・矛盾) の場合、evidence/index.md に不整合箇所を記録し、該当する原因 task を再実行対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/security.md (qa-025 SEC2/SEC6)
- Detailed authoritative source: docs/backend-spec.md (§3.8 監査対象, §5.3 Build 状態機械)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-build-pipeline-board
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-build-pipeline-board-p10
