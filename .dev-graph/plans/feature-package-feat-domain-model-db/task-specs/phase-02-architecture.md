# System task overlay: コアドメイン 18 テーブル Drizzle スキーマ・接続層隔離・R2 registry アーキテクチャ設計

## Machine-readable registration fields

- feature_package_id: feature-package/feat-domain-model-db (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-domain-model-db", "macro-feature", "data", "architecture"]
- related_nodes: ["feat-domain-model-db", "arch-harness-hub-data", "arch-harness-hub-backend"]
- parent_feature: feat-domain-model-db
- phase_ref: P02
- classification: confidence=0.9, reason="コアドメイン 18 テーブルの Drizzle スキーマ設計・libSQL/D1 接続層隔離設計・R2 content-addressed registry 設計・User 基底テーブル owner 確定を行う P02 タスク", candidates=[{artifact_kind: task, confidence: 0.9, candidate_path: tasks/feat-domain-model-db/sys-domain-model-db-p02.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P01 で確定した要件ベースラインを実装可能なアーキテクチャへ具体化する。具体的には (1) コアドメイン 18 テーブルの Drizzle スキーマ (列定義・型・制約) を backend-spec.md §2.2 に一致させて確定し、(2) libSQL (Turso) を primary、Cloudflare D1 を hedge とする接続層隔離の設計を確定し、(3) R2 content-addressed PackageRegistry のキー設計・不変性保証を確定し、(4) releases immutable 制約・target_channels.stable_release_id atomic pointer の強制方式を確定し、(5) audit_events hash chain と encryption_keys 封筒暗号化の repository 層責務を確定し、(6) 単一 Drizzle migration 系統のもとで Studio 拡張 feature が自身のテーブルを追加できるスキーマ構成 (barrel import 方式) を確定し、(7) goal-spec quality_constraints の P02 必須解消事項である User 基底テーブルの owner feature を確定する。

## 背景

### Architecture decision: User 基底テーブルの owner は feat-domain-model-db である

features/feat-domain-model-db.md の上流未解決節は「qa-024 の既存不変エンティティ一覧に User が含まれず、owner feature が未明記」と記す。docs/backend-spec.md §2.2 (コアドメイン 18 テーブル定義、grounding 指定の detailed authoritative source) 53 行目は `users` を `id, tenant_id, idp_subject, email, name, department, salary (PII, 年収 JPY), role, status, last_login_at` の単一行・単一の既存確定・不変定義として明記しており、department/salary は §2.3 (Studio 拡張) 側には一切登場しない。すなわち department/salary は「User 拡張列」ではなく §2.2 が定めるコアドメイン base table そのものの構成列である。この事実を踏まえ、以下の証跡から owner を確定した。

1. **文書証跡 (直接引用)**: docs/backend-spec.md §2.2 の `users` 行 (53 行目) は department/salary を含む単一の既存確定・不変定義であり、§2.3 (Studio 拡張 11 テーブル: hearing_sheets, builds, build_stage_events, feedbacks, documents, notifications, metrics_events, metrics_rollups, ai_jobs, tenant_coefficients, display_code_counters) には users/department/salary への言及が一切ない。したがって users テーブルの列定義 (department/salary 含む) を分割して別 feature に割り当てる文書的根拠は存在せず、§2.2 の単一定義をそのまま Drizzle スキーマ化する。
2. **write_scope の構造的制約**: `packages/db/schema/core/` は本 feature の排他的 write_scope であり、単一 migration 系統 (quality_constraints: single-migration-pipeline-drizzle-repository-package) の下で 1 つの CREATE TABLE 文を複数 feature の write_scope にまたがって ALTER 分割する仕組みは goal-spec/exact-13 契約のどこにも定義されていない。したがって users テーブルの全列 (department/salary 含む) は schema/core/ に単一の CREATE TABLE として実装され、feat-domain-model-db が唯一の owner となる。
3. **アクセス制御責務の分離**: docs/backend-spec.md はメンバーが name/department のみ閲覧可能で salary は admin 限定であること、role/department/salary/status 変更時に監査 event を要求することを定める (§3 API 契約、§9.1 セキュリティ深掘り)。これは「誰が列を定義するか (スキーマ owner)」と「誰が読み書きを制御するか (業務ロジック owner)」が別責務であることを示す。PII ガード共通層自体は feat-hub-foundation が owner (docs/shared-layers.md §5) であり、feat-user-org-admin はこの共通層を salary 列に適用する消費者であって、列定義そのものの owner ではない。

以上の証跡が整合するため、本 task は次のとおり確定する。**feat-domain-model-db が users テーブル (department/salary 列を含む完全な基底定義: id, tenant_id, idp_subject, email, name, department, salary, role, status, last_login_at) および user_settings テーブルを含むコアドメイン 18 テーブル全ての owner である。feat-user-org-admin は users テーブルへの列追加を一切行わず、代わりに (a) feat-hub-foundation 所有の PII ガード共通層 (docs/shared-layers.md §5) を salary 列に適用する認可ゲート、(b) feat-domain-model-db の AuditRepo.append() を消費する salary/role 変更監査ロジック、(c) tenant_coefficients テーブルと係数管理 UI/API (hourlyRate = salary ÷ annual_hours、docs/backend-spec.md §6) を担う。** これにより「1 テーブルの DDL を 2 つの write_scope に分割 ALTER する」という未定義メカニズムは不要になり、schema/core/ と feat-user-org-admin の write_scope (apps/hub 配下、packages/schemas/user-org-admin/ 等) は列レベルではなく責務レベルで非重複となる。

**cross-feature 整合に関する follow-up 注記**: feat-user-org-admin の現行公開 plan (`.dev-graph/plans/feature-package-feat-user-org-admin/task-specs/phase-02-architecture.md`) は目的・背景・Compatibility 節で「User 拡張 (department/salary) のカラム設計」および「User テーブルへの department/salary 列追加は既存行に対する後方互換な列追加として設計する」と明記しており、本決定 (基底列は feat-domain-model-db 所有、feat-user-org-admin はガード適用・監査・係数管理のみ) と矛盾する前提に基づいている。この矛盾は feat-user-org-admin 自身の write_scope 配下にあり feat-domain-model-db の write_scope 外であるため本 task では訂正できない。dev-graph への follow-up として「feat-user-org-admin 側 P02 再実行時に、User 拡張列設計を PII ガード適用・監査・tenant_coefficients 設計へ置き換え、department/salary 列のスキーマ定義記述を削除する」ことを申し送る。features/feat-domain-model-db.md 上流未解決節の記述更新も同様に follow-up として申し送る (features/ 配下は読み取り専用のため本 task の write_scope 外)。

### コアドメイン 18 テーブルの確定

docs/backend-spec.md §2.2 に基づき、以下 18 テーブルを本 feature の Drizzle スキーマ対象として確定する: tenants, idp_connections, workspaces, users, user_settings, projects, target_channels, releases, packages, deployment_references, catalog_entries, publish_requests, publisher_tokens, device_authorizations, audit_events, encryption_keys, session_revocations, idempotency_ledger。このうち users は §2.2 の単一定義どおり department/salary 列を含む完全形で実装し (「Architecture decision: User 基底テーブルの owner は feat-domain-model-db である」を参照)、department/salary を後続 feature 向けに空けておく設計上の分割は行わない。共通規約 (qa-032) として全 PK は ULID 文字列 (26 文字 Crockford Base32)、時刻列は INTEGER (Unix epoch ミリ秒、サーバ時刻のみ、クライアント指定不可)、表示用連番は Studio 拡張が owner の display_code_counters (packages/db/schema 配下ではなく各 Studio feature が管理) から発行される別列とし、本 feature のコアテーブルは連番カウンタ自体を持たない。tenant_id/workspace_id を持つ全テーブルに row-level scope を適用し (documents.scope='common' 相当の全体共有列は本 feature のテーブルには存在しない)、CI 必須の分離テスト対象とする (D4, qa-024)。

### 接続層の隔離設計 (D2 ヘッジ)

Drizzle スキーマ定義自体は `drizzle-orm/sqlite-core` の driver 非依存 API (`sqliteTable`/`text`/`integer`) のみを用い、Turso 固有・D1 固有の型に依存しない。接続層は `packages/db/connection/` に 2 系統のファクトリを設ける: `createTursoClient(env)` (`@libsql/client` + `drizzle-orm/libsql`、primary) と `createD1Client(binding)` (`drizzle-orm/d1`、hedge)。両者は同一スキーマに対して構造的に互換な query builder を返すため、リポジトリ層の関数は driver 種別を意識せず同一シグネチャで動作する。切替はデプロイ時の環境バインディング選択のみで完結し、アプリ層コードの変更を要さない。DB アクセスは packages/db のリポジトリ層関数を経由する以外の手段を禁止し (qa-020)、CI での import 経路チェックで検証する (P09 で具体化)。

### R2 content-addressed PackageRegistry

`packages` テーブルは content_hash (sha256, unique) / r2_key / size_bytes / kind のみを保持し、SkillPackage 実体は保存しない。R2 key は content_hash から決定的に導出し (例: `packages/{content_hash}`)、同一 content_hash への書き込みは既存オブジェクトの存在確認により拒否し (immutable、上書き禁止)、`putPackage(buffer) -> {content_hash, r2_key}` と `getPackage(content_hash) -> ReadableStream` の 2 関数のみを packages/db の registry サブモジュールとして公開する。

### Release immutability と audit/encryption の owner 確定

releases テーブルは status 列以外の UPDATE を禁止する制約をリポジトリ層で強制し (アプリ層の `updateReleaseStatus()` のみを公開し、他フィールドの UPDATE 関数を提供しない)、version は content_hash + 直前 version からの差分判定により自動採番する。target_channels.stable_release_id の切替は単一トランザクション内の atomic UPDATE として実装する (I3)。audit_events は本 feature のコアドメインテーブルであるため、hash chain 計算 (`event_hash = SHA-256(prev_hash || "\n" || tenant_id || "\n" || seq || ... )`、docs/security-spec.md §5.4) を含む `append()`/`read()` のみを提供する AuditRepo を本 feature が実装し、他の全 feature (feat-user-org-admin 等) はこの AuditRepo を消費するのみで独自の監査テーブルを持たない。同様に encryption_keys テーブルは本 feature が owner であり、KEK/DEK 封筒暗号化のラップ/アンラップ・列暗号化ユーティリティ (AES-256-GCM, Web Crypto API, IV=96bit random, AAD=`"{table}:{column}:{row_id}"`) を packages/db の共有プリミティブとして実装する。これにより idp_connections.client_secret_enc と users.salary (いずれも本 feature が owner として実装する core テーブルの列) の双方が同一の暗号化プリミティブを再利用でき、feat-user-org-admin はこの encryptColumn/decryptColumn プリミティブ経由で salary への PII ガード付きアクセス (admin 限定読取・export mask) を実装する消費者として振る舞う。

### 単一 migration 系統と Studio 拡張の統合方式

drizzle-kit の migration 出力先を `packages/db/migrations/` に一本化する。本 feature はコアドメイン 18 テーブルの schema.ts 群を `packages/db/schema/core/` に配置し、Studio 拡張 feature は各自の write_scope である `packages/db/schema/{studio-feature}/` に自身のテーブル定義を配置する。本 feature は両者を単一の migration lineage へ束ねる schema barrel (`packages/db/schema/index.ts`) と drizzle.config.ts を所有し、barrel は Studio 拡張の schema.ts を re-export するのみで内容を編集しない。これにより「スキーマ変更は単一系統で運用」(quality_constraints) を満たしつつ、各 feature の write_scope 境界を保つ。

### qa-045 (tenant_data_objects) の扱い

system-spec/database.md qa-045 (2026-07-18 確定) は業務ナレッジ/実行入出力データ保持のための新テーブル tenant_data_objects (id, tenant_id, workspace_id, kind, title, r2_key, size_bytes, content_hash, enc_key_version, uploaded_by, created_at) と、テナント別 DEK による R2 封筒暗号化、ユーザー削除時の即時完全削除ポリシー、四半期 restore drill への削除確認項目追加を定めている。docs/backend-spec.md も §1/§9 でこの delta を反映済みである。しかし本 feature が拘束される feature_context_digest (sha256:ed9bbe22a2887731c84470adb8e4f8df41fd7eec46efc58b4dc8e5095b5b5fd5) の quality_constraints/lineage にはこのテーブルへの言及がなく、team-lead が指定した grounding qa エントリ (qa-004/017/019/020/024/032) にも qa-045 は含まれない。exact-13 パッケージ契約は digest に紐づかないスコープ拡張を禁止するため、本 task は tenant_data_objects を本 feature の成果物に含めないことを確定する。この table は「業務データ保持」という feat-domain-model-db と類似だが独立した責務 (別の暗号化 purpose、別の削除ポリシー、別の R2 バケット/prefix) であるため、dev-graph へ follow-up feature candidate (feat-tenant-data-retention 相当) として返す。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-domain-model-db, arch-harness-hub-data, arch-harness-hub-backend
- Entry gate: .dev-graph/staging/goal-spec.json の feature_context_digest が sha256:ed9bbe22a2887731c84470adb8e4f8df41fd7eec46efc58b4dc8e5095b5b5fd5 に一致し、confirmation_status=confirmed であること。加えて P01 の docs/features/feat-domain-model-db/requirements-baseline.md が存在すること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: N/A: 本 feature は UI を持たない
- Backend: applicable + change: packages/db のスキーマ・接続層・リポジトリ層のアーキテクチャを確定する (実装は P05)
- API: N/A: 本 feature は HTTP API endpoint を持たない。契約はリポジトリ層関数シグネチャとして本 task で確定する
- Data: applicable + change: コアドメイン 18 テーブルの列定義・制約・migration 系統を確定する
- Infrastructure: applicable + change: libSQL/D1 接続層構成と R2 バケット/キー設計を確定する (プロビジョニング自体は feat-hub-foundation の既存インフラを利用し新設しない)
- Security: applicable + change: audit_events hash chain と encryption_keys 封筒暗号化の owner・責務境界を確定する
- Quality: applicable + change: User 基底テーブル owner 確定により quality_constraints の P02 必須解消事項を解消する
- Documentation: applicable + change: docs/features/feat-domain-model-db/architecture-decision-record.md を新規作成する
- Operations: N/A: 運用手順の具体化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-data, arch-harness-hub-backend (D2/D4/I3/G1/G4, qa-004/qa-019/qa-020/qa-024/qa-032 を踏襲し、本 task で User 基底テーブル owner の architecture decision を追加する)
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: N/A: 本 task は設計確定のみで、実際の migration 生成は P08 で行う。既存データは存在しない (feat-domain-model-db が本 DB の初回スキーマ) ため backfill 対象なし

## 成果物

- Produced artifacts: docs/features/feat-domain-model-db/architecture-decision-record.md (18 テーブルの列定義表、接続層隔離設計、R2 registry 設計、release immutability 強制方式、audit/encryption owner 確定、単一 migration 系統と Studio 拡張統合方式、User 基底テーブル owner の architecture decision、qa-045 follow-up 記録を含む)
- Consumed artifacts: docs/features/feat-domain-model-db/requirements-baseline.md, docs/backend-spec.md, docs/security-spec.md, docs/shared-layers.md, system-spec/database.md, .dev-graph/plans/feature-package-feat-user-org-admin/workstream-inventory.json, .dev-graph/plans/feature-package-feat-user-org-admin/plan-findings.json, .dev-graph/plans/feature-package-feat-user-org-admin/task-specs/phase-02-architecture.md
- Write scope/touches: docs/features/feat-domain-model-db/architecture-decision-record.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-domain-model-db-p02) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-domain-model-db-p02 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-domain-model-db-p02) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-DOMAIN-MODEL-DB-P01]。resource_scope (docs/features/feat-domain-model-db/architecture-decision-record.md) は他 task と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- department/salary 列に対する PII ガード適用・利用 API・監査 UI・tenant_coefficients (係数管理 UI/API) の設計 (owner=feat-user-org-admin。本 feature は users テーブルの列定義自体 [department/salary 含む] のみを確定し、業務ロジック・認可・UI は対象外とする)
- Studio 拡張テーブル (packages/db/schema/{studio-feature}/ 配下) の列定義
- tenant_data_objects テーブル (qa-045) の設計 (本 digest スコープ外。follow-up feature candidate として記録)
- 実装コード自体の作成 (packages/db への実コード投入は P05)
- 認可ミドルウェア・認証フロー (owner=feat-auth-tenancy)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: docs/features/feat-domain-model-db/architecture-decision-record.md に (1) 18 テーブル列定義が docs/backend-spec.md §2.2 と一致すること、(2) User 基底テーブル owner の architecture decision が 3 系統の証跡とともに明記されていること、(3) qa-045 の follow-up 記録が明記されていること、の 3 点が確認できること

