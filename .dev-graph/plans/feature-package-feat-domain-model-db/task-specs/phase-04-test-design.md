# System task overlay: テストファースト設計 — D1 互換性・release immutable・tenant 分離・R2 registry・backup/restore

## Machine-readable registration fields

- feature_package_id: feature-package/feat-domain-model-db (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-domain-model-db", "macro-feature", "data", "test-design"]
- related_nodes: ["feat-domain-model-db", "arch-harness-hub-data", "arch-harness-hub-backend"]
- parent_feature: feat-domain-model-db
- phase_ref: P04
- classification: confidence=0.87, reason="goal-spec の acceptance 3 件・quality_constraints 9 件を検証可能なテストケースへ写像するテストファースト設計 P04 タスク", candidates=[{artifact_kind: task, confidence: 0.87, candidate_path: tasks/feat-domain-model-db/sys-domain-model-db-p04.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P02/P03 で確定したアーキテクチャに基づき、実装 (P05) に先立ってテストケースを設計する。goal-spec の acceptance 3 件と quality_constraints 9 件のすべてを自動化可能なテストケースへ写像し、test-design.md として記録する。

## 背景

quality_constraints からテストケースを以下のとおり導出する。(1) sqlite-dialect-compat-d1-fallback-connection-layer-d2: 同一スキーマ定義に対する libSQL 接続と D1 接続の双方で CRUD が成功することを確認する互換性テスト。(2) release-immutable-atomic-stable-pointer-i3: releases の status 以外への UPDATE がリポジトリ層で拒否されること、version が content_hash から自動採番されること、target_channels.stable_release_id の切替が単一トランザクションで atomic に行われることを確認するテスト。(3) tenant-workspace-scope-row-level-d4: tenant_id/workspace_id を持つ全テーブルについて、異なる tenant のリクエストコンテキストから他 tenant の行が取得できないことを確認する分離テスト (CI 必須ゲート、docs/security-spec.md §8.4 と同一パターン)。(4) ulid-pk-display-code-epoch-server-time-qa032: 生成される PK が ULID 形式であること、created_at 等の時刻列がサーバ側で INTEGER epoch ms として付与されクライアント指定値が無視されることを確認するテスト。(5) r2-content-addressed-package-registry-c4: 同一内容の putPackage が同一 content_hash/r2_key を返すこと (冪等性)、既存 content_hash への再書き込みが拒否されること (immutable) を確認するテスト。(6) daily-export-quarterly-restore-drill-qa019: 日次 export ジョブが salary 列を暗号化状態のままマスクして出力すること、四半期 restore drill の dry-run が成功することを確認するテスト。(7) single-migration-pipeline-drizzle-repository-package: drizzle.config.ts の migration 出力先が単一であること、Studio 拡張 feature のスキーマファイルが barrel 経由で同一 migration lineage に統合されることを確認する CI 検査。(8) repository-layer-db-access-isolation-qa020: packages/db 以外のディレクトリから DB クライアントへの直接 import が存在しないことを確認する CI grep 検査、および TenantCtx を経由しないリポジトリ関数呼び出しがコンパイルエラーになることを確認する型テスト。(9) user-base-table-schema-owner-unresolved-p02: P02 の architecture decision (feat-domain-model-db が department/salary 列を含む users テーブル全体の owner) に基づき、(a) users スキーマ定義が docs/backend-spec.md §2.2 の列定義 (department/salary 含む) と完全一致することを確認するスキーマ一致テスト、(b) packages/db/schema/core/ 配下に本 feature 以外の feature からの書き込みが存在しないことを確認する write_scope 分離の静的検査 (CI grep 検査)、の 2 テストを設計する。加えて、docs/security-spec.md §5.4/T6 に準じ audit_events の hash chain 検証テスト (改ざん検知)、および encryption_keys を用いた列暗号化の暗号化/復号ラウンドトリップテストを追加する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-domain-model-db, arch-harness-hub-data, arch-harness-hub-backend
- Entry gate: .dev-graph/staging/goal-spec.json の feature_context_digest が sha256:ed9bbe22a2887731c84470adb8e4f8df41fd7eec46efc58b4dc8e5095b5b5fd5 に一致し、confirmation_status=confirmed であること。P03 の docs/features/feat-domain-model-db/design-review-notes.md が承認判定を含むこと
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: N/A: 本 feature は UI を持たない
- Backend: applicable + change: packages/db のリポジトリ層・接続層に対するテストケースを設計する
- API: N/A: 本 feature は HTTP API endpoint を持たない
- Data: applicable + change: スキーマ制約・分離テスト・migration 互換性テストを設計する
- Infrastructure: N/A: 新規インフラ変更なし
- Security: applicable + change: hash chain 検証・列暗号化ラウンドトリップ・tenant 分離のテストケースを設計する
- Quality: applicable + change: goal-spec acceptance 3 件と quality_constraints 9 件の全件をテストケースへ写像する
- Documentation: applicable + change: docs/features/feat-domain-model-db/test-design.md を新規作成する
- Operations: N/A: 運用手順は本 task の対象外

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-data, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: N/A: 本 task はテスト設計のみで実装・migration 生成を伴わない

## 成果物

- Produced artifacts: docs/features/feat-domain-model-db/test-design.md (quality_constraints 9 件 + acceptance 3 件をテストケースへ写像した一覧、テスト種別 [単体/結合/CI ゲート] とテストダブル方針を含む)
- Consumed artifacts: docs/features/feat-domain-model-db/architecture-decision-record.md, docs/features/feat-domain-model-db/design-review-notes.md, docs/security-spec.md §8
- Write scope/touches: docs/features/feat-domain-model-db/test-design.md, packages/db/__tests__/ (テストファイルの雛形配置。実装内容は含めず構造のみ)

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-domain-model-db-p04) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-domain-model-db-p04 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-domain-model-db-p04) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-DOMAIN-MODEL-DB-P03]。resource_scope (docs/features/feat-domain-model-db/test-design.md, packages/db/__tests__/) は他 task と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- テストの実装コード自体 (テストダブルやアサーションの記述は P05/P06 で行う。本 task はテストケース一覧と雛形配置のみ)
- Studio 拡張 feature 独自のテストケース設計 (各 feature 自身の P04 が担当)
- tenant_data_objects (qa-045) 関連テストの設計 (本 digest スコープ外)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: docs/features/feat-domain-model-db/test-design.md に quality_constraints 9 件 + acceptance 3 件それぞれに対応するテストケースが最低 1 件ずつ記載されていること

## Rollout and rollback

- Rollout: test-design.md を作成し、全 quality_constraints/acceptance のカバレッジを確認してから P05 (実装) へ引き継ぐ
- Rollback trigger and steps: quality_constraints のいずれかがテストケースへ写像できないと判明した場合、P02/P03 への差し戻しを記録し設計を見直す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/00-requirements-definition.md (D2, D4, I3, G1, G4), system-spec/spec-state.json qa_log (qa-004, qa-017, qa-019, qa-020, qa-024, qa-032)
- Detailed authoritative source: docs/security-spec.md §8 (検証: ASVS 目標, CI 静的検査 CI-1..CI-9, 単体/結合テスト T-1..T-12, テナント分離テスト §8.4)
- Architecture: arch-harness-hub-data, arch-harness-hub-backend
- Feature: feat-domain-model-db
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-DOMAIN-MODEL-DB-P03
