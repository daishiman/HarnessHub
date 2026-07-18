# System task overlay: リリース/デプロイ — 本番 Turso/D1・R2 registry 反映とスモークテスト

## Machine-readable registration fields

- feature_package_id: feature-package/feat-domain-model-db (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-domain-model-db", "macro-feature", "data", "release-deploy"]
- related_nodes: ["feat-domain-model-db", "arch-harness-hub-data", "arch-harness-hub-backend"]
- parent_feature: feat-domain-model-db
- phase_ref: P13
- classification: confidence=0.87, reason="初回ベースライン migration を本番 Turso へ適用し R2 registry を有効化してスモークテストを行う P13 タスク (required-node)", candidates=[{artifact_kind: task, confidence: 0.87, candidate_path: tasks/feat-domain-model-db/sys-domain-model-db-p13.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P08 で生成した初回ベースライン migration を本番 Turso インスタンス (および D1 hedge 環境) に適用し、R2 content-addressed registry のバケット/prefix 設定を有効化したうえで、DB 接続・R2 registry・audit_events append・日次 export cron の初回起動を含むスモークテストを実施し release-record.md として記録する。

## 背景

本 feature は control-plane DB の初回スキーマ確立者であるため、本番適用は既存データへの影響を持たない新規作成である。デプロイ手順は (1) 本番 Turso インスタンスへの migration 適用、(2) D1 hedge 環境 (フォールバック用、通常時は待機) への同一 migration 適用によるスキーマ同期確認、(3) R2 バケットの PackageRegistry 用 prefix 設定確認、(4) スモークテスト (DB 接続確認、ULID PK 発行確認、releases immutable 制約の本番環境での再確認、R2 registry put/get ラウンドトリップ、audit_events への初回 append と hash chain 検証、日次 export cron の dry-run 実行) の順で実施する。qa-019 の四半期 restore drill は本番運用開始後の四半期サイクルで初回実施されるため、本 task では restore drill 自体の実行ではなく「実行可能であること」の確認 (runbook.md の手順どおりに dry-run が成功すること) までを範囲とする。デプロイ失敗時のロールバックは、migration 適用前の状態 (テーブル未作成) への復帰が可能であることを事前確認したうえで実施する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-domain-model-db, arch-harness-hub-data, arch-harness-hub-backend
- Entry gate: .dev-graph/staging/goal-spec.json の feature_context_digest が sha256:ed9bbe22a2887731c84470adb8e4f8df41fd7eec46efc58b4dc8e5095b5b5fd5 に一致し、confirmation_status=confirmed であること。P12 の docs/features/feat-domain-model-db/runbook.md が存在すること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: N/A: 本 feature は UI を持たない
- Backend: applicable + change: 本番環境への migration 適用とスモークテストを実施する
- API: N/A: 本 feature は HTTP API endpoint を持たない
- Data: applicable + change: 本番 Turso/D1 へのスキーマ反映を実施する
- Infrastructure: applicable + change: R2 registry バケット/prefix 設定を有効化する
- Security: applicable + change: 本番環境での releases immutable 制約・audit hash chain の動作確認を行う
- Quality: applicable + change: スモークテスト結果を release-record.md に記録する
- Documentation: applicable + change: docs/features/feat-domain-model-db/release-record.md を新規作成する
- Operations: applicable + change: 日次 export cron の初回 dry-run を実施する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-data, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub (本番 Turso インスタンス、D1 hedge 環境、R2 バケットを対象とする)
- Compatibility/migration/backfill: 既存データなし。本番環境における初回スキーマ確立であり、後方互換性・backfill は N/A。ロールバック手段としてテーブル未作成状態への復帰が可能であることを事前確認する

## 成果物

- Produced artifacts: docs/features/feat-domain-model-db/release-record.md (migration 適用結果、R2 registry 有効化結果、スモークテスト結果、四半期 restore drill 実行可能性確認結果を含む)
- Consumed artifacts: docs/features/feat-domain-model-db/runbook.md, docs/features/feat-domain-model-db/evidence-summary.md, packages/db/migrations/
- Write scope/touches: docs/features/feat-domain-model-db/release-record.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-domain-model-db-p13) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-domain-model-db-p13 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-domain-model-db-p13) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-DOMAIN-MODEL-DB-P12]。resource_scope (docs/features/feat-domain-model-db/release-record.md) は他 task と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- 四半期 restore drill の本実施 (本番運用開始後の四半期サイクルで実施。本 task は実行可能性確認のみ)
- Studio 拡張 feature 自身のリリース (各 feature 自身の P13 が担当。本 feature のリリースは Studio 拡張 feature の migration 積み増しの前提条件となる)
- tenant_data_objects (qa-045) のリリース (本 digest スコープ外)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: docs/features/feat-domain-model-db/release-record.md に migration 適用成功、R2 registry 有効化成功、スモークテスト全項目 pass (DB 接続、ULID PK 発行、releases immutable、R2 put/get、audit hash chain、export cron dry-run) が記録されていること

## Rollout and rollback

- Rollout: release-record.md で全スモークテスト pass を確認し、本 feature のリリース完了を確定する
- Rollback trigger and steps: migration 適用またはスモークテストのいずれかが失敗した場合、適用済み migration をロールバックしテーブル未作成状態へ復帰したうえで、P08 または P05 へ差し戻し是正する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/00-requirements-definition.md (D2, D4, I3, G1, G4), system-spec/spec-state.json qa_log (qa-004, qa-017, qa-019, qa-020, qa-024, qa-032)
- Detailed authoritative source: docs/features/feat-domain-model-db/runbook.md, docs/backend-spec.md §7 (cron 表), §8 (非機能)
- Architecture: arch-harness-hub-data, arch-harness-hub-backend
- Feature: feat-domain-model-db
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-DOMAIN-MODEL-DB-P12
