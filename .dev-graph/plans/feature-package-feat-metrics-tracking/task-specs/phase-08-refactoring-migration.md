# System task overlay: リファクタリング/マイグレーション — metrics_events/metrics_rollups テーブルマイグレーション生成と後方互換性確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-metrics-tracking (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-metrics-tracking", "studio-extension", "metrics-tracking", "refactoring-migration"]
- related_nodes: ["feat-metrics-tracking", "arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-frontend"]
- parent_feature: feat-metrics-tracking
- phase_ref: P08
- classification: confidence=0.83, reason="P05 で実装した metrics_events/metrics_rollups スキーマに対する DB マイグレーション生成と、実装確定後の重複コード整理を行う P08 リファクタリング/マイグレーションタスク (required-node、N/A 許容)", candidates=[{artifact_kind: task, confidence: 0.83, candidate_path: tasks/feat-metrics-tracking/sys-metrics-tracking-p08.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P05 で実装した metrics_events/metrics_rollups の Drizzle スキーマに対する DB マイグレーションファイルを生成し、既存スキーマとの後方互換性 (新規テーブル追加のみで既存テーブルへの破壊的変更がないこと) を確認する。あわせて P07 受入完了後に判明した重複コードや設計との軽微な乖離があれば整理する。

## 背景

metrics_events/metrics_rollups は新規テーブルであり backfill 対象データは存在しないため、本 task のマイグレーションは CREATE TABLE 相当の追加のみで完結する。tenant_coefficients は feat-user-org-admin 側の既存テーブルを読取 consume するのみのため、本 task ではマイグレーション対象に含めない。リファクタリング対象としては、P05 実装時に ingest/summary/rollups ハンドラ間で共通化できるバリデーションロジックや、試算エンジン呼び出し箇所の重複がないかを確認する。既存の feat-domain-model-db が管理する共通スキーマファイル (共有 CI 対象) には触れず、`packages/db/schema/metrics-tracking/` 配下に閉じたマイグレーション生成のみを行う。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-metrics-tracking, arch-harness-hub-data
- Entry gate: P07 の acceptance-record.md で goal-spec acceptance 3 件が pass 済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: N/A: 本 task は DB マイグレーションとコード整理が中心であり frontend 実装物への変更を伴わない
- Backend: applicable + change: ingest/summary/rollups ハンドラ間の重複ロジック整理を行う (該当箇所がある場合のみ)
- API: N/A: API 契約自体は P02 で確定済みで本 task では変更しない
- Data: applicable + change: metrics_events/metrics_rollups の DB マイグレーションファイルを生成する
- Infrastructure: N/A: 既存デプロイ単位内でのマイグレーション適用のみで追加インフラを新設しない
- Security: N/A: 本 task はマイグレーション生成とコード整理のみでセキュリティ設計自体は変更しない
- Quality: applicable + change: マイグレーション適用後も P06 のテストが green を維持することを確認する
- Documentation: applicable + change: docs/features/feat-metrics-tracking/refactoring-migration-note.md を新規作成する
- Operations: N/A: マイグレーション適用の運用手順化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-data (metrics_events/metrics_rollups のマイグレーション生成は P02 で確定したスキーマ設計に従う。既存 architecture doc は書き換えない)
- Deploy unit/environment: cloudflare-workers/hub (Turso/libSQL へのマイグレーション適用)
- Compatibility/migration/backfill: metrics_events/metrics_rollups は新規テーブル追加のみで既存テーブルへの破壊的変更なし。backfill 対象データなし

## 成果物

- Produced artifacts: docs/features/feat-metrics-tracking/refactoring-migration-note.md (マイグレーション内容と後方互換性確認結果), packages/db/schema/metrics-tracking/ 配下のマイグレーションファイル
- Consumed artifacts: docs/features/feat-metrics-tracking/acceptance-record.md, packages/db/schema/metrics-tracking/
- Write scope/touches: docs/features/feat-metrics-tracking/refactoring-migration-note.md, packages/db/schema/metrics-tracking/

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-metrics-tracking-p08) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-metrics-tracking-p08 として払い出す
- Worktree lease: graph_node_id (sys-metrics-tracking-p08) の worktree lease を claim し heartbeat 送出、完了時 release
- Parallel safety: depends_on=[sys-metrics-tracking-p07]。P07 完了後に着手する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 共有スキーマファイル (feat-domain-model-db 管轄) への変更
- tenant_coefficients テーブルのマイグレーション (owner=feat-user-org-admin)
- 新規機能の追加 (本 task はマイグレーション生成と軽微な整理のみ)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: docs/features/feat-metrics-tracking/refactoring-migration-note.md にマイグレーション内容と後方互換性確認結果 (既存テーブルへの破壊的変更なし) が記載されていること

## Rollout and rollback

- Rollout: マイグレーションファイルを生成し P06 のテストが green を維持することを確認後 P09 の品質保証へ引き継ぐ
- Rollback trigger and steps: マイグレーション適用後に既存テーブルとの非互換が判明した場合、生成したマイグレーションファイルを取り下げ P05 のスキーマ実装へ差し戻す

## Handoff

- Executor: system build route
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/00-requirements-definition.md (D4), system-spec/spec-state.json qa_log (qa-024)
- Detailed authoritative source: docs/backend-spec.md (§2.3)
- Architecture: arch-harness-hub-data
- Feature: feat-metrics-tracking
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-metrics-tracking-p07
