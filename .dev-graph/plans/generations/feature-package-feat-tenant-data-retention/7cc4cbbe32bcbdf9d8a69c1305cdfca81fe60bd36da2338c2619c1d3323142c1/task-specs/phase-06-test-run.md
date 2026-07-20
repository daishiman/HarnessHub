# System task overlay: テスト実行 — テナント分離・削除完全性・暗号化検証・R2使用量監視アラートテストの実行

## Machine-readable registration fields

- feature_package_id: feature-package/feat-tenant-data-retention (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-tenant-data-retention", "macro-feature", "quality", "test-run"]
- related_nodes: ["feat-tenant-data-retention", "arch-harness-hub-security"]
- parent_feature: feat-tenant-data-retention
- phase_ref: P06
- classification: confidence=0.84, reason="P04で設計したテナント分離テスト・削除完全性テスト(R2実体/DB行/backup断面)・暗号化検証テスト・R2使用量監視アラートテストを実行し結果を記録するP06テスト実行タスク", candidates=[{artifact_kind: task, confidence: 0.84, candidate_path: tasks/feat-tenant-data-retention/sys-tenant-data-retention-p06.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P05 で実装した tenant_data_objects API・R2 封筒暗号化保管/取得/即時完全削除・R2 使用量監視 cron 拡張に対して、P04 で設計したテナント分離テスト・削除完全性テスト・暗号化検証テスト・R2 使用量監視アラートテストを実行し、結果を記録する。この task 完了時点で、quality_constraints 6 件全ての pass/fail 状況が確定し、P07 の受入判定が着手可能になる。

## 背景

Feature Execution Package の固定責務マッピングでは、P06 は「テスト実行」を担い、P04 が設計したテストケースを P05 の実装に対して実行し客観的な pass/fail 記録を残すゲートである。本 feature はテナント越境読取 (T14) と削除不完全 (T15) という重大な脅威モデル項目を対象とするため、テナント分離テストと削除完全性テストの実行結果は特に厳密に記録する。暗号化検証テストでは IV の再利用がないこと、AAD 不一致時に復号が失敗することを実測する。R2 使用量監視アラートテストは既存 Turso 使用量監視 cron への統合後の閾値 70%/90% 到達時の通知動作を実測する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-tenant-data-retention, arch-harness-hub-security
- Entry gate: P05 (packages/db/src/schema/tenant-data-objects.ts, apps/hub/src/app/api/v1/tenant-data/, apps/hub/src/lib/tenant-data/, apps/hub/src/lib/scheduled/r2-usage-monitor.ts) が実装済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 feature は host UI を持たず frontend テスト実行対象がない
- Backend: applicable + change: tenant_data 保管 API (upload/取得/削除) の単体・統合テストを実行する
- API: applicable + contract: API 契約 (パス・スキーマ・rate limit) の境界値・異常系テストを実行する
- Data: applicable + migration: tenant_data_objects テーブルへの D4 row-level scope 適用テストを実行する
- Infrastructure: N/A: infrastructure 変更自体は本 task の対象外であり、cron 統合の動作確認は Operations 区分で扱う
- Security: applicable + control: テナント分離テスト (T14 対策検証)・削除完全性テスト (T15 対策検証)・暗号化検証テスト (IV 再利用なし・AAD 不一致復号失敗) を実行する
- Quality: applicable + tests/gates: acceptance 3 件と quality_constraints 6 件全てに対応するテストの実行結果を記録する
- Documentation: applicable + change: docs/features/feat-tenant-data-retention/test-run-results.md を新規作成する
- Operations: applicable + runbook/monitoring: R2 使用量監視アラート (閾値 70%/90%) の通知動作テストを実行する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-security (P02 architecture-decision-record.md の削除完全性テストID・暗号化契約を検証)
- Deploy unit/environment: cloudflare-workers/hub (本 task はテスト実行のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task はテスト実行のみで実データへの互換性移行を伴わない

## 成果物

- Produced artifacts: docs/features/feat-tenant-data-retention/test-run-results.md (quality_constraints 6件全てのテスト実行結果)
- Consumed artifacts: docs/features/feat-tenant-data-retention/test-design.md, packages/db/src/__tests__/tenant-data/
- Write scope/touches: docs/features/feat-tenant-data-retention/test-run-results.md, packages/db/src/__tests__/tenant-data/

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-tenant-data-retention-p06) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-tenant-data-retention-p06 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-tenant-data-retention-p06) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-TENANT-DATA-RETENTION-P05] であり P05 完了後に着手する。resource_scope (docs/features/feat-tenant-data-retention/test-run-results.md, packages/db/src/__tests__/tenant-data/) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- テストケースの新規設計・変更 (owner=P04)
- 実装コードの修正そのもの (本 task はテスト実行のみ。fail 時の修正はP05へ差し戻す)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: test-run-results.md に quality_constraints 6 件全ての pass 結果 (テナント分離・削除完全性・暗号化検証・R2使用量監視アラートの実測結果を含む) が記録されていること (fail が残る場合は差し戻し理由が明記されていること). Normative evidence: 2 tenantで別DEK/version、cross-tenant unwrap拒否、rotation、R2+DB+backup restore non-restoration、既存cron dispatch registration、70/90%通知をP04/P06/P09/P10/P11で実証する。

## Rollout and rollback

- Rollout: 全テスト pass を確認し test-run-results.md へ記録してから P07 (受入) へ引き継ぐ
- Rollback trigger and steps: いずれかのテスト (テナント越境読取検出・削除残存検出・平文検出を含む) が fail した場合、test-run-results.md に原因を記録しP05(実装)へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-tenant-data-retention.context.json` (`sha256:69dfcdf921e77e21f88ca692b562cad0785381e22f00f1e446c512c0d87ea327`)
- Phase responsibility: P05 の実装に対して P04 の全テストを実行し、再現可能な結果を残す。
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

This section is normative for P06 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

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

- System specification: system-spec/spec-state.json qa_log (qa-045)
- Detailed authoritative source: docs/security-spec.md (§1.3 T14/T15, §8.3, §8.4)
- Architecture: arch-harness-hub-security (architecture/harness-hub-security.md)
- Feature: feat-tenant-data-retention
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-TENANT-DATA-RETENTION-P05
