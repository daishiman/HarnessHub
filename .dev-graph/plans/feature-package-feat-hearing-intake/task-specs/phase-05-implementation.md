# System task overlay: 実装 — S10 ウィザード/S11-S12 シート管理/受付番号採番/AI キュー API/Markdown sanitize の実装

## Machine-readable registration fields

- feature_package_id: feature-package/feat-hearing-intake (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-hearing-intake", "studio-extension", "async-ai-queue", "implementation"]
- related_nodes: ["feat-hearing-intake", "arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data"]
- parent_feature: feat-hearing-intake
- phase_ref: P05
- classification: confidence=0.9, reason="P03 承認済み設計と P04 テストスタブに基づき S10-S12 実装・受付番号採番・AI キュー API・Markdown sanitize を実装する P05 タスク", candidates=[{artifact_kind: task, confidence: 0.9, candidate_path: tasks/feat-hearing-intake/sys-hearing-intake-p05.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P02/P03 で確定・承認された設計と P04 のテストスタブに基づき、S10 (4 ステップウィザード)・S11/S12 (シート一覧/詳細)・受付番号採番・AI キュー (D5 pull 型) ジョブ投入/書戻し受領 API・Markdown sanitize 適用を実装し、P04 のテストスタブが green になる状態にする。

## 背景

test-first で定義された合否基準 (test-design.md) を満たす実装を行う。frontend はウィザード共通部品・KPI カード/チャート共通部品・Markdown レンダラ共通部品を消費し独自実装を避ける (qa-022, docs/shared-layers.md §1)。backend は zod 単一ソースへの schema 追加と認可単一ミドルウェア配下への配置を徹底する (qa-023 B1)。試算表示はサーバ計算値の表示専用実装とし、クライアント側の金額再計算コードを一切含めない (SEC5)。AiJob (hearing kind) は共通層の汎化を待たず、本 feature 固有の最小スキーマとして packages/db/schema/hearing-intake/ 配下に実装する (P02 のスコープ判断を継承)。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-hearing-intake, sys-hearing-intake-p04
- Entry gate: docs/features/feat-hearing-intake/test-design.md と apps/hub/src/features/hearing-intake/__tests__/ のテストスタブが P04 で作成済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: applicable + change: apps/hub/src/app/(dashboard)/hearing-intake/ に S10 4 ステップウィザード (課題入力→影響範囲→頻度/時間→確認、サーバ計算値の試算表示専用) を実装し、apps/hub/src/app/(dashboard)/hearing-sheets/ に S11 一覧/S12 詳細 (status 変更は admin 限定 UI) を実装する
- Backend: applicable + change: apps/hub/src/features/hearing-intake/ に受付番号採番ハンドラと AI キュー (D5 pull 型) ジョブ投入/Claude Code セッションからの書戻し受領ハンドラを実装する
- API: applicable + change: packages/schemas/hearing-intake/ に HearingSheet/FormData/AiJob (hearing kind) の zod スキーマを実装し、認可単一ミドルウェア配下に登録する (qa-023 B1)
- Data: applicable + change: packages/db/schema/hearing-intake/ に HearingSheet/FormData/AiJob (hearing kind) のテーブル定義を実装し、tenant_id/workspace_id スコープ列を必須付与する (D4)
- Infrastructure: N/A: 既存 Cloudflare Workers/hub デプロイ単位への追加実装のみで新規インフラは作らない
- Security: applicable + change: AI キューの pull/書戻し認可を Device Flow token 保有者に限定する実装 (SEC8)、Markdown sanitize の適用箇所実装 (SEC7)、試算表示のサーバ計算値限定実装 (SEC5) を行う
- Quality: applicable + change: P04 のテストスタブを green にする実装を行う
- Documentation: N/A: 実装コードのコメント・型定義のみで独立ドキュメント成果物は作らない (ドキュメント成果物は P12 で作る)
- Operations: N/A: 運用手順の作成は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend, arch-harness-hub-data
- Deploy unit/environment: cloudflare-workers/hub (feat-hub-foundation が確立した既存 Worker への機能追加。本 task はコード実装のみでデプロイは P13 で行う)
- Compatibility/migration/backfill: HearingSheet/FormData/AiJob (hearing kind 追加分) は新規テーブルであり既存データへの互換性影響はない

## 成果物

- Produced artifacts: apps/hub/src/app/(dashboard)/hearing-intake/, apps/hub/src/app/(dashboard)/hearing-sheets/, apps/hub/src/features/hearing-intake/, packages/schemas/hearing-intake/, packages/db/schema/hearing-intake/
- Consumed artifacts: docs/features/feat-hearing-intake/architecture-decision-record.md, docs/features/feat-hearing-intake/design-review-notes.md, docs/features/feat-hearing-intake/test-design.md, apps/hub/src/features/hearing-intake/__tests__/
- Write scope/touches: apps/hub/src/app/(dashboard)/hearing-intake/, apps/hub/src/app/(dashboard)/hearing-sheets/, apps/hub/src/features/hearing-intake/, packages/schemas/hearing-intake/, packages/db/schema/hearing-intake/

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-hearing-intake-p05) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-hearing-intake-p05 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-hearing-intake-p05) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[sys-hearing-intake-p04] が完了するまで着手しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- AI 実行基盤のサーバ側実装 (D5 で不採用。goal-spec scope_out)
- AiJob キュー共通層そのものの汎化実装 (feat-hub-foundation の scope。P02 の判断を継承)
- 構築工程の進行管理 UI (feat-build-pipeline-board の scope)
- 試算エンジン本体の実装 (feat-metrics-tracking の scope。本 feature は TenantCoefficient 係数の読取消費のみ実装する)
- 認証方式・role 体系そのものの実装変更 (feat-auth-tenancy の scope)

## Verification and evidence

- Automated commands: `pnpm install --frozen-lockfile`, `pnpm --filter hub build`, `pnpm --filter hub test`, `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: P04 のテストスタブがすべて green であること、および pnpm build/test の成功ログ

## Rollout and rollback

- Rollout: 実装完了後 P06 のテスト実行へ引き継ぐ
- Rollback trigger and steps: build/test が失敗する場合、失敗箇所を write_scope 内の該当 path に限定して修正し、影響が設計 (P02/P03) に及ぶ場合は該当 task を再実行対象として差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/frontend.md (qa-022), system-spec/backend.md (qa-023 B1/B5), system-spec/database.md (qa-024), system-spec/security.md (qa-025 SEC5/SEC7/SEC8), system-spec/00-requirements-definition.md (D4, D5)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md), arch-harness-hub-data (architecture/harness-hub-data.md)
- Feature: feat-hearing-intake
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-hearing-intake-p04
