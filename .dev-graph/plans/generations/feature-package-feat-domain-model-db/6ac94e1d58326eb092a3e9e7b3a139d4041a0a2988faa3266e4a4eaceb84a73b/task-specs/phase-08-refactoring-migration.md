# System task overlay: リファクタリング/マイグレーション — 初回ベースライン migration 生成と単一系統確立

## Machine-readable registration fields

- feature_package_id: feature-package/feat-domain-model-db (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-domain-model-db", "macro-feature", "data", "refactor-migration"]
- related_nodes: ["feat-domain-model-db", "arch-harness-hub-data", "arch-harness-hub-backend"]
- parent_feature: feat-domain-model-db
- phase_ref: P08
- classification: confidence=0.88, reason="drizzle-kit による初回ベースライン migration を生成し単一 migration 系統を確立する P08 タスク (required-node)", candidates=[{artifact_kind: task, confidence: 0.88, candidate_path: tasks/feat-domain-model-db/sys-domain-model-db-p08.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P05 で実装したコアドメイン 18 テーブルのスキーマ定義から drizzle-kit を用いて初回ベースライン migration を生成し、`packages/db/migrations/` を単一系統として確立する。本 feature が control-plane DB の最初のスキーマであるため、本 task は既存データへの破壊的変更を伴わない新規作成の migration である。

## 背景

quality_constraints の single-migration-pipeline-drizzle-repository-package は「スキーマ変更は Drizzle ORM の migration を単一系統で運用する」ことを要求する。本 feature は control-plane DB における最初の migration lineage の確立者であるため、本 task で drizzle.config.ts の migration 出力先を `packages/db/migrations/` に固定し、`drizzle-kit generate` を実行して初回ベースライン migration SQL を生成する。生成された migration が P02 で確定した 18 テーブルの列定義・制約 (PK、UNIQUE 制約 [`idempotency_ledger` の idempotency key、`encryption_keys` の UNIQUE(purpose, key_version)、`audit_events` の UNIQUE(tenant_id, seq) 等]) と一致することを確認する。users テーブルは P02 決定に基づき department/salary 列を含む完全形でベースライン migration に含める。department/salary 列自体は本 task のベースライン migration に含まれるため、feat-user-org-admin 側で別途 ALTER migration を生成する必要はない (同 feature の責務は PII ガード適用・監査・tenant_coefficients であり、スキーマ変更を伴わない)。Studio 拡張 feature が今後追加する schema.ts (packages/db/schema/{studio-feature}/) は本 task が確立した単一 migration lineage に対して `drizzle-kit generate` を再実行することで追加 migration として積み増される設計であり、本 task はその積み増しが可能な barrel 構造 (P05 で実装済みの packages/db/schema/index.ts) を migration 生成の入力として実際に利用できることを検証する。既存本番データは存在しないため、データ移行・後方互換性の考慮は本 task では N/A となるが、今後 Studio 拡張が追加する migration との整合を保つため、migration ファイルの命名規約とタイムスタンプ順序の運用ルールを refactoring-migration-note.md に明記する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-domain-model-db, arch-harness-hub-data, arch-harness-hub-backend
- Entry gate: goal-spec.json の feature_context_digest が sha256:68f274de9cd604964c4499897cc3bf2efc88d09bdaf730db7640c5f09c9caffc に一致し、confirmation_status=confirmed であること。P07 の docs/features/feat-domain-model-db/acceptance-record.md が全項目 pass を記録していること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: N/A: 本 feature は UI を持たない
- Backend: applicable + change: drizzle.config.ts の確立と migration 生成コマンドの実行
- API: N/A: 本 feature は HTTP API endpoint を持たない
- Data: applicable + change: 初回ベースライン migration SQL を生成し 18 テーブルを定義する
- Infrastructure: N/A: 生成した migration の実 DB への適用は P13 (リリース/デプロイ) で行う
- Security: applicable + change: 生成された migration に encryption_keys/session_revocations/audit_events の制約が正しく含まれることを確認する
- Quality: applicable + change: 単一 migration 系統の確立を quality_constraints の該当項目として確認する
- Documentation: applicable + change: docs/features/feat-domain-model-db/refactoring-migration-note.md を新規作成する
- Operations: N/A: 運用手順の確定は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-data, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: 既存データなし (本 feature が control-plane DB の初回スキーマ確立者であるため、後方互換性・backfill は N/A)。今後の Studio 拡張 feature の追加 migration が本 lineage に安全に積み増せるよう、命名規約・適用順序を本 task で確立する

## 成果物

- Produced artifacts: packages/db/migrations/ (初回ベースライン migration SQL 一式), docs/features/feat-domain-model-db/refactoring-migration-note.md (migration 生成手順、命名規約、今後の Studio 拡張 feature 向け積み増しルールを含む)
- Consumed artifacts: packages/db/schema/core/, packages/db/schema/index.ts, docs/features/feat-domain-model-db/acceptance-record.md
- Write scope/touches: packages/db/migrations/, packages/db/drizzle.config.ts, docs/features/feat-domain-model-db/refactoring-migration-note.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-domain-model-db-p08) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-domain-model-db-p08 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-domain-model-db-p08) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-DOMAIN-MODEL-DB-P07]。resource_scope (packages/db/migrations/, packages/db/drizzle.config.ts) は他 task と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- migration の本番適用 (P13 で実施。本 task は生成とローカル/ステージング環境での検証のみ)
- Studio 拡張 feature 自身のテーブル追加 migration (各 feature 自身の P08 が担当)
- tenant_data_objects (qa-045) の migration (本 digest スコープ外)
- department/salary 列に対する PII ガード適用・利用 API・監査 UI・tenant_coefficients の migration (owner=feat-user-org-admin。department/salary 列自体は本 task のベースライン migration に含まれるためスキーマ変更は発生しない)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: packages/db/migrations/ に生成された SQL が P02 の 18 テーブル定義と一致すること、docs/features/feat-domain-model-db/refactoring-migration-note.md に命名規約と積み増しルールが明記されていること

