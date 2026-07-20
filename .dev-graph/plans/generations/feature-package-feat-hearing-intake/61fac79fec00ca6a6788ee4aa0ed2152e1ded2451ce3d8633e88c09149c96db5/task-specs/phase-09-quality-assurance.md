# System task overlay: 品質保証 — CI 品質ゲート (axe/Tenant 分離/AI キュー認可) 適合確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-hearing-intake (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-hearing-intake", "studio-extension", "async-ai-queue", "quality-assurance"]
- related_nodes: ["feat-hearing-intake", "arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data"]
- parent_feature: feat-hearing-intake
- phase_ref: P09
- classification: confidence=0.86, reason="feat-hub-foundation が確立した共有 CI 品質ゲート (axe/Tenant 分離/AI キュー認可) に対する本 feature の適合を確認する P09 タスク", candidates=[{artifact_kind: task, confidence: 0.86, candidate_path: tasks/feat-hearing-intake/sys-hearing-intake-p09.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

feat-hub-foundation が所有する共有 CI 品質ゲート (axe a11y、Tenant/Workspace 分離テスト、監視/SLO ダッシュボード) に本 feature が適合していることを確認し、AI キュー滞留監視の未解決論点を運用文書化対象として P12 へ引き継ぐ。

## 背景

docs/shared-layers.md §3 は監視 (/health + Workers logs/analytics + 外部死活監視 + SLO ダッシュボード + エラーバジェットアラート) を共通インフラ層として feat-hub-foundation に一元化しており (qa-011, qa-019)、本 feature は既存の品質ゲートを「使う」側に徹する。一方で AI キューの滞留 (誰も pull しない期間) は滞留監視・アラートを保守運用に組み込んで検出する必要がある (system-spec/00-requirements-definition.md D5 の risk note, qa-027)。本 task は既存品質ゲートへの適合確認を行い、AI キュー滞留監視の具体的な運用手順化は P12 へ引き継ぐ。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-hearing-intake, sys-hearing-intake-p08
- Entry gate: docs/features/feat-hearing-intake/refactoring-migration-note.md が P08 で作成済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: applicable + change: S10-S12 の axe a11y 品質ゲート適合を最終確認する (qa-018)
- Backend: applicable + change: AI キューの pull/書戻し認可 (SEC8) が既存品質ゲートの認可検査対象に含まれていることを確認する
- API: N/A: API 契約変更を伴わない適合確認のみ
- Data: applicable + change: HearingSheet/FormData と共通ai_jobs(kind=sheet_generation) consumer の Tenant/Workspace 分離テストが共有 CI 品質ゲートで実行されることを確認する (D4)
- Infrastructure: N/A: 監視インフラ自体は feat-hub-foundation の scope であり本 feature は追加しない
- Security: applicable + change: SEC5/SEC7/SEC8 の品質ゲート適合を最終確認する
- Quality: applicable + change: AI キュー滞留監視 (qa-027) の未解決運用論点を P12 引き継ぎ事項として整理する
- Documentation: applicable + change: docs/features/feat-hearing-intake/quality-assurance-report.md を新規作成する
- Operations: applicable + change: AI キュー滞留監視の運用要件を P12 への引き継ぎ事項として明記する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend, arch-harness-hub-data
- Deploy unit/environment: cloudflare-workers/hub (feat-hub-foundation の既存 CI/監視基盤上での適合確認のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は適合確認のみで対象物への変更を行わない

## 成果物

- Produced artifacts: docs/features/feat-hearing-intake/quality-assurance-report.md (品質ゲート適合確認結果と AI キュー滞留監視の P12 引き継ぎ事項)
- Consumed artifacts: docs/features/feat-hearing-intake/refactoring-migration-note.md, docs/features/feat-hearing-intake/test-run-report.md, docs/shared-layers.md §3
- Write scope/touches: docs/features/feat-hearing-intake/quality-assurance-report.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-hearing-intake-p09) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-hearing-intake-p09 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-hearing-intake-p09) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[sys-hearing-intake-p08] が完了するまで着手しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 共有 CI 品質ゲート自体の変更 (.github/workflows/ci.yml。feat-hub-foundation の scope)
- AI キュー滞留監視の実運用構築 (P12 で運用文書化のみ行い、監視基盤の実装自体は feat-hub-foundation の scope)

## Verification and evidence

- Automated commands: `pnpm --filter hub build`, `pnpm --filter hub test`, `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: quality-assurance-report.md に axe/Tenant 分離/SEC5/SEC7/SEC8 の適合確認結果と AI キュー滞留監視 (qa-027) の P12 引き継ぎ事項が記載されている. Normative evidence: kind=sheet_generation、shared queue consumer、sheetEstimate server execution、estimate snapshot、tenant/role、enqueue/complete round-trip の contract testsを必須とする。

## Rollout and rollback

- Rollout: 品質ゲート適合確認完了後 P10 の最終独立レビューへ引き継ぐ
- Rollback trigger and steps: 品質ゲート不適合が判明した場合、quality-assurance-report.md に不適合詳細を記録し該当する P05/P08 の task を再実行対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-hearing-intake.context.json` (`sha256:d186363b613242215867a3dabda3c9a25690f884d363ae23de6d492538a09507`)
- Phase responsibility: 品質・security・operations・CI gate を現行正本に照らして保証する。
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

This section is normative for P09 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-hearing-intake.context.json; docs/backend-spec.md §2.3/§4.3/§4.11/§6.2; docs/shared-layers.md §2
- Effective phase contract: feature固有 AiJob schema や kind=hearing を作らず、共通 ai_jobs の kind=sheet_generation を consumer として使う。POST /api/v1/sheets は server-side packages/estimation の sheetEstimate を実行し estimate snapshot を保存してから、同一transactionでsheet_generationをenqueueする。共通 package/boundary の実装ownerは feat-hub-foundationであり、hearingは公開contractを消費する。P1は後発metrics完了を前提にしない。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `apps/hub/src/app/api/v1/sheets/`
- `apps/hub/src/features/hearing-intake/ai-job-adapter/`
- `apps/hub/src/features/hearing-intake/estimation-adapter/`
- Mandatory evidence: kind=sheet_generation、shared queue consumer、sheetEstimate server execution、estimate snapshot、tenant/role、enqueue/complete round-trip の contract testsを必須とする。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: system-spec/security.md (qa-025 SEC5/SEC7/SEC8), system-spec/00-requirements-definition.md (D5 risk note, qa-027), docs/shared-layers.md §1 (qa-018)/§3 (qa-011, qa-019)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md), arch-harness-hub-data (architecture/harness-hub-data.md)
- Feature: feat-hearing-intake
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-hearing-intake-p08
