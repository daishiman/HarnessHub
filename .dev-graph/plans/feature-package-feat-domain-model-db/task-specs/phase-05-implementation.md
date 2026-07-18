# System task overlay: 実装 — コアドメイン Drizzle スキーマ・接続層・リポジトリ層・R2 registry

## Machine-readable registration fields

- feature_package_id: feature-package/feat-domain-model-db (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-domain-model-db", "macro-feature", "data", "implementation"]
- related_nodes: ["feat-domain-model-db", "arch-harness-hub-data", "arch-harness-hub-backend"]
- parent_feature: feat-domain-model-db
- phase_ref: P05
- classification: confidence=0.9, reason="P02/P04 で確定した設計・テストケースに基づき packages/db のスキーマ・接続層・リポジトリ層・R2 registry を実装する P05 タスク", candidates=[{artifact_kind: task, confidence: 0.9, candidate_path: tasks/feat-domain-model-db/sys-domain-model-db-p05.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P02 の architecture-decision-record.md と P04 の test-design.md に基づき、packages/db にコアドメイン 18 テーブルの Drizzle スキーマ、libSQL/D1 接続層、リポジトリ層 (tenant scope 強制・release immutable 強制・audit hash chain・封筒暗号化プリミティブ)、R2 content-addressed registry を実装する。migration ファイル自体の生成は P08 で行うため、本 task はスキーマ定義コードとリポジトリ層コードの実装に限定する。

## 背景

実装は P02 の architecture decision に厳密に従う。`packages/db/schema/core/` に tenants, idp_connections, workspaces, users, user_settings, projects, target_channels, releases, packages, deployment_references, catalog_entries, publish_requests, publisher_tokens, device_authorizations, audit_events, encryption_keys, session_revocations, idempotency_ledger の 18 テーブル定義を `drizzle-orm/sqlite-core` の driver 非依存 API で実装する。users は docs/backend-spec.md §2.2 の単一定義どおり department/salary 列を含む完全形で実装し (P02 の「User 基底テーブルの owner は feat-domain-model-db である」決定に基づく)、salary の格納には encryptColumn/decryptColumn プリミティブを適用する。department/salary への PII ガード適用・監査 UI・利用 API・tenant_coefficients (係数管理) の実装は feat-user-org-admin の責務であり本 task には含まない。`packages/db/schema/index.ts` に barrel を実装し、Studio 拡張 feature の schema.ts (未実装、各 feature 自身が後続で追加) を re-export できる構造を用意する。`packages/db/connection/` に `createTursoClient(env)` と `createD1Client(binding)` の 2 ファクトリを実装し、両者が同一の Schema 型パラメータを持つ Database 型を返すことを型レベルで保証する。リポジトリ層 (`packages/db/repository/`) は `TenantCtx` ブランド型を第一引数に取る関数群として実装し、tenant_id/workspace_id の WHERE 句注入を型システムで強制する (docs/security-spec.md §3.6 の TenantCtx パターンに準拠)。releases リポジトリは `updateReleaseStatus()` のみを公開し他フィールド更新関数を提供しない。target_channels の stable_release_id 切替は単一トランザクション内の atomic UPDATE として実装する。audit_events リポジトリは `append()`/`read()` のみを公開し、hash chain 計算 (`event_hash = SHA-256(prev_hash || "\n" || tenant_id || "\n" || seq || "\n" || actor_type || "\n" || actor_id || "\n" || action || "\n" || entity_type || "\n" || entity_id || "\n" || canonical_json(summary_json) || "\n" || created_at)`) を `BEGIN IMMEDIATE` トランザクション内で実行し、UPDATE/DELETE を許可しない。encryption_keys リポジトリと列暗号化ユーティリティ (`encryptColumn(purpose, plaintext)`/`decryptColumn(purpose, ciphertext)`) を実装し、AES-256-GCM (Web Crypto API, IV=96bit random, AAD=`"{table}:{column}:{row_id}"`, 保存形式 `{key_version}:{iv_b64}:{ciphertext_b64}:{tag_b64}`) を用いる。R2 registry (`packages/db/registry/`) は `putPackage(buffer) -> {content_hash, r2_key}` / `getPackage(content_hash) -> ReadableStream` を実装し、content_hash が既存であれば書き込みをスキップする冪等かつ immutable な挙動とする。全 PK は ULID 生成ユーティリティで発行し、時刻列はリポジトリ層でサーバ側 `Date.now()` を注入しクライアント指定値を受け付けない。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-domain-model-db, arch-harness-hub-data, arch-harness-hub-backend
- Entry gate: .dev-graph/staging/goal-spec.json の feature_context_digest が sha256:ed9bbe22a2887731c84470adb8e4f8df41fd7eec46efc58b4dc8e5095b5b5fd5 に一致し、confirmation_status=confirmed であること。P04 の docs/features/feat-domain-model-db/test-design.md が存在すること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: N/A: 本 feature は UI を持たない
- Backend: applicable + change: packages/db のスキーマ・接続層・リポジトリ層・registry を実装する
- API: N/A: 本 feature は HTTP API endpoint を持たない
- Data: applicable + change: コアドメイン 18 テーブルの Drizzle スキーマコードを実装する
- Infrastructure: N/A: 新規インフラのプロビジョニングは行わない (既存の Turso/D1/R2 バインディングを利用)
- Security: applicable + change: tenant scope 強制・release immutable 強制・audit hash chain・封筒暗号化プリミティブを実装する
- Quality: applicable + change: P04 のテストケース一覧に対応する実装対象を過不足なく実装する
- Documentation: N/A: 本 task はコード実装が中心であり文書更新は伴わない (test-design.md 等の更新は不要)
- Operations: N/A: 運用手順の実装は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-data, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: N/A: 本 task はコード実装のみで migration ファイルは生成しない (P08 で実施)。既存データは存在しないため backfill 対象なし

## 成果物

- Produced artifacts: packages/db/schema/core/ (18 テーブル定義), packages/db/schema/index.ts (barrel), packages/db/connection/ (Turso/D1 ファクトリ), packages/db/repository/ (tenant scope・release immutable・audit・encryption を強制するリポジトリ関数群), packages/db/registry/ (R2 content-addressed registry)
- Consumed artifacts: docs/features/feat-domain-model-db/architecture-decision-record.md, docs/features/feat-domain-model-db/test-design.md, docs/security-spec.md §3.6/§4/§5
- Write scope/touches: packages/db/schema/core/, packages/db/schema/index.ts, packages/db/connection/, packages/db/repository/, packages/db/registry/ (packages/db/schema/{studio-feature}/ 配下は対象外)

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-domain-model-db-p05) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-domain-model-db-p05 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-domain-model-db-p05) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-DOMAIN-MODEL-DB-P04]。resource_scope (packages/db/ 配下、Studio 拡張ディレクトリを除く) は他 task と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- migration ファイルの生成・適用 (P08 で実施)
- packages/db/schema/{studio-feature}/ 配下の実装 (各 Studio feature の write_scope)
- 検査 pipeline のビジネスロジック実装 (owner=feat-publish-pipeline)
- 認可ミドルウェアの実装 (owner=feat-auth-tenancy)
- tenant_data_objects (qa-045) の実装 (本 digest スコープ外)
- department/salary 列に対する PII ガード適用・利用 API・監査 UI・tenant_coefficients の実装 (owner=feat-user-org-admin。本 task は users テーブルの列実装 [department/salary 含む] のみを行う)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: packages/db 配下に schema/core/, schema/index.ts, connection/, repository/, registry/ の 5 ディレクトリ/ファイルが実装され、P04 の test-design.md に列挙された全テストケースに対応する実装対象が揃っていること

## Rollout and rollback

- Rollout: packages/db の実装を完了し、schema barrel が Studio 拡張の re-export に対応した構造であることを確認してから P06 (テスト実行) へ引き継ぐ
- Rollback trigger and steps: 実装が P02 の architecture decision と矛盾する場合 (例: リポジトリ層を経由しない直接 DB アクセスが混入した場合)、該当コードを削除し P02 の設計に沿って再実装する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/00-requirements-definition.md (D2, D4, I3, G1, G4), system-spec/spec-state.json qa_log (qa-004, qa-017, qa-019, qa-020, qa-024, qa-032)
- Detailed authoritative source: docs/backend-spec.md §2.2, docs/security-spec.md §3.6 (TenantCtx), §4 (データ保護), §5 (監査/改ざん防止)
- Architecture: arch-harness-hub-data, arch-harness-hub-backend
- Feature: feat-domain-model-db
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-DOMAIN-MODEL-DB-P04
