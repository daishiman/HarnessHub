# System task overlay: リリース/デプロイ — S10-S12 の Cloudflare Workers 本番反映とロールアウト確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-hearing-intake (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-hearing-intake", "studio-extension", "async-ai-queue", "release-deploy"]
- related_nodes: ["feat-hearing-intake", "arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data"]
- parent_feature: feat-hearing-intake
- phase_ref: P13
- classification: confidence=0.85, reason="P12 の runbook.md に基づき S10-S12 を feat-hub-foundation の既存 Cloudflare Workers パイプライン経由で本番反映し、feature 全体の完了を報告する P13 タスク", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-hearing-intake/sys-hearing-intake-p13.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P12 の runbook.md に基づき S10 ウィザード・S11/S12 シート管理・受付番号採番・AI キュー API を feat-hub-foundation が確立した既存 Cloudflare Workers パイプライン経由で本番反映し、ロールアウトを確認したうえで feature 全体の完了 (P01..P13 全 done) を dev-graph へ報告する。

## 背景

本 feature は新規デプロイ単位を持たず、feat-hub-foundation の既存 Hub Worker へ機能追加する形でリリースする。AI 処理は D5 確定の pull 型でありサーバ側 AI 実行基盤を追加しないため (qa-026)、本 task のデプロイ対象は S10-S12 の画面と API ハンドラのみである。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-hearing-intake, sys-hearing-intake-p12
- Entry gate: docs/features/feat-hearing-intake/runbook.md が P12 で作成済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: applicable + change: S10-S12 の本番反映とロールアウト後の表示確認を行う
- Backend: applicable + change: 受付番号採番 API・AI キュー投入/書戻し受領 API の本番反映とロールアウト後の疎通確認を行う
- API: N/A: API 契約の変更は伴わずデプロイのみ
- Data: N/A: migration は P08 で完了済みでありデプロイ時に追加のスキーマ変更は行わない
- Infrastructure: N/A: 新規インフラは追加しない (qa-026: AI 処理は D5 pull 型のためサーバ側 AI 実行基盤のインフラ追加なし)
- Security: applicable + change: 本番環境で AI キュー pull/書戻し認可 (SEC8) が意図通り機能していることを最終確認する
- Quality: applicable + change: ロールアウト後の smoke test 結果を release-notes.md へ記録する
- Documentation: applicable + change: docs/features/feat-hearing-intake/release-notes.md を新規作成する
- Operations: applicable + change: runbook.md に基づく本番反映後の運用開始を確認する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend, arch-harness-hub-data
- Deploy unit/environment: cloudflare-workers/hub (feat-hub-foundation の既存パイプライン経由で本番反映する)
- Compatibility/migration/backfill: P08 で生成した migration は本番反映前に適用済みであることを確認する。新規テーブルのみのため backfill は不要

## 成果物

- Produced artifacts: docs/features/feat-hearing-intake/release-notes.md (本番反映内容・ロールアウト確認結果・smoke test 結果)
- Consumed artifacts: docs/features/feat-hearing-intake/runbook.md, docs/features/feat-hearing-intake/evidence/index.md
- Write scope/touches: docs/features/feat-hearing-intake/release-notes.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-hearing-intake-p13) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-hearing-intake-p13 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-hearing-intake-p13) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[sys-hearing-intake-p12] が完了するまで着手しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- feat-hub-foundation の既存デプロイパイプライン自体の変更
- AI 実行基盤のサーバ側デプロイ (D5 で不採用。goal-spec scope_out)
- 構築工程進行管理のデプロイ (feat-build-pipeline-board の scope)

## Verification and evidence

- Automated commands: `wrangler deploy 相当のコマンド (runbook.md記載、feat-hub-foundationの既存パイプライン経由)`, `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: release-notes.md に本番反映日時・smoke test 結果・ロールアウト確認結果が記載されている. Normative evidence: kind=sheet_generation、shared queue consumer、sheetEstimate server execution、estimate snapshot、tenant/role、enqueue/complete round-trip の contract testsを必須とする。

## Rollout and rollback

- Rollout: release-notes.md を作成し、feature 全体の完了 (P01..P13 全 done) を dev-graph へ報告する
- Rollback trigger and steps: 本番反映後に smoke test が失敗した場合、feat-hub-foundation の既存パイプラインのロールバック手順 (runbook.md 記載) に従い直前バージョンへ復元し、release-notes.md に発生事象を記録する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-hearing-intake.context.json` (`sha256:d186363b613242215867a3dabda3c9a25690f884d363ae23de6d492538a09507`)
- Phase responsibility: release/deploy/close-out と rollback 証跡を残し、N/A でも理由を確定する。
- Purpose: 業務課題から業務ツールが生まれる入口として、S10 の 4 ステップウィザード (削減試算付き)・受付番号採番・D5 pull 型 AI キューによるヒアリングシート生成・S11/S12 のシート管理を提供する (I11, J4)
- Goal: 非エンジニアがウィザードで課題を登録すると受付番号が発番され、AI キュー (D5) 経由で生成されたシートが S11/S12 に反映され status 管理 (admin) できる状態
- Scope in (all items are in-scope for the package; this phase owns the subset matching its responsibility):
- S10 ヒアリングウィザード (4 ステップ・自動試算表示)
- HearingSheet/FormData エンティティ + 受付番号採番
- AI 処理キュー (D5 pull 型) のジョブ投入・生成結果の書戻し受領
- S11 シート一覧 / S12 シート詳細 (status 変更は admin)
- ステップウィザード共通部品の消費
- Scope out:
- AI 実行基盤のサーバ側実装 (D5 で不採用)
- 構築工程の進行管理 (feat-build-pipeline-board)
- Acceptance (P04/P06/P07/P10/P11 must preserve exact coverage):
- ウィザード完了で受付番号が発番され「生成中」状態が表示される (非同期 UI パターン)
- AI キューのジョブが pull→書戻しで完結しサーバ側 AI 課金が発生しない
- シート本文の Markdown が sanitize 済みで描画される (SEC7)
- Architecture/source refs:
- architecture/harness-hub-frontend.md
- architecture/harness-hub-backend.md
- architecture/harness-hub-data.md
- specs/harness-hub-system-specification.md

This section is the current source closure and supersedes older counts or wording in this task when they conflict with the pinned feature context.

## Normative implementation closure (2026-07-19)

This section is normative for P13 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-hearing-intake.context.json; docs/backend-spec.md §2.3/§4.3/§4.11/§6.2; docs/shared-layers.md §2
- Effective phase contract: feature固有 AiJob schema や kind=hearing を作らず、共通 ai_jobs の kind=sheet_generation を consumer として使う。POST /api/v1/sheets は server-side packages/estimation の sheetEstimate を実行し estimate snapshot を保存してから、同一transactionでsheet_generationをenqueueする。共通 package/boundary の実装ownerは feat-hub-foundationであり、hearingは公開contractを消費する。P1は後発metrics完了を前提にしない。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `apps/hub/src/app/api/v1/sheets/`
- `apps/hub/src/features/hearing-intake/ai-job-adapter/`
- `apps/hub/src/features/hearing-intake/estimation-adapter/`
- Mandatory evidence: kind=sheet_generation、shared queue consumer、sheetEstimate server execution、estimate snapshot、tenant/role、enqueue/complete round-trip の contract testsを必須とする。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: system-spec/infrastructure.md (qa-026), system-spec/security.md (qa-025 SEC8)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md), arch-harness-hub-data (architecture/harness-hub-data.md)
- Feature: feat-hearing-intake
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-hearing-intake-p12
