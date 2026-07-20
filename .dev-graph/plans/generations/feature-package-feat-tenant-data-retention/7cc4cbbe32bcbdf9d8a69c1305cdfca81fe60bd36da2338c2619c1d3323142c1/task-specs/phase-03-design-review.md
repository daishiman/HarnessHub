# System task overlay: 独立設計レビュー — encryption_keys拡張・R2 prefix分離・API契約・削除完全性テスト採番の妥当性確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-tenant-data-retention (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-tenant-data-retention", "macro-feature", "quality", "design-review"]
- related_nodes: ["feat-tenant-data-retention", "arch-harness-hub-security", "arch-harness-hub-backend"]
- parent_feature: feat-tenant-data-retention
- phase_ref: P03
- classification: confidence=0.83, reason="P02で確定したencryption_keys.purpose拡張・R2 prefix分離・API詳細設計・削除完全性テスト採番の5系統architecture decisionを、実装着手前に独立観点で妥当性確認するP03設計レビュータスク", candidates=[{artifact_kind: task, confidence: 0.83, candidate_path: tasks/feat-tenant-data-retention/sys-tenant-data-retention-p03.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P02 architecture-decision-record.md で確定した encryption_keys.purpose 拡張・AAD/IV 運用適用、tenant_data 保管 API エンドポイント詳細設計、R2 tenant prefix 分離設計、R2 使用量監視 cron 拡張設計、削除完全性テスト ID 採番・ケース定義の 5 系統を、実装着手 (P05) 前に P02 作成者とは独立した観点でレビューし、妥当性を確認する。この task 完了時点で、5 系統すべてに重大な指摘がないことが確認され、P04 のテスト設計が安心して着手できる状態になる。

## 背景

Feature Execution Package の固定責務マッピングでは、P03 は「独立設計レビュー」を担い、P02 の architecture decision を実装前に検証するゲートとして機能する。本 feature は既存共有基盤 (encryption_keys テーブル、R2 バケット、Turso 使用量監視 cron) に手を加える設計を含むため、既存 salary/idp_secret 運用や既存 PackageRegistry/backups への悪影響がないかを重点的にレビューする必要がある。特に encryption_keys.purpose enum 拡張は feat-domain-model-db/feat-auth-tenancy が既に運用しているテーブルへの変更であるため、本 task では P02 が確定した migration 方針が非破壊であることを architecture decision の記述内容から確認する (実際の migration 実施と動作確認は P08 が担う)。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-tenant-data-retention, arch-harness-hub-security, arch-harness-hub-backend
- Entry gate: P02 (docs/features/feat-tenant-data-retention/architecture-decision-record.md) が作成済みであり、5 系統の architecture decision が記載されていること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 feature は host UI を持たず frontend レビュー対象がない
- Backend: applicable + change: tenant_data 保管 API エンドポイント詳細設計 (パス・スキーマ・rate limit) の妥当性をレビューする
- API: applicable + contract: API 契約が既存 deny-by-default 認可マトリクスおよび S15/S12 統合 extension point の外形と整合しているかをレビューする
- Data: applicable + migration: encryption_keys.purpose enum 拡張 migration 方針が既存 salary/idp_secret 運用と非破壊で共存するかをレビューする
- Infrastructure: applicable + IaC/deploy: R2 tenant prefix 分離設計が既存 PackageRegistry/backups と衝突しないかをレビューする
- Security: applicable + control: AAD/IV 運用適用方式、テナント越境読取防止 (T14)、削除完全性テスト (T15 対策検証) の ID 採番・ケース定義の妥当性をレビューする
- Quality: applicable + change: レビュー結果 (問題なし、または是正指示) を design-review-notes.md に記録する
- Documentation: applicable + change: docs/features/feat-tenant-data-retention/design-review-notes.md を新規作成する
- Operations: N/A: 運用手順のレビューは P12 完了後の運用引き継ぎ時に行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-security, arch-harness-hub-backend (P02 architecture-decision-record.md を対象にレビューする)
- Deploy unit/environment: cloudflare-workers/hub (本 task はレビューのみでデプロイは行わない)
- Compatibility/migration/backfill: applicable + contract: P02 が確定した encryption_keys migration 方針の非破壊性をレビューする (migration 自体の実施は P08)

## 成果物

- Produced artifacts: docs/features/feat-tenant-data-retention/design-review-notes.md (5 系統 architecture decision の妥当性確認結果)
- Consumed artifacts: docs/features/feat-tenant-data-retention/architecture-decision-record.md, docs/security-spec.md
- Write scope/touches: docs/features/feat-tenant-data-retention/design-review-notes.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-tenant-data-retention-p03) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-tenant-data-retention-p03 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-tenant-data-retention-p03) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-TENANT-DATA-RETENTION-P02] であり P02 完了後に着手する。resource_scope (docs/features/feat-tenant-data-retention/design-review-notes.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- architecture decision の新規作成・修正そのもの (owner=P02。本 task は既存 decision のレビューのみ)
- 実装コードの作成 (本 task はレビューのみ。実装は P05 で行う)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: design-review-notes.md に P02 の 5 系統 architecture decision それぞれについて妥当性確認結果 (問題なし、または是正指示) が記載されていること

## Rollout and rollback

- Rollout: design-review-notes.md を作成し、5 系統すべてに重大な指摘がないことを確認してから P04 (テストファースト設計) へ引き継ぐ
- Rollback trigger and steps: encryption_keys拡張・R2 prefix分離・API契約・削除完全性テスト採番のいずれかに重大な指摘が見つかった場合、design-review-notes.md に指摘内容を記録しP02へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-tenant-data-retention.context.json` (`sha256:69dfcdf921e77e21f88ca692b562cad0785381e22f00f1e446c512c0d87ea327`)
- Phase responsibility: P02 の設計が現行 context を漏れなく、矛盾なく満たすか独立レビューする。
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

This section is normative for P03 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

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
- Detailed authoritative source: docs/security-spec.md (§1.3, §4.1, §8.3, §8.4)
- Architecture: arch-harness-hub-security (architecture/harness-hub-security.md), arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-tenant-data-retention
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-TENANT-DATA-RETENTION-P02
