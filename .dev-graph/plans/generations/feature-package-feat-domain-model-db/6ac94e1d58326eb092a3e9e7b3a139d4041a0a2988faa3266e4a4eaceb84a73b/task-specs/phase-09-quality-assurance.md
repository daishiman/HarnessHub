# System task overlay: 品質保証 — CI 品質ゲート (tenant 分離・接続層隔離・secret scan・schema-driven 分離テスト網羅)

## Machine-readable registration fields

- feature_package_id: feature-package/feat-domain-model-db (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-domain-model-db", "macro-feature", "data", "quality-assurance"]
- related_nodes: ["feat-domain-model-db", "arch-harness-hub-data", "arch-harness-hub-backend"]
- parent_feature: feat-domain-model-db
- phase_ref: P09
- classification: confidence=0.86, reason="CI 品質ゲート (tenant 分離・接続層隔離・secret scan・schema-driven 分離テスト網羅) を確認する P09 タスク", candidates=[{artifact_kind: task, confidence: 0.86, candidate_path: tasks/feat-domain-model-db/sys-domain-model-db-p09.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

docs/security-spec.md §8 が定める CI 品質ゲートのうち本 feature に該当する項目 (テナント分離テストの CI 必須化、リポジトリ層以外からの DB 直接アクセス禁止の静的検査、secret scan、schema 追加時の分離テスト網羅性チェック) を実装・確認し、quality-assurance-report.md として記録する。

## 背景

docs/security-spec.md §8.4 はテナント分離テストを CI 必須ゲートと定めており、本 feature が owner の全 tenant_id 保有テーブル (18 テーブルのうち tenant_id 列を持つ全テーブル) を対象に、新規テーブル追加時に対応する分離テストが存在しない場合 CI を失敗させる仕組み (schema barrel から tenant_id 保有テーブルを列挙し、テスト対象一覧との差分を検出するスクリプト) を実装する。qa-020 の接続層隔離要求を CI で機械検証するため、packages/db 以外のディレクトリから `@libsql/client` や `drizzle-orm/d1` への直接 import が存在しないことを grep ベースで検査する CI ステップを追加する。docs/security-spec.md §8.3 CI-4 (secret scan) に準じ、encryption_keys/idp_connections.client_secret_enc 関連コードに平文シークレットがハードコードされていないことを確認する。単一 migration 系統 (quality_constraints) の維持を保証するため、drizzle.config.ts の migration 出力先が複数存在しないことを確認する CI ステップも追加する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-domain-model-db, arch-harness-hub-data, arch-harness-hub-backend
- Entry gate: goal-spec.json の feature_context_digest が sha256:68f274de9cd604964c4499897cc3bf2efc88d09bdaf730db7640c5f09c9caffc に一致し、confirmation_status=confirmed であること。P08 の packages/db/migrations/ が生成済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: N/A: 本 feature は UI を持たない
- Backend: applicable + change: CI 品質ゲート用の静的検査スクリプトを実装する
- API: N/A: 本 feature は HTTP API endpoint を持たない
- Data: applicable + change: schema-driven 分離テスト網羅性チェックを実装する
- Infrastructure: applicable + change: CI ワークフローへ品質ゲートステップを追加する
- Security: applicable + change: 接続層隔離検査・secret scan・分離テスト CI 必須化を実装する
- Quality: applicable + change: 全 CI 品質ゲートの pass を確認する
- Documentation: applicable + change: docs/features/feat-domain-model-db/quality-assurance-report.md を新規作成する
- Operations: N/A: 運用手順の確定は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-data, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: N/A: 本 task は品質ゲートの追加のみで既存スキーマへの変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-domain-model-db/quality-assurance-report.md (CI 品質ゲート一覧と各ゲートの pass 結果), packages/db/scripts/check-tenant-isolation-coverage.ts (schema-driven 分離テスト網羅性チェックスクリプト), packages/db/scripts/check-connection-layer-isolation.ts (接続層隔離検査スクリプト)
- Consumed artifacts: docs/security-spec.md §8, packages/db/schema/core/, packages/db/connection/, packages/db/repository/
- Write scope/touches: docs/features/feat-domain-model-db/quality-assurance-report.md, packages/db/scripts/, .github/workflows/ci.yml

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-domain-model-db-p09) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-domain-model-db-p09 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-domain-model-db-p09) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-DOMAIN-MODEL-DB-P08]。resource_scope (docs/features/feat-domain-model-db/quality-assurance-report.md, packages/db/scripts/, .github/workflows/ci.yml) は他 task と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- Studio 拡張 feature 独自の CI ゲート追加 (各 feature 自身の P09 が担当)
- 認可ミドルウェアの CI ゲート (owner=feat-auth-tenancy)
- tenant_data_objects (qa-045) 関連の品質ゲート (本 digest スコープ外)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: docs/features/feat-domain-model-db/quality-assurance-report.md に全 CI 品質ゲート (テナント分離・接続層隔離・secret scan・単一 migration 系統維持) の pass 結果が記録されていること. Normative evidence: P05実装パス、P08 migration apply、2-tenant fixture、export→別DB restore round-trip、salary暗号化/マスク断面、単一lineage検査を証跡化する。

## Rollout and rollback

- Rollout: quality-assurance-report.md で全ゲート pass を確認してから P10 (最終独立レビュー) へ引き継ぐ
- Rollback trigger and steps: いずれかのゲートが fail した場合、該当する P05/P08 の実装へ差し戻し修正したうえで本 task を再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-domain-model-db.context.json` (`sha256:68f274de9cd604964c4499897cc3bf2efc88d09bdaf730db7640c5f09c9caffc`)
- Phase responsibility: 品質・security・operations・CI gate を現行正本に照らして保証する。
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

- Required responsibility: CI に migration apply、2-tenant isolation fixture、export/restore round-trip、単一 migration lineage の gate を追加する。
- Dependency rule: this phase consumes only earlier P01..P08 outputs; later phase documentation or evidence is never an entry prerequisite.

## Normative implementation closure (2026-07-19)

This section is normative for P09 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

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
- Detailed authoritative source: docs/security-spec.md §8 (ASVS 目標, CI-1..CI-9, T-1..T-12, §8.4 テナント分離 CI 必須ゲート)
- Architecture: arch-harness-hub-data, arch-harness-hub-backend
- Feature: feat-domain-model-db
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-DOMAIN-MODEL-DB-P08
