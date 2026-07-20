# System task overlay: 受入 — goal-spec acceptance 3 項目の確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-docs-cms (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-docs-cms", "studio-extension", "docs-cms", "acceptance"]
- related_nodes: ["feat-docs-cms", "arch-harness-hub-frontend", "arch-harness-hub-backend"]
- parent_feature: feat-docs-cms
- phase_ref: P07
- classification: confidence=0.87, reason="P06 のテスト結果を goal-spec の acceptance 3 項目に照らして受入判定する P07 タスク", candidates=[{artifact_kind: task, confidence: 0.87, candidate_path: tasks/feat-docs-cms/sys-docs-cms-p07.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P06 のテスト結果を goal-spec の acceptance 3 項目 (tenant スコープ doc の分離・Markdown XSS sanitize・doc 編集操作の監査記録) に照らして受入判定を行い、feature acceptance の根拠を確定する。

## 背景

feature-execution-package-contract.md §3 は P07 を「feature acceptance」と定めており、P06 のテスト実行結果を goal-spec acceptance と突合することで、P10 最終レビューと P11 エビデンス収集の入力となる受入判定を確定する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-docs-cms
- Entry gate: sys-docs-cms-p06 の test-run-report.md で 5 テストカテゴリ全件が pass していること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は受入判定文書化のみで frontend 実装物を変更しない
- Backend: N/A: 本 task は受入判定文書化のみで backend 実装物を変更しない
- API: N/A: 本 task は受入判定文書化のみ
- Data: N/A: 本 task は受入判定文書化のみ
- Infrastructure: N/A: 本 feature は追加インフラを新設しない
- Security: applicable + change: acceptance 3 項目のうち tenant 分離と監査記録がセキュリティ要件に該当するため判定根拠に含める
- Quality: applicable + change: acceptance-report.md に acceptance 3 項目それぞれの pass/fail 判定を記録する
- Documentation: applicable + change: docs/features/feat-docs-cms/acceptance-report.md を新規作成する
- Operations: N/A: 本 task は受入判定文書化のみ

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub (本 task は受入判定のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は受入判定のみで実変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-docs-cms/acceptance-report.md (acceptance 3 項目の pass/fail 判定)
- Consumed artifacts: docs/features/feat-docs-cms/test-run-report.md, goal-spec.json
- Write scope/touches: docs/features/feat-docs-cms/acceptance-report.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-docs-cms-p07) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-docs-cms-p07 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-docs-cms-p07) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: sys-docs-cms-p06 完了後に着手する。resource_scope (docs/features/feat-docs-cms/acceptance-report.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 実装コードの修正 (未達の場合の修正は P05 へ差し戻す)
- goal-spec 自体の再確定 (dev-graph の scope)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: acceptance-report.md に acceptance 3 項目それぞれの pass/fail 判定と test-run-report.md への参照が記載されていること

## Rollout and rollback

- Rollout: acceptance-report.md を作成し、全件 pass を確認してから P08 リファクタリング/マイグレーションへ引き継ぐ
- Rollback trigger and steps: acceptance いずれかが未達の場合、acceptance-report.md に未達理由を記録し、原因が実装にある場合は sys-docs-cms-p05 を、設計にある場合は sys-docs-cms-p02 を再実行対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-docs-cms.context.json` (`sha256:6e8ea8a7a1042002d0bb0b3ff2a2b3464ea4a45ba77ddea709580cc3bed03d34`)
- Phase responsibility: 現行 context の acceptance 全件を P06 の実行証跡から判定する。
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

- System specification: system-spec/security.md (qa-025 SEC6/SEC7), system-spec/00-requirements-definition.md (I13)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-docs-cms
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-docs-cms-p06
