# System task overlay: リファクタリング/マイグレーション — Build テーブルマイグレーション生成と後方互換性確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-build-pipeline-board (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-build-pipeline-board", "studio-extension", "build-pipeline-board", "migration"]
- related_nodes: ["feat-build-pipeline-board", "arch-harness-hub-frontend", "arch-harness-hub-backend"]
- parent_feature: feat-build-pipeline-board
- phase_ref: P08
- classification: confidence=0.85, reason="P05 で追加した Build/build_stage_events スキーマ定義から migration ファイルを生成し既存スキーマ (publish_requests 含む) への後方互換性を確認する P08 タスク", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-build-pipeline-board/sys-build-pipeline-board-p08.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P05 で packages/db/schema/build-pipeline/ に追加した Build/build_stage_events テーブル定義から migration ファイルを生成し、既存スキーマ (特に publish_request_id が参照する既存 publish_requests テーブル) への後方互換性 (破壊的変更がないこと) を確認する。

## 背景

feature-execution-package-contract.md §3 は P08 を「リファクタリング/マイグレーション」と定め、実装対象に該当がなくても常に存在させる契約になっている。本 feature では Build/build_stage_events は新規エンティティであり既存テーブルの変更を伴わないが、tenant_id/workspace_id スコープ列 (D4) を含む migration ファイルの生成と、publish_request_id 列が既存 publish_requests テーブルへの外部キー参照として整合すること (B4、二重実装しない接続方式) の確認は必須の作業として本 task に属する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-build-pipeline-board, arch-harness-hub-backend
- Entry gate: sys-build-pipeline-board-p07 の acceptance-report.md で acceptance 3 項目が全件 pass していること。かつ goal-spec.json の feature_context_digest が sha256:eeed295d50359e11ac8aee84800def3ad3399cee866ab5b4dc2712116c9a4441 に一致し、features/feat-build-pipeline-board.md の confirmation_status が confirmed であること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task はデータスキーマのマイグレーションのみで frontend 実装物を変更しない
- Backend: N/A: 本 task はデータスキーマのマイグレーションのみで backend ハンドラ実装を変更しない
- API: N/A: 本 task は API 契約を変更しない
- Data: applicable + migration: Build/build_stage_events テーブルの migration ファイルを生成し、既存テーブル (publish_requests 含む) への後方互換性 (破壊的変更なし) を確認する
- Infrastructure: N/A: 本 feature は追加インフラを新設しない
- Security: applicable + change: migration ファイルに tenant_id/workspace_id スコープ列 (D4) が含まれることを確認する
- Quality: applicable + change: refactoring-migration-note.md に migration 適用結果と後方互換性確認結果を記録する
- Documentation: applicable + change: docs/features/feat-build-pipeline-board/refactoring-migration-note.md を新規作成する
- Operations: N/A: 運用手順の文書化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub (本 task は migration ファイル生成・検証のみで本番適用は P13 で行う)
- Compatibility/migration/backfill: Build/build_stage_events は新規エンティティであり既存テーブルへの破壊的変更を伴わない。publish_request_id は既存 publish_requests テーブルへの新規外部キー参照であり、既存テーブル側の変更は不要。backfill は不要 (新規テーブルのため既存データが存在しない)

## 成果物

- Produced artifacts: docs/features/feat-build-pipeline-board/refactoring-migration-note.md (migration 適用結果と後方互換性確認結果), packages/db/schema/build-pipeline/ 配下の migration ファイル
- Consumed artifacts: packages/db/schema/build-pipeline/, docs/features/feat-build-pipeline-board/architecture-decision-record.md
- Write scope/touches: docs/features/feat-build-pipeline-board/refactoring-migration-note.md, packages/db/schema/build-pipeline/

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-build-pipeline-board-p08) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-build-pipeline-board-p08 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-build-pipeline-board-p08) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: sys-build-pipeline-board-p07 完了後に着手する。write_scope (packages/db/schema/build-pipeline/) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 既存テーブル (build-pipeline 以外、特に publish_requests 本体) のスキーマ変更
- 本番環境への migration 適用 (P13 のリリース task で扱う)

## Verification and evidence

- Automated commands: `pnpm --filter db migrate:generate`, `pnpm --filter db migrate:check`, `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: refactoring-migration-note.md に migration ファイル生成結果と後方互換性確認 (破壊的変更なし) の記録があること

## Rollout and rollback

- Rollout: migration ファイルを packages/db/schema/build-pipeline/ に生成し、refactoring-migration-note.md に結果を記録してから P09 品質保証へ引き継ぐ
- Rollback trigger and steps: 後方互換性違反が検出された場合、migration ファイルを破棄し、原因スキーマ定義を sys-build-pipeline-board-p05 の write_scope 内で修正してから本 task を再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-build-pipeline-board.context.json` (`sha256:eeed295d50359e11ac8aee84800def3ad3399cee866ab5b4dc2712116c9a4441`)
- Phase responsibility: migration・互換性・refactor の適用要否を実行し、N/A でも根拠を残す。
- Purpose: ヒアリング→要件定義→設計→構築→テスト→レビュー→公開の 7 工程を S13 のボードで進行管理し (工程操作は admin)、公開工程を既存 PublishRequest 状態機械 (B4/I2/I3) へ接続する
- Goal: 各ハーネスの構築進捗が 7 工程ボードで可視化され、工程操作が admin 限定 + 監査記録付きで行え、公開工程が publish パイプラインと二重実装なしに連動する状態
- Scope in (all items are in-scope for the package; this phase owns the subset matching its responsibility):
- Build エンティティ (7 stage・リスク表示)
- S13 パイプラインボード (ステージボード共通部品の消費)
- 工程操作の admin 権限 + 監査 event (SEC6)
- 公開工程の PublishRequest 接続 (B4)
- Scope out:
- publish 状態機械の再実装 (既存 I2/I3 を使う)
- 工程の自動遷移 (手動運用から開始)
- Acceptance (P04/P06/P07/P10/P11 must preserve exact coverage):
- 7 工程の遷移が admin のみ操作でき監査 event に記録される
- 公開工程が PublishRequest の状態と整合する (二重状態を持たない)
- ボードが axe 違反 0・CWV good で動作する
- Architecture/source refs:
- architecture/harness-hub-frontend.md
- architecture/harness-hub-backend.md
- specs/harness-hub-system-specification.md

This section is the current source closure and supersedes older counts or wording in this task when they conflict with the pinned feature context.

## 参照情報

- System specification: system-spec/database.md (qa-032), system-spec/00-requirements-definition.md (D4)
- Detailed authoritative source: docs/backend-spec.md (§2.3 builds/build_stage_events テーブル定義)
- Architecture: arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-build-pipeline-board
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-build-pipeline-board-p07
