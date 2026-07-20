# System task overlay: リリース/デプロイ — Cloudflare Workers 本番反映とスモークテスト

## Machine-readable registration fields

- feature_package_id: feature-package/feat-build-pipeline-board (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-build-pipeline-board", "studio-extension", "build-pipeline-board", "release"]
- related_nodes: ["feat-build-pipeline-board", "arch-harness-hub-frontend", "arch-harness-hub-backend"]
- parent_feature: feat-build-pipeline-board
- phase_ref: P13
- classification: confidence=0.85, reason="P12 の runbook を踏まえ feat-hub-foundation の既存パイプラインで Cloudflare Workers 本番反映とスモークテストを行う P13 タスク", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-build-pipeline-board/sys-build-pipeline-board-p13.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

feat-hub-foundation が既に確立している Cloudflare Workers デプロイパイプラインを用いて構築パイプラインボード機能一式 (S13 画面・Build/build_stage_events スキーマ・builds API・PublishRequest 接続・監査 event) を本番反映し、release-notes.md にスモークテスト結果を記録する。

## 背景

feature-execution-package-contract.md §3 は P13 を「リリース/デプロイ/クローズアウト」と定め、実装対象に該当がなくても常に存在させる契約になっている。Hub は単一 Cloudflare Worker のデプロイ単位であり (arch-harness-hub-backend)、本 feature は新規インフラを持たないため既存パイプラインへの乗り入れのみで完結する。P08 で生成した migration ファイルの本番適用もここで行う。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-build-pipeline-board, arch-harness-hub-frontend, arch-harness-hub-backend
- Entry gate: sys-build-pipeline-board-p12 の runbook.md が作成済みであること。かつ goal-spec.json の feature_context_digest が sha256:eeed295d50359e11ac8aee84800def3ad3399cee866ab5b4dc2712116c9a4441 に一致し、features/feat-build-pipeline-board.md の confirmation_status が confirmed であること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: applicable + change: S13 画面の本番反映後のスモークテスト (7 工程ボードの到達確認) を実施する
- Backend: applicable + change: builds API と工程遷移 API の本番反映後のスモークテストを実施する
- API: applicable + contract: 本番環境での zod スキーマ検証・認可 MW 動作のスモークテストを実施する
- Data: applicable + migration: P08 で生成した migration ファイルを本番環境へ適用する
- Infrastructure: N/A: feat-hub-foundation が既に確立している Cloudflare Workers デプロイ単位に乗り入れるのみで新規インフラは追加しない
- Security: applicable + change: 本番反映後に工程操作 admin 限定・build.stage_change 監査・PublishRequest 整合・tenant 分離が機能していることをスモークテストで確認する
- Quality: applicable + change: release-notes.md にスモークテスト結果を記録する
- Documentation: applicable + change: docs/features/feat-build-pipeline-board/release-notes.md を新規作成する
- Operations: applicable + change: 本番反映後の runbook.md に基づく監視開始を確認する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub (feat-hub-foundation が確立した既存デプロイパイプラインを使用する)
- Compatibility/migration/backfill: P08 で生成した migration ファイルを本番環境へ適用する。Build/build_stage_events は新規エンティティのため backfill は不要

## 成果物

- Produced artifacts: docs/features/feat-build-pipeline-board/release-notes.md (本番反映結果とスモークテスト結果)
- Consumed artifacts: docs/features/feat-build-pipeline-board/runbook.md, packages/db/schema/build-pipeline/ 配下の migration ファイル
- Write scope/touches: docs/features/feat-build-pipeline-board/release-notes.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-build-pipeline-board-p13) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-build-pipeline-board-p13 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-build-pipeline-board-p13) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: sys-build-pipeline-board-p12 完了後に着手する。resource_scope (docs/features/feat-build-pipeline-board/release-notes.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 新規デプロイパイプラインの構築 (feat-hub-foundation の既存パイプラインを使用する)
- publish 状態機械自体の本番切替 (既存 I2/I3 パイプラインを使用。goal-spec scope_out)

## Verification and evidence

- Automated commands: `pnpm --filter hub deploy`, `pnpm --filter hub smoke-test`, `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: release-notes.md に本番反映日時とスモークテスト結果 (S13 到達確認・builds API 疎通確認・migration 適用確認) が記録されていること. Normative evidence: stage transition/API tests、axe report、CWV report（LCP/INP/CLS各good）、CI job URLまたは再実行可能ログを必須証跡とする。

## Rollout and rollback

- Rollout: migration 適用後に本番デプロイを実行し、スモークテスト全件 pass を確認してから release-notes.md を確定する
- Rollback trigger and steps: スモークテストが失敗した場合、feat-hub-foundation の既存デプロイパイプラインのロールバック手順に従い直前バージョンへ復帰し、release-notes.md に失敗詳細を記録した上で原因 task を再実行対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-build-pipeline-board.context.json` (`sha256:eeed295d50359e11ac8aee84800def3ad3399cee866ab5b4dc2712116c9a4441`)
- Phase responsibility: release/deploy/close-out と rollback 証跡を残し、N/A でも理由を確定する。
- Purpose: ヒアリング→要件定義→設計→構築→テスト→レビュー→公開の 7 工程を S13 のボードで進行管理し (工程操作は admin)、公開工程を既存 PublishRequest 状態機械 (B4/I2/I3) へ接続する
- Goal: 各ハーネスの構築進捗が 7 工程ボードで可視化され、工程操作が admin 限定 + 監査記録付きで行え、公開工程が publish パイプラインと二重実装なしに連動する状態
- Scope in (all items are in-scope for the package; this phase owns the subset matching its responsibility):
- Build エンティティ (7 stage・リスク表示)
- S13 パイプラインボード (ステージボード共通部品の消費)
- 工程操作の admin 権限 + 監査 event (SEC6)
- 公開工程の PublishRequest 接続 (B4)
- Scope out:
- publish 状態機械の再実装 (既存 I2/I3 を使う)
- 工程の自動遷移 (手動運用から開始)
- Acceptance (P04/P06/P07/P10/P11 must preserve exact coverage):
- 7 工程の遷移が admin のみ操作でき監査 event に記録される
- 公開工程が PublishRequest の状態と整合する (二重状態を持たない)
- ボードが axe 違反 0・CWV good で動作する
- Architecture/source refs:
- architecture/harness-hub-frontend.md
- architecture/harness-hub-backend.md
- specs/harness-hub-system-specification.md

This section is the current source closure and supersedes older counts or wording in this task when they conflict with the pinned feature context.

## Normative implementation closure (2026-07-19)

This section is normative for P13 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-build-pipeline-board.context.json; docs/backend-spec.md §4.4; docs/frontend-spec.md S13; docs/security-spec.md CI accessibility contract
- Effective phase contract: P04 は既存5カテゴリに axe detectable violations=0 と CWV LCP/INP/CLS=good を追加する。P05 は S13 UI/Build schema に加え、GET /api/v1/builds、GET /api/v1/builds/:id、POST /api/v1/builds（sheet_id xor feedback_id の手動復旧）、PATCH /api/v1/builds/:id、POST /api/v1/builds/:id/stage の正本5 endpointを route handler、zod contract、単一 authz middleware接続として実装する。P04/P06/P07 は5 endpoint（manual recoveryを含む）とaxe/CWVを実測し、P09 CI gate、P10最終判定、P11 evidence、P13 production smokeまで同じ測定IDを追跡する。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `apps/hub/src/app/api/v1/builds/`
- `apps/hub/src/features/build-pipeline-board/__tests__/`
- `.github/workflows/ci.yml`
- Mandatory evidence: 正本5 endpoint（POST manual recoveryのsheet_id xor feedback_idを含む）のrole/tenant/validation tests、stage transition tests、axe report、CWV report（LCP/INP/CLS各good）、CI job URLまたは再実行可能ログを必須証跡とする。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: system-spec/00-requirements-definition.md (D4, B4), system-spec/backend.md (qa-033)
- Detailed authoritative source: docs/backend-spec.md (§2.3, §4.4, §5.3)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-build-pipeline-board
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-build-pipeline-board-p12
