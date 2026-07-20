# System task overlay: 品質・セキュリティ・運用保証 — テナント越境読取防止(T14)・削除不完全対策(T15)・R2使用量監視運用確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-tenant-data-retention (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-tenant-data-retention", "macro-feature", "security", "quality-assurance"]
- related_nodes: ["feat-tenant-data-retention", "arch-harness-hub-security"]
- parent_feature: feat-tenant-data-retention
- phase_ref: P09
- classification: confidence=0.85, reason="T14(テナント越境読取)対策(purpose=tenant_data封筒暗号化+D4 row-level+R2 tenant prefix分離+認可MW通過後復号)の一貫適用確認、T15(削除不完全)対策(即時完全削除+削除監査event+restore drill非復元確認)の運用確認、R2使用量監視アラート(閾値70%/90%)の運用確認を行うP09品質保証タスク", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-tenant-data-retention/sys-tenant-data-retention-p09.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P08 の migration 完了後、T14 (テナント越境読取) 対策と T15 (削除不完全) 対策が実装全体を通じて一貫して適用されていることを確認し、R2 使用量監視アラートの運用面での確認を行う。この task 完了時点で、本 feature の品質・セキュリティ・運用保証観点での懸念が解消され、P10 の独立最終レビューへ引き継げる状態になる。

## 背景

docs/security-spec.md §1.3 の T14 は「テナント A の利用者/管理者が保持業務データ (tenant_data) をテナント越境で読む」脅威であり、対策は purpose=tenant_data の封筒暗号化 + D4 row-level + R2 tenant prefix 分離、認可ミドルウェア通過後のみ復号である。T15 は「削除不完全により、削除操作後も業務データが R2 実体・DB 行・バックアップ断面に残存する」脅威であり、対策は即時完全削除 + 削除監査 event + restore drill での非復元確認である。四半期 restore drill には削除済み業務データが復元されないことの確認項目を追加する (qa-019 拡張)。R2 使用量監視は既存 Turso 使用量監視 cron への統合後、実運用での閾値 70%/90% 到達時の通知経路が機能することを確認する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-tenant-data-retention, arch-harness-hub-security
- Entry gate: P08 (docs/features/feat-tenant-data-retention/refactoring-migration-note.md) が作成済みであり migration の非破壊性が確認されていること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 feature は host UI を持たず frontend 品質保証対象がない
- Backend: N/A: backend 実装の品質保証は P06/P07 で完了済みであり、本 task はセキュリティ・運用横断の保証に限定する
- API: N/A: API 契約の品質保証は P06/P07 で完了済み
- Data: applicable + migration: D4 row-level scope が tenant_data_objects 全経路 (upload/取得/削除) で一貫適用されていることを確認する
- Infrastructure: applicable + IaC/deploy: R2 tenant prefix 分離が既存 PackageRegistry/backups と衝突しないことを本番相当環境で確認する
- Security: applicable + control: T14 対策 (封筒暗号化+D4+R2 prefix分離+認可MW通過後復号)、T15 対策 (即時完全削除+削除監査event+restore drill非復元確認) の一貫適用を確認する
- Quality: applicable + tests/gates: 四半期 restore drill への削除済み業務データ非復元確認項目の追加を確認する
- Documentation: applicable + change: docs/features/feat-tenant-data-retention/quality-assurance-report.md を新規作成する
- Operations: applicable + runbook/monitoring: R2 使用量監視アラート (閾値 70%/90%) の実運用通知経路を確認する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-security (T14/T15 対策の一貫適用確認)
- Deploy unit/environment: cloudflare-workers/hub (本 task は保証確認のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は保証確認のみで新たな migration を伴わない (migration 自体は P08 で完了済み)

## 成果物

- Produced artifacts: docs/features/feat-tenant-data-retention/quality-assurance-report.md (T14/T15対策確認結果、R2使用量監視運用確認結果)
- Consumed artifacts: apps/hub/src/lib/tenant-data/, docs/features/feat-tenant-data-retention/refactoring-migration-note.md, docs/security-spec.md (§1.3)
- Write scope/touches: apps/hub/src/lib/tenant-data/, docs/features/feat-tenant-data-retention/quality-assurance-report.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-tenant-data-retention-p09) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-tenant-data-retention-p09 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-tenant-data-retention-p09) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-TENANT-DATA-RETENTION-P08] であり P08 完了後に着手する。resource_scope (apps/hub/src/lib/tenant-data/) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 新規機能の実装 (owner=P05。本 task は既存実装の品質・セキュリティ・運用保証確認のみ)
- encryption_keys migration の実施そのもの (owner=P08)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: quality-assurance-report.md に T14(テナント越境読取防止)確認結果・T15(削除不完全対策)確認結果・R2使用量監視アラート運用確認・四半期restore drillへの削除済みデータ非復元確認項目追加の4項目全てが記載されていること. Normative evidence: 2 tenantで別DEK/version、cross-tenant unwrap拒否、rotation、R2+DB+backup restore non-restoration、既存cron dispatch registration、70/90%通知をP04/P06/P09/P10/P11で実証する。

## Rollout and rollback

- Rollout: quality-assurance-report.md を作成し、T14/T15対策の一貫適用とR2使用量監視の実運用確認を終えてから P10 (独立最終レビュー) へ引き継ぐ
- Rollback trigger and steps: テナント分離またはR2使用量監視の確認で不整合が見つかった場合、apps/hub/src/lib/tenant-data/ の該当実装を修正し本taskを再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-tenant-data-retention.context.json` (`sha256:69dfcdf921e77e21f88ca692b562cad0785381e22f00f1e446c512c0d87ea327`)
- Phase responsibility: 品質・security・operations・CI gate を現行正本に照らして保証する。
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

This section is normative for P09 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

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
- Detailed authoritative source: docs/security-spec.md (§1.3 T14/T15), docs/infrastructure-spec.md (§4)
- Architecture: arch-harness-hub-security (architecture/harness-hub-security.md)
- Feature: feat-tenant-data-retention
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-TENANT-DATA-RETENTION-P08
