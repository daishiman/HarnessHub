# System task overlay: 独立設計レビュー — スキーマ・接続層隔離・User 基底テーブル owner 判断の妥当性確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-domain-model-db (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-domain-model-db", "macro-feature", "data", "design-review"]
- related_nodes: ["feat-domain-model-db", "arch-harness-hub-data", "arch-harness-hub-backend"]
- parent_feature: feat-domain-model-db
- phase_ref: P03
- classification: confidence=0.88, reason="P02 で確定したアーキテクチャ決定 (18 テーブル設計・接続層隔離・User 基底テーブル owner) を P02 実行者から独立した視点で再検証する P03 タスク", candidates=[{artifact_kind: task, confidence: 0.88, candidate_path: tasks/feat-domain-model-db/sys-domain-model-db-p03.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P02 の architecture-decision-record.md を P02 実行と独立した視点でレビューし、(1) User 基底テーブル owner の architecture decision が feat-user-org-admin の実際の write_scope と衝突しないこと、(2) 18 テーブル定義が docs/backend-spec.md §2.2 と過不足なく一致すること、(3) 接続層隔離設計が qa-020 (DB アクセスはリポジトリ層限定) を満たすこと、(4) qa-045 の scope-out 判断が exact-13 パッケージ契約に照らして妥当であること、を確認し design-review-notes.md として記録する。

## 背景

feature-execution-package-contract.md は各 task が独立した検証可能な単位であることを要求しており、P02 のような設計判断 (特に User 基底テーブル owner のような他 feature との境界に関わる判断) は実行者自身の確認だけでなく独立レビューを経ることで、write_scope 衝突や境界誤認による手戻りリスクを下げる。本 task は P02 の 3 系統の証跡 (①docs/backend-spec.md §2.2 の `users` 行 [53 行目] が department/salary を含む単一の既存確定・不変定義であるという文書証跡、②`packages/db/schema/core/` が本 feature の排他的 write_scope であり単一 migration 系統の下で 1 テーブルの DDL を複数 write_scope に分割 ALTER する仕組みが契約上定義されていないという構造的制約、③スキーマ owner と業務ロジック owner [PII ガード共通層は feat-hub-foundation 所有、feat-user-org-admin は消費者] が別責務であるというアクセス制御責務の分離) を再度独立に参照し、結論の再現性を確認する。あわせて、feat-user-org-admin の現行公開 plan が「User 拡張 (department/salary) のカラム設計」を前提とする記述を含み P02 の決定と矛盾しているという cross-feature follow-up 注記が P02 の architecture-decision-record.md に正しく記録されていることを確認する。さらに、P02 が qa-045 (tenant_data_objects) を本 digest スコープ外と判断した根拠 (feature_context_digest の quality_constraints/lineage に不在、team-lead 指定の grounding qa エントリに不在) が exact-13 パッケージ契約の「digest に紐づかないスコープ拡張の禁止」原則と整合することを確認する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-domain-model-db, arch-harness-hub-data, arch-harness-hub-backend
- Entry gate: goal-spec.json の feature_context_digest が sha256:68f274de9cd604964c4499897cc3bf2efc88d09bdaf730db7640c5f09c9caffc に一致し、confirmation_status=confirmed であること。P02 の docs/features/feat-domain-model-db/architecture-decision-record.md が存在すること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: N/A: 本 feature は UI を持たない
- Backend: applicable + change: architecture-decision-record.md の技術的妥当性 (接続層隔離・R2 registry・release immutability 強制方式) をレビューする
- API: N/A: 本 feature は HTTP API endpoint を持たない
- Data: applicable + change: 18 テーブル定義の docs/backend-spec.md §2.2 との一致性をレビューする
- Infrastructure: N/A: 新規インフラ変更なし
- Security: applicable + change: audit_events hash chain・encryption_keys owner 境界のレビューを行う
- Quality: applicable + change: User 基底テーブル owner 判断の再現性検証を行う (quality_constraints の必須解消事項)
- Documentation: applicable + change: docs/features/feat-domain-model-db/design-review-notes.md を新規作成する
- Operations: N/A: 運用手順は本 task の対象外

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-data, arch-harness-hub-backend (P02 の architecture decision をレビュー対象とする)
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: N/A: 本 task はレビューのみで実スキーマへの変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-domain-model-db/design-review-notes.md (レビュー観点ごとの判定結果と根拠、必要に応じた是正指摘事項を含む)
- Consumed artifacts: docs/features/feat-domain-model-db/architecture-decision-record.md, docs/backend-spec.md, docs/shared-layers.md, .dev-graph/plans/feature-package-feat-user-org-admin/workstream-inventory.json, .dev-graph/plans/feature-package-feat-user-org-admin/plan-findings.json, .dev-graph/plans/feature-package-feat-user-org-admin/task-specs/phase-02-architecture.md
- Write scope/touches: docs/features/feat-domain-model-db/design-review-notes.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-domain-model-db-p03) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-domain-model-db-p03 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-domain-model-db-p03) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-DOMAIN-MODEL-DB-P02]。resource_scope (docs/features/feat-domain-model-db/design-review-notes.md) は他 task と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- architecture-decision-record.md 自体の書き換え (是正が必要な場合は P02 への差し戻しを記録するのみで、本 task では編集しない)
- 実装コードのレビュー (実装は未着手のため対象外。実装レビューは P07/P10 で行う)
- Studio 拡張 feature の設計レビュー (各 feature 自身の P03 が担当)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: docs/features/feat-domain-model-db/design-review-notes.md に 4 レビュー観点 (User 基底テーブル owner 判断・18 テーブル定義一致性・接続層隔離設計・qa-045 scope-out 判断) それぞれの判定 (承認/要是正) が記録されていること

## Rollout and rollback

- Rollout: design-review-notes.md で全観点が承認された時点で P04 (テストファースト設計) へ引き継ぐ
- Rollback trigger and steps: いずれかの観点で要是正と判定された場合、P02 の architecture-decision-record.md への差し戻しを記録し、P02 再実行後に本 task を再度実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-domain-model-db.context.json` (`sha256:68f274de9cd604964c4499897cc3bf2efc88d09bdaf730db7640c5f09c9caffc`)
- Phase responsibility: P02 の設計が現行 context を漏れなく、矛盾なく満たすか独立レビューする。
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

This section is normative for P03 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

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
- Detailed authoritative source: docs/backend-spec.md §2.2, docs/security-spec.md §4-5
- Architecture: arch-harness-hub-data, arch-harness-hub-backend
- Feature: feat-domain-model-db
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-DOMAIN-MODEL-DB-P02
