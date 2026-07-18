# System task overlay: 品質保証 — CI 品質ゲート (axe/tenant 分離/認可/AI キュー lease/監査) の確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-feedback-loop (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-feedback-loop", "studio-extension", "feedback-loop", "quality-assurance"]
- related_nodes: ["feat-feedback-loop", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
- parent_feature: feat-feedback-loop
- phase_ref: P09
- classification: confidence=0.85, reason="P06 テスト結果と P08 migration 結果を踏まえ CI 品質ゲート (axe/tenant 分離/認可/AI キュー lease/監査記録) の充足を確認する P09 タスク", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-feedback-loop/sys-feedback-loop-p09.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P06 テスト結果と P08 migration 結果を踏まえ、CI 品質ゲート (axe アクセシビリティ検証、feedbacks テーブルの tenant 分離、feedback API の認可単一ミドルウェア適合、AiJob(`feedback_response`) の lease 失効/attempt 上限処理、feedback.status_change/ai_job.complete 監査 event 記録) の充足を確認する。

## 背景

S14 は design system 共通部品を消費するため axe 違反 0 を CI 必須ゲートとする (qa-021)。feedbacks テーブルは D4 に従い tenant 分離テストを CI 必須とする (system-spec/database.md qa-032)。AiJob(`feedback_response`) は lease 10 分・attempt 3 で dead (admin 通知) となる状態機械 (§5.5) であり、lease 失効時の queued への復帰・dead 到達時の admin 通知が正しく動作することを CI で確認する。監査 event (`feedback.status_change`, `ai_job.complete`) の記録漏れがないことも品質ゲートに含める。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-feedback-loop, arch-harness-hub-backend, arch-harness-hub-frontend
- Entry gate: sys-feedback-loop-p08 の refactoring-migration-note.md が作成済みであること。かつ .dev-graph/staging/goal-spec.json の feature_context_digest が sha256:072f4574b7156af35459d941d9c0655fe9f50453e151420d6e98fcb7da5499c3 に一致し、features/feat-feedback-loop.md の confirmation_status が confirmed であること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: applicable + verify: S14 の axe アクセシビリティ検証を実行する
- Backend: applicable + verify: feedback REST ハンドラのカバレッジと AiJob lease/attempt 処理を検証する
- API: applicable + verify: feedback zod スキーマと認可単一ミドルウェアの適合を検証する
- Data: applicable + verify: feedbacks テーブルの tenant 分離を検証する
- Infrastructure: N/A: 追加インフラの品質ゲートは不要
- Security: applicable + verify: feedback.status_change/ai_job.complete 監査 event 記録漏れがないことを検証する
- Quality: applicable + change: quality-assurance-report.md に axe/tenant 分離/認可/AI キュー lease/監査の 5 種の確認結果を記録する
- Documentation: applicable + change: docs/features/feat-feedback-loop/quality-assurance-report.md を新規作成する
- Operations: applicable + verify: AI キュー lease 失効時の queued 復帰・dead 到達時の admin 通知動作を確認する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: N/A: 本 task は品質ゲート確認のみで実変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-feedback-loop/quality-assurance-report.md (axe/tenant 分離/認可/AI キュー lease/監査の 5 種の確認結果)
- Consumed artifacts: docs/features/feat-feedback-loop/test-run-report.md, docs/features/feat-feedback-loop/refactoring-migration-note.md, docs/screen-inventory.md
- Write scope/touches: docs/features/feat-feedback-loop/quality-assurance-report.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-feedback-loop-p09) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-feedback-loop-p09 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-feedback-loop-p09) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: sys-feedback-loop-p08 完了後に着手する。resource_scope (docs/features/feat-feedback-loop/quality-assurance-report.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 未達品質ゲートの原因修正 (原因 task への差し戻しのみ行う。本 task は確認のみ)
- axe/lint ツール自体の設定変更 (feat-hub-foundation の共通 CI 設定を使用する)

## Verification and evidence

- Automated commands: `pnpm --filter hub lint`, `pnpm --filter hub test -- --coverage`, `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: quality-assurance-report.md に axe/tenant 分離/認可/AI キュー lease/監査の 5 種の確認結果が記録されている

## Rollout and rollback

- Rollout: quality-assurance-report.md に全件充足を確認し、P10 最終独立レビューへ引き継ぐ
- Rollback trigger and steps: 未達の品質ゲートがある場合、quality-assurance-report.md に未達理由を記録し、原因が実装にある場合は sys-feedback-loop-p05 を再実行対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/ui-ux.md (qa-021 S14), system-spec/security.md (qa-025), system-spec/database.md (qa-032)
- Detailed authoritative source: docs/backend-spec.md (§3.8 監査対象, §5.5 AiJob 状態機械), docs/screen-inventory.md (S14)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-feedback-loop
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-feedback-loop-p08
