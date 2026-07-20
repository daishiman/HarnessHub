# System task overlay: アーキテクチャ設計 — HearingSheet/FormData と共通ai_jobs(kind=sheet_generation) consumer契約・受付番号採番・AI キュー API 契約の設計

## Machine-readable registration fields

- feature_package_id: feature-package/feat-hearing-intake (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-hearing-intake", "studio-extension", "async-ai-queue", "architecture"]
- related_nodes: ["feat-hearing-intake", "arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data"]
- parent_feature: feat-hearing-intake
- phase_ref: P02
- classification: confidence=0.9, reason="qa-024 の指示 (カラム定義の詳細設計は各 feature の P02 で行う) に従い HearingSheet/FormData と共通ai_jobs(kind=sheet_generation) consumer契約と受付番号採番・AI キュー API 契約を確定する P02 タスク", candidates=[{artifact_kind: task, confidence: 0.9, candidate_path: tasks/feat-hearing-intake/sys-hearing-intake-p02.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

S10 (4 ステップウィザード)・S11/S12 (シート一覧/詳細) の画面構成、HearingSheet/FormData と共通ai_jobs(kind=sheet_generation) consumer のカラム設計、受付番号採番方式、AI キュー (D5 pull 型) ジョブ投入/書戻し受領 API の契約設計、ウィザード共通部品/Markdown レンダラ/通知ディスパッチ共通層への接続点を確定し、P05 実装が迷いなく着手できる設計成果物を作る。

## 背景

qa-024 は『カラム定義の詳細設計は各 feature の P02 で行う』と定めており、HearingSheet（受付番号・status・生成物参照）とFormData（ウィザード入力）のカラム設計、および既存共通ai_jobs(kind=sheet_generation)へ渡すpayload/result DTOとconsumer adapter契約が本taskの責務である。AiJob table/schemaは本featureで新設しない。全新規テーブルは tenant_id/workspace_id スコープ列を必須とする (D4)。試算表示はサーバ計算値の表示専用としクライアント再計算・自己申告を行わない (SEC5)。

**AiJob 共通層の扱い**: docs/shared-layers.md §2 は「AI 処理キュー (pull 型)」をシート生成・FB 対応・doc 下書きの job queue として追加共通層に位置づけ、同文書冒頭は複数 feature が使うものの実装 owner を feat-hub-foundation に一元化する方針を示す。同キューは feat-feedback-loop (FB 対応)・feat-docs-cms (doc 下書き) も消費予定であり、3 feature に共通する AiJob 汎化スキーマの確定は hearing-intake 単独では決定できない上流論点である。docs/shared-layers.md §5 は「共通層に第 3 の利用者が現れたときに初めて共通化する (2 回目までは重複を許す) — 早すぎる抽象化の禁止」と定めており、本 feature は 3 消費者中の最初期の実装であるため、AiJob の汎化スキーマを本 task で確定させることは早すぎる抽象化にあたる。よって本 task は 共通 ai_jobs(kind=sheet_generation) の既存カラムと公開contractを消費するadapterだけを設計し、payload/resultのhearing DTOはpackages/schemas側で定義する。queue schemaの複製は0件とする。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-hearing-intake, sys-hearing-intake-p01
- Entry gate: docs/features/feat-hearing-intake/requirements-baseline.md が P01 で作成済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: applicable + change: S10 (4 ステップウィザード: 課題入力→影響範囲→頻度/時間→確認、各ステップで packages/ui のステップウィザード共通部品を消費) と S11 (シート一覧)/S12 (シート詳細、status 変更は admin 限定) の画面構成を確定する
- Backend: applicable + change: 受付番号採番ロジック、AI キュー (D5 pull 型) ジョブ投入 API・Claude Code セッションからの書戻し受領 API のハンドラ構成 (認可・監査) を確定する
- API: applicable + change: packages/schemas/hearing-intake/ に HearingSheet/FormData と共通ai_jobs(kind=sheet_generation) consumer の入出力契約を zod 単一ソースへ追加する設計を確定する (qa-023 B1)
- Data: applicable + change: HearingSheet（受付番号・status・生成物参照・estimate snapshot）とFormData（ウィザード入力）のカラム設計・tenant_id/workspace_idスコープ列必須化、および既存共通ai_jobs(kind=sheet_generation) consumer契約を確定する。AiJob schemaは追加しない (qa-024)
- Infrastructure: N/A: デプロイ単位・CI/CD は feat-hub-foundation が既に確立しており、本 feature は追加インフラを新設しない
- Security: applicable + change: AI キューの pull/書戻し認可を Device Flow token 保有者に限定し job payload に secret を含めない設計 (SEC8)、Markdown sanitize の適用点 (SEC7)、role×操作許可表における S11/S12 の status 変更 admin 限定の実装方針 (SEC2) を確定する
- Quality: applicable + change: S10-S12 の axe a11y 検査対象範囲と非同期 UI (受付番号+生成中ステータス) の状態遷移テスト観点を確定する
- Documentation: applicable + change: docs/features/feat-hearing-intake/architecture-decision-record.md を新規作成する
- Operations: N/A: 運用手順の具体化は P12 で行う。本 task は設計確定のみ

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend, arch-harness-hub-data
- Deploy unit/environment: cloudflare-workers/hub (feat-hub-foundation が確立した既存 Worker 上に S10-S12 を追加する。本 task は設計確定のみでデプロイは行わない)
- Compatibility/migration/backfill: HearingSheet/FormData（共通ai_jobsは既存schemaを消費） はいずれも新規テーブルであり既存データへの影響はない。migration 適用手順は P08 で扱う

## 成果物

- Produced artifacts: docs/features/feat-hearing-intake/architecture-decision-record.md (S10-S12 画面構成、HearingSheet/FormData と共通ai_jobs(kind=sheet_generation) consumer カラム設計、受付番号採番方式、AI キュー API 契約、共通 ai_jobs consumer contractと重複schema禁止の明記)
- Consumed artifacts: docs/features/feat-hearing-intake/requirements-baseline.md, system-spec/database.md, system-spec/security.md, system-spec/backend.md, docs/shared-layers.md, docs/screen-inventory.md, architecture/harness-hub-frontend.md, architecture/harness-hub-backend.md, architecture/harness-hub-data.md
- Write scope/touches: docs/features/feat-hearing-intake/architecture-decision-record.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-hearing-intake-p02) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-hearing-intake-p02 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-hearing-intake-p02) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[sys-hearing-intake-p01] が完了するまで着手しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- AI 実行基盤のサーバ側実装 (D5 で不採用。goal-spec scope_out)
- 共通 ai_jobs schema の再設計・複製（禁止。hub-foundationが確立した公開contractのconsumer adapterだけを実装する）
- 構築工程の進行管理 (feat-build-pipeline-board の scope)
- packages/estimationのpackage境界/public contractの再設計（owner=feat-hub-foundation）。本featureは公開sheetEstimateをserver-sideで実行しsnapshot保存するconsumerである
- 認証方式・role 体系そのものの設計変更 (feat-auth-tenancy の scope)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: architecture-decision-record.md に HearingSheet/FormData と共通ai_jobs(kind=sheet_generation) consumer のカラム一覧、受付番号採番方式、AI キュー API 契約、共通 ai_jobs consumer contractと重複schema禁止の明記、S10-S12 の画面構成表が記載されている

## Rollout and rollback

- Rollout: architecture-decision-record.md を作成し、P03 の独立設計レビューへ引き継ぐ
- Rollback trigger and steps: P03 レビューで設計案が却下された場合、architecture-decision-record.md へ却下理由を追記し、本 task を再実行して代替設計を再評価する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-hearing-intake.context.json` (`sha256:d186363b613242215867a3dabda3c9a25690f884d363ae23de6d492538a09507`)
- Phase responsibility: 現行 architecture_refs と全 scope を実装境界・deploy unit・owner に割り当てる。
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

This section is normative for P02 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-hearing-intake.context.json; docs/backend-spec.md §2.3/§4.3/§4.11/§6.2; docs/shared-layers.md §2
- Effective phase contract: feature固有 AiJob schema や kind=hearing を作らず、共通 ai_jobs の kind=sheet_generation を consumer として使う。POST /api/v1/sheets は server-side packages/estimation の sheetEstimate を実行し estimate snapshot を保存してから、同一transactionでsheet_generationをenqueueする。共通 package/boundary の実装ownerは feat-hub-foundationであり、hearingは公開contractを消費する。P1は後発metrics完了を前提にしない。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `apps/hub/src/app/api/v1/sheets/`
- `apps/hub/src/features/hearing-intake/ai-job-adapter/`
- `apps/hub/src/features/hearing-intake/estimation-adapter/`
- Mandatory evidence: kind=sheet_generation、shared queue consumer、sheetEstimate server execution、estimate snapshot、tenant/role、enqueue/complete round-trip の contract testsを必須とする。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: system-spec/database.md (qa-024), system-spec/security.md (qa-025 SEC2/SEC5/SEC7/SEC8), system-spec/backend.md (qa-023 B1/B5), system-spec/00-requirements-definition.md (D4, D5), docs/shared-layers.md §2/§5
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md), arch-harness-hub-data (architecture/harness-hub-data.md)
- Feature: feat-hearing-intake
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-hearing-intake-p01
