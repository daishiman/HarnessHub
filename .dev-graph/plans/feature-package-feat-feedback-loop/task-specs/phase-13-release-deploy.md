# System task overlay: リリース/デプロイ — Cloudflare Workers 本番反映とスモークテスト

## Machine-readable registration fields

- feature_package_id: feature-package/feat-feedback-loop (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-feedback-loop", "studio-extension", "feedback-loop", "release"]
- related_nodes: ["feat-feedback-loop", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
- parent_feature: feat-feedback-loop
- phase_ref: P13
- classification: confidence=0.86, reason="P12 の runbook を踏まえ cloudflare-workers/hub への本番反映とスモークテストを実施し feature package を完了させる P13 タスク", candidates=[{artifact_kind: task, confidence: 0.86, candidate_path: tasks/feat-feedback-loop/sys-feedback-loop-p13.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P12 の runbook と P08 の migration ファイルを用いて、feedbacks テーブル migration を本番へ適用し、cloudflare-workers/hub へ feat-feedback-loop を本番反映する。反映後、S14 到達性・feedback API 疎通・migration 適用確認・AI キュー pull 疎通の 4 点をスモークテストで確認し、feature package を release-notes.md に記録して完了する。

## 背景

feature-execution-package-contract.md は P13 を「release/deploy/close-out」と定め、常に存在させる契約になっている。本 feature は既存 cloudflare-workers/hub デプロイ単位への追加機能であり新規インフラは不要だが、feedbacks テーブルの本番 migration 適用と、修正版 publish が既存 PublishRequest パイプラインへ正しく接続されていることの本番疎通確認が release gate として必須である。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-feedback-loop, arch-harness-hub-backend, arch-harness-hub-frontend
- Entry gate: sys-feedback-loop-p12 の runbook.md が作成済みであること。かつ .dev-graph/staging/goal-spec.json の feature_context_digest が sha256:072f4574b7156af35459d941d9c0655fe9f50453e151420d6e98fcb7da5499c3 に一致し、features/feat-feedback-loop.md の confirmation_status が confirmed であること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: applicable + deploy: S14 を含む hub フロントエンドを cloudflare-workers/hub へ本番反映する
- Backend: applicable + deploy: feedback/ai-jobs API ハンドラを cloudflare-workers/hub へ本番反映する
- API: applicable + verify: 本番環境で feedback API 疎通を確認する
- Data: applicable + deploy: feedbacks テーブル migration を本番データベースへ適用する
- Infrastructure: N/A: 既存 cloudflare-workers/hub デプロイ単位を使用し新規インフラは追加しない
- Security: applicable + verify: 本番環境で認可・監査記録が有効であることを確認する
- Quality: applicable + change: release-notes.md にスモークテスト結果を記録する
- Documentation: applicable + change: docs/features/feat-feedback-loop/release-notes.md を新規作成する
- Operations: applicable + verify: P12 runbook に基づく本番運用開始準備が整っていることを確認する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub (production)
- Compatibility/migration/backfill: P08 で生成した migration ファイルを本番データベースへ適用する。feedbacks は新規テーブルのため backfill は不要

## 成果物

- Produced artifacts: docs/features/feat-feedback-loop/release-notes.md (デプロイ結果とスモークテスト結果)
- Consumed artifacts: docs/features/feat-feedback-loop/runbook.md, packages/db/schema/feedback-loop/ (migration ファイル)
- Write scope/touches: docs/features/feat-feedback-loop/release-notes.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-feedback-loop-p13) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-feedback-loop-p13 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-feedback-loop-p13) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: sys-feedback-loop-p12 完了後に着手する。resource_scope (docs/features/feat-feedback-loop/release-notes.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 新規インフラ・新規デプロイ単位の作成 (既存 cloudflare-workers/hub を使用する)
- feat-publish-pipeline/feat-hub-foundation 自体のデプロイ手順変更

## Verification and evidence

- Automated commands: `pnpm --filter hub deploy`, `pnpm --filter hub smoke-test`, `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: release-notes.md に S14 到達性・feedback API 疎通・migration 適用確認・AI キュー pull 疎通の 4 点のスモークテスト結果が記録されている

## Rollout and rollback

- Rollout: 本番 migration 適用後 cloudflare-workers/hub へ反映し、スモークテスト 4 点通過を確認してから release-notes.md に記録する
- Rollback trigger and steps: スモークテストいずれかが失敗した場合、cloudflare-workers/hub を直前バージョンへロールバックし、migration が適用済みの場合は down migration を実行してから原因 task (P05/P08) へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/ui-ux.md (qa-021 S14), system-spec/frontend.md (qa-022)
- Detailed authoritative source: docs/backend-spec.md (§4.7 feedback API, §4.11 ai-jobs API), docs/user-journeys.md (J5)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-feedback-loop
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-feedback-loop-p12
