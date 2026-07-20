# System task overlay: 実装 — S13 パイプラインボード・Build スキーマ・工程操作 API・PublishRequest 接続・監査 event の実装

## Machine-readable registration fields

- feature_package_id: feature-package/feat-build-pipeline-board (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-build-pipeline-board", "studio-extension", "build-pipeline-board", "implementation"]
- related_nodes: ["feat-build-pipeline-board", "arch-harness-hub-frontend", "arch-harness-hub-backend"]
- parent_feature: feat-build-pipeline-board
- phase_ref: P05
- classification: confidence=0.9, reason="P03 承認済み設計と P04 テストスタブに基づき S13 実装・Build スキーマ・builds API・PublishRequest 接続・監査 event を実装する P05 タスク", candidates=[{artifact_kind: task, confidence: 0.9, candidate_path: tasks/feat-build-pipeline-board/sys-build-pipeline-board-p05.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P03 承認済み設計と P04 テストスタブに基づき、S13 パイプラインボード (ステージボード共通部品の消費)・Build/build_stage_events スキーマ・builds REST API (閲覧/起票/更新/工程遷移)・publish 工程の PublishRequest 接続・build.stage_change 監査 event を実装する。

## 背景

P04 で確定した 5 テストカテゴリを green にすることが本 task の受入条件である。工程遷移 API (POST /api/v1/builds/:id/stage) は admin (workspace-admin/provider-admin) 限定とし (SEC2, docs/backend-spec.md §3.3)、隣接遷移のみを許可し (§5.3)、publish 遷移時は接続済み PublishRequest の Published 状態を確認したうえで build.stage_change 監査 event を記録する (SEC6, §3.8)。Build/build_stage_events テーブルは tenant_id/workspace_id スコープ列を必須とする (D4)。S13 画面は design system のステージボード共通部品を消費するのみとし独自実装を行わない (qa-021/qa-022)。builds の zod スキーマは packages/schemas/ 配下の単一ソースへ追加し認可単一ミドルウェア (deny-by-default) 配下に置く (B1, qa-023)。工程操作の admin 権限判定は Yellow review (I8) の承認 queue と共通の認可表 (B9) を用いる。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-build-pipeline-board, arch-harness-hub-frontend, arch-harness-hub-backend
- Entry gate: sys-build-pipeline-board-p04 のテストスタブ (docs/features/feat-build-pipeline-board/test-design.md, apps/hub/src/features/build-pipeline-board/__tests__/) が作成済みであること。かつ .dev-graph/staging/goal-spec.json の feature_context_digest が sha256:eeed295d50359e11ac8aee84800def3ad3399cee866ab5b4dc2712116c9a4441 に一致し、features/feat-build-pipeline-board.md の confirmation_status が confirmed であること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: applicable + change: S13 パイプラインボード画面 (apps/hub/src/app/(dashboard)/builds/) を、ステージボード共通部品を消費して実装する
- Backend: applicable + change: builds REST ハンドラ (GET/POST/PATCH/stage 遷移) を実装する
- API: applicable + contract: builds の zod スキーマを packages/schemas/build-pipeline-board/ へ実装し、認可単一ミドルウェア配下へ登録する
- Data: applicable + migration: packages/db/schema/build-pipeline/ に Build/build_stage_events スキーマを実装する
- Infrastructure: N/A: feat-hub-foundation の既存デプロイ単位を使用し、追加インフラを新設しない
- Security: applicable + change: 工程遷移 admin 限定認可・build.stage_change 監査 event・PublishRequest Published 確認・tenant 分離・B9 共有認可表を実装する
- Quality: applicable + change: P04 のテストスタブを green にする
- Documentation: N/A: 実装作業自体は docs/features 配下への文書化を伴わない (文書化は P12 で行う)
- Operations: N/A: 運用手順の文書化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub (feat-hub-foundation が確立した既存デプロイ単位を使用する)
- Compatibility/migration/backfill: Build/build_stage_events は新規エンティティのため既存テーブルへの破壊的変更を伴わない。migration ファイルの生成・後方互換性確認は P08 で行う

## 成果物

- Produced artifacts: apps/hub/src/app/(dashboard)/builds/ (S13 画面), apps/hub/src/features/build-pipeline-board/ (feature 実装), packages/schemas/build-pipeline-board/ (zod スキーマ), packages/db/schema/build-pipeline/ (Build/build_stage_events スキーマ定義)
- Consumed artifacts: docs/features/feat-build-pipeline-board/architecture-decision-record.md, docs/features/feat-build-pipeline-board/test-design.md, apps/hub/src/features/build-pipeline-board/__tests__/
- Write scope/touches: apps/hub/src/app/(dashboard)/builds/, apps/hub/src/features/build-pipeline-board/, packages/schemas/build-pipeline-board/, packages/db/schema/build-pipeline/

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-build-pipeline-board-p05) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-build-pipeline-board-p05 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-build-pipeline-board-p05) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: sys-build-pipeline-board-p04 完了後に着手する。write_scope 内の各 path が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- ステージボード共通部品自体の実装 (owner=feat-hub-foundation)
- publish 状態機械自体の実装・変更 (既存 I2/I3 を使用。goal-spec scope_out)
- 工程の自動遷移ロジックの実装 (goal-spec scope_out)
- AI 下書きキュー・ヒアリング intake の実装 (feat-hearing-intake の scope)

## Verification and evidence

- Automated commands: `pnpm install --frozen-lockfile`, `pnpm --filter hub build`, `pnpm --filter hub test`, `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: P04 のテストスタブがすべて green であること、および pnpm build/test の成功ログが得られていること

## Rollout and rollback

- Rollout: 実装完了後、build/test 成功ログを添えて P06 テスト実行へ引き継ぐ
- Rollback trigger and steps: build/test が失敗する場合、失敗箇所を write_scope 内の該当 path に限定して修正し、影響が設計 (P02/P03) に及ぶ場合は該当 task を再実行対象として差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/frontend.md (qa-022), system-spec/backend.md (qa-033), system-spec/database.md (qa-032), system-spec/security.md (qa-025 SEC2/SEC6), system-spec/00-requirements-definition.md (D4)
- Detailed authoritative source: docs/backend-spec.md (§2.3 builds/build_stage_events, §3.3 認可マトリクス, §3.8 監査対象, §4.4 builds API, §5.3 Build 状態機械)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-build-pipeline-board
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-build-pipeline-board-p04
