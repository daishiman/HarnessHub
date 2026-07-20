# System task overlay: アーキテクチャ設計 — PublishRequest 状態機械実装方式・検査 pipeline 共有パッケージ・R2/監査/認可 consumer 境界確定

## Machine-readable registration fields

- feature_package_id: feature-package/feat-publish-pipeline (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-publish-pipeline", "macro-feature", "backend", "architecture-decision"]
- related_nodes: ["feat-publish-pipeline", "arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-security"]
- parent_feature: feat-publish-pipeline
- phase_ref: P02
- classification: confidence=0.9, reason="PublishRequest 状態機械の実装方式・検査 pipeline 共有パッケージ設計・REST endpoint 設計に加え、publish_requests 等のスキーマ owner (feat-domain-model-db) と単一認可ミドルウェア owner (feat-auth-tenancy) の cross-feature 境界確定を行う P02 architecture decision タスク", candidates=[{artifact_kind: task, confidence: 0.9, candidate_path: tasks/feat-publish-pipeline/sys-publish-pipeline-p02.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P01 で確定した要件ベースラインを実装可能なアーキテクチャへ具体化する。具体的には (1) PublishRequest 状態機械 (§7.2 準拠 9 値) を純関数の state-transition として実装する方式を確定し、(2) 検査 pipeline (packages/inspection) の共有純関数パッケージ設計・scaffold owner (feat-hub-foundation) とロジック実装 owner (feat-publish-pipeline) の分割・既存 Python 資産の TypeScript 移植方針を確定し、(3) REST API 12 経路 (§4.6) の zod スキーマ設計と単一認可ミドルウェア消費方式を確定し、(4) R2 content-addressed PackageRegistry・releases/target_channels・audit_events への consumer としてのアクセス方式を確定し、(5) TargetChannel 直列化の実装方式 (partial UNIQUE index + repository 層チェック + 409 応答) を確定し、(6) goal-spec quality_constraints の P02 必須解消事項である publish_requests 等のスキーマ owner・単一認可ミドルウェア owner・検査 pipeline の scaffold/ロジック分割 owner・消費境界を確定する。

## 背景

### Architecture decision: publish_requests/releases/target_channels/packages/deployment_references/audit_events/idempotency_ledger のスキーマ owner は feat-domain-model-db である

`.dev-graph/plans/feature-package-feat-domain-model-db/task-specs/phase-02-architecture.md` (35行目以降) は、docs/backend-spec.md §2.2 に基づきコアドメイン 18 テーブルを feat-domain-model-db の Drizzle スキーマ対象として確定しており、その一覧には `target_channels, releases, packages, deployment_references, publish_requests, audit_events, encryption_keys, session_revocations, idempotency_ledger, publisher_tokens, device_authorizations` が明記されている。同文書はさらに「DB アクセスは packages/db のリポジトリ層関数を経由する以外の手段を禁止し (qa-020)」「releases テーブルは status 列以外の UPDATE を禁止する制約をリポジトリ層で強制し (アプリ層の `updateReleaseStatus()` のみを公開)」「target_channels.stable_release_id の切替は単一トランザクション内の atomic UPDATE として実装する (I3)」「audit_events は本 feature のコアドメインテーブルであるため、hash chain 計算を含む `append()`/`read()` のみを提供する AuditRepo を本 feature が実装し、他の全 feature はこの AuditRepo を消費するのみで独自の監査テーブルを持たない」「`packages` テーブルは content_hash/r2_key/size_bytes/kind のみを保持し、`putPackage(buffer) -> {content_hash, r2_key}` と `getPackage(content_hash) -> ReadableStream` の 2 関数のみを packages/db の registry サブモジュールとして公開する」と明記する。

以下の証跡から本 feature の owner/consumer 境界を確定する。

1. **文書証跡 (直接引用)**: 上記 feat-domain-model-db P02 文書は publish_requests/releases/target_channels/packages/deployment_references/audit_events/idempotency_ledger の全列定義・制約・リポジトリ層関数シグネチャ (`updateReleaseStatus()`, atomic `stable_release_id` 切替, `AuditRepo.append()`/`read()`, `putPackage()`/`getPackage()`) を既に確定済みの成果物として持つ。したがって本 feature がこれらのテーブルの列定義や制約を再定義する余地は文書上存在しない。
2. **write_scope の構造的制約**: `packages/db/schema/` は本 feature の write_scope に含まれない (P01 requirements-baseline.md で確定済み)。単一 migration 系統 (feat-domain-model-db が owner) の下で、本 feature が独自にスキーマを追加・変更する仕組みは goal-spec/exact-13 契約のどこにも定義されていない。
3. **責務分離の原則**: 「誰がテーブルを定義するか (スキーマ owner)」と「誰が業務ロジックとして読み書きするか (機能 owner)」は別責務である。本 feature は PublishRequest 状態機械・検査 pipeline・promote/rollback という**業務ロジック**の owner であり、上記テーブルへは feat-domain-model-db が公開するリポジトリ層関数 (`createPublishRequest()`, `transitionPublishRequest()`, `updateReleaseStatus()`, atomic pointer 切替, `AuditRepo.append()`, `putPackage()`/`getPackage()` 等) を消費することでのみアクセスする。

以上の証跡が整合するため、本 task は次のとおり確定する。**feat-domain-model-db が publish_requests/releases/target_channels/packages/deployment_references/audit_events/idempotency_ledger を含むコアドメイン 18 テーブル全ての owner であり、本 feature (feat-publish-pipeline) はこれらテーブルへの repository 層関数を消費する consumer である。** これにより本 feature の write_scope は apps/hub の API route・状態機械実装・検査 pipeline パッケージ・zod スキーマに限定され、packages/db/schema/ 配下への変更は一切発生しない。

### Architecture decision: 単一認可ミドルウェアの owner は feat-auth-tenancy である

docs/backend-spec.md §1 コード構造規約は「認可は単一ミドルウェアに集約 (deny-by-default・全 API で Tenant/Workspace スコープ強制 = D4)」と定める。単一認可ミドルウェア (apps/hub/src/lib/authz/) は feat-auth-tenancy が P05 で実装する既存確定の成果物であり (feat-auth-tenancy の goal-spec quality_constraints に authz middleware の実装が明記されている)、本 feature は publish/promote/rollback/approve/suspend/deployment の各 endpoint でこのミドルウェアが公開する認可判定関数を呼び出し、role×リソースマトリクス (docs/backend-spec.md §3.3。publish=Bearer/owner、approve=session/workspace-admin、promote/rollback=owner、audit-events 閲覧=workspace-admin 等) を適用するのみで、認可判定ロジック自体を本 feature 内で再実装しない。これにより認可判定が散在する事態を回避する (qa-020)。

### Architecture decision: 検査 pipeline (packages/inspection) の owner は scaffold (feat-hub-foundation) とロジック実装 (feat-publish-pipeline) に分割する

qa-010/qa-020/goal-spec quality_constraint (inspection-pipeline-shared-pure-function-package-qa010-qa020) は「検査ロジックは Hub 側 (Workers=JS) と共有し二重実装を回避する」「既存 Python 資産 (harness-creator の package check / package contract / marketplace catalog) を仕様の正本として TypeScript へ移植し、挙動同値性をテストで担保する」と定める。features/feat-publish-pipeline.md の scope_in には「検査 pipeline (共有パッケージ化)」が明記されている。

一方、docs/shared-layers.md:9 (冒頭) は「複数 feature が使うものはここに登録し、実装 owner を feat-hub-foundation (基盤) に一元化する」と定め、同書 §2 共通バックエンド層表の検査 pipeline (純関数・共有 package) 行は「static validation / secret scan / policy 判定。Publisher (ローカル pre-check) と Hub (正式検査) で同一実装」を挙げる。さらに published 済みの `.dev-graph/plans/feature-package-feat-hub-foundation/task-specs/phase-02-architecture.md` は 23 行目で「docs/shared-layers.md は共通バックエンド層 (…検査 pipeline…) の実装 owner を feat-hub-foundation に一元化しており…」、38 行目で「検査 pipeline は feat-publish-pipeline と feat-publisher-plugin の双方が消費」と明記しており、これらを表面的に読むと packages/inspection 全体の実装 owner が feat-hub-foundation であるかのように読める。本 task は sibling plan のこの記述を実読・引用したうえで、次の 3 点の証跡により owner を分割解決する。

1. **feature 定義との整合性**: features/feat-hub-foundation.md の scope_out は「業務ドメインロジック」を明記して除外している。owner/公開範囲確認・secret scan・skills-only 制約・高リスク instructions パターン検出・Green/Yellow/Red の検査判定ロジックは、goal-spec quality_constraint (inspection-pipeline-shared-pure-function-package-qa010-qa020) が定める本 feature 固有の業務ルールであり、業務ドメインロジックに該当する。したがって feat-hub-foundation.md 自身の scope_out に照らすと、同 feature が検査判定ロジックの実装 owner を主張することは自 feature 定義と矛盾する。これは同型の先例である NotificationDispatcher owner 問題 (`.dev-graph/plans/feature-package-feat-feedback-loop/plan-findings.json` の medium finding "cross-feature/notification-dispatcher-owner-mismatch": NotificationDispatcher の owner=feat-hub-foundation という帰属記述が feat-hub-foundation.md の scope_out と整合せず、どの feature も実装 owner を宣言していない状態が検出された) と構造的に一致する。
2. **published plan 内の実際の成果物範囲**: 同じ `.dev-graph/plans/feature-package-feat-hub-foundation/task-specs/phase-02-architecture.md` の 52 行目 (成果物 Produced artifacts) は「pnpm-workspace.yaml の設計内容 (apps/hub, packages/ui, packages/schemas, packages/inspection, packages/db を workspace member として列挙する設計)」とのみ記述しており、packages/inspection 内部の検査ロジック実装そのものを成果物として挙げていない。同文書の write_scope (54 行目) も docs/features/feat-hub-foundation/architecture-decision-record.md, pnpm-workspace.yaml, package.json に限定され、packages/inspection/ 配下のソースファイルは含まれない。したがって feat-hub-foundation P02 が実際にコミットしている範囲は workspace 配線 (packages/inspection を空パッケージとして workspace member 列挙する scaffold) であり、検査ロジック本体の実装ではない。
3. **precedent (試算エンジン owner 分割)**: `.dev-graph/plans/feature-package-feat-metrics-tracking/plan-findings.json` の info finding "verified/independent-fork" は、shared-layers.md §2 が試算エンジンを共通層として一元化する記述を持つにもかかわらず、feat-metrics-tracking P02 が「試算エンジン owner=feat-metrics-tracking」と確定した判断 (判断基準 3 点の成立) を独立 fork context で妥当と評価済みである。これは shared-layers.md の一元化原則が業務ドメインロジックの owner を強制するものではなく、ドメインロジックはドメイン feature が持つという原則が既に本システムの先例として確立していることを示す。

以上の 3 点から、本 task は次のとおり owner を分割解決する。**feat-hub-foundation = packages/inspection のパッケージ scaffold + workspace 配線の owner** (pnpm-workspace.yaml への列挙・空パッケージ骨格・CI 配線)。**feat-publish-pipeline (本 feature) = packages/inspection/src/ 配下の検査ロジック実装 owner** (owner/公開範囲確認・secret scan・必須メタ検証・skills-only 制約・禁止 Hook/script/binary 検出・高リスク instructions パターン検出・manifest 補完・試験 install・Catalog 生成の各純関数実装、および既存 Python 資産との挙動同値性移植テスト)。qa-010 が要求する「Publisher と Hub の検査挙動同値」は、実装ロジックが単一の packages/inspection パッケージ内に存在する限り owner 分割によって損なわれない (scaffold とロジックの分割はパッケージの二重実装を意味しない)。features/feat-publisher-plugin (Publisher クライアント側) はこの packages/inspection パッケージ (feat-hub-foundation が用意した scaffold の上に feat-publish-pipeline が実装したロジック) を import して消費する側のままである。

本 feature の write_scope は packages/inspection/ 配下の内容実装に限定され、pnpm-workspace.yaml・package.json (feat-hub-foundation が owner の共有ファイル) には一切触れない。

**cross-feature follow-up (本 feature の write_scope 外。dev-graph follow-up として記録する):**
- (a) docs/shared-layers.md §2 の検査 pipeline owner 行を「scaffold owner=feat-hub-foundation / ロジック owner=feat-publish-pipeline」の 2 段表記へ訂正する。本 feature の write_scope (docs/features/feat-publish-pipeline/ 配下) 外のため、本 task はこの訂正を実施せず dev-graph へ follow-up として引き継ぐ。
- (b) feat-hub-foundation の P02/P05 (published 済みだが未実装) 実行時に、本 architecture decision (scaffold のみ担当し検査ロジックは実装しない) との整合を確認する必要がある旨を dev-graph follow-up として記録する。

### PublishRequest 状態機械の実装方式

状態機械は `Draft | Validating | NeedsFix | Ready | ApprovalPending | Approved | Publishing | Failed | Published` の 9 値を持つ純関数 `transition(state, event) -> state` として `apps/hub/src/lib/publish/state-machine.ts` に実装する。遷移は隣接工程間 (前進/差戻し) のみ許可し、docs/backend-spec.md §5.1 の遷移図に厳密に一致させる。MVP サブセットでは検査結果が Yellow/Red のいずれであっても一律 NeedsFix へ遷移させ、ApprovalPending への遷移パスはコード上に残しつつ policy 設定 (Stage 1 では常に auto-approve=Green のみ) により到達しないことを型レベルで表現する。検査 FAIL (NeedsFix) 時は既存 Publishing 中の Release には一切触れず、Publishing 失敗 (Failed) 時は `target_channels.stable_release_id` の更新を行わないことで既存 stable を無傷のまま維持する。state-transition 関数は property-based test (P04 で設計) により全遷移の網羅的検証を行う。

### 検査 pipeline (packages/inspection) の設計

`packages/inspection/src/` に、owner/公開範囲確認・secret scan・必須メタ検証・skills-only 制約・禁止 Hook/script/binary 検出・高リスク instructions パターン検出 (検出時 Yellow 降格)・manifest 補完・試験 install・Catalog 生成の各チェックを個別の純関数として実装し、`runInspection(packageBuffer, manifest) -> InspectionResult` としてまとめて公開する。既存 Python 資産 (harness-creator の package check / package contract / marketplace catalog スクリプト) を仕様の正本として直接参照し、各チェック項目ごとに入出力の挙動同値性テスト (P04 で設計) を作成する。Publisher (feat-publisher-plugin) はこのパッケージを直接 import してローカル pre-check として利用し、Hub は POST /api/v1/publish/:id/submit の中で同一パッケージを呼び出す (Worker 内同期実行、skills-only package は小サイズ前提)。

### REST API と単一ソース zod スキーマ

`packages/schemas/publish-pipeline/` に PublishRequest/Release/TargetChannel/DeploymentReference の各 zod スキーマを定義し、OpenAPI 生成の入力とする。`apps/hub/src/app/api/v1/publish/` (POST 作成・GET 一覧)、`apps/hub/src/app/api/v1/publish/[id]/package/` (PUT)、`apps/hub/src/app/api/v1/publish/[id]/submit/` (POST)、`apps/hub/src/app/api/v1/publish/[id]/` (GET)、`apps/hub/src/app/api/v1/publish/[id]/approve/` (POST)、`apps/hub/src/app/api/v1/publish/[id]/cancel/` (POST)、`apps/hub/src/app/api/v1/projects/[id]/releases/` (GET)、`apps/hub/src/app/api/v1/channels/[id]/promote/` (POST)、`apps/hub/src/app/api/v1/channels/[id]/rollback/` (POST)、`apps/hub/src/app/api/v1/releases/[id]/suspend/` (POST)、`apps/hub/src/app/api/v1/projects/[id]/deployment/` (POST) の 12 経路を実装する。POST /api/v1/publish は Idempotency-Key ヘッダを必須とし (scope=(tenant,endpoint)・TTL 24 時間・同一 key 異 payload は 422)、TargetChannel 直列化違反は 409 を返す。rollback は 2 版目以降のみ rollback 先の検査 (§7.2) を実行する。

### TargetChannel 直列化の実装方式

feat-domain-model-db が提供する partial UNIQUE index (同一 target_channel_id かつ非終端状態の publish_requests 行を 1 件に制限) を repository 層の `createPublishRequest()` 呼び出し時に活用し、制約違反を検知した場合に REST 層で 409 を返す。これによりアプリ層とスキーマ層の二重チェックで直列化を保証する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-publish-pipeline, arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security
- Entry gate: .dev-graph/staging/goal-spec.json の feature_context_digest が sha256:7a4625914be99dd47f51c4c92698737ad8fe431319995457a6cadc5fd39d2f41 に一致し、confirmation_status=confirmed であること。P01 の docs/features/feat-publish-pipeline/requirements-baseline.md が存在すること。feat-domain-model-db の publish_requests/releases/target_channels/packages/deployment_references/audit_events リポジトリ層関数、feat-auth-tenancy の単一認可ミドルウェア (apps/hub/src/lib/authz/)、および feat-hub-foundation が pnpm-workspace.yaml へ packages/inspection を workspace member として列挙した scaffold (feat-hub-foundation P02 成果物、52 行目) が利用可能であること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: N/A: 本 feature は UI を持たない (公開状態の閲覧導線は既存確定の範囲)
- Backend: applicable + change: apps/hub の状態機械・REST endpoint 12 経路・検査 pipeline のアーキテクチャを確定する (実装は P05)
- API: applicable + change: publish/promote/rollback 12 経路の zod スキーマ設計と OpenAPI 生成方針を確定する
- Data: applicable + change: publish_requests 等のスキーマ owner (feat-domain-model-db) との consumer 境界とリポジトリ層関数の利用方式を確定する (スキーマ自体の変更は行わない)
- Infrastructure: N/A: 新規インフラのプロビジョニングは行わない (既存 R2/Turso を feat-domain-model-db 経由で利用する)
- Security: applicable + change: 単一認可ミドルウェア (feat-auth-tenancy owner) の消費方式・secret scan・高リスク instructions パターン検出の設計を確定する
- Quality: applicable + change: goal-spec quality_constraints の P02 必須解消事項 (スキーマ owner・認可ミドルウェア owner・検査 pipeline owner/消費境界) を解消する
- Documentation: applicable + change: docs/features/feat-publish-pipeline/architecture-decision-record.md を新規作成する
- Operations: N/A: 運用手順の具体化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security (I2/I3/D4/G1/G4, qa-002/qa-004/qa-006/qa-009/qa-010/qa-011/qa-020/qa-033/qa-037 を踏襲し、本 task で publish_requests 等のスキーマ owner・単一認可ミドルウェア owner・検査 pipeline owner の architecture decision を追加する)
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: N/A: 本 task は設計確定のみで、実際のコード実装は P05 で行う。既存データは存在しない (本 feature は永続化スキーマを持たない)ため backfill 対象なし

## 成果物

- Produced artifacts: docs/features/feat-publish-pipeline/architecture-decision-record.md (状態機械実装方式、検査 pipeline 設計と Python 移植方針、REST API 12 経路の zod スキーマ設計、TargetChannel 直列化実装方式、publish_requests 等のスキーマ owner 確定・単一認可ミドルウェア owner 確定・検査 pipeline owner 確定の 3 系統 architecture decision を含む)
- Consumed artifacts: docs/features/feat-publish-pipeline/requirements-baseline.md, docs/backend-spec.md, docs/security-spec.md, docs/shared-layers.md, features/feat-hub-foundation.md, .dev-graph/plans/feature-package-feat-domain-model-db/task-specs/phase-02-architecture.md, .dev-graph/plans/feature-package-feat-auth-tenancy/task-specs/phase-05-implementation.md, .dev-graph/plans/feature-package-feat-hub-foundation/task-specs/phase-02-architecture.md, .dev-graph/plans/feature-package-feat-metrics-tracking/plan-findings.json, .dev-graph/plans/feature-package-feat-feedback-loop/plan-findings.json
- Write scope/touches: docs/features/feat-publish-pipeline/architecture-decision-record.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-publish-pipeline-p02) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-publish-pipeline-p02 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-publish-pipeline-p02) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-PUBLISH-PIPELINE-P01]。resource_scope (docs/features/feat-publish-pipeline/architecture-decision-record.md) は他 task と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- publish_requests/releases/target_channels/packages/deployment_references/audit_events/idempotency_ledger のスキーマ定義・migration (owner=feat-domain-model-db。本 feature はリポジトリ層関数の消費のみ)
- 単一認可ミドルウェアの実装 (owner=feat-auth-tenancy)
- packages/inspection のパッケージ scaffold・pnpm-workspace.yaml への workspace member 列挙・空パッケージ骨格・CI 配線 (owner=feat-hub-foundation。本 feature は scaffold の上に検査ロジックを実装するのみで pnpm-workspace.yaml・package.json には触れない)
- Publisher クライアント側のローカル pre-check 実行ロジック (owner=feat-publisher-plugin。本 feature は packages/inspection のロジック実装 owner として提供するのみ)
- カタログ UI・承認キュー UI (owner=feat-dual-catalog-web / feat-workspace-governance。Approval Pending 状態自体は状態機械に含めるが UI は対象外)
- 実装コード自体の作成 (packages/inspection・apps/hub への実コード投入は P05)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: docs/features/feat-publish-pipeline/architecture-decision-record.md に (1) publish_requests 等のスキーマ owner 確定が 3 系統の証跡とともに明記されていること、(2) 単一認可ミドルウェア owner 確定が明記されていること、(3) 検査 pipeline の scaffold owner (feat-hub-foundation) とロジック実装 owner (feat-publish-pipeline) の分割・消費境界確定が 3 系統の証跡とともに明記されていること、(4) 状態機械実装方式・REST API 12 経路設計・TargetChannel 直列化実装方式が記載されていること、の 4 点が確認できること

