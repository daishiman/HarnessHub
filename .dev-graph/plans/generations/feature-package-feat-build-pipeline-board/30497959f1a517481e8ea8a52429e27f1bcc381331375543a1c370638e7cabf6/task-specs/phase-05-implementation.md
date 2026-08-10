# System task overlay: 実装 — S13 パイプラインボード・Build スキーマ・工程操作 API・PublishRequest 接続・監査 event の実装

## Machine-readable registration fields

- feature_package_id: feature-package/feat-build-pipeline-board (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-build-pipeline-board", "studio-extension", "build-pipeline-board", "implementation"]
- related_nodes: ["feat-build-pipeline-board", "arch-harness-hub-frontend", "arch-harness-hub-backend"]
- parent_feature: feat-build-pipeline-board
- phase_ref: P05
- classification: confidence=0.9, reason="P03 承認済み設計と P04 テストスタブに基づき S13 実装・Build スキーマ・builds API・PublishRequest 接続・監査 event を実装する P05 タスク", candidates=[{artifact_kind: task, confidence: 0.9, candidate_path: tasks/feat-build-pipeline-board/sys-build-pipeline-board-p05.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P03 承認済み設計と P04 テストスタブに基づき、S13 パイプラインボード (ステージボード共通部品の消費)・Build/build_stage_events スキーマ・builds REST API (閲覧/起票/更新/工程遷移)・publish 工程の PublishRequest 接続・build.stage_change 監査 event を実装する。

## 背景

P04 で確定した 5 テストカテゴリを green にすることが本 task の受入条件である。工程遷移 API (POST /api/v1/builds/:id/stage) は admin (workspace-admin/provider-admin) 限定とし (SEC2, docs/backend-spec.md §3.3)、隣接遷移のみを許可し (§5.3)、publish 遷移時は接続済み PublishRequest の Published 状態を確認したうえで build.stage_change 監査 event を記録する (SEC6, §3.8)。Build/build_stage_events テーブルは tenant_id/workspace_id スコープ列を必須とする (D4)。S13 画面は design system のステージボード共通部品を消費するのみとし独自実装を行わない (qa-021/qa-022)。builds の zod スキーマは packages/schemas/ 配下の単一ソースへ追加し認可単一ミドルウェア (deny-by-default) 配下に置く (B1, qa-023)。工程操作の admin 権限判定は Yellow review (I8) の承認 queue と共通の認可表 (B9) を用いる。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-build-pipeline-board, arch-harness-hub-frontend, arch-harness-hub-backend
- Entry gate: sys-build-pipeline-board-p04 のtest IDs (docs/features/feat-build-pipeline-board/test-design.md, apps/hub/src/__tests__/build-pipeline-board/, packages/schemas/build-pipeline-board/contracts.test.ts, packages/db/__tests__/build-stage-transition.test.ts) と全typed handoff evidenceが揃うこと。かつfeature digest一致、qa-226..229 confirmed、appr-043束縛を確認する
- P01 upstream entry gate: N/A: intra-feature depends_on gate
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: applicable + change: S13 正規route (apps/hub/src/app/(dashboard)/pipeline/) と個票を、StageBoard共通部品、card明示action、ConfirmDialogで実装する。既存/buildsは互換redirect以外のcanonical linkを生成しない
- Backend: applicable + change: builds REST ハンドラ (GET/POST/PATCH/stage 遷移) を実装する
- API: applicable + contract: builds の zod スキーマを packages/schemas/build-pipeline-board/ へ実装し、認可単一ミドルウェア配下へ登録する
- Data: applicable + migration: packages/db/schema/build-pipeline/schema.ts と packages/db/repository/ に全schema・trusted resolver adapter・Turso atomic repository port・D1 fail-closed adapterを実装する。migration artifact自体はP08が所有する
- Infrastructure: N/A: feat-hub-foundation の既存デプロイ単位を使用し、追加インフラを新設しない
- Security: applicable + change: 工程遷移 admin 限定認可・build.stage_change 監査 event・PublishRequest Published 確認・tenant 分離・B9 共有認可表を実装する
- Quality: applicable + change: P04 のテストスタブを green にする
- Documentation: N/A: 実装作業自体は docs/features 配下への文書化を伴わない (文書化は P12 で行う)
- Operations: N/A: 運用手順の文書化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub (feat-hub-foundation が確立した既存デプロイ単位を使用する)
- Compatibility/migration/backfill: 既存0007/0008 schemaを互換baselineとして維持し、P05はP08のBuild専用additive delta/backfillが生成できるschema/repository状態を作る。combined 0008は変更しない

## 成果物

- Produced artifacts: apps/hub/src/app/(dashboard)/pipeline/, legacy builds redirect if required, apps/hub/src/features/build-pipeline-board/, packages/schemas/build-pipeline-board/, packages/db/schema/build-pipeline/schema.ts, packages/db/repository/ Build transaction/resolver ports, apps/hub/src/app/api/v1/builds/, apps/hub/src/__tests__/build-pipeline-board/, packages/db/__tests__/build-stage-transition.test.ts, .github/workflows/ci.yml
- Consumed artifacts: docs/features/feat-build-pipeline-board/architecture-decision-record.md, docs/features/feat-build-pipeline-board/test-design.md, typed handoff receipts from feat-hearing-intake/feat-publish-pipeline/feat-hub-foundation/feat-auth-tenancy/feat-domain-model-db
- Write scope/touches: apps/hub/src/app/(dashboard)/pipeline/, apps/hub/src/app/(dashboard)/builds/page.tsx (legacy redirect only), apps/hub/src/features/build-pipeline-board/, apps/hub/src/app/api/v1/builds/, apps/hub/src/__tests__/build-pipeline-board/, apps/hub/src/lib/authz/, packages/schemas/build-pipeline-board/, packages/db/schema/build-pipeline/schema.ts, packages/db/repository/, packages/db/__tests__/build-stage-transition.test.ts, .github/workflows/ci.yml

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-build-pipeline-board-p05) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-build-pipeline-board-p05 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-build-pipeline-board-p05) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: sys-build-pipeline-board-p04 完了後に着手する。write_scope 内の各 path が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- ステージボード共通部品自体の実装 (owner=feat-hub-foundation)
- publish 状態機械自体の実装・変更 (既存 I2/I3 を使用。goal-spec scope_out)
- 工程の自動遷移ロジックの実装 (goal-spec scope_out)
- Hearing IntakeのProject作成・関連付け実装 (feat-hearing-intake owner)。本taskはtyped resolver port/consumer adapterのみを実装し、provider evidence不在ならblockedとする

## テスト戦略

- テストレベル選定: 単体・結合・境界値・回帰の4レベルを本taskの成果物に応じて適用する。適用外のレベルは証跡で N/A: 理由を明記する。
- カバレッジ目標: 実行コードを変更する場合は既定80%を維持し、文書のみの場合も受入条件を100%照合する。
- 層別方針: applicableなFrontendはbehaviorベース、Backend・API・DataはAPI 契約・ロジック単体・DB 結合、InfrastructureはIaC静的検証・smokeを適用する。N/Aの層はWorkstream applicabilityの理由を維持する。
- 保守性制約: pixel位置依存とDOM構造依存を禁止し、公開契約ではなく実装詳細へ密結合する過剰テストを作らない。

## Verification and evidence

- Automated commands: `pnpm install --frozen-lockfile`, `pnpm --filter @harness-hub/hub build`, `pnpm --filter @harness-hub/hub exec vitest run src/__tests__/build-pipeline-board`, `pnpm --filter @harness-hub/db exec vitest run __tests__/build-stage-transition.test.ts`, `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-build-pipeline-board`
- Required evidence: P04 のテストスタブがすべて green であること、および pnpm build/test の成功ログが得られていること. Normative evidence: stage transition/API tests、axe report、CWV report（LCP/INP/CLS各good）、CI job URLまたは再実行可能ログを必須証跡とする。

## Inner goal-seek execution loop

- Methodology contract: `system-task-goal-seek/v1`
- Goal: 本taskの「目的」と「成果物」に定義した単一責務を、受入条件を削らず再実行可能な証跡とともに完了する。
- Generic execution prompt: 目的・背景・前提条件・スコープ・成果物を入力に、手段を固定せず最小の変更で実装と検証を行う。
- Rubric: 受入条件を全件満たし、必要なカバレッジが80%以上で、既存テストの回帰が0件、証跡が再実行可能で、宣言したwrite scope外を変更していなければPASSとする。
- Feedback loop: 実行後に独立評価し、findingを次のpromptへ反映して再実行する。`rubric verdict=PASS`まで反復し、上限到達時はfail-closedで停止する。
- P13 spec/architecture writeback: N/A: P13が正本への書き戻しを所有する。

## Rollout and rollback

- Rollout: 実装完了後、build/test 成功ログを添えて P06 テスト実行へ引き継ぐ
- Rollback trigger and steps: build/test が失敗する場合、失敗箇所を write_scope 内の該当 path に限定して修正し、影響が設計 (P02/P03) に及ぶ場合は該当 task を再実行対象として差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-build-pipeline-board.context.json` (`sha256:eeed295d50359e11ac8aee84800def3ad3399cee866ab5b4dc2712116c9a4441`)
- Phase responsibility: P04 を先行条件として現行 scope_in を実装し、scope_out を混入させない。
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

This section is normative for P05 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-build-pipeline-board.context.json; docs/backend-spec.md §4.4; docs/frontend-spec.md S13; docs/security-spec.md CI accessibility contract
- Effective phase contract: P04 は既存5カテゴリに axe detectable violations=0 と CWV LCP/INP/CLS=good を追加する。P05 は S13 UI/Build schema に加え、GET /api/v1/builds、GET /api/v1/builds/:id、POST /api/v1/builds（sheet_id xor feedback_id の手動復旧）、PATCH /api/v1/builds/:id、POST /api/v1/builds/:id/stage の正本5 endpointを route handler、zod contract、単一 authz middleware接続として実装する。P04/P06/P07 は5 endpoint（manual recoveryを含む）とaxe/CWVを実測し、P09 CI gate、P10最終判定、P11 evidence、P13 production smokeまで同じ測定IDを追跡する。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `apps/hub/src/app/api/v1/builds/`
- `apps/hub/src/__tests__/build-pipeline-board/`
- `.github/workflows/ci.yml`
- Mandatory evidence: 正本5 endpoint（POST manual recoveryのsheet_id xor feedback_idを含む）のrole/tenant/validation tests、stage transition tests、axe report、CWV report（LCP/INP/CLS各good）、CI job URLまたは再実行可能ログを必須証跡とする。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## Confirmed contract overlay (2026-08-10)

This section is normative for this phase and supersedes older schema, route, writer, migration, owner, command, count, and path wording when a conflict exists. Canonical approval lineage is `system-spec/spec-state.json#qa-226..qa-229` plus `appr-043`; the target design is `docs/features/feat-build-pipeline-board/architecture-decision-record.md`. Current implementation is gap evidence, not permission to weaken the target contract.

- Data/API: `builds` owns `id,tenant_id,workspace_id,sheet_id,feedback_id,project_id,type,title,stage,risk,eta_date,assignee_user_id,publish_request_id,note,created_at,updated_at`; source is strict `sheet_id xor feedback_id`. `build_stage_events` owns `id,tenant_id,workspace_id,build_id,from_stage,to_stage,actor_user_id,reason,occurred_at,created_at` and is append-only. Both tables enforce stage/risk/scope constraints and the ADR §3 indexes. The five endpoints are GET list/detail, POST manual recovery, PATCH metadata, and POST stage; invalid/foreign cursor is 422, manual recovery accepts exactly one source ID, and all IDs are resolved inside tenant/workspace.
- Project/trust: Hearing Intake creates or links Project idempotently when a HearingSheet becomes confirmed and persists the scoped relation. Build accepts only the typed trusted-resolver result; it never accepts or derives `project_id` from client body, token claim, display name, or untrusted JSON. Unresolved, mismatch, or cross-scope resolution is fail-closed and zero-write.
- Mutation/authorization: the canonical stage endpoint applies CAS and writes Build state + stage event + `build.stage_change` audit in one Turso transaction. A Turso failure never falls back to D1. Until D1 proves the same all-or-nothing boundary, every D1 Build mutation returns typed 503 unavailable with zero state/event/audit writes. Reads require member; create/update/stage require workspace-admin or provider-admin through the shared deny-by-default B9 action table.
- UI: S13 canonical route is `/pipeline` and detail is `/pipeline/[buildId]` under the existing HubShell. Every card exposes an explicit stage action and ConfirmDialog; drag-and-drop is optional enhancement, never the sole operation. Desktop/mobile loading, empty, forbidden, failed, conflict, unavailable and success states are distinct; shared `packages/ui` StageBoard primitives are consumed without importing Hub domain types.
- Publish: `PublishRequest` remains the only publish status/verdict/channel state. Transition to `publish` verifies a published request in the same tenant/workspace/project; Build stores only the reference and never duplicates publish state.
- Migration/release: `packages/db/migrations/0008_metrics-tracking-and-build-stage-events.sql`, `meta/0008_snapshot.json`, and `meta/_journal.json` are immutable history and must not be edited, split, renamed, or re-numbered. Future additive migration, trusted backfill, release, rollback and evidence are Build-only and separate from Metrics. At execution time P08 resolves the next unused numeric sequence and writes `packages/db/migrations/NNNN_build-pipeline-*.sql`, the same-sequence `packages/db/migrations/meta/NNNN_snapshot.json`, the journal entry, schema/repository changes and migration-lineage tests.
- Fail-closed verification: use existing scripts only: `pnpm --filter @harness-hub/db check:ddl`; `pnpm --filter @harness-hub/db exec vitest run __tests__/migration-lineage.test.ts __tests__/build-stage-transition.test.ts`; `pnpm --filter @harness-hub/hub exec vitest run src/__tests__/build-pipeline-board`; `pnpm --filter @harness-hub/hub build`. A missing package/script/test selection is failure, not a skipped success. Planner revalidation after promotion uses `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-build-pipeline-board`.

### Typed external handoffs

- `{provider_feature_id: feat-hearing-intake, contract_ref: qa-228§1/qa-229§1, required_evidence: confirmed HearingSheet→Project relation + tenant/workspace trusted-resolver contract tests, unavailable_behavior: P05/P08 blocked; Build create returns fail-closed zero-write}`.
- `{provider_feature_id: feat-publish-pipeline, contract_ref: B4/I2/I3 + qa-228§6, required_evidence: same-scope PublishRequest resolver and published-state tests, unavailable_behavior: publish transition rejected without changing Build}`.
- `{provider_feature_id: feat-hub-foundation, contract_ref: qa-226§1/§6 + qa-227§2, required_evidence: StageBoard/ConfirmDialog contracts and /pipeline HubShell route support, unavailable_behavior: visual implementation phase blocked}`.
- `{provider_feature_id: feat-auth-tenancy, contract_ref: qa-226§3 + B9, required_evidence: principal tenant/workspace/user projection and shared action-table tests, unavailable_behavior: deny-by-default}`.
- `{provider_feature_id: feat-domain-model-db, contract_ref: qa-228§6/qa-229§4/§7, required_evidence: Turso transaction-capable repository port + D1 zero-write adapter tests + migration lineage, unavailable_behavior: mutation and release blocked}`.

These are typed consumed-artifact gates, not new intra-feature DAG nodes and not permission to modify provider-owned files. Parent `depends_on` remains canonical; each executor rechecks the required evidence before its phase.

### P01-P13 responsibility trace

| Phase | Required semantic closure |
|---|---|
| P01 | Merge the baseline with qa-226..229/appr-043 and the five typed handoffs; do not call the old 3-acceptance/6-constraint set complete by itself. |
| P02 | Freeze the full schema/index/API/UI/auth/transaction/publish/migration design and current-implementation gaps in the ADR. |
| P03 | Independently reject any P02 omission or contradiction, including provider readiness and D1/0008 fail-closed boundaries. |
| P04 | Define executable positive, negative, concurrency, cross-scope, D1 zero-write, migration-lineage, /pipeline action/ConfirmDialog, axe and CWV cases. |
| P05 | Implement only after typed gates pass; own route/UI/schema/repository/transaction/authz changes needed for all five endpoints. |
| P06 | Execute the exact P04 IDs with real commands and record zero skipped or deferred cases plus coverage and transaction rollback evidence. |
| P07 | Accept only executed evidence for the original three criteria and the four approved addenda in this overlay. |
| P08 | Produce a Build-only additive delta/backfill after immutable 0008 and verify schema/journal/snapshot/repository compatibility. |
| P09 | Make the P04/P06 gates fail-closed in CI; a missing script, test, driver, evidence, or provider contract is FAIL. |
| P10 | Independently adjudicate all original and confirmed-overlay constraints; unresolved High means NO-GO. |
| P11 | Preserve source digests, exact commands/results, migration hashes, zero-write/atomicity evidence, UI/a11y/CWV evidence and typed handoff receipts. |
| P12 | Document /pipeline operations, manual action/ConfirmDialog, 409/422/503 recovery, Turso-only writer, audit checks, migration and rollback without claiming runtime completion. |
| P13 | With explicit approval, apply the Build-only migration via the real DB script, deploy, smoke all five endpoints/UI/atomicity, write back actual findings, and keep durable done gated by merged PR/default reconciliation. |

## 参照情報

- System specification: system-spec/frontend.md (qa-022), system-spec/backend.md (qa-033), system-spec/database.md (qa-032), system-spec/security.md (qa-025 SEC2/SEC6), system-spec/00-requirements-definition.md (D4)
- Detailed authoritative source: docs/backend-spec.md (§2.3 builds/build_stage_events, §3.3 認可マトリクス, §3.8 監査対象, §4.4 builds API, §5.3 Build 状態機械)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-build-pipeline-board
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-build-pipeline-board-p04
