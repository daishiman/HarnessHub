# System task overlay: 要件ベースライン確定 — tenant_data_objects CRUD API・R2封筒暗号化保管・即時完全削除・R2使用量監視の要件確定

## Machine-readable registration fields

- feature_package_id: feature-package/feat-tenant-data-retention (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-tenant-data-retention", "macro-feature", "documentation", "requirements-baseline"]
- related_nodes: ["feat-tenant-data-retention", "arch-harness-hub-data", "arch-harness-hub-security"]
- parent_feature: feat-tenant-data-retention
- phase_ref: P01
- classification: confidence=0.87, reason="goal-spec (.dev-graph/staging/feature-package-feat-tenant-data-retention/goal-spec.json) の purpose/goal/scope_in 5件/scope_out 3件/acceptance 3件/quality_constraints 6件(id単位)を要件ベースラインへ確定転記するP01タスク", candidates=[{artifact_kind: task, confidence: 0.87, candidate_path: tasks/feat-tenant-data-retention/sys-tenant-data-retention-p01.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

feat-tenant-data-retention の受入可能な要件ベースラインを確定し、以降の P02 以降の全 task が同一の合意事項 (tenant_data_objects CRUD API、R2 テナント別封筒暗号化保管、即時完全削除、R2 使用量監視) を参照できる状態にする。この task 完了時点で、goal-spec の purpose/goal/scope_in 5 件/scope_out 3 件/acceptance 3 件/quality_constraints 6 件が machine-verifiable な baseline 文書として固定される。

## 背景

C4 改訂 (2026-07-18・appr-007) により、顧客業務システム接続 credential と WebApp runtime は恒久的に非保持のまま、顧客業務ナレッジ/ドキュメントとハーネス実行入出力データ (tenant_data) のみ保持可能となった (system-spec/spec-state.json qa-045〜qa-049)。本 feature はこの改訂で新たに独立した価値提供単位として切り出された tenant_data_objects の upload/取得/即時完全削除 API と R2 使用量監視を提供する。保持先は新テーブル tenant_data_objects (id, tenant_id, workspace_id, kind[knowledge_doc/run_input/run_output], title, r2_key, size_bytes, content_hash[sha256], enc_key_version, uploaded_by, created_at) であり、実体は DB に保存せず R2 参照とメタデータのみを保持し、Turso 無料枠 5GB を業務データで消費しない (D4 row-level scope 必須・分離テスト CI 対象)。封筒暗号化は既存 salary/idp_secret と同一機構 (KEK/DEK、AES-256-GCM) を用い、削除は soft delete を設けず R2 実体・DB 行を即時完全削除して audit_events のみを残す。R2 使用量監視は既存 Turso 使用量監視 cron (日次、閾値 70%/90%) へ R2 使用量を追加する形で実装する設計方針が確定している。

本 task は上記の確定要件を再解釈や欠落なく baseline 化するとともに、goal-spec の quality_constraints のうち P02 (feature architecture 設計) より前には確定していない未解決事項を本 baseline に明記し、P02 の必須解消事項として引き継ぐ。具体的には (1) docs/security-spec.md §4.1.1 の encryption_keys.purpose enum は現時点で salary/idp_secret の 2 値のみが記載されており、purpose=tenant_data の追加と AAD/IV 運用の tenant_data への適用は P02 で確定する、(2) tenant_data 保管 API のエンドポイント詳細設計 (パス・zod スキーマ・rate limit) は P02 で確定する、(3) 削除完全性テストは docs/security-spec.md §8.3 が T-14 までしか採番しておらず、tenant_data 専用の削除完全性テスト ID の採番とテストケース定義は P02 で確定する。本 task はこれら 3 点を「未確定・P02 で確定」の据置事項として明記するに留め、最終的な確定値を先取りして書かない。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-tenant-data-retention, arch-harness-hub-data, arch-harness-hub-security
- Entry gate: .dev-graph/staging/feature-package-feat-tenant-data-retention/goal-spec.json の feature_context_digest が sha256:69dfcdf921e77e21f88ca692b562cad0785381e22f00f1e446c512c0d87ea327 に一致し、features/feat-tenant-data-retention.md の confirmation_status が confirmed であること。evaluation_status は本 task package 生成時点で pending であり、system-dev-plan-evaluator による C12 PASS 判定と C11 promotion を経て解決する
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は要件文書化のみで frontend 実装物を変更しない
- Backend: N/A: 本 task は要件文書化のみで backend 実装物を変更しない (エンドポイント詳細設計は P02 で確定する)
- API: N/A: tenant_data 保管 API のパス・スキーマ・rate limit の詳細は P02 で定義する。本 task は要件記述のみ
- Data: N/A: tenant_data_objects テーブルの DDL 詳細確定は P02 で行う。本 task は要件記述のみ
- Infrastructure: N/A: Cloudflare Workers デプロイ単位は feat-hub-foundation が既に確立しており、本 feature は追加インフラを新設しない
- Security: applicable + change: c4-revision-tenant-data-retention-qa045-048-appr007・tenant-data-envelope-encryption-numeric-contract・immediate-full-deletion-r2-db-backup-contract・tenant-cross-boundary-read-prevention-t14-r2-prefix・r2-usage-monitoring-alert-cron-extension・tenant-data-api-endpoint-detail-deferred-to-p02 の 6 件の quality_constraints を要件ベースラインへ確定記述する
- Quality: applicable + change: goal-spec acceptance 3 件と quality_constraints 6 件を machine-verifiable な受入基準として requirements-baseline.md に固定する。P02 で確定すべき 3 つの据置事項 (enum 拡張・API詳細設計・削除完全性テスト採番) を必須解消事項として明記する
- Documentation: applicable + change: docs/features/feat-tenant-data-retention/requirements-baseline.md を新規作成する
- Operations: N/A: R2 使用量監視の運用手順の具体化は P12 で行う。本 task は要件確定のみ

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-data, arch-harness-hub-security (features/feat-tenant-data-retention.context.json architecture_refs の正本参照)
- Deploy unit/environment: cloudflare-workers/hub (apps/hub は Hub Worker にバンドルされる。本 task は要件確定のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は要件確定のみで実コードへの変更を伴わない (実変更は P05、既存 encryption_keys への互換移行は P08 で扱う)

## 成果物

- Produced artifacts: docs/features/feat-tenant-data-retention/requirements-baseline.md (要件ベースライン文書。purpose/goal/scope_in 5 件/scope_out 3 件/acceptance 3 件/quality_constraints 6 件の確定転記、および P02 必須解消事項 3 点の明記を含む)
- Consumed artifacts: .dev-graph/staging/feature-package-feat-tenant-data-retention/goal-spec.json, features/feat-tenant-data-retention.md, features/feat-tenant-data-retention.context.json, architecture/harness-hub-data.md, architecture/harness-hub-security.md
- Write scope/touches: docs/features/feat-tenant-data-retention/requirements-baseline.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-tenant-data-retention-p01) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-tenant-data-retention-p01 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-tenant-data-retention-p01) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on が空のため他 task との着手順序制約はない。resource_scope (docs/features/feat-tenant-data-retention/requirements-baseline.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 顧客業務システム接続 credential と WebApp runtime の保管 (C4 により恒久的に非保持)
- 業務データを入力とする AI ジョブ実行ロジック (owner=feat-hearing-intake / feat-build-pipeline-board)
- 既存 users.salary / idp_connections.client_secret_enc の封筒暗号化 (owner=feat-auth-tenancy / feat-domain-model-db)
- 実装コードの作成 (本 task は要件確定のみ)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging/feature-package-feat-tenant-data-retention`
- Required evidence: docs/features/feat-tenant-data-retention/requirements-baseline.md に goal-spec acceptance 3 件と quality_constraints 6 件 (c4-revision-tenant-data-retention-qa045-048-appr007, tenant-data-envelope-encryption-numeric-contract, immediate-full-deletion-r2-db-backup-contract, tenant-cross-boundary-read-prevention-t14-r2-prefix, r2-usage-monitoring-alert-cron-extension, tenant-data-api-endpoint-detail-deferred-to-p02) が過不足なく転記され、P02 必須解消事項 3 点が明記されていること

## Rollout and rollback

- Rollout: requirements-baseline.md を作成し、feature-package.json の source_feature_digest と一致することを確認してから P02 へ引き継ぐ
- Rollback trigger and steps: goal-spec と features/feat-tenant-data-retention.md の内容不一致が判明した場合、requirements-baseline.md を作成前状態 (ファイル未作成) に戻し、goal-spec 側の再確定を dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/spec-state.json qa_log (qa-045, qa-046, qa-047, qa-048, qa-049), approval_log (appr-007)
- Detailed authoritative source: docs/security-spec.md (§1.2, §1.3, §4.1), docs/backend-spec.md, docs/infrastructure-spec.md (§3, §4)
- Architecture: arch-harness-hub-data (architecture/harness-hub-data.md), arch-harness-hub-security (architecture/harness-hub-security.md)
- Feature: feat-tenant-data-retention
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: なし (P01 は本 package の起点 task)
