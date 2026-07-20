# System task overlay: リリース/デプロイ — Cloudflare Workers 本番反映とスモークテスト

## Machine-readable registration fields

- feature_package_id: feature-package/feat-docs-cms (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-docs-cms", "studio-extension", "docs-cms", "release"]
- related_nodes: ["feat-docs-cms", "arch-harness-hub-frontend", "arch-harness-hub-backend"]
- parent_feature: feat-docs-cms
- phase_ref: P13
- classification: confidence=0.85, reason="P12 の runbook を踏まえ feat-hub-foundation の既存パイプラインで Cloudflare Workers 本番反映とスモークテストを行う P13 タスク", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-docs-cms/sys-docs-cms-p13.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

feat-hub-foundation が既に確立している Cloudflare Workers デプロイパイプラインを用いて docs-cms 機能一式 (S15 画面・Doc スキーマ・B7 API・AI 下書きキュー) を本番反映し、release-notes.md にスモークテスト結果を記録する。

## 背景

feature-execution-package-contract.md §3 は P13 を「リリース/デプロイ/クローズアウト」と定め、実装対象に該当がなくても常に存在させる契約になっている。Hub は単一 Cloudflare Worker のデプロイ単位であり (arch-harness-hub-backend)、本 feature は新規インフラを持たないため既存パイプラインへの乗り入れのみで完結する。P08 で生成した migration ファイルの本番適用もここで行う。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-docs-cms, arch-harness-hub-frontend, arch-harness-hub-backend
- Entry gate: sys-docs-cms-p12 の runbook.md が作成済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: applicable + change: S15 画面の本番反映後のスモークテスト (一覧/閲覧/編集の到達確認) を実施する
- Backend: applicable + change: B7 API と AI 下書きキューの本番反映後のスモークテストを実施する
- API: applicable + contract: 本番環境での zod スキーマ検証・認可 MW 動作のスモークテストを実施する
- Data: applicable + migration: P08 で生成した migration ファイルを本番環境へ適用する
- Infrastructure: N/A: feat-hub-foundation が既に確立している Cloudflare Workers デプロイ単位に乗り入れるのみで新規インフラは追加しない
- Security: applicable + change: 本番反映後に tenant 分離・doc 編集 admin 限定・AI キュー認可が機能していることをスモークテストで確認する
- Quality: applicable + change: release-notes.md にスモークテスト結果を記録する
- Documentation: applicable + change: docs/features/feat-docs-cms/release-notes.md を新規作成する
- Operations: applicable + change: 本番反映後の runbook.md に基づく監視開始を確認する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub (feat-hub-foundation が確立した既存デプロイパイプラインを使用する)
- Compatibility/migration/backfill: P08 で生成した migration ファイルを本番環境へ適用する。Doc は新規エンティティのため backfill は不要

## 成果物

- Produced artifacts: docs/features/feat-docs-cms/release-notes.md (本番反映結果とスモークテスト結果)
- Consumed artifacts: docs/features/feat-docs-cms/runbook.md, packages/db/schema/docs-cms/ 配下の migration ファイル
- Write scope/touches: docs/features/feat-docs-cms/release-notes.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-docs-cms-p13) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-docs-cms-p13 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-docs-cms-p13) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: sys-docs-cms-p12 完了後に着手する。resource_scope (docs/features/feat-docs-cms/release-notes.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 新規デプロイパイプラインの構築 (feat-hub-foundation の既存パイプラインを使用する)
- 外部公開サイトの生成・配信 (goal-spec scope_out)

## Verification and evidence

- Automated commands: `pnpm --filter hub deploy`, `pnpm --filter hub smoke-test`, `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: release-notes.md に本番反映日時とスモークテスト結果 (S15 到達確認・API 疎通確認・migration 適用確認) が記録されていること. Normative evidence: 5 endpoint の role/tenant tests、doc_draft enqueue/complete round-trip、共通 queue consumer contract、XSS sanitize、監査 event を同一 evidence chain で追跡する。

## Rollout and rollback

- Rollout: migration 適用後に本番デプロイを実行し、スモークテスト全件 pass を確認してから release-notes.md を確定する
- Rollback trigger and steps: スモークテストが失敗した場合、feat-hub-foundation の既存デプロイパイプラインのロールバック手順に従い直前バージョンへ復帰し、release-notes.md に失敗詳細を記録した上で原因 task を再実行対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-docs-cms.context.json` (`sha256:6e8ea8a7a1042002d0bb0b3ff2a2b3464ea4a45ba77ddea709580cc3bed03d34`)
- Phase responsibility: release/deploy/close-out と rollback 証跡を残し、N/A でも理由を確定する。
- Purpose: 利用ガイド・FAQ 等のドキュメントを common (全テナント) / tenant (テナント限定) スコープで管理し (B7/I13)、S15 の閲覧/編集 UI と D5 pull 型 AI キューによる下書き生成を提供する
- Goal: ドキュメントがスコープ規則 (tenant 分離 + common 共有) 下で閲覧・編集でき、Markdown が sanitize 済みで描画され (SEC7)、AI 下書きがキュー経由で生成される状態
- Scope in (all items are in-scope for the package; this phase owns the subset matching its responsibility):
- Doc エンティティ (scope=common/tenant・Markdown 本文)
- S15 一覧/閲覧/編集 (編集は admin)
- Markdown レンダラ + エディタ共通部品の消費 (XSS sanitize)
- AI 下書き生成 (D5 キュー)
- doc 編集の監査 event (SEC6)
- Scope out:
- 外部公開サイト生成
- バージョン管理 (Git 連携)
- Acceptance (P04/P06/P07/P10/P11 must preserve exact coverage):
- tenant スコープ doc が他テナントから参照できない (分離テスト)
- Markdown 描画で XSS が sanitize される (テスト付き)
- 編集操作が監査 event に記録される
- Architecture/source refs:
- architecture/harness-hub-frontend.md
- architecture/harness-hub-backend.md
- specs/harness-hub-system-specification.md

This section is the current source closure and supersedes older counts or wording in this task when they conflict with the pinned feature context.

## Normative implementation closure (2026-07-19)

This section is normative for P13 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-docs-cms.context.json; docs/backend-spec.md §2.3/§4.8/§4.11; docs/shared-layers.md §2
- Effective phase contract: B7 の5資源（GET /api/v1/docs、GET /api/v1/docs/:id、POST /api/v1/docs、PATCH /api/v1/docs/:id、POST /api/v1/docs/:id/draft）を route handler と zod single source で実装する。draft は共通 ai_jobs へ kind=doc_draft で投入し、共通 pull/complete 経路から documents へ結果を書き戻す consumer adapter を実装する。AiJob 共通層を複製せず、未解決として先送りもしない。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `apps/hub/src/app/api/v1/docs/`
- `apps/hub/src/features/docs-cms/ai-job-adapter/`
- `packages/schemas/docs-cms/`
- Mandatory evidence: 5 endpoint の role/tenant tests、doc_draft enqueue/complete round-trip、共通 queue consumer contract、XSS sanitize、監査 event を同一 evidence chain で追跡する。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: system-spec/00-requirements-definition.md (D4, D5, I13), system-spec/backend.md (qa-023 B7)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-docs-cms
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-docs-cms-p12
