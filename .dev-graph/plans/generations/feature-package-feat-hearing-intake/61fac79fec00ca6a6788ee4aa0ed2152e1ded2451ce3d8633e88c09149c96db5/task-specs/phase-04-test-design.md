# System task overlay: テストファースト設計 — 受付番号発番/AI キュー認可/Markdown sanitize/試算表示サーバ計算限定/axe a11y のテストスタブ作成

## Machine-readable registration fields

- feature_package_id: feature-package/feat-hearing-intake (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-hearing-intake", "studio-extension", "async-ai-queue", "test-design"]
- related_nodes: ["feat-hearing-intake", "arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data"]
- parent_feature: feat-hearing-intake
- phase_ref: P04
- classification: confidence=0.88, reason="P03 で承認された設計に基づき P05 実装の受入契約となるテストスタブを作成する P04 タスク", candidates=[{artifact_kind: task, confidence: 0.88, candidate_path: tasks/feat-hearing-intake/sys-hearing-intake-p04.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P03 で承認された設計に基づき、受付番号発番テスト・AI キュー pull/書戻し認可テスト (SEC8)・Markdown sanitize テスト (SEC7)・試算表示のサーバ計算値限定テスト (SEC5)・S10-S12 の axe a11y テストのスタブを作成し、P05 実装の受入契約とする。

## 背景

test-first により、P05 実装が「何を満たせば完了か」を先に機械的に定義し、実装と検証の乖離を防ぐ。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-hearing-intake, sys-hearing-intake-p03
- Entry gate: docs/features/feat-hearing-intake/design-review-notes.md で承認判定が記録されていること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: applicable + change: S10-S12 の axe a11y テストスタブと非同期 UI (受付番号+生成中ステータス+完了通知) 状態遷移テストスタブを作成する
- Backend: applicable + change: 受付番号発番の一意性テストスタブと AI キューの pull/書戻し認可テストスタブ (SEC8) を作成する
- API: applicable + change: HearingSheet/FormData と共通ai_jobs(kind=sheet_generation) consumer の zod schemas に対する入出力検証テストスタブを作成する
- Data: applicable + change: tenant_id/workspace_id スコープ列の分離テストスタブを作成する (D4)
- Infrastructure: N/A: 既存の共有 CI パイプライン (feat-hub-foundation 確立) 上で実行するのみ
- Security: applicable + change: 試算表示がサーバ計算値のみでクライアント再計算不可であることを確認するテストスタブ (SEC5) と Markdown sanitize の XSS 防止テストスタブ (SEC7) を作成する
- Quality: applicable + change: P04 で定義した合否基準を P06 実行対象として整理する
- Documentation: applicable + change: docs/features/feat-hearing-intake/test-design.md を新規作成する
- Operations: N/A: 運用監視テストは P09 で扱う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend, arch-harness-hub-data
- Deploy unit/environment: cloudflare-workers/hub (既存 CI 実行環境。テストスタブ作成のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task はテストスタブ作成のみで対象物への変更を行わない

## 成果物

- Produced artifacts: docs/features/feat-hearing-intake/test-design.md, apps/hub/src/features/hearing-intake/__tests__/ (テストスタブ)
- Consumed artifacts: docs/features/feat-hearing-intake/architecture-decision-record.md, docs/features/feat-hearing-intake/design-review-notes.md
- Write scope/touches: docs/features/feat-hearing-intake/test-design.md, apps/hub/src/features/hearing-intake/__tests__/

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-hearing-intake-p04) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-hearing-intake-p04 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-hearing-intake-p04) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[sys-hearing-intake-p03] が完了するまで着手しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- テストスタブの実装コードへの接続 (P05 の責務)
- 共有 CI パイプライン設定 (.github/workflows/ci.yml) の変更

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: test-design.md に受付番号発番・AI キュー認可・Markdown sanitize・試算表示サーバ計算限定・axe a11y の 5 テストカテゴリの合否基準が明記されている. Normative evidence: kind=sheet_generation、shared queue consumer、sheetEstimate server execution、estimate snapshot、tenant/role、enqueue/complete round-trip の contract testsを必須とする。

## Rollout and rollback

- Rollout: テストスタブ一式を P05 実装の受入契約として引き継ぐ
- Rollback trigger and steps: 合否基準が P02 設計と矛盾する場合、矛盾箇所を記録し sys-hearing-intake-p02 または sys-hearing-intake-p03 を再確認対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-hearing-intake.context.json` (`sha256:d186363b613242215867a3dabda3c9a25690f884d363ae23de6d492538a09507`)
- Phase responsibility: 全 acceptance と品質制約を実装前のテストケースへ写像する。
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

This section is normative for P04 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-hearing-intake.context.json; docs/backend-spec.md §2.3/§4.3/§4.11/§6.2; docs/shared-layers.md §2
- Effective phase contract: feature固有 AiJob schema や kind=hearing を作らず、共通 ai_jobs の kind=sheet_generation を consumer として使う。POST /api/v1/sheets は server-side packages/estimation の sheetEstimate を実行し estimate snapshot を保存してから、同一transactionでsheet_generationをenqueueする。共通 package/boundary の実装ownerは feat-hub-foundationであり、hearingは公開contractを消費する。P1は後発metrics完了を前提にしない。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `apps/hub/src/app/api/v1/sheets/`
- `apps/hub/src/features/hearing-intake/ai-job-adapter/`
- `apps/hub/src/features/hearing-intake/estimation-adapter/`
- Mandatory evidence: kind=sheet_generation、shared queue consumer、sheetEstimate server execution、estimate snapshot、tenant/role、enqueue/complete round-trip の contract testsを必須とする。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: system-spec/security.md (qa-025 SEC5/SEC7/SEC8), system-spec/database.md (qa-024 D4), docs/shared-layers.md §1 (qa-018 axe 検査)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md), arch-harness-hub-data (architecture/harness-hub-data.md)
- Feature: feat-hearing-intake
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-hearing-intake-p03
