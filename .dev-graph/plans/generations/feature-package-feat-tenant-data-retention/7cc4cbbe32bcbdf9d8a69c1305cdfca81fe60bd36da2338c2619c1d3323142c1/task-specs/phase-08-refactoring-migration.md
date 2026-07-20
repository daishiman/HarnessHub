# System task overlay: リファクタリング/マイグレーション — encryption_keys.tenant_id/key uniqueness migration・per-tenant DEK provisioning・R2バケット/prefix新設の既存基盤互換移行

## Machine-readable registration fields

- feature_package_id: feature-package/feat-tenant-data-retention (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-tenant-data-retention", "macro-feature", "data", "refactoring-migration"]
- related_nodes: ["feat-tenant-data-retention", "arch-harness-hub-data", "arch-harness-hub-security"]
- parent_feature: feat-tenant-data-retention
- phase_ref: P08
- classification: confidence=0.83, reason="既存encryption_keysテーブル(feat-domain-model-db/feat-auth-tenancy所有のsalary/idp_secret運用と共有するinfrastructure)へtenant_id nullable/tenant-scoped unique indexを追加し、tenantごとにactive DEKをprovisionするmigrationと、R2の新規バケットまたはprefix分離をPackageRegistry/backupsに影響を与えず適用するP08マイグレーションタスク。本featureは新規実装だが、encryption_keysは既存共有テーブルであるためbackward-compatible migrationが必須責務となる", candidates=[{artifact_kind: task, confidence: 0.83, candidate_path: tasks/feat-tenant-data-retention/sys-tenant-data-retention-p08.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P02 で確定した encryption_keys.purpose enum 拡張方針 (tenant_data 追加) を実際の migration として適用し、既存 salary/idp_secret 運用を破壊しないことを確認する。あわせて R2 の新規バケットまたは tenant prefix 分離を、既存 PackageRegistry (immutable) や backups に影響を与えずに適用する。本 feature は新規実装だが encryption_keys は既存共有テーブル (feat-domain-model-db/feat-auth-tenancy が既に運用) であるため、この migration は本 feature が担う必須の非破壊移行責務である。

## 背景

docs/security-spec.md §4.1.1 の encryption_keys テーブルは UNIQUE(tenant_id, purpose, key_version) for tenant_data（既存global用途はtenant_id=NULL互換） 制約を持ち、active な DEK は purpose ごとに 1 件という契約になっている。P02 で確定した purpose=tenant_data の追加は、既存 purpose=salary/idp_secret の行に一切触れず、tenant_data 用の新しい active DEK 行を追加する seed migration として実施する。KEK は既存 Workers Secret (ENCRYPTION_KEK) を再利用し、DEK 生成・KEK による wrap・encryption_keys への insert のみを行う。R2 側では、qa-045 が確定した「業務データ用 prefix をテナント別に分離し、PackageRegistry とはバケットまたは prefix を分ける」という方針を、P02 が確定した具体的な prefix 命名規則に従って実際に provisioning する。本 feature は新規実装であるため既存データの backfill は発生しないが、既存共有インフラ (encryption_keys テーブル、R2 バケット) への追加が既存の feat-domain-model-db/feat-auth-tenancy/PackageRegistry 運用と非互換にならないことの確認が本 task の中心的な責務となる。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-tenant-data-retention, arch-harness-hub-data, arch-harness-hub-security
- Entry gate: P07 (docs/features/feat-tenant-data-retention/acceptance-record.md) が作成済みであり acceptance 3 件が pass していること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は data/infrastructure migration のみで frontend 実装物を変更しない
- Backend: N/A: 本 task は migration のみで新規 backend 実装を追加しない (backend 実装自体は P05 で完了済み)
- API: N/A: 本 task は migration のみで API 契約を変更しない
- Data: applicable + migration: packages/db/migrations/ に encryption_keys.purpose=tenant_data 追加 DEK seed migration を追加する
- Infrastructure: applicable + IaC/deploy: R2 バケット/prefix 新設を既存 PackageRegistry/backups に影響を与えず provisioning する
- Security: applicable + control: 既存 salary/idp_secret 運用への非破壊性を確認し、UNIQUE(tenant_id, purpose, key_version) for tenant_data（既存global用途はtenant_id=NULL互換） 制約充足を確認する
- Quality: applicable + tests/gates: migration 適用後の既存 encryption_keys 運用・R2 バケットへの回帰確認を行う
- Documentation: applicable + change: docs/features/feat-tenant-data-retention/refactoring-migration-note.md を新規作成する
- Operations: N/A: 運用手順の具体化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-data, arch-harness-hub-security (P02 architecture-decision-record.md の encryption_keys 拡張・R2 prefix 分離決定を実施)
- Deploy unit/environment: cloudflare-workers/hub (migration は Turso DB と R2 バケットに対して適用する)
- Compatibility/migration/backfill: applicable + contract: encryption_keys.purpose=tenant_data 追加 DEK seed migration (既存 salary/idp_secret 行は変更しない、追加のみ)、R2 バケット/prefix 新設 (既存 PackageRegistry/backups への影響なし)

## 成果物

- Produced artifacts: packages/db/migrations/ (encryption_keys.purpose=tenant_data 追加 DEK seed migration), docs/features/feat-tenant-data-retention/refactoring-migration-note.md
- Consumed artifacts: docs/features/feat-tenant-data-retention/architecture-decision-record.md, docs/security-spec.md (§4.1.1)
- Write scope/touches: packages/db/migrations/, docs/features/feat-tenant-data-retention/refactoring-migration-note.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-tenant-data-retention-p08) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-tenant-data-retention-p08 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-tenant-data-retention-p08) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-TENANT-DATA-RETENTION-P07] であり P07 完了後に着手する。resource_scope (packages/db/migrations/) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 既存 users.salary / idp_connections.client_secret_enc 行そのものの変更 (owner=feat-auth-tenancy / feat-domain-model-db。本 task は追加のみで既存行に触れない)
- 新規機能の追加 (本 task は既存共有基盤への非破壊 migration のみ)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: refactoring-migration-note.md に encryption_keys.tenant_id/key uniqueness migration・per-tenant DEK provisioning migrationの適用手順・既存salary/idp_secret運用への非破壊確認結果と、R2バケット/prefix新設がPackageRegistry/backupsに影響しないことの確認結果が記載されていること

