# System task overlay: 実装 — S15 一覧/閲覧/編集・Doc スキーマ・B7 API・AI 下書きキュー・監査 event の実装

## Machine-readable registration fields

- feature_package_id: feature-package/feat-docs-cms (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-docs-cms", "studio-extension", "docs-cms", "implementation"]
- related_nodes: ["feat-docs-cms", "arch-harness-hub-frontend", "arch-harness-hub-backend"]
- parent_feature: feat-docs-cms
- phase_ref: P05
- classification: confidence=0.9, reason="P03 承認済み設計と P04 テストスタブに基づき S15 実装・Doc スキーマ・B7 API・AI 下書きキュー・監査 event を実装する P05 タスク", candidates=[{artifact_kind: task, confidence: 0.9, candidate_path: tasks/feat-docs-cms/sys-docs-cms-p05.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P03 承認済み設計と P04 テストスタブに基づき、S15 一覧/閲覧/編集 UI (編集は admin 限定)・Doc エンティティスキーマ (scope=common/tenant)・B7 REST 資源 (zod 単一ソース + 認可単一ミドルウェア)・AI 下書きキュー (AiJob doc kind) の投入/受領・doc 編集の監査 event 記録を実装し、P04 のテストスタブを green にする。

## 背景

S15 は閲覧 member・編集 admin の画面であり (qa-021, docs/screen-inventory.md)、frontend は design system の Markdown レンダラ + エディタ共通部品を消費するのみで独自実装を行わない (qa-021/qa-022, docs/shared-layers.md §1)。backend は B7 の common/tenant スコープを持つ Doc REST 資源を zod 単一ソースへ追加し、認可単一ミドルウェア (deny-by-default) 配下に置く (qa-023 B1/B7)。全新規テーブルには tenant_id/workspace_id スコープ列を必須とし、tenant スコープ doc は他テナントから参照できないようアプリ層で強制する (D4, qa-024)。AI 下書き生成は D5 pull 型キューを用い、pull/書戻し認可を Device Flow token 保有者に限定し job payload に secret を含めない (qa-025 SEC8)。doc 編集操作は SEC6 の監査対象に含まれる。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-docs-cms, arch-harness-hub-frontend, arch-harness-hub-backend
- Entry gate: sys-docs-cms-p04 のテストスタブが作成済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: applicable + change: S15 一覧/閲覧/編集画面 (apps/hub/src/app/(dashboard)/docs/) を実装し、design system の Markdown レンダラ + エディタ共通部品を消費する (sanitize 済み HTML のみ描画。独自 sanitize 実装は行わない)
- Backend: applicable + change: Doc REST 資源のハンドラと AI 下書きキュー (doc kind) の投入/受領 API を実装する
- API: applicable + contract: packages/schemas/docs-cms/ に zod スキーマを追加し、認可単一ミドルウェア配下に配置する
- Data: applicable + migration: packages/db/schema/docs-cms/ に Doc テーブル定義と tenant_id/workspace_id スコープ列を追加する
- Infrastructure: N/A: デプロイ単位・CI/CD は feat-hub-foundation が既に確立している
- Security: applicable + change: tenant 分離のアプリ層強制・doc 編集 admin 限定認可・AI キュー pull/書戻しの Device Flow token 認可・job payload の secret 非包含を実装する
- Quality: applicable + change: P04 のテストスタブを green にする
- Documentation: N/A: 実装成果物のドキュメント化は P12 で行う
- Operations: N/A: AI キュー滞留監視の具体化は P09/P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub (Hub は単一 Worker)
- Compatibility/migration/backfill: N/A: Doc は新規エンティティであり既存テーブルへの後方互換性影響はない (migration ファイル生成自体は P08 で扱う)

## 成果物

- Produced artifacts: apps/hub/src/app/(dashboard)/docs/ (S15 画面), apps/hub/src/features/docs-cms/ (feature 実装), packages/schemas/docs-cms/ (zod スキーマ), packages/db/schema/docs-cms/ (Doc テーブル定義)
- Consumed artifacts: docs/features/feat-docs-cms/architecture-decision-record.md, docs/features/feat-docs-cms/test-design.md, apps/hub/src/features/docs-cms/__tests__/
- Write scope/touches: apps/hub/src/app/(dashboard)/docs/, apps/hub/src/features/docs-cms/, packages/schemas/docs-cms/, packages/db/schema/docs-cms/

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-docs-cms-p05) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-docs-cms-p05 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-docs-cms-p05) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: sys-docs-cms-p04 完了後に着手する。write_scope が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- Markdown レンダラ/エディタ部品自体の実装 (design system 共通部品。owner は feat-hub-foundation で、本 feature は消費のみ)
- AI 実行基盤のサーバ側実装 (D5 で不採用)
- 外部公開サイト生成・バージョン管理 (Git 連携) (goal-spec scope_out)
- AiJob キュー共通層自体の一般化実装 (上流論点)

## Verification and evidence

- Automated commands: `pnpm install --frozen-lockfile`, `pnpm --filter hub build`, `pnpm --filter hub test`, `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: P04 のテストスタブがすべて green であること、および pnpm build/test の成功ログが得られていること

## Rollout and rollback

- Rollout: 実装完了後、pnpm build/test の成功を確認してから P06 テスト実行へ引き継ぐ
- Rollback trigger and steps: build/test が失敗する場合、失敗箇所を write_scope 内の該当 path に限定して修正し、影響が設計 (P02/P03) に及ぶ場合は該当 task を再実行対象として差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/frontend.md (qa-022), system-spec/backend.md (qa-023 B1/B7), system-spec/database.md (qa-024), system-spec/security.md (qa-025 SEC2/SEC6/SEC7/SEC8), system-spec/00-requirements-definition.md (D4, D5, I13)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-docs-cms
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-docs-cms-p04
