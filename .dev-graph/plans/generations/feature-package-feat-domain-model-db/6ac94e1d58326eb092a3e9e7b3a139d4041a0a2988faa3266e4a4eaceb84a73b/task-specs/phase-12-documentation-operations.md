# System task overlay: ドキュメント/運用 — 日次 export・四半期 restore drill・migration 適用・KEK/DEK ローテーション runbook

## Machine-readable registration fields

- feature_package_id: feature-package/feat-domain-model-db (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-domain-model-db", "macro-feature", "data", "documentation"]
- related_nodes: ["feat-domain-model-db", "arch-harness-hub-data", "arch-harness-hub-backend"]
- parent_feature: feat-domain-model-db
- phase_ref: P12
- classification: confidence=0.85, reason="日次 export・四半期 restore drill・migration 適用・KEK/DEK ローテーションの運用手順を runbook 化する P12 タスク", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-domain-model-db/sys-domain-model-db-p12.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

本 feature が owner の運用手順 (日次 export cron、四半期 restore drill、Studio 拡張 feature 向け migration 積み増し手順、encryption_keys の年次 DEK ローテーション/KEK ローテーション手順、audit_events hash chain の日次検証 cron) を runbook.md として整備し、P13 (リリース/デプロイ) での実運用開始に備える。

## 背景

qa-019 は日次 export + R2 保存と四半期 restore drill を要求し、docs/backend-spec.md §7 の cron 表にこれらのジョブが定義される。docs/security-spec.md §4.1 は encryption_keys の年次 DEK ローテーション (key_version 発行による無停止ローテーション) と KEK ローテーション (re-wrap のみ、DEK 自体は不変) の手順を、§5.4 は audit_events hash chain の日次検証 cron (改ざん検知時のアラート) を定める。本 task はこれらの運用コマンド・手順・ロールバック条件を runbook.md にまとめ、日次 export 出力において salary 列が暗号化状態を維持することを運用手順レベルで再確認する。あわせて、P08 で確立した単一 migration 系統に対して Studio 拡張 feature が安全に migration を積み増すための手順 (drizzle-kit generate の実行順序、コンフリクト時の対処) を明記する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-domain-model-db, arch-harness-hub-data, arch-harness-hub-backend
- Entry gate: goal-spec.json の feature_context_digest が sha256:68f274de9cd604964c4499897cc3bf2efc88d09bdaf730db7640c5f09c9caffc に一致し、confirmation_status=confirmed であること。P11 の docs/features/feat-domain-model-db/evidence-summary.md が存在すること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: N/A: 本 feature は UI を持たない
- Backend: applicable + change: 日次 export・restore drill・KEK/DEK ローテーションを実行するスクリプト/cron ハンドラを整備する
- API: N/A: 本 feature は HTTP API endpoint を持たない
- Data: applicable + change: restore drill の対象範囲 (18 テーブル) を明記する
- Infrastructure: applicable + change: cron ジョブ定義 (日次 export、日次 audit chain 検証) を整備する
- Security: applicable + change: KEK/DEK ローテーション手順と salary マスク維持の運用確認手順を整備する
- Quality: N/A: 本 task は運用手順の整備が中心であり新たな品質判定は行わない (P10 で判定済み)
- Documentation: applicable + change: docs/features/feat-domain-model-db/runbook.md を新規作成する
- Operations: applicable + change: 日次 export・四半期 restore drill・migration 積み増し・KEK/DEK ローテーションの運用手順を確定する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-data, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub (cron トリガーは Hub Worker の Scheduled Handler 経由)
- Compatibility/migration/backfill: N/A: 本 task は運用手順の整備のみで新規 migration は生成しない

## 成果物

- Produced artifacts: docs/features/feat-domain-model-db/runbook.md (日次 export 手順、四半期 restore drill 手順、migration 積み増し手順、KEK/DEK ローテーション手順、audit chain 日次検証手順、salary マスク確認手順を含む), packages/db/cron/export-daily.ts, packages/db/cron/verify-audit-chain.ts のインタフェーススタブ (cron ハンドラの型シグネチャのみ。実装本体は既存の feat-hub-foundation cron 基盤に接続する形で今後拡張)
- Consumed artifacts: docs/features/feat-domain-model-db/evidence-summary.md, docs/backend-spec.md §7, docs/security-spec.md §4.1, §5.4
- Write scope/touches: docs/features/feat-domain-model-db/runbook.md, packages/db/cron/

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-domain-model-db-p12) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-domain-model-db-p12 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-domain-model-db-p12) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-DOMAIN-MODEL-DB-P11]。resource_scope (docs/features/feat-domain-model-db/runbook.md, packages/db/cron/) は他 task と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- cron 基盤自体の新設 (feat-hub-foundation が既に確立済みの Scheduled Handler 基盤を利用する)
- Studio 拡張 feature 独自の運用手順 (各 feature 自身の P12 が担当)
- tenant_data_objects (qa-045) の restore drill 拡張項目 (本 digest スコープ外)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: docs/features/feat-domain-model-db/runbook.md に日次 export・四半期 restore drill・migration 積み増し・KEK/DEK ローテーション・audit chain 検証の 5 手順全てが記載されていること

