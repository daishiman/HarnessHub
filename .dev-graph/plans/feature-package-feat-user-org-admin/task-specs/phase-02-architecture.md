# System task overlay: アーキテクチャ設計 — User拡張/TenantCoefficient スキーマ・PII ガード/通知ディスパッチ接続点の設計

## Machine-readable registration fields

- feature_package_id: feature-package/feat-user-org-admin (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-user-org-admin", "studio-extension", "security", "architecture"]
- related_nodes: ["feat-user-org-admin", "arch-harness-hub-security", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
- parent_feature: feat-user-org-admin
- phase_ref: P02
- classification: confidence=0.9, reason="qa-024 の指示 (カラム定義の詳細設計は各 feature の P02 で行う) に従い TenantCoefficient/User 拡張のスキーマと共通層接続点を確定する P02 タスク", candidates=[{artifact_kind: task, confidence: 0.9, candidate_path: tasks/feat-user-org-admin/sys-user-org-admin-p02.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

S17/S18 の画面構成・API 契約・User 拡張 (department/salary) と TenantCoefficient エンティティのカラム設計・PII ガード共通層と通知ディスパッチ共通層への接続点を確定し、P05 実装が迷いなく着手できる設計成果物を作る。

## 背景

qa-024 は『カラム定義の詳細設計は各 feature の P02 で行う』と定めており、TenantCoefficient (annualHours・分/回・削減率) と User 拡張 (department・salary) のカラム設計は本 task の責務である。全新規テーブルは tenant_id/workspace_id スコープ列を 必須とする (D4)。salary は PII 列として admin 限定読取・一般 API 非公開・export マスクで扱う (qa-025 SEC4)。docs/shared-layers.md §2 は PII ガード (SEC4) と通知ディスパッチ (B8) を共通層として feat-hub-foundation が実装 owner になると定めており、本 feature はこれらを『使う』設計に徹し、共通層そのものを再発明しない。同 §1 は KPI カード/チャート共通 UI 部品の消費 feature に user-org-admin を明記しており、S17 の個別ダッシュボードはこの共通部品を利用する設計とする。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-user-org-admin, sys-user-org-admin-p01
- Entry gate: docs/features/feat-user-org-admin/requirements-baseline.md が P01 で作成済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: applicable + change: S17 (ユーザー管理 + 個別ダッシュボード)・S18 (アカウント設定) の画面構成と、共通 UI (KPI カード/チャート、フォーム部品、状態チップ) の再利用方針を確定する (docs/shared-layers.md §1)
- Backend: applicable + change: S17/S18 の API ハンドラ構成 (role 認可・PII ガード・通知ディスパッチ呼び出し・監査 event 記録) を確定する
- API: applicable + change: zod schemas 単一ソース (packages/schemas/) 配下に user-org-admin 専用の入出力契約を追加する設計を確定する (qa-009 準拠)
- Data: applicable + change: TenantCoefficient (annualHours・分/回・削減率) と User 拡張 (department・salary) のカラム設計、tenant_id/workspace_id スコープ列必須化 (D4) を確定する (qa-024)
- Infrastructure: N/A: デプロイ単位・CI/CD は feat-hub-foundation が既に確立しており、本 feature は追加インフラを新設しない
- Security: applicable + change: salary の admin 限定表示・一般 API 非公開・export マスク・読取監査 (SEC4) と、role 4 種 (qa-005) に基づく新規 API 群の認可設計 (SEC2) を確定する
- Quality: applicable + change: S17/S18 の axe a11y 検査対象範囲と CI 品質ゲートへの組込み方針を確定する
- Documentation: applicable + change: docs/features/feat-user-org-admin/architecture-decision-record.md を新規作成する
- Operations: N/A: 運用手順の具体化は P12 で行う。本 task は設計確定のみ

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-security, arch-harness-hub-backend, arch-harness-hub-frontend
- Deploy unit/environment: cloudflare-workers/hub (feat-hub-foundation が確立した既存 Worker 上に S17/S18 を追加する。本 task は設計確定のみでデプロイは行わない)
- Compatibility/migration/backfill: User テーブルへの department/salary 列追加は既存行に対する後方互換な列追加 (nullable もしくは既定値付き) として設計し、既存データを破壊しない。TenantCoefficient は新規テーブルであり移行対象データは存在しない。列追加・新規テーブルの migration 適用手順は P08 で扱う

## 成果物

- Produced artifacts: docs/features/feat-user-org-admin/architecture-decision-record.md (S17/S18 画面構成、API 契約方針、TenantCoefficient/User 拡張カラム設計、PII ガード/通知ディスパッチ接続点の設計記録)
- Consumed artifacts: docs/features/feat-user-org-admin/requirements-baseline.md, system-spec/database.md, system-spec/security.md, docs/shared-layers.md, docs/screen-inventory.md, architecture/harness-hub-security.md, architecture/harness-hub-backend.md, architecture/harness-hub-frontend.md
- Write scope/touches: docs/features/feat-user-org-admin/architecture-decision-record.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-user-org-admin-p02) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-user-org-admin-p02 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-user-org-admin-p02) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[sys-user-org-admin-p01] が完了するまで着手しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- PII ガード共通層・通知ディスパッチ共通層・検査 pipeline 自体の再設計 (feat-hub-foundation が実装 owner。docs/shared-layers.md §5)
- Auth.js アダプタ・認可ミドルウェア自体の設計変更 (feat-auth-tenancy の scope)
- Tenant/Workspace/Project/TargetChannel/Release 等の既存中核エンティティのスキーマ変更 (feat-domain-model-db の scope)
- 試算エンジン (annualHours・分/回・削減率を用いた実際の削減時間/削減額計算) の設計 (feat-metrics-tracking の scope。本 feature は係数の保存・管理のみを担う)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: docs/features/feat-user-org-admin/architecture-decision-record.md に TenantCoefficient/User 拡張のカラム一覧、PII ガード適用列 (salary) の明記、通知ディスパッチ共通層の呼び出しインタフェース、S17/S18 の画面構成表が記載されている

## Rollout and rollback

- Rollout: architecture-decision-record.md を作成し、P03 の独立設計レビューへ引き継ぐ
- Rollback trigger and steps: P03 レビューで設計案が却下された場合、architecture-decision-record.md へ却下理由を追記し、本 task を再実行して代替設計を再評価する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/database.md (qa-024), system-spec/security.md (qa-025 SEC2/SEC4), system-spec/backend.md (qa-023 B8/B10), docs/shared-layers.md §1/§2
- Architecture: arch-harness-hub-security (architecture/harness-hub-security.md), arch-harness-hub-backend (architecture/harness-hub-backend.md), arch-harness-hub-frontend (architecture/harness-hub-frontend.md)
- Feature: feat-user-org-admin
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-user-org-admin-p01
