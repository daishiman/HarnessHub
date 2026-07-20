# System task overlay: リファクタリング/マイグレーション — Doc テーブルマイグレーション生成と後方互換性確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-docs-cms (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-docs-cms", "studio-extension", "docs-cms", "migration"]
- related_nodes: ["feat-docs-cms", "arch-harness-hub-frontend", "arch-harness-hub-backend"]
- parent_feature: feat-docs-cms
- phase_ref: P08
- classification: confidence=0.85, reason="P05 で追加した Doc スキーマ定義から migration ファイルを生成し既存スキーマへの後方互換性を確認する P08 タスク", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-docs-cms/sys-docs-cms-p08.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P05 で packages/db/schema/docs-cms/ に追加した Doc テーブル定義から migration ファイルを生成し、既存スキーマへの後方互換性 (破壊的変更がないこと) を確認する。

## 背景

feature-execution-package-contract.md §3 は P08 を「リファクタリング/マイグレーション」と定め、実装対象に該当がなくても常に存在させる契約になっている。本 feature では Doc は新規エンティティであり既存テーブルの変更を伴わないが、tenant_id/workspace_id スコープ列 (D4) を含む migration ファイルの生成と適用可否確認は必須の作業として本 task に属する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-docs-cms, arch-harness-hub-backend
- Entry gate: sys-docs-cms-p07 の acceptance-report.md で acceptance 3 項目が全件 pass していること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task はデータスキーマのマイグレーションのみで frontend 実装物を変更しない
- Backend: N/A: 本 task はデータスキーマのマイグレーションのみで backend ハンドラ実装を変更しない
- API: N/A: 本 task は API 契約を変更しない
- Data: applicable + migration: Doc テーブルの migration ファイルを生成し、既存テーブルへの後方互換性 (破壊的変更なし) を確認する
- Infrastructure: N/A: 本 feature は追加インフラを新設しない
- Security: applicable + change: migration ファイルに tenant_id/workspace_id スコープ列 (D4) が含まれることを確認する
- Quality: applicable + change: refactoring-migration-note.md に migration 適用結果と後方互換性確認結果を記録する
- Documentation: applicable + change: docs/features/feat-docs-cms/refactoring-migration-note.md を新規作成する
- Operations: N/A: 運用手順の文書化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub (本 task は migration ファイル生成・検証のみで本番適用は P13 で行う)
- Compatibility/migration/backfill: Doc は新規エンティティであり既存テーブルへの破壊的変更を伴わない。backfill は不要 (新規テーブルのため既存データが存在しない)

## 成果物

- Produced artifacts: docs/features/feat-docs-cms/refactoring-migration-note.md (migration 適用結果と後方互換性確認結果), packages/db/schema/docs-cms/ 配下の migration ファイル
- Consumed artifacts: packages/db/schema/docs-cms/, docs/features/feat-docs-cms/architecture-decision-record.md
- Write scope/touches: docs/features/feat-docs-cms/refactoring-migration-note.md, packages/db/schema/docs-cms/

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-docs-cms-p08) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-docs-cms-p08 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-docs-cms-p08) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: sys-docs-cms-p07 完了後に着手する。write_scope (packages/db/schema/docs-cms/) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 既存テーブル (docs-cms 以外) のスキーマ変更
- 本番環境への migration 適用 (P13 のリリース task で扱う)

## Verification and evidence

- Automated commands: `pnpm --filter db migrate:generate`, `pnpm --filter db migrate:check`, `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: refactoring-migration-note.md に migration ファイル生成結果と後方互換性確認 (破壊的変更なし) の記録があること

## Rollout and rollback

- Rollout: migration ファイルを packages/db/schema/docs-cms/ に生成し、refactoring-migration-note.md に結果を記録してから P09 品質保証へ引き継ぐ
- Rollback trigger and steps: 後方互換性違反が検出された場合、migration ファイルを破棄し、原因スキーマ定義を sys-docs-cms-p05 の write_scope 内で修正してから本 task を再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-docs-cms.context.json` (`sha256:6e8ea8a7a1042002d0bb0b3ff2a2b3464ea4a45ba77ddea709580cc3bed03d34`)
- Phase responsibility: migration・互換性・refactor の適用要否を実行し、N/A でも根拠を残す。
- Purpose: 利用ガイド・FAQ 等のドキュメントを common (全テナント) / tenant (テナント限定) スコープで管理し (B7/I13)、S15 の閲覧/編集 UI と D5 pull 型 AI キューによる下書き生成を提供する
- Goal: ドキュメントがスコープ規則 (tenant 分離 + common 共有) 下で閲覧・編集でき、Markdown が sanitize 済みで描画され (SEC7)、AI 下書きがキュー経由で生成される状態
- Scope in (all items are in-scope for the package; this phase owns the subset matching its responsibility):
- Doc エンティティ (scope=common/tenant・Markdown 本文)
- S15 一覧/閲覧/編集 (編集は admin)
- Markdown レンダラ + エディタ共通部品の消費 (XSS sanitize)
- AI 下書き生成 (D5 キュー)
- doc 編集の監査 event (SEC6)
- Scope out:
- 外部公開サイト生成
- バージョン管理 (Git 連携)
- Acceptance (P04/P06/P07/P10/P11 must preserve exact coverage):
- tenant スコープ doc が他テナントから参照できない (分離テスト)
- Markdown 描画で XSS が sanitize される (テスト付き)
- 編集操作が監査 event に記録される
- Architecture/source refs:
- architecture/harness-hub-frontend.md
- architecture/harness-hub-backend.md
- specs/harness-hub-system-specification.md

This section is the current source closure and supersedes older counts or wording in this task when they conflict with the pinned feature context.

## 参照情報

- System specification: system-spec/database.md (qa-024), system-spec/00-requirements-definition.md (D4)
- Architecture: arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-docs-cms
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-docs-cms-p07
