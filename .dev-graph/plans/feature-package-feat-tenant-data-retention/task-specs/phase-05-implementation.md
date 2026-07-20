# System task overlay: 実装 — tenant_data_objects API・R2封筒暗号化保管/取得/即時完全削除・R2使用量監視cron拡張の実装

## Machine-readable registration fields

- feature_package_id: feature-package/feat-tenant-data-retention (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-tenant-data-retention", "macro-feature", "backend", "implementation"]
- related_nodes: ["feat-tenant-data-retention", "arch-harness-hub-data", "arch-harness-hub-security", "arch-harness-hub-backend"]
- parent_feature: feat-tenant-data-retention
- phase_ref: P05
- classification: confidence=0.86, reason="tenant_data_objectsテーブル定義・upload(multipart→テナント別封筒暗号化→R2保存+DB参照登録)/取得(認可MW通過後にのみ復号)/即時完全削除(R2実体+DB行+監査event)のAPI実装、R2使用量監視cron拡張実装を行うP05実装タスク", candidates=[{artifact_kind: task, confidence: 0.86, candidate_path: tasks/feat-tenant-data-retention/sys-tenant-data-retention-p05.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P02 で確定したアーキテクチャ決定と P04 で設計したテストケースをもとに、tenant_data_objects テーブルの CRUD API・R2 テナント別封筒暗号化保管/取得/即時完全削除・R2 使用量監視 cron 拡張を実装する。この task 完了時点で、P04 が設計した全テストケースに対応する実装対象が揃い、P06 のテスト実行が着手可能になる。

## 背景

tenant_data_objects テーブル (id, tenant_id, workspace_id, kind[knowledge_doc/run_input/run_output], title, r2_key, size_bytes, content_hash[sha256], enc_key_version, uploaded_by, created_at) は実体を DB に保存せず R2 参照とメタデータのみを保持する。upload API は multipart アップロードを受け取り、P02 で確定した purpose=tenant_data の DEK で封筒暗号化 (KEK は Workers Secret ENCRYPTION_KEK、IV はレコードごとにランダム 96bit、AAD は table:column:row_id) したうえで R2 に保存し、tenant_data_objects へ参照を登録する。取得 API は認可ミドルウェア通過後にのみリポジトリ層で復号する。削除 API は R2 実体・DB 行を即時完全削除し、soft delete 列を設けず audit_events のみを残す。R2 使用量監視 cron は既存 Turso 使用量監視 cron (日次、閾値 70%/90%) へ R2 使用量取得処理を追加する形で拡張する。本 repo は pre-implementation 状態 (apps/, packages/ が未作成) であるため、write_scope に列挙する将来パスは feat-dual-catalog-web で既に前例のある将来パス記法に従う。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-tenant-data-retention, arch-harness-hub-data, arch-harness-hub-security, arch-harness-hub-backend
- Entry gate: P04 (docs/features/feat-tenant-data-retention/test-design.md) が作成済みであり、acceptance 3 件・quality_constraints 6 件全てに対応するテストケースが定義済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 feature は host UI を持たず frontend 実装を行わない
- Backend: applicable + change: apps/hub/src/lib/tenant-data/ に封筒暗号化/復号処理・削除処理のリポジトリ層を実装する
- API: applicable + contract: apps/hub/src/app/api/v1/tenant-data/ に upload/取得/削除エンドポイントを P02 確定契約に従い実装する
- Data: applicable + migration: packages/db/src/schema/tenant-data-objects.ts に tenant_data_objects テーブルスキーマを実装する (encryption_keys.purpose enum 拡張自体の migration 実施は P08)
- Infrastructure: applicable + IaC/deploy: apps/hub/src/lib/scheduled/r2-usage-monitor.ts に既存 Turso 使用量監視 cron への R2 使用量監視統合を実装する
- Security: applicable + control: IV 96bit ランダム生成・AAD (table:column:row_id) 付加・認可ミドルウェア通過後復号・R2 tenant prefix 分離を実装する
- Quality: applicable + change: P04 test-design.md が定義した全テストケースに対応する実装対象を揃える
- Documentation: applicable + change: docs/features/feat-tenant-data-retention/implementation-notes.md を新規作成する
- Operations: N/A: 運用手順の具体化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-data, arch-harness-hub-security, arch-harness-hub-backend (P02 architecture-decision-record.md の5系統決定を実装へ反映)
- Deploy unit/environment: cloudflare-workers/hub (apps/hub は @opennextjs/cloudflare 経由で単一 Cloudflare Worker としてデプロイされる)
- Compatibility/migration/backfill: applicable + contract: encryption_keys.purpose enum 拡張を前提としたコードを実装するが、migration 実施自体はP08で行うため、本taskの実装はP08完了前にはproduction経路で有効化しない

## 成果物

- Produced artifacts: packages/db/src/schema/tenant-data-objects.ts, packages/schemas/tenant-data/, apps/hub/src/app/api/v1/tenant-data/, apps/hub/src/lib/tenant-data/, apps/hub/src/lib/scheduled/r2-usage-monitor.ts, docs/features/feat-tenant-data-retention/implementation-notes.md
- Consumed artifacts: docs/features/feat-tenant-data-retention/architecture-decision-record.md, docs/features/feat-tenant-data-retention/test-design.md, docs/backend-spec.md, docs/security-spec.md
- Write scope/touches: packages/db/src/schema/tenant-data-objects.ts, packages/schemas/tenant-data/, apps/hub/src/app/api/v1/tenant-data/, apps/hub/src/lib/tenant-data/, apps/hub/src/lib/scheduled/r2-usage-monitor.ts, docs/features/feat-tenant-data-retention/implementation-notes.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-tenant-data-retention-p05) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-tenant-data-retention-p05 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-tenant-data-retention-p05) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-TENANT-DATA-RETENTION-P04] であり P04 完了後に着手する。resource_scope (packages/db/src/schema/tenant-data-objects.ts, apps/hub/src/app/api/v1/tenant-data/, apps/hub/src/lib/tenant-data/, apps/hub/src/lib/scheduled/r2-usage-monitor.ts) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 顧客業務システム接続 credential と WebApp runtime の保管実装 (C4 により恒久的に非保持)
- 業務データを入力とする AI ジョブ実行ロジックの実装 (owner=feat-hearing-intake / feat-build-pipeline-board)
- encryption_keys.purpose enum 拡張 migration の実施そのもの (owner=P08)
- テストの実行そのもの (owner=P06)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging/feature-package-feat-tenant-data-retention`
- Required evidence: packages/db/src/schema/tenant-data-objects.ts, packages/schemas/tenant-data/, apps/hub/src/app/api/v1/tenant-data/, apps/hub/src/lib/tenant-data/, apps/hub/src/lib/scheduled/r2-usage-monitor.ts が実装され、P04 の test-design.md に列挙された全テストケースに対応する実装対象が揃っていること

## Rollout and rollback

- Rollout: 実装完了後、implementation-notes.md に実装差分と P04 テストケースとの対応関係を記録してから P06 (テスト実行) へ引き継ぐ
- Rollback trigger and steps: 実装がP02のarchitecture decisionと矛盾する場合、該当コードを削除しP02の設計に沿って再実装する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/spec-state.json qa_log (qa-045, qa-048)
- Detailed authoritative source: docs/backend-spec.md, docs/security-spec.md (§4.1)
- Architecture: arch-harness-hub-data (architecture/harness-hub-data.md), arch-harness-hub-security (architecture/harness-hub-security.md), arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-tenant-data-retention
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-TENANT-DATA-RETENTION-P04
