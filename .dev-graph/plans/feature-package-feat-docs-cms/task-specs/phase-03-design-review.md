# System task overlay: 独立設計レビュー — Doc スキーマ・S15 認可・AI キュー契約・Markdown sanitize の妥当性確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-docs-cms (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-docs-cms", "studio-extension", "docs-cms", "design-review"]
- related_nodes: ["feat-docs-cms", "arch-harness-hub-frontend", "arch-harness-hub-backend"]
- parent_feature: feat-docs-cms
- phase_ref: P03
- classification: confidence=0.88, reason="P02 で確定した Doc スキーマ・S15 画面構成・B7 API 契約・AI キュー doc kind 契約を、設計担当から独立した視点でレビューする P03 タスク", candidates=[{artifact_kind: task, confidence: 0.88, candidate_path: tasks/feat-docs-cms/sys-docs-cms-p03.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P02 の architecture-decision-record.md に対し、設計担当から独立した視点で tenant 分離・doc 編集 admin 限定認可・Markdown sanitize 消費点・AI キュー認可・監査 event 記録点の妥当性を確認し、承認または差し戻しを判定する。

## 背景

feature-execution-package-contract.md §3 は P03 を「独立設計レビュー」と定めており、P02 の設計が quality_constraints 8 件 (tenant-scope-d4-doc-entity, markdown-sanitize-sec7-doc, markdown-common-component-qa021-qa022, doc-edit-audit-sec6, ai-queue-pull-type-d5-doc-draft, ai-queue-authz-payload-secret-ban, doc-edit-admin-only-qa021-sec2, b7-zod-single-source-authz-mw) を満たすかを、実装着手前に確認する。特に D4 の row-level tenant scope 実現がアプリ層強制に依存すること (分離テスト CI 必須という前提)、qa-025 SEC2 の role×操作許可表が deny-by-default で構成されていること、SEC8 の job payload に secret を含めない規則が API 契約に反映されていることを重点確認する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-docs-cms, arch-harness-hub-frontend, arch-harness-hub-backend
- Entry gate: sys-docs-cms-p02 の architecture-decision-record.md が作成済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は設計文書のレビューのみで frontend 実装物を変更しない
- Backend: N/A: 本 task は設計文書のレビューのみで backend 実装物を変更しない
- API: applicable + contract: B7 の zod スキーマ契約と role×操作許可表が qa-023(B1/B7) と qa-025(SEC2) に適合しているかをレビューする
- Data: applicable + migration: Doc カラム一覧が D4 (tenant_id/workspace_id スコープ列必須) と qa-024 に適合しているかをレビューする
- Infrastructure: N/A: 本 feature は追加インフラを新設しない
- Security: applicable + change: SEC2 (認可単一 MW の role×操作許可表)・SEC6 (doc 編集監査)・SEC7 (Markdown sanitize 消費点)・SEC8 (AI キュー認可・payload secret 非包含) の適合をレビューする
- Quality: applicable + change: P04 のテストスタブが依拠できる明確な合否基準が P02 設計に含まれているかをレビューする
- Documentation: applicable + change: docs/features/feat-docs-cms/design-review-notes.md を新規作成する
- Operations: N/A: AI キュー滞留監視の具体化は P09/P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend (D4/D5/qa-021/qa-022/qa-023(B1/B7)/qa-024/qa-025(SEC2/SEC6/SEC7/SEC8) の正本参照)
- Deploy unit/environment: cloudflare-workers/hub (本 task はレビューのみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task はレビューのみで実変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-docs-cms/design-review-notes.md (承認可否判定と SEC2/SEC6/SEC7/SEC8・qa-021/qa-022/qa-023(B1/B7)/qa-024 適合確認結果)
- Consumed artifacts: docs/features/feat-docs-cms/architecture-decision-record.md, system-spec/security.md, system-spec/database.md, system-spec/backend.md, system-spec/ui-ux.md
- Write scope/touches: docs/features/feat-docs-cms/design-review-notes.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-docs-cms-p03) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-docs-cms-p03 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-docs-cms-p03) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: sys-docs-cms-p02 完了後に着手する。resource_scope (docs/features/feat-docs-cms/design-review-notes.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- Markdown レンダラ/エディタ部品自体のレビュー (design system 共通部品。owner は feat-hub-foundation)
- AI 実行基盤のサーバ側実装のレビュー (D5 で不採用)
- 実装コードの作成 (本 task はレビューのみ)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: design-review-notes.md に承認可否と SEC2/SEC6/SEC7/SEC8・qa-021/qa-022/qa-023(B1/B7)/qa-024 適合確認結果が明記されていること

## Rollout and rollback

- Rollout: design-review-notes.md に承認結果を記録し、P04 のテストファースト設計へ引き継ぐ
- Rollback trigger and steps: 差し戻しと判定された場合、design-review-notes.md に指摘事項を記録し、sys-docs-cms-p02 を再実行対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/security.md (qa-025 SEC2/SEC6/SEC7/SEC8), system-spec/database.md (qa-024), system-spec/backend.md (qa-023 B1/B7), system-spec/ui-ux.md (qa-021 S15)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-docs-cms
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-docs-cms-p02
