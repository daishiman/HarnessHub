# System task overlay: ドキュメント/運用 — S14 運用手順・AI キュー運用・監査/通知運用の runbook 作成

## Machine-readable registration fields

- feature_package_id: feature-package/feat-feedback-loop (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-feedback-loop", "studio-extension", "feedback-loop", "documentation", "operations"]
- related_nodes: ["feat-feedback-loop", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
- parent_feature: feat-feedback-loop
- phase_ref: P12
- classification: confidence=0.85, reason="P11 のエビデンスを踏まえ S14 運用手順・AI キュー運用・監査/通知運用を runbook 化する P12 タスク", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-feedback-loop/sys-feedback-loop-p12.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P11 のエビデンスを踏まえ、S14 (一覧+フォーム) の日常運用手順、AiJob(`feedback_response`) キューの運用手順 (lease 失効時の対応、attempt 3 で dead 到達時の admin 通知対応)、feedback.status_change/ai_job.complete 監査運用手順、resolved 通知 (アプリ内+Resend) の到達確認・トラブルシュート手順を runbook 化する。

## 背景

運用開始後に AI キューの lease 失効や dead job (admin 通知対象) が発生した場合の対応手順、workspace-admin による status 変更操作の監査ログ確認手順、Resend メール不達時にもアプリ内通知で情報が欠けないことの確認手順を、実装・テスト担当以外の運用者が参照できる形で文書化する必要がある。修正版 publish が既存 PublishRequest フローへ接続される際の運用上の連携ポイント (feat-publish-pipeline との境界) も明記する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-feedback-loop, arch-harness-hub-backend, arch-harness-hub-frontend
- Entry gate: sys-feedback-loop-p11 の evidence/index.md が作成済みであること。かつ .dev-graph/staging/goal-spec.json の feature_context_digest が sha256:072f4574b7156af35459d941d9c0655fe9f50453e151420d6e98fcb7da5499c3 に一致し、features/feat-feedback-loop.md の confirmation_status が confirmed であること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: applicable + change: S14 運用手順 (一覧フィルタ・フォーム入力・ai_response 確認) を runbook に記載する
- Backend: applicable + change: feedback API・AiJob 連携の運用手順を runbook に記載する
- API: N/A: API 契約自体の変更は伴わない
- Data: N/A: データスキーマの変更は伴わない
- Infrastructure: N/A: feat-hub-foundation の既存デプロイ運用手順を参照するのみ
- Security: applicable + change: 監査ログ確認手順・AI キュー Device Flow token 運用手順を runbook に記載する
- Quality: applicable + change: runbook.md の記載が P11 エビデンスと整合していることを確認する
- Documentation: applicable + change: docs/features/feat-feedback-loop/runbook.md を新規作成する
- Operations: applicable + change: AI キュー lease 失効/dead job 対応手順、resolved 通知トラブルシュート手順を記載する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: N/A: 本 task は運用文書化のみで実変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-feedback-loop/runbook.md (S14 運用手順・AI キュー運用手順・監査運用手順・通知トラブルシュート手順の 4 項目)
- Consumed artifacts: docs/features/feat-feedback-loop/evidence/, docs/backend-spec.md, docs/user-journeys.md
- Write scope/touches: docs/features/feat-feedback-loop/runbook.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-feedback-loop-p12) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-feedback-loop-p12 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-feedback-loop-p12) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: sys-feedback-loop-p11 完了後に着手する。resource_scope (docs/features/feat-feedback-loop/runbook.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- feat-publish-pipeline 側の運用手順自体の作成 (本 task は接続ポイントの明記のみ)
- NotificationDispatcher 共通層自体の運用手順の作成 (owner=feat-hub-foundation。消費側の確認手順のみ記載する)
- 実装コードの変更

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: runbook.md に S14 運用手順・AI キュー運用手順・監査運用手順・通知トラブルシュート手順の 4 項目が記載されている

## Rollout and rollback

- Rollout: runbook.md を作成し、P13 リリース/デプロイへ引き継ぐ
- Rollback trigger and steps: runbook.md の記載が P11 エビデンスと矛盾する場合、矛盾箇所を記録し sys-feedback-loop-p11 を再確認対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/ui-ux.md (qa-021 S14), system-spec/00-requirements-definition.md (D5/D6), system-spec/security.md (qa-025)
- Detailed authoritative source: docs/backend-spec.md (§4.7 feedback API, §4.10 notifications API, §4.11 ai-jobs API, §5.5 AiJob 状態機械), docs/user-journeys.md (J5)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-feedback-loop
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-feedback-loop-p11
