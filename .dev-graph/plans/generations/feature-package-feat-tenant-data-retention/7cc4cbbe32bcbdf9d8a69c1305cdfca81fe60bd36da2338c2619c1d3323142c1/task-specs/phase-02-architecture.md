# System task overlay: アーキテクチャ設計 — encryption_keys.purpose拡張・R2 tenant prefix分離・API詳細設計・R2使用量監視cron拡張・削除完全性テスト採番の決定

## Machine-readable registration fields

- feature_package_id: feature-package/feat-tenant-data-retention (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-tenant-data-retention", "macro-feature", "backend", "architecture-decision"]
- related_nodes: ["feat-tenant-data-retention", "arch-harness-hub-data", "arch-harness-hub-security", "arch-harness-hub-backend", "arch-harness-hub-infrastructure"]
- parent_feature: feat-tenant-data-retention
- phase_ref: P02
- classification: confidence=0.85, reason="qa-046が次回security深掘り(feature P02前)へ据え置いたencryption_keys.purpose enum拡張(tenant_data追加)とAAD/IV運用適用、qa-048が据え置いたtenant_data保管APIのエンドポイント詳細設計(パス・zodスキーマ・rate limit)、R2 tenant prefix分離設計、qa-045のR2使用量監視cron拡張設計、削除完全性テスト(T番号未採番)の採番・ケース定義の5系統を確定するP02アーキテクチャ設計タスク", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-tenant-data-retention/sys-tenant-data-retention-p02.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P01 requirements-baseline.md が P02 必須解消事項として引き継いだ 3 点の据置事項、すなわち (1) encryption_keys.purpose enum への tenant_data 追加と AAD/IV 運用の tenant_data への適用方式、(2) tenant_data 保管 API のエンドポイント詳細設計 (パス・zod スキーマ・rate limit)、(3) 削除完全性テストのテスト ID 採番とテストケース定義、をこの task 自身の成果物として確定する。あわせて R2 tenant prefix 分離設計と既存 Turso 使用量監視 cron への R2 使用量監視追加設計を確定し、この task 完了時点で P05 実装が着手可能な設計状態になる。

## 背景

docs/security-spec.md §4.1.1 の encryption_keys テーブル定義は現時点で purpose ∈ {salary, idp_secret} の 2 値のみを記載しており、system-spec/spec-state.json qa-045 が確定した purpose=tenant_data の追加は、qa-046 が「次回 security 深掘り (feature P02 前)」で全面展開すると明示的に据え置いた未反映事項である。tenant_data の封筒暗号化は既存 salary/idp_secret と同一機構 (KEK は Workers Secret 1 本 ENCRYPTION_KEK、DEK は encryption_keys テーブルに KEK で wrap して保存、UNIQUE(tenant_id, purpose, key_version) for tenant_data（既存global用途はtenant_id=NULL互換）、active は tenant_data ではtenant/purposeごとに1件（既存global用途はpurposeごと）) を用い、IV はレコードごとにランダム 96bit で再利用禁止、AAD は table:column:row_id を付加する契約が確定している。本 task はこの enum 拡張の具体的な migration 方針 (P08 が実施する DEK seed migration の前提となる architecture decision) と、AAD/IV 運用を tenant_data_objects.r2_key を対象にどう適用するかを確定する。

tenant_data 保管 API については system-spec/spec-state.json qa-048 が「エンドポイント詳細設計 (パス・スキーマ・rate limit) は feature P02 で行い、認可は既存 deny-by-default マトリクスへ行を追加する」と明示しており、本 task がこの確定作業そのものを担う。R2 tenant prefix 分離は qa-045 の「業務データ用 prefix をテナント別に分離し、PackageRegistry [immutable] とはバケットまたは prefix を分ける」という方針を、具体的な prefix 命名規則 (例: tenant/{tenant_id}/{workspace_id}/{kind}/{content_hash}) として確定する。R2 使用量監視は既存 Turso 使用量監視 cron (日次、閾値 70% で admin 通知・90% で R4-reopen 起票) へ R2 使用量を追加する設計方針が qa-045 で確定しているため、本 task はその具体的な cron 拡張方式 (R2 API からの使用量取得箇所・既存 cron ジョブへの統合方式) を確定する。削除完全性テストは docs/security-spec.md §8.3 の単体テスト一覧が T-14 までしか採番されておらず、tenant_data 専用の削除完全性テスト (T15 対策検証) の ID 採番とテストケース定義 (R2実体・DB行・backup restore+tombstone・cacheの4点確認) を本 task で確定する。

これら 5 系統はいずれも P01 が「未確定・P02 で確定」として明記した事項であり、本 task はその確定作業自体を担う。確定値は本 task の成果物 (architecture-decision-record.md) にのみ記載し、P01 requirements-baseline.md を遡って書き換えない。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-tenant-data-retention, arch-harness-hub-data, arch-harness-hub-security, arch-harness-hub-backend, arch-harness-hub-infrastructure
- Entry gate: P01 (docs/features/feat-tenant-data-retention/requirements-baseline.md) が作成済みであり、goal-spec の purpose/goal/scope_in/scope_out/acceptance/quality_constraints が baseline へ転記済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 feature はテナントデータ保管 API と R2 使用量監視のみを提供し、host UI は S15/S12 側の各 feature が所有する
- Backend: applicable + change: tenant_data 保管 API のエンドポイント詳細設計 (パス・zod スキーマ・rate limit)、封筒暗号化/復号処理のリポジトリ層設計を architecture-decision-record.md へ記述する
- API: applicable + contract: tenant_data upload/取得/削除 API のパス・zod スキーマ・rate limit、S15/S12 向け任意統合 API 契約・extension point の外形を確定する
- Data: applicable + migration: tenant_data_objects テーブル DDL 詳細確定、encryption_keys.purpose enum への tenant_data 追加 migration 方針 (実施は P08) を確定する
- Infrastructure: applicable + IaC/deploy: R2 tenant prefix 分離設計 (prefix 命名規則、PackageRegistry/backups とのバケットまたは prefix 分離)、既存 Turso 使用量監視 cron への R2 使用量監視追加方式を確定する
- Security: applicable + control: encryption_keys.purpose enum 拡張と AAD/IV 運用の tenant_data への適用方式、テナント越境読取防止 (T14) の一貫適用方式、削除完全性テスト (T15 対策検証) のテスト ID 採番とテストケース定義を確定する
- Quality: applicable + change: P04 のテスト設計が参照する削除完全性テスト ID とテストケース定義の確定、R2 使用量監視アラートの検証方式を確定する
- Documentation: applicable + change: docs/features/feat-tenant-data-retention/architecture-decision-record.md を新規作成する
- Operations: N/A: 運用手順 (R2 使用量監視 runbook 等) の具体化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-data, arch-harness-hub-security, arch-harness-hub-backend, arch-harness-hub-infrastructure (qa-045〜qa-049, appr-007 を含む)
- Deploy unit/environment: cloudflare-workers/hub (apps/hub は @opennextjs/cloudflare 経由で単一 Cloudflare Worker としてデプロイされる)
- Compatibility/migration/backfill: applicable + contract: encryption_keys.purpose enum への tenant_data 追加は既存 salary/idp_secret 運用と非破壊で共存する migration 方針として確定する (具体的な migration 実施は P08 の責務)

## 成果物

- Produced artifacts: docs/features/feat-tenant-data-retention/architecture-decision-record.md (encryption_keys.purpose拡張・AAD/IV運用適用、tenant_data保管APIエンドポイント詳細設計、R2 tenant prefix分離設計、R2使用量監視cron拡張設計、削除完全性テストID採番・ケース定義の5系統 architecture decision)
- Consumed artifacts: docs/features/feat-tenant-data-retention/requirements-baseline.md, docs/security-spec.md, docs/backend-spec.md, docs/infrastructure-spec.md, architecture/harness-hub-data.md, architecture/harness-hub-security.md
- Write scope/touches: docs/features/feat-tenant-data-retention/architecture-decision-record.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-tenant-data-retention-p02) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-tenant-data-retention-p02 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-tenant-data-retention-p02) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-TENANT-DATA-RETENTION-P01] であり P01 完了後に着手する。resource_scope (docs/features/feat-tenant-data-retention/architecture-decision-record.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 既存 users.salary / idp_connections.client_secret_enc の封筒暗号化そのものの再設計 (owner=feat-auth-tenancy / feat-domain-model-db)
- S15 添付 / S12 実行入出力閲覧の host UI 実装 (各 feature が所有。本 task は統合 API 契約・extension point の外形確定のみ)
- 実装コードの作成 (本 task は設計確定のみ。実装は P05 で行う)
- encryption_keys.purpose enum 拡張 migration の実施そのもの (本 task は方針確定のみ。実施は P08 で行う)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: docs/features/feat-tenant-data-retention/architecture-decision-record.md に5系統 (encryption_keys.purpose拡張/AAD-IV運用、API詳細設計、R2 prefix分離、R2使用量監視cron拡張、削除完全性テストID採番) の architecture decision が記載されていること

## Rollout and rollback

- Rollout: architecture-decision-record.md を作成し、P01 requirements-baseline.md との整合を確認してから P03 (独立設計レビュー) へ引き継ぐ
- Rollback trigger and steps: encryption_keys.purpose拡張が既存 salary/idp_secret 運用と非互換であることが判明した場合、または R2 prefix分離がPackageRegistry/backupsと衝突することが判明した場合、architecture decisionをre-openしP02を再実行する。再実行まではP03以降の着手を保留する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-tenant-data-retention.context.json` (`sha256:69dfcdf921e77e21f88ca692b562cad0785381e22f00f1e446c512c0d87ea327`)
- Phase responsibility: 現行 architecture_refs と全 scope を実装境界・deploy unit・owner に割り当てる。
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

This section is normative for P02 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

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

- System specification: system-spec/spec-state.json qa_log (qa-045, qa-046, qa-048)
- Detailed authoritative source: docs/security-spec.md (§1.3 T14/T15, §4.1, §4.1.1, §8.3, §8.4), docs/backend-spec.md, docs/infrastructure-spec.md (§3, §4)
- Architecture: arch-harness-hub-data (architecture/harness-hub-data.md), arch-harness-hub-security (architecture/harness-hub-security.md), arch-harness-hub-backend (architecture/harness-hub-backend.md), arch-harness-hub-infrastructure (architecture/harness-hub-infrastructure.md)
- Feature: feat-tenant-data-retention
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-TENANT-DATA-RETENTION-P01
