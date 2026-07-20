# System task overlay: 最終独立レビュー — quality_constraints 10 件の充足判定

## Machine-readable registration fields

- feature_package_id: feature-package/feat-domain-model-db (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-domain-model-db", "macro-feature", "data", "final-review"]
- related_nodes: ["feat-domain-model-db", "arch-harness-hub-data", "arch-harness-hub-backend"]
- parent_feature: feat-domain-model-db
- phase_ref: P10
- classification: confidence=0.86, reason="quality_constraints 10 件の充足判定を実装・テスト・品質保証結果に基づき独立に確認する P10 タスク", candidates=[{artifact_kind: task, confidence: 0.86, candidate_path: tasks/feat-domain-model-db/sys-domain-model-db-p10.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P02 (アーキテクチャ)・P06 (テスト実行)・P07 (受入)・P09 (品質保証) の結果を突き合わせ、goal-spec の quality_constraints 10 件全てが充足されていることを P02 実行者から独立した視点で最終確認し、final-review-record.md として記録する。

## 背景

quality_constraints 10 件 (sqlite-dialect-compat-d1-fallback-connection-layer-d2, release-immutable-atomic-stable-pointer-i3, tenant-workspace-scope-row-level-d4, ulid-pk-display-code-epoch-server-time-qa032, r2-content-addressed-package-registry-c4, daily-export-quarterly-restore-drill-qa019, single-migration-pipeline-drizzle-repository-package, repository-layer-db-access-isolation-qa020, user-base-table-schema-owner-unresolved-p02, executable-export-restore-ci-fixture) それぞれについて、対応する成果物 (P02 の architecture-decision-record.md、P06 の test-run-results.md、P09 の quality-assurance-report.md) を根拠として充足判定を行う。特に user-base-table-schema-owner-unresolved-p02 は P02 の architecture decision と P03 の design-review-notes.md の承認判定を根拠に「解消済み」と判定する。全 10 件の充足が確認できない場合は該当する task へ差し戻す。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-domain-model-db, arch-harness-hub-data, arch-harness-hub-backend
- Entry gate: goal-spec.json の feature_context_digest が sha256:68f274de9cd604964c4499897cc3bf2efc88d09bdaf730db7640c5f09c9caffc に一致し、confirmation_status=confirmed であること。P09 の docs/features/feat-domain-model-db/quality-assurance-report.md が全ゲート pass を記録していること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: N/A: 本 feature は UI を持たない
- Backend: N/A: 本 task はレビューのみで実装物を変更しない
- API: N/A: 本 feature は HTTP API endpoint を持たない
- Data: applicable + change: quality_constraints のうちデータモデル関連項目 (D2/I3/D4/qa-032/C4/P02 必須解消事項) の充足判定を行う
- Infrastructure: N/A: 新規インフラ変更なし
- Security: applicable + change: quality_constraints のうちセキュリティ関連項目 (qa-019/qa-020) の充足判定を行う
- Quality: applicable + change: quality_constraints 10 件全体の最終充足判定を行う
- Documentation: applicable + change: docs/features/feat-domain-model-db/final-review-record.md を新規作成する
- Operations: N/A: 運用手順の確定は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-data, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: N/A: 本 task はレビューのみ

## 成果物

- Produced artifacts: docs/features/feat-domain-model-db/final-review-record.md (quality_constraints 10 件それぞれの充足判定と根拠成果物への参照)
- Consumed artifacts: docs/features/feat-domain-model-db/architecture-decision-record.md, docs/features/feat-domain-model-db/design-review-notes.md, docs/features/feat-domain-model-db/test-run-results.md, docs/features/feat-domain-model-db/acceptance-record.md, docs/features/feat-domain-model-db/quality-assurance-report.md
- Write scope/touches: docs/features/feat-domain-model-db/final-review-record.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-domain-model-db-p10) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-domain-model-db-p10 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-domain-model-db-p10) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-DOMAIN-MODEL-DB-P09]。resource_scope (docs/features/feat-domain-model-db/final-review-record.md) は他 task と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- 未充足項目の実装修正 (該当 task へ差し戻し、本 task は判定のみ)
- Studio 拡張 feature の quality_constraints 判定 (各 feature 自身の P10 が担当)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: docs/features/feat-domain-model-db/final-review-record.md に quality_constraints 10 件全てが「充足」と判定され、根拠成果物への参照が記載されていること. Normative evidence: P05実装パス、P08 migration apply、2-tenant fixture、export→別DB restore round-trip、salary暗号化/マスク断面、単一lineage検査を証跡化する。

## Rollout and rollback

- Rollout: final-review-record.md で全 10 件充足を確認してから P11 (エビデンス収集) へ引き継ぐ
- Rollback trigger and steps: いずれかの項目が未充足の場合、該当する task (P02/P05/P06/P09 等) へ差し戻し是正したうえで本 task を再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-domain-model-db.context.json` (`sha256:68f274de9cd604964c4499897cc3bf2efc88d09bdaf730db7640c5f09c9caffc`)
- Phase responsibility: 全 acceptance、scope、品質制約の最終充足を独立にレビューする。
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

## Normative implementation closure (2026-07-19)

This section is normative for P10 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

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
- Detailed authoritative source: goal-spec.json (quality_constraints ブロック)
- Architecture: arch-harness-hub-data, arch-harness-hub-backend
- Feature: feat-domain-model-db
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-DOMAIN-MODEL-DB-P09