## Rollout and rollback

- Rollout: migration を staging 相当環境で適用し、既存 encryption_keys 行・R2 バケットへの非破壊性を確認してから refactoring-migration-note.md へ記録し P09 (品質・セキュリティ・運用保証) へ引き継ぐ
- Rollback trigger and steps: migration後にexisting salary/idp_secret運用または既存R2バケットへ悪影響が確認された場合、migrationをrollbackしrefactoring-migration-note.mdに原因を記録した上で本taskを再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-tenant-data-retention.context.json` (`sha256:69dfcdf921e77e21f88ca692b562cad0785381e22f00f1e446c512c0d87ea327`)
- Phase responsibility: migration・互換性・refactor の適用要否を実行し、N/A でも根拠を残す。
- Purpose: C4 改訂 (qa-045-048, appr-007) で保持可能となった顧客業務ナレッジ・harness 実行入出力データを、R2 + テナント別封筒暗号化で保管し、即時完全削除を保証する独立した価値提供単位
- Goal: テナント業務データの upload / 取得 / 即時完全削除 API と R2 使用量監視を提供し、C4 の非保持境界 (顧客業務システム接続 credential と WebApp runtime) を維持したまま業務データのみを安全に扱える状態
- Scope in (all items are in-scope for the package; this phase owns the subset matching its responsibility):
- tenant_data_objects テーブルの CRUD API 設計・実装
- R2 への content-addressed 業務データ保管 (テナント別 DEK 封筒暗号化)
- 即時完全削除 (R2 blob・DB row・backup 断面の同時削除)
- R2 使用量監視・上限アラート
- S15 添付 / S12 実行入出力閲覧向けの任意統合 API 契約・extension point (host UI は各 feature が所有)
- Scope out:
- 顧客業務システム接続 credential と WebApp runtime の保管 (C4 により恒久的に非保持)
- 業務データを入力とする AI ジョブ実行ロジック (feat-hearing-intake / feat-build-pipeline-board 側)
- 既存 users.salary / idp_connections.client_secret_enc の封筒暗号化 (feat-auth-tenancy / feat-domain-model-db 既管理)
- Acceptance (P04/P06/P07/P10/P11 must preserve exact coverage):
- テナント A の業務データがテナント B のいかなる authz role からも取得不可であること (テナント分離テストが PASS)
- 削除 API 実行後、R2 blob・DB row・backup 断面のいずれにも当該データの平文/暗号文が残存しないこと (削除完全性テストが PASS)
- 保管された業務データが R2 上で平文として存在せず、テナント別 DEK で封筒暗号化されていること (暗号化検証テストが PASS)
- Architecture/source refs:
- architecture/harness-hub-data.md
- architecture/harness-hub-security.md
- architecture/harness-hub-backend.md
- architecture/harness-hub-infrastructure.md
- specs/harness-hub-system-specification.md

This section is the current source closure and supersedes older counts or wording in this task when they conflict with the pinned feature context.

## Normative implementation closure (2026-07-19)

This section is normative for P08 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-tenant-data-retention.context.json; system-spec/database.md qa-045/qa-048; docs/security-spec.md §4; docs/infrastructure-spec.md backup contract
- Effective phase contract: tenant_data DEKはテナント別とし、encryption_keysへtenant_id nullable（既存global用途互換）を追加して tenant_data は UNIQUE(tenant_id,purpose,key_version)、tenant/purposeごとactive=1、lookup/rotation/deletionを実装する。削除はR2 blob・live DB rowに加え、日次exportの対象object/tombstone manifestを同一deletion transaction/workflowで更新し、過去backupからrestoreしてもtombstone適用で復元不能にする。既存Turso使用量cron dispatchへR2 monitorを実登録する。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `packages/db/src/schema/encryption-keys.ts`
- `packages/db/src/repository/tenant-deks.ts`
- `packages/db/src/backup/tenant-data-tombstones.ts`
- `apps/hub/src/lib/scheduled/usage-monitor.ts`
- `packages/db/migrations/`
- Mandatory evidence: 2 tenantで別DEK/version、cross-tenant unwrap拒否、rotation、R2+DB+backup restore non-restoration、既存cron dispatch registration、70/90%通知をP04/P06/P09/P10/P11で実証する。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: system-spec/spec-state.json qa_log (qa-045, qa-046)
- Detailed authoritative source: docs/security-spec.md (§4.1.1, §4.1.2), docs/infrastructure-spec.md (§3)
- Architecture: arch-harness-hub-data (architecture/harness-hub-data.md), arch-harness-hub-security (architecture/harness-hub-security.md)
- Feature: feat-tenant-data-retention
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-TENANT-DATA-RETENTION-P07
