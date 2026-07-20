# System task overlay: リファクタリング/マイグレーション — HearingSheet/FormData新規テーブルのmigration（共通ai_jobsは既存schemaを消費） 生成と後方互換性確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-hearing-intake (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-hearing-intake", "studio-extension", "async-ai-queue", "refactoring-migration"]
- related_nodes: ["feat-hearing-intake", "arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data"]
- parent_feature: feat-hearing-intake
- phase_ref: P08
- classification: confidence=0.85, reason="HearingSheet/FormDataの新規テーブル（共通ai_jobsは既存schemaを消費）に対する migration ファイル生成と後方互換性確認を行う P08 タスク (feature-execution-package-contract.md により P08 は N/A 判定時も常設される)", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-hearing-intake/sys-hearing-intake-p08.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P05 で実装した HearingSheet/FormDataの新規テーブル（共通ai_jobsは既存schemaを消費）定義に対する migration ファイルを生成し、既存データへの後方互換性影響がないことを確認する。

## 背景

HearingSheet/FormDataは本featureが新規追加するテーブルであり、共通ai_jobs(kind=sheet_generation)は既存schemaを消費するため新規table/migration対象ではなく、既存行に対する ALTER 相当の変更を伴わない。feat-user-org-admin の precedent (department/salary 列の既存エンティティへの追加) とは異なり後方互換性リスクは低いが、feature-execution-package-contract.md は P08 を「N/A 判定でも常に存在する task」と定めているため、本 task は新規テーブルの migration ファイル生成そのものを実行内容とし、後方互換性確認 (既存テーブルへの影響が皆無であることの確認) を成果物として明記する。AiJob については P02 のスコープ判断 (sheet_generation kind 用の最小分に限定し共通層汎化を行わない) を継承し、汎化を前提とした migration は生成しない。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-hearing-intake, sys-hearing-intake-p07
- Entry gate: docs/features/feat-hearing-intake/acceptance-report.md で acceptance 3 項目が pass 済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task はデータ層の migration 生成のみで frontend 実装物を変更しない
- Backend: N/A: 本 task は migration ファイル生成のみで backend ハンドラを変更しない
- API: N/A: API 契約の変更を伴わない
- Data: applicable + change: HearingSheet/FormDataの新規テーブル（共通ai_jobsは既存schemaを消費） migration ファイルを packages/db/schema/hearing-intake/ 配下に生成し、既存テーブルへの影響がないことを確認する
- Infrastructure: N/A: デプロイ単位の変更は伴わない
- Security: N/A: 認可・sanitize の実装変更を伴わない (P05 で実装済み)
- Quality: applicable + change: migration 適用後も P06 のテストが再度 green であることを確認する
- Documentation: applicable + change: docs/features/feat-hearing-intake/refactoring-migration-note.md を新規作成する
- Operations: N/A: 運用手順への反映は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-data
- Deploy unit/environment: cloudflare-workers/hub (Turso 上の新規テーブル追加。本 task は migration ファイル生成のみでデプロイは P13 で行う)
- Compatibility/migration/backfill: HearingSheet/FormDataだけが新規テーブルでbackfill不要である。共通ai_jobs(kind=sheet_generation)は既存schemaを消費し、新規table/migrationやALTERを行わない

## 成果物

- Produced artifacts: docs/features/feat-hearing-intake/refactoring-migration-note.md (migration ファイル一覧と後方互換性確認結果), packages/db/schema/hearing-intake/ 配下の migration ファイル
- Consumed artifacts: docs/features/feat-hearing-intake/architecture-decision-record.md, docs/features/feat-hearing-intake/acceptance-report.md, packages/db/schema/hearing-intake/
- Write scope/touches: docs/features/feat-hearing-intake/refactoring-migration-note.md, packages/db/schema/hearing-intake/

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-hearing-intake-p08) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-hearing-intake-p08 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-hearing-intake-p08) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[sys-hearing-intake-p07] が完了するまで着手しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 共通 ai_jobs schema の複製migration（禁止。consumer adapterのみ許可）
- 既存テーブルへの ALTER (本 feature には対象がない)
- 本番環境への migration 適用 (P13 の scope)

## Verification and evidence

- Automated commands: `pnpm --filter hub build`, `pnpm --filter hub test`, `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: refactoring-migration-note.md に生成した migration ファイル一覧と後方互換性確認結果 (既存テーブル影響なし) が記載され、P06 テストが再度 green であることの記録がある

## Rollout and rollback

- Rollout: migration ファイル生成完了後 P09 の品質保証へ引き継ぐ
- Rollback trigger and steps: migration 適用でテストが fail する場合、refactoring-migration-note.md に失敗詳細を記録し packages/db/schema/hearing-intake/ の migration ファイルを修正または削除して再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-hearing-intake.context.json` (`sha256:d186363b613242215867a3dabda3c9a25690f884d363ae23de6d492538a09507`)
- Phase responsibility: migration・互換性・refactor の適用要否を実行し、N/A でも根拠を残す。
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

This section is normative for P08 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-hearing-intake.context.json; docs/backend-spec.md §2.3/§4.3/§4.11/§6.2; docs/shared-layers.md §2
- Effective phase contract: feature固有 AiJob schema や kind=hearing を作らず、共通 ai_jobs の kind=sheet_generation を consumer として使う。POST /api/v1/sheets は server-side packages/estimation の sheetEstimate を実行し estimate snapshot を保存してから、同一transactionでsheet_generationをenqueueする。共通 package/boundary の実装ownerは feat-hub-foundationであり、hearingは公開contractを消費する。P1は後発metrics完了を前提にしない。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `apps/hub/src/app/api/v1/sheets/`
- `apps/hub/src/features/hearing-intake/ai-job-adapter/`
- `apps/hub/src/features/hearing-intake/estimation-adapter/`
- Mandatory evidence: kind=sheet_generation、shared queue consumer、sheetEstimate server execution、estimate snapshot、tenant/role、enqueue/complete round-trip の contract testsを必須とする。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: system-spec/database.md (qa-024), system-spec/00-requirements-definition.md (D4)
- Architecture: arch-harness-hub-data (architecture/harness-hub-data.md)
- Feature: feat-hearing-intake
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-hearing-intake-p07
