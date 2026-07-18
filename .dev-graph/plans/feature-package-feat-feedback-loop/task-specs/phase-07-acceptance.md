# System task overlay: 受入 — goal-spec acceptance 3 項目の確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-feedback-loop (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-feedback-loop", "studio-extension", "feedback-loop", "acceptance"]
- related_nodes: ["feat-feedback-loop", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
- parent_feature: feat-feedback-loop
- phase_ref: P07
- classification: confidence=0.87, reason="P06 のテスト結果を goal-spec の acceptance 3 項目に照らして受入判定する P07 タスク", candidates=[{artifact_kind: task, confidence: 0.87, candidate_path: tasks/feat-feedback-loop/sys-feedback-loop-p07.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P06 のテスト結果を goal-spec の acceptance 3 項目 (2 経路受付の同一資源正規化、AI 対応 pull 型処理+status 遷移監査記録、対応済み通知のアプリ内+メール到達) に照らして受入判定する。

## 背景

feature-execution-package-contract.md は P07 を「feature acceptance」と定め、goal-spec の acceptance 項目に対する最終的な機能受入判定を行う工程と定める。本 feature の acceptance 3 件は、P04/P06 で検証した 8 テストカテゴリのうち特に two-route-single-resource・ai-pull-queue-status-audit・resolved-notification-inapp-resend の 3 カテゴリと対応する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-feedback-loop, arch-harness-hub-backend, arch-harness-hub-frontend
- Entry gate: sys-feedback-loop-p06 の test-run-report.md で 8 テストカテゴリ全件が pass していること。かつ .dev-graph/staging/goal-spec.json の feature_context_digest が sha256:072f4574b7156af35459d941d9c0655fe9f50453e151420d6e98fcb7da5499c3 に一致し、features/feat-feedback-loop.md の confirmation_status が confirmed であること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は受入判定の文書化のみで frontend 実装物を変更しない
- Backend: N/A: 本 task は受入判定の文書化のみで backend 実装物を変更しない
- API: N/A: 本 task は API 契約を変更しない
- Data: N/A: 本 task はデータスキーマを変更しない
- Infrastructure: N/A: 本 feature は追加インフラを新設しない
- Security: applicable + verify: AI 対応 pull 型処理と status 遷移監査記録の受入基準充足を確認する
- Quality: applicable + change: acceptance-report.md に acceptance 3 項目の pass/fail 判定を記録する
- Documentation: applicable + change: docs/features/feat-feedback-loop/acceptance-report.md を新規作成する
- Operations: N/A: 運用受入は P09/P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub (本 task は受入判定のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は受入判定のみで実変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-feedback-loop/acceptance-report.md (acceptance 3 項目それぞれの pass/fail 判定と test-run-report.md への参照)
- Consumed artifacts: docs/features/feat-feedback-loop/test-run-report.md, .dev-graph/staging/goal-spec.json
- Write scope/touches: docs/features/feat-feedback-loop/acceptance-report.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-feedback-loop-p07) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-feedback-loop-p07 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-feedback-loop-p07) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: sys-feedback-loop-p06 完了後に着手する。resource_scope (docs/features/feat-feedback-loop/acceptance-report.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 新規テストの実行 (P06 の scope。本 task は既存結果の受入判定のみ)
- 実装コードの修正 (未達の場合は原因 task へ差し戻す)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: acceptance-report.md に acceptance 3 項目それぞれの pass/fail 判定と test-run-report.md への参照が記載されている

## Rollout and rollback

- Rollout: acceptance-report.md に全件 pass を確認し、P08 リファクタリング/マイグレーションへ引き継ぐ
- Rollback trigger and steps: acceptance いずれかが未達の場合、acceptance-report.md に未達理由を記録し、原因が実装にある場合は sys-feedback-loop-p05 を、設計にある場合は sys-feedback-loop-p02 を再実行対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/security.md (qa-025), docs/backend-spec.md (§5.4/§5.5)
- Detailed authoritative source: docs/backend-spec.md (§4.7 feedback API, §4.10 notifications API, §4.11 ai-jobs API)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-feedback-loop
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-feedback-loop-p06
