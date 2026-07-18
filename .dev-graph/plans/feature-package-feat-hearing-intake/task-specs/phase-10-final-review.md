# System task overlay: 最終独立レビュー — feature 全体の confirmation 前最終点検

## Machine-readable registration fields

- feature_package_id: feature-package/feat-hearing-intake (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-hearing-intake", "studio-extension", "async-ai-queue", "final-review"]
- related_nodes: ["feat-hearing-intake", "arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data"]
- parent_feature: feat-hearing-intake
- phase_ref: P10
- classification: confidence=0.87, reason="feature-execution-package-contract.md §7 が定める最終独立レビューゲートに従い、quality_constraints 10 件全件を P01-P09 の成果物に照らして最終点検する P10 タスク", candidates=[{artifact_kind: task, confidence: 0.87, candidate_path: tasks/feat-hearing-intake/sys-hearing-intake-p10.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

feature-execution-package-contract.md §7 が定める最終独立レビューゲートに従い、goal-spec の quality_constraints 10 件全件を P01-P09 の成果物に照らして最終点検し、feature 全体が confirmation へ進める状態にあるかを判定する。

## 背景

P03 の設計レビューは P02 の設計単体を対象とするのに対し、P10 は P01-P09 全体を横断し、実装・テスト・受入・migration・品質保証の各成果物が quality_constraints 10 件を過不足なく満たしているかを確認する最終ゲートである。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-hearing-intake, sys-hearing-intake-p09
- Entry gate: docs/features/feat-hearing-intake/quality-assurance-report.md が P09 で作成済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は横断レビューのみで frontend 実装物を変更しない
- Backend: N/A: 本 task は横断レビューのみで backend 実装物を変更しない
- API: N/A: API 契約の変更を伴わない
- Data: N/A: データ構造の変更を伴わない
- Infrastructure: N/A: インフラ変更を伴わない
- Security: applicable + change: quality_constraints 10 件のうち ai-queue-authz-payload-secret-ban・markdown-sanitize-sec7・estimate-server-computed-only・authz-single-mw-role-table の 4 件を P05/P06/P09 成果物と突合する
- Quality: applicable + change: quality_constraints 10 件全件の充足状況を final-review-notes.md へ判定記録する
- Documentation: applicable + change: docs/features/feat-hearing-intake/final-review-notes.md を新規作成する
- Operations: N/A: 運用手順そのものの点検は P12 の成果物確定後に行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend, arch-harness-hub-data
- Deploy unit/environment: cloudflare-workers/hub (横断レビューのみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task はレビューのみで対象物への変更を行わない

## 成果物

- Produced artifacts: docs/features/feat-hearing-intake/final-review-notes.md (quality_constraints 10 件全件の充足判定と根拠成果物への参照)
- Consumed artifacts: docs/features/feat-hearing-intake/requirements-baseline.md, docs/features/feat-hearing-intake/architecture-decision-record.md, docs/features/feat-hearing-intake/design-review-notes.md, docs/features/feat-hearing-intake/test-run-report.md, docs/features/feat-hearing-intake/acceptance-report.md, docs/features/feat-hearing-intake/refactoring-migration-note.md, docs/features/feat-hearing-intake/quality-assurance-report.md
- Write scope/touches: docs/features/feat-hearing-intake/final-review-notes.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-hearing-intake-p10) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-hearing-intake-p10 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-hearing-intake-p10) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[sys-hearing-intake-p09] が完了するまで着手しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- quality_constraints 未充足時の実装修正 (該当 task を再実行対象として差し戻す)
- feature の confirmation 判定そのもの (system-dev-plan-evaluator の C12 判定と dev-graph の C11 promotion の scope)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: final-review-notes.md に quality_constraints 10 件全件それぞれの充足判定と根拠成果物への参照が記載されている

## Rollout and rollback

- Rollout: quality_constraints 10 件全件充足を確認後 P11 のエビデンス収集へ引き継ぐ
- Rollback trigger and steps: いずれかの quality_constraint が未充足の場合、final-review-notes.md に未充足理由を記録し、原因に応じて該当 task (P02/P05/P08/P09 等) を再実行対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/ui-ux.md (qa-021), system-spec/frontend.md (qa-022), system-spec/backend.md (qa-023), system-spec/database.md (qa-024), system-spec/security.md (qa-025)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md), arch-harness-hub-data (architecture/harness-hub-data.md)
- Feature: feat-hearing-intake
- Phase doc: N/A: feature-execution-package-contract.md §7 が最終独立レビューゲートの正本であり、本 run は個別 phase lifecycle 文書を追加生成しない
- Dependencies: sys-hearing-intake-p09