## Rollout and rollback

- Rollout: runbook.md を作成し、cron インタフェーススタブが既存の feat-hub-foundation cron 基盤の型契約と整合することを確認してから P13 (リリース/デプロイ) へ引き継ぐ
- Rollback trigger and steps: 運用手順が既存 cron 基盤と非互換と判明した場合、cron インタフェーススタブを修正し本 task を再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-domain-model-db.context.json` (`sha256:68f274de9cd604964c4499897cc3bf2efc88d09bdaf730db7640c5f09c9caffc`)
- Phase responsibility: 検証済み実装の運用・runbook・handover を文書化し、先行 phase の前提にしない。
- Purpose: Tenant→Workspace→Project→TargetChannel→Release(immutable) のドメインモデルを Drizzle スキーマとして確立し、D1 退避経路 (D2 ヘッジ) を保つ接続層を構築する
- Goal: 全エンティティの CRUD が接続層越しに動作し、R2 immutable PackageRegistry と日次 export が稼働する状態
- Scope in (all items are in-scope for the package; this phase owns the subset matching its responsibility):
- Drizzle スキーマ (SQLite 方言互換)
- 接続層の隔離 (libSQL/D1 両対応)
- R2 content-addressed registry
- 日次 export + restore drill 手順
- マイグレーション運用
- Scope out:
- 検査 pipeline のビジネスロジック
- UI
- Acceptance (P04/P06/P07/P10/P11 must preserve exact coverage):
- スキーマが SQLite 方言互換で D1 接続テストが通る
- Release が immutable として強制される
- バックアップ export と復元手順が検証済み
- Architecture/source refs:
- architecture/harness-hub-data.md
- architecture/harness-hub-backend.md
- architecture/harness-hub-infrastructure.md
- specs/harness-hub-system-specification.md

This section is the current source closure and supersedes older counts or wording in this task when they conflict with the pinned feature context.

## Current phase closure

- Required responsibility: P05-P11で実行済みの export/restore command と evidence を runbook 化する。未実装処理を文書で代替しない。
- Dependency rule: this phase consumes only earlier P01..P11 outputs; later phase documentation or evidence is never an entry prerequisite.

## Normative implementation closure (2026-07-19)

This section is normative for P12 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-domain-model-db.context.json; docs/backend-spec.md §2; docs/infrastructure-spec.md backup/restore; docs/security-spec.md §3.6/§4/§5
- Effective phase contract: 現行 quality_constraints は10件である。P05 は schema/repository/R2 registry に加え、日次 control-plane export job、暗号化/マスク保持、検証可能な restore command/library をコード成果物として実装する。P06 はP05実装をschema test harnessと2テナントfixtureで検証し、まだ生成されていないP08 migration artifactを前提にしない。P08 は単一 migration lineageを生成して2テナントfixtureへ適用する。P09 はmigration apply、tenant isolation、export artifact integrity、別DB restore round-tripを実行するCI gateを .github/workflows/ci.yml へ接続する。P05/P06/P09は後続P12 runbookへ逆依存しない。P10は10 constraint IDをexact-setで判定する。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `packages/db/backup/`
- `packages/db/scripts/export-control-plane.ts`
- `packages/db/scripts/restore-control-plane.ts`
- `packages/db/__tests__/fixtures/two-tenants.ts`
- `packages/db/__tests__/backup-restore.test.ts`
- `.github/workflows/ci.yml`
- Mandatory evidence: P05実装パス、P08 migration apply、2-tenant fixture、export→別DB restore round-trip、salary暗号化/マスク断面、単一lineage検査を証跡化する。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: system-spec/00-requirements-definition.md (D2, D4, I3, G1, G4), system-spec/spec-state.json qa_log (qa-004, qa-017, qa-019, qa-020, qa-024, qa-032)
- Detailed authoritative source: docs/backend-spec.md §7 (cron 表), docs/security-spec.md §4.1 (KEK/DEK ローテーション), §5.4 (hash chain 検証 cron), §8.5 (運用監視)
- Architecture: arch-harness-hub-data, arch-harness-hub-backend
- Feature: feat-domain-model-db
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-DOMAIN-MODEL-DB-P11
