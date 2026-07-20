# System task overlay: ドメインモデル & control-plane DB (Turso + Drizzle + R2 registry) 要件ベースライン確定

## Machine-readable registration fields

- feature_package_id: feature-package/feat-domain-model-db (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-domain-model-db", "macro-feature", "data", "requirements-baseline"]
- related_nodes: ["feat-domain-model-db", "arch-harness-hub-data", "arch-harness-hub-backend"]
- parent_feature: feat-domain-model-db
- phase_ref: P01
- classification: confidence=0.92, reason="goal-spec (.dev-graph/staging/goal-spec.json) と features/feat-domain-model-db.md の purpose/goal/scope/acceptance/quality_constraints を要件ベースラインへ確定転記する P01 タスク", candidates=[{artifact_kind: task, confidence: 0.92, candidate_path: tasks/feat-domain-model-db/sys-domain-model-db-p01.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

feat-domain-model-db の受入可能な要件ベースラインを確定し、以降の P02 以降の全 task が同一の合意事項 (コアドメイン 18 テーブルの Drizzle スキーマ、libSQL/D1 両対応の接続層隔離、R2 content-addressed PackageRegistry、日次 export + 四半期 restore drill、単一 migration 系統) を参照できる状態にする。この task 完了時点で、goal-spec の purpose/goal/scope_in 5 件/scope_out 2 件/acceptance 3 件/quality_constraints 9 件が machine-verifiable な baseline 文書として固定される。

## 背景

Harness Hub の control-plane DB は Tenant→Workspace→Project→TargetChannel→Release(immutable) のドメインモデルを中核とし (system-spec/00-requirements-definition.md I3、紐づくゴール G1/G4)、Turso Free (libSQL) を Drizzle ORM (SQLite dialect) 経由で採用しつつ Cloudflare D1 への退避経路を SQLite 方言互換によって温存する (D2 ヘッジ、system-spec/spec-state.json qa-004)。DB アクセスは Drizzle リポジトリ層に閉じ、Turso→D1 移行の影響をアプリ層へ波及させない接続層隔離を qa-020 が要求する。マルチテナント論理分離は row-level-scope 方式 (単一 DB + tenant_id/workspace_id スコープ列 + アプリ層 WHERE 句強制) を D4 が確定しており、documents.scope='common' を除く全テーブルに適用し分離テストを CI 必須とする (qa-024)。共通スキーマ規約として全 PK を ULID 文字列とし、表示用コードは display_code_counters (Studio 拡張が管轄する別テーブル) による連番の別列とし、時刻列は INTEGER (epoch ms) でサーバ時刻のみを採用する (qa-032)。SkillPackage 実体は Cloudflare R2 上に content hash (sha256) を key とする immutable PackageRegistry として保持し、DB (packages テーブル) には content_hash/r2_key/size_bytes/kind のみを保存する (C4、qa-004)。releases テーブルは immutable とし更新を status 列のみに制限し、version は差分+content hash から自動採番、target_channels.stable_release_id が TargetChannel ごとの atomic な stable pointer として機能する (I3)。バックアップは日次 export を R2 へ保存し四半期ごとの restore drill で復元手順を検証し、salary 列は export・R2 バックアップ断面でも暗号化状態を維持し常にマスクする (qa-019、docs/security-spec.md §4.2)。スキーマ変更は Drizzle migration を単一系統で運用し、packages/db にスキーマ定義とリポジトリ層を集約する。

本 task は上記の確定要件を再解釈や欠落なく baseline 化するとともに、goal-spec の quality_constraints に含まれる P02 必須解消事項 — User 基底テーブル (id, tenant_id, idp_subject, email, name, role, status, last_login_at 等) の owner feature の未確定 (features/feat-domain-model-db.md 上流未解決節: 「qa-024 は User 拡張列 department/salary のみ確定、既存不変エンティティ一覧にも User が無い」が、docs/backend-spec.md §2.2 の現行版は users を「コアドメイン (既存確定・不変)」に含める) — を、後続タスクの手戻りを防ぐため本 baseline に明記し P02 の必須解消事項として引き継ぐ。あわせて、system-spec/database.md qa-045 (2026-07-18 確定、C4 データ保持境界改訂により新設される tenant_data_objects テーブルおよび業務ナレッジ/実行入出力データの R2 テナント別封筒暗号化保存) は、本 feature の feature_context_digest (sha256:ed9bbe22a2887731c84470adb8e4f8df41fd7eec46efc58b4dc8e5095b5b5fd5) が拘束する goal-spec の quality_constraints/lineage のいずれにも含まれておらず、docs/backend-spec.md の qa_ref にも本 feature の grounding source として指定された qa-004/qa-017/qa-019/qa-020/qa-024/qa-032 に含まれない後発の確定事項であるため、本 baseline のスコープには含めない。この事実を上流未解決事項の第 2 項目として記録し、P02 で改めて「本 digest スコープ外」と確定させたうえで dev-graph への follow-up feature candidate として返す。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-domain-model-db, arch-harness-hub-data, arch-harness-hub-backend
- Entry gate: .dev-graph/staging/goal-spec.json の feature_context_digest が sha256:ed9bbe22a2887731c84470adb8e4f8df41fd7eec46efc58b4dc8e5095b5b5fd5 に一致し、features/feat-domain-model-db.md の confirmation_status が confirmed であること。evaluation_status は本 task package 生成時点で pending であり、system-dev-plan-evaluator による C12 PASS 判定と C11 promotion を経て解決する
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は要件文書化のみで frontend 実装物を変更しない (本 feature 自体 scope_out に UI を含む)
- Backend: N/A: 本 task は要件文書化のみで backend 実装物 (packages/db) を変更しない
- API: N/A: 本 feature は API endpoint を持たない (API 実装は各消費 feature の scope)。契約はリポジトリ層の関数シグネチャとして P02 で定義する
- Data: N/A: コアドメイン 18 テーブルのカラム定義詳細設計は P02 で行う。本 task は要件記述のみ
- Infrastructure: N/A: デプロイ単位・CI/CD は feat-hub-foundation が既に確立しており、本 feature は追加インフラを新設しない
- Security: applicable + change: tenant-workspace-scope-row-level-d4・ulid-pk-display-code-epoch-server-time-qa032・daily-export-quarterly-restore-drill-qa019・repository-layer-db-access-isolation-qa020 の 4 件のセキュリティ関連 quality_constraints を要件ベースラインへ確定記述する
- Quality: applicable + change: goal-spec acceptance 3 件と quality_constraints 9 件を machine-verifiable な受入基準として requirements-baseline.md に固定する。user-base-table-schema-owner-unresolved-p02 は P02 必須解消事項として明記する
- Documentation: applicable + change: docs/features/feat-domain-model-db/requirements-baseline.md を新規作成する
- Operations: N/A: 日次 export・四半期 restore drill・監査 chain 検証 cron 運用の具体化は P09/P12 で行う。本 task は要件確定のみ

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-data, arch-harness-hub-backend (features/feat-domain-model-db.md architecture_refs の正本参照。D2/D4/I3/G1/G4 と qa-004/qa-019/qa-020/qa-024/qa-032 を含む)
- Deploy unit/environment: cloudflare-workers/hub (packages/db は Hub Worker にバンドルされる共有パッケージ。本 task は要件確定のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は要件確定のみで実スキーマへの変更を伴わない (実変更は P05/P08 で扱う)

## 成果物

- Produced artifacts: docs/features/feat-domain-model-db/requirements-baseline.md (要件ベースライン文書。purpose/goal/scope_in 5 件/scope_out 2 件/acceptance 3 件/quality_constraints 9 件の確定転記、および User 基底テーブル owner 未解決事項と qa-045 digest スコープ外事項を P02 必須解消事項として明記した記載を含む)
- Consumed artifacts: .dev-graph/staging/goal-spec.json, features/feat-domain-model-db.md, features/feat-domain-model-db.context.json, system-spec/00-requirements-definition.md, system-spec/spec-state.json, docs/backend-spec.md, docs/security-spec.md, system-spec/database.md
- Write scope/touches: docs/features/feat-domain-model-db/requirements-baseline.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-domain-model-db-p01) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-domain-model-db-p01 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-domain-model-db-p01) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on が空のため他 task との着手順序制約はない。resource_scope (docs/features/feat-domain-model-db/requirements-baseline.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 検査 pipeline のビジネスロジック (owner=feat-publish-pipeline、goal-spec scope_out)
- UI (goal-spec scope_out)
- Studio 拡張テーブル (hearing_sheets/builds/feedbacks/documents/metrics_events/metrics_rollups/ai_jobs/tenant_coefficients/display_code_counters 等) のスキーマ実装 (各 Studio feature が自身の write_scope で実装)
- 認可ミドルウェア (owner=feat-auth-tenancy)
- User 基底テーブル owner の最終確定 (本 task は未解決事項の記録のみ。確定判断は P02 で行う)
- tenant_data_objects テーブル (qa-045) の設計・実装 (本 digest スコープ外。本 task は記録のみ)
- 実装コードの作成 (本 task は要件確定のみ)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: docs/features/feat-domain-model-db/requirements-baseline.md に goal-spec acceptance 3 件と quality_constraints 9 件 (sqlite-dialect-compat-d1-fallback-connection-layer-d2, release-immutable-atomic-stable-pointer-i3, tenant-workspace-scope-row-level-d4, ulid-pk-display-code-epoch-server-time-qa032, r2-content-addressed-package-registry-c4, daily-export-quarterly-restore-drill-qa019, single-migration-pipeline-drizzle-repository-package, repository-layer-db-access-isolation-qa020, user-base-table-schema-owner-unresolved-p02) が過不足なく転記されていること

## Rollout and rollback

- Rollout: requirements-baseline.md を作成し、feature-package.json の source_feature_digest と一致することを確認してから P02 へ引き継ぐ
- Rollback trigger and steps: goal-spec と features/feat-domain-model-db.md の内容不一致が判明した場合、requirements-baseline.md を作成前状態 (ファイル未作成) に戻し、goal-spec 側の再確定を dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/00-requirements-definition.md (D2, D4, I3, 紐づくゴール G1/G4), system-spec/spec-state.json qa_log (qa-004, qa-017, qa-019, qa-020, qa-024, qa-032)
- Detailed authoritative source: docs/backend-spec.md (§1 コード構造規約, §2.1 共通規約, §2.2 コアドメイン 18 テーブル定義, §7 cron 表, §8 非機能), docs/security-spec.md (§4.1 封筒暗号化, §4.3 IdP secret, §5.1 append-only, §5.4 hash chain), system-spec/database.md (qa-045。本 digest スコープ外の参考情報として)
- Architecture: arch-harness-hub-data (architecture/harness-hub-data.md), arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-domain-model-db
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: なし (P01 は本 package の起点 task)