## Rollout and rollback

- Rollout: 初回ベースライン migration をローカル/ステージング環境の Turso インスタンスに適用し、スキーマが期待どおり作成されることを確認してから P09 (品質保証) へ引き継ぐ
- Rollback trigger and steps: 生成された migration が P02 の設計と乖離する場合、migration ファイルを削除し P05 のスキーマ定義を修正したうえで本 task を再実行する。本番適用前段階のため、適用済み migration のロールバックは発生しない

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-domain-model-db.context.json` (`sha256:68f274de9cd604964c4499897cc3bf2efc88d09bdaf730db7640c5f09c9caffc`)
- Phase responsibility: migration・互換性・refactor の適用要否を実行し、N/A でも根拠を残す。
- Purpose: Tenant→Workspace→Project→TargetChannel→Release(immutable) のドメインモデルを Drizzle スキーマとして確立し、D1 退避経路 (D2 ヘッジ) を保つ接続層を構築する
- Goal: 全エンティティの CRUD が接続層越しに動作し、R2 immutable PackageRegistry と日次 export が稼働する状態
- Scope in (all items are in-scope for the package; this phase owns the subset matching its responsibility):
- Drizzle スキーマ (SQLite 方言互換)
- 接続層の隔離 (libSQL/D1 両対応)
- R2 content-addressed registry
- 日次 export + restore drill 手順
- マイグレーション運用
- Scope out:
- 検査 pipeline のビジネスロジック
- UI
- Acceptance (P04/P06/P07/P10/P11 must preserve exact coverage):
- スキーマが SQLite 方言互換で D1 接続テストが通る
- Release が immutable として強制される
- バックアップ export と復元手順が検証済み
- Architecture/source refs:
- architecture/harness-hub-data.md
- architecture/harness-hub-backend.md
- architecture/harness-hub-infrastructure.md
- specs/harness-hub-system-specification.md

This section is the current source closure and supersedes older counts or wording in this task when they conflict with the pinned feature context.

## Current phase closure

- Required responsibility: Turso/D1 の初回 migration を単一 lineage で生成し、apply/rollback と2テナント fixture初期化を検証する。
- Dependency rule: this phase consumes only earlier P01..P07 outputs; later phase documentation or evidence is never an entry prerequisite.

## Normative implementation closure (2026-07-19)

This section is normative for P08 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-domain-model-db.context.json; docs/backend-spec.md §2; docs/infrastructure-spec.md backup/restore; docs/security-spec.md §3.6/§4/§5
- Effective phase contract: 現行 quality_constraints は10件である。P05 は schema/repository/R2 registry に加え、日次 control-plane export job、暗号化/マスク保持、検証可能な restore command/library をコード成果物として実装する。P06 はP05実装をschema test harnessと2テナントfixtureで検証し、まだ生成されていないP08 migration artifactを前提にしない。P08 は単一 migration lineageを生成して2テナントfixtureへ適用する。P09 はmigration apply、tenant isolation、export artifact integrity、別DB restore round-tripを実行するCI gateを .github/workflows/ci.yml へ接続する。P05/P06/P09は後続P12 runbookへ逆依存しない。P10は10 constraint IDをexact-setで判定する。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `packages/db/backup/`
- `packages/db/scripts/export-control-plane.ts`
- `packages/db/scripts/restore-control-plane.ts`
- `packages/db/__tests__/fixtures/two-tenants.ts`
- `packages/db/__tests__/backup-restore.test.ts`
- `.github/workflows/ci.yml`
- Mandatory evidence: P05実装パス、P08 migration apply、2-tenant fixture、export→別DB restore round-trip、salary暗号化/マスク断面、単一lineage検査を証跡化する。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: system-spec/00-requirements-definition.md (D2, D4, I3, G1, G4), system-spec/spec-state.json qa_log (qa-004, qa-017, qa-019, qa-020, qa-024, qa-032)
- Detailed authoritative source: docs/backend-spec.md §2.2
- Architecture: arch-harness-hub-data, arch-harness-hub-backend
- Feature: feat-domain-model-db
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-DOMAIN-MODEL-DB-P07
