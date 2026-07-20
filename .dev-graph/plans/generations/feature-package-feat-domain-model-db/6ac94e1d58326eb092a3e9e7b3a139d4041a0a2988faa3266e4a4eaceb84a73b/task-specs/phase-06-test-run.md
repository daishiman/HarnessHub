# System task overlay: テスト実行 — D1 互換性・release immutable・tenant 分離・R2 registry・backup/restore

## Machine-readable registration fields

- feature_package_id: feature-package/feat-domain-model-db (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-domain-model-db", "macro-feature", "data", "test-execution"]
- related_nodes: ["feat-domain-model-db", "arch-harness-hub-data", "arch-harness-hub-backend"]
- parent_feature: feat-domain-model-db
- phase_ref: P06
- classification: confidence=0.87, reason="P04 で設計したテストケースを P05 の実装に対して実行し結果を記録する P06 タスク", candidates=[{artifact_kind: task, confidence: 0.87, candidate_path: tasks/feat-domain-model-db/sys-domain-model-db-p06.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P04 の test-design.md に列挙された全テストケースを P05 の実装に対して実行し、結果 (pass/fail・カバレッジ・失敗時の是正記録) を test-run-results.md に記録する。

## 背景

goal-spec の quality_constraints 10 件と acceptance 3 件はいずれも実行可能なテストとして検証されなければ受入判定 (P07) に進めない。特に D1 互換性テスト (libSQL/D1 双方での CRUD 成功)、release immutable テスト (status 以外の UPDATE 拒否)、tenant 分離テスト (他 tenant 行の非到達性)、R2 registry immutable テスト (同一 content_hash への再書き込み拒否)、audit_events hash chain 検証テスト (改ざん検知)、封筒暗号化ラウンドトリップテストは本 feature が owner のコアドメイン機能の正当性を直接証明するため優先的に実行し、失敗があれば P05 へ差し戻す。日次 export/四半期 restore drill テストは実運用 cron を模したドライラン形式で実行し、salary 列が export 出力においても暗号化状態を維持していることを確認する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-domain-model-db, arch-harness-hub-data, arch-harness-hub-backend
- Entry gate: goal-spec.json の feature_context_digest が sha256:68f274de9cd604964c4499897cc3bf2efc88d09bdaf730db7640c5f09c9caffc に一致し、confirmation_status=confirmed であること。P05 の packages/db 実装が存在すること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: N/A: 本 feature は UI を持たない
- Backend: applicable + change: packages/db のリポジトリ層・接続層に対するテストを実行する
- API: N/A: 本 feature は HTTP API endpoint を持たない
- Data: applicable + change: スキーマ制約・分離テスト・fresh schema test-harness互換性テストを実行する（P08 migration artifactは前提にしない）
- Infrastructure: N/A: 新規インフラ変更なし
- Security: applicable + change: hash chain 検証・列暗号化ラウンドトリップ・tenant 分離テストを実行する
- Quality: applicable + change: quality_constraints 10 件 + acceptance 3 件のテスト結果を記録する
- Documentation: applicable + change: docs/features/feat-domain-model-db/test-run-results.md を新規作成する
- Operations: N/A: 運用手順の検証は本 task の対象外 (P12 で扱う)

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-data, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: N/A: 本 task はテスト実行のみ

## 成果物

- Produced artifacts: docs/features/feat-domain-model-db/test-run-results.md (P04 の全テストケースに対する実行結果、失敗時の是正記録を含む)
- Consumed artifacts: docs/features/feat-domain-model-db/test-design.md, packages/db/__tests__/, packages/db/schema/core/, packages/db/repository/, packages/db/registry/
- Write scope/touches: docs/features/feat-domain-model-db/test-run-results.md, packages/db/__tests__/ (実行に伴うテストコード補完)

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-domain-model-db-p06) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-domain-model-db-p06 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-domain-model-db-p06) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-DOMAIN-MODEL-DB-P05]。resource_scope (docs/features/feat-domain-model-db/test-run-results.md, packages/db/__tests__/) は他 task と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- テスト失敗の恒久修正 (再実装が必要な場合は P05 へ差し戻し、本 task は結果記録と差し戻し判断のみ)
- Studio 拡張 feature 独自のテスト実行 (各 feature 自身の P06 が担当)
- tenant_data_objects (qa-045) 関連テストの実行 (本 digest スコープ外)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: docs/features/feat-domain-model-db/test-run-results.md に P04 の全テストケースの実行結果 (pass/fail) が記録され、fail が残っていないこと. Normative evidence: P05実装パス、P08 migration apply、2-tenant fixture、export→別DB restore round-trip、salary暗号化/マスク断面、単一lineage検査を証跡化する。

## Rollout and rollback

- Rollout: test-run-results.md で全テストケースが pass したことを確認してから P07 (受入) へ引き継ぐ
- Rollback trigger and steps: いずれかのテストケースが fail した場合、P05 へ差し戻し実装を修正したうえで本 task を再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-domain-model-db.context.json` (`sha256:68f274de9cd604964c4499897cc3bf2efc88d09bdaf730db7640c5f09c9caffc`)
- Phase responsibility: P05 の実装に対して P04 の全テストを実行し、再現可能な結果を残す。
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

- Required responsibility: P05 の export/restore 実装をschema test harnessと2-tenant fixtureで直接実行する。P08で後から生成するcanonical migration artifactはP06の前提にせず、P12成果物への逆依存も禁止する。
- Dependency rule: this phase consumes only earlier P01..P05 outputs; later phase documentation or evidence is never an entry prerequisite.

## Normative implementation closure (2026-07-19)

This section is normative for P06 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

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
- Detailed authoritative source: docs/security-spec.md §8 (検証)
- Architecture: arch-harness-hub-data, arch-harness-hub-backend
- Feature: feat-domain-model-db
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-DOMAIN-MODEL-DB-P05