## Rollout and rollback

- Rollout: architecture-decision-record.md を作成し、P01 の requirements-baseline.md との整合を確認してから P03 (独立設計レビュー) へ引き継ぐ
- Rollback trigger and steps: feat-domain-model-db または feat-auth-tenancy 側の write_scope・公開 API が今後変更され本 architecture decision の前提 (リポジトリ層関数シグネチャ・認可ミドルウェア API) が崩れた場合、本 task の architecture decision を re-open し P02 を再実行する。再実行までは P03 以降の着手を保留する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/00-requirements-definition.md (I2, I3, D4, G1, G4), system-spec/spec-state.json qa_log (qa-002, qa-004, qa-006, qa-009, qa-010, qa-011, qa-020, qa-033, qa-037)
- Detailed authoritative source: docs/backend-spec.md §1 (コード構造規約, packages/inspection), §2.2 (publish_requests/releases/target_channels/packages/deployment_references/audit_events/idempotency_ledger), §3 (API 共通契約), §4.6 (公開エンドポイント 12 経路), §5.1 (PublishRequest 状態機械), §6.1 (検査 pipeline 最小検査項目), docs/shared-layers.md §2 (共通バックエンド層・検査 pipeline owner 記述)
- Cross-feature published plans referenced: .dev-graph/plans/feature-package-feat-hub-foundation/task-specs/phase-02-architecture.md, .dev-graph/plans/feature-package-feat-metrics-tracking/plan-findings.json, .dev-graph/plans/feature-package-feat-feedback-loop/plan-findings.json, features/feat-hub-foundation.md
- Architecture: arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security
- Feature: feat-publish-pipeline
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-PUBLISH-PIPELINE-P01