## Rollout and rollback

- Rollout: architecture-decision-record.md を作成し、P01 の requirements-baseline.md との整合を確認してから P03 (独立設計レビュー) へ引き継ぐ
- Rollback trigger and steps: feat-user-org-admin 側の write_scope が今後変更され本 architecture decision の前提 (write_scope 非重複) が崩れた場合、本 task の architecture decision を re-open し P02 を再実行する。再実行までは P03 以降の着手を保留する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/00-requirements-definition.md (D2, D4, I3, G1, G4), system-spec/spec-state.json qa_log (qa-004, qa-017, qa-019, qa-020, qa-024, qa-032), system-spec/database.md (qa-045、follow-up 参考)
- Detailed authoritative source: docs/backend-spec.md §2.2 (コアドメイン 18 テーブル、users は department/salary を含む単一定義), §2.3 (Studio 拡張 11 テーブル、users/department/salary への言及なし、対照用), §3 (API 共通契約), §6 (hourlyRate 算出式), §9.1 (セキュリティ深掘り), docs/security-spec.md §4 (データ保護), §5 (監査/改ざん防止), docs/shared-layers.md §5 (PII ガード共通層、owner=feat-hub-foundation)
- Architecture: arch-harness-hub-data, arch-harness-hub-backend
- Feature: feat-domain-model-db
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-DOMAIN-MODEL-DB-P01
