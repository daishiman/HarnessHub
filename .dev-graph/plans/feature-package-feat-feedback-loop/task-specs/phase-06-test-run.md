# System task overlay: テスト実行 — 単体/結合/2 経路正規化/status 遷移監査/AI pull キュー/通知/tenant 分離テストの実行と結果記録

## Machine-readable registration fields

- feature_package_id: feature-package/feat-feedback-loop (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-feedback-loop", "studio-extension", "feedback-loop", "test-run"]
- related_nodes: ["feat-feedback-loop", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
- parent_feature: feat-feedback-loop
- phase_ref: P06
- classification: confidence=0.87, reason="P04 のテストスタブ (2 経路正規化/status 遷移監査/AI pull キュー/通知/Markdown sanitize/tenant 分離/publish 接続/authz-mw の 8 カテゴリ) を P05 実装に対して実行し結果を記録する P06 タスク", candidates=[{artifact_kind: task, confidence: 0.87, candidate_path: tasks/feat-feedback-loop/sys-feedback-loop-p06.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P04 で定義した 8 テストカテゴリ (2 経路単一資源正規化、status 遷移 workspace-admin 限定+監査、AI pull キュー provider-admin 限定、resolved 通知アプリ内+Resend、Markdown sanitize、feedbacks tenant 分離、PublishRequest 接続非重複、REST zod 単一ソース+認可単一ミドルウェア) を P05 実装に対して実行し、pass/fail 結果を記録する。

## 背景

P05 の実装完了後、テストファーストで定義した受入契約 (P04) に照らして機械的に合否を判定する。本 task はテストの実行と記録のみを行い、失敗が判明した場合は P05 実装または P02/P03 設計への差し戻しを判断する起点となる。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-feedback-loop, arch-harness-hub-backend, arch-harness-hub-frontend
- Entry gate: sys-feedback-loop-p05 の実装が完了し build/test 成功ログが得られていること。かつ .dev-graph/staging/goal-spec.json の feature_context_digest が sha256:072f4574b7156af35459d941d9c0655fe9f50453e151420d6e98fcb7da5499c3 に一致し、features/feat-feedback-loop.md の confirmation_status が confirmed であること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: applicable + verify: S14 一覧/フォームのテストを実行する
- Backend: applicable + verify: feedback REST ハンドラ・AiJob 連携のテストを実行する
- API: applicable + verify: zod スキーマ単一ソース検証・認可単一ミドルウェア適合テストを実行する
- Data: applicable + verify: feedbacks テーブルの tenant 分離テストを実行する
- Infrastructure: N/A: 追加インフラのテストは不要
- Security: applicable + verify: AI キュー Device Flow 限定・status 変更 workspace-admin 限定・監査 event 記録のテストを実行する
- Quality: applicable + change: test-run-report.md に 8 テストカテゴリ全件の pass/fail 結果を記録する
- Documentation: applicable + change: docs/features/feat-feedback-loop/test-run-report.md を新規作成する
- Operations: N/A: 運用テストは P09 で扱う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: N/A: 本 task はテスト実行のみで実変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-feedback-loop/test-run-report.md (8 テストカテゴリの pass/fail 結果)
- Consumed artifacts: docs/features/feat-feedback-loop/test-design.md, apps/hub/src/features/feedback-loop/, apps/hub/src/features/feedback-loop/__tests__/
- Write scope/touches: docs/features/feat-feedback-loop/test-run-report.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-feedback-loop-p06) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-feedback-loop-p06 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-feedback-loop-p06) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: sys-feedback-loop-p05 完了後に着手する。resource_scope (docs/features/feat-feedback-loop/test-run-report.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 新規テストケースの追加設計 (P04 の scope。本 task は既存テストの実行と記録のみ)
- 実装コードの修正 (fail 判明時は sys-feedback-loop-p05 を再実行対象とする)

## Verification and evidence

- Automated commands: `pnpm install --frozen-lockfile`, `pnpm --filter hub build`, `pnpm --filter hub test`, `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: test-run-report.md に P04 定義の 8 テストカテゴリ全件の pass/fail 結果が記録されている

## Rollout and rollback

- Rollout: test-run-report.md に全件 pass を確認し、P07 受入へ引き継ぐ
- Rollback trigger and steps: fail が発生した場合、test-run-report.md に失敗詳細を記録し sys-feedback-loop-p05 を再実行対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/security.md (qa-025 SEC2/SEC6/SEC7/SEC8/SEC9), system-spec/database.md (qa-032), system-spec/ui-ux.md (qa-021 S14)
- Detailed authoritative source: docs/backend-spec.md (§3.3 認可マトリクス, §3.8 監査対象, §4.7 feedback API, §4.11 ai-jobs API, §5.4/§5.5 状態機械)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-feedback-loop
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-feedback-loop-p05
