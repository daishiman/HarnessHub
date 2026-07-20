# System task overlay: テストファースト設計 — tenant 分離/admin 限定編集/Markdown sanitize/AI キュー認可/監査記録のテストスタブ作成

## Machine-readable registration fields

- feature_package_id: feature-package/feat-docs-cms (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-docs-cms", "studio-extension", "docs-cms", "test-design"]
- related_nodes: ["feat-docs-cms", "arch-harness-hub-frontend", "arch-harness-hub-backend"]
- parent_feature: feat-docs-cms
- phase_ref: P04
- classification: confidence=0.88, reason="P03 で承認された設計に基づき P05 実装の受入契約となるテストスタブを作成する P04 タスク", candidates=[{artifact_kind: task, confidence: 0.88, candidate_path: tasks/feat-docs-cms/sys-docs-cms-p04.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P03 で承認された設計に基づき、P05 実装が満たすべき受入契約として、tenant 分離・doc 編集 admin 限定認可・Markdown XSS sanitize・doc 編集監査 event 記録・AI 下書きキュー (doc kind) 認可の 5 テストカテゴリのテストスタブを作成する。

## 背景

goal-spec の acceptance 3 件 (tenant スコープ doc が他テナントから参照できない・Markdown 描画で XSS が sanitize される・編集操作が監査 event に記録される) と quality_constraints 8 件を machine-verifiable なテストとして先に定義することで、P05 実装が受入基準を後追いで解釈する手戻りを防ぐ。qa-025 SEC2/SEC6/SEC7/SEC8 と D4 の tenant 分離規則を、テストスタブの合否基準として明文化する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-docs-cms, arch-harness-hub-frontend, arch-harness-hub-backend
- Entry gate: sys-docs-cms-p03 の design-review-notes.md で承認判定が記録されていること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: applicable + change: S15 編集 UI の admin 限定表示分岐と Markdown プレビュー (sanitize 済み HTML のみ描画) のテストスタブを作成する
- Backend: applicable + change: Doc REST 資源の認可 MW 通過テストと AI 下書きキュー投入/受領のテストスタブを作成する
- API: applicable + contract: zod スキーマ検証 (不正 payload 拒否) のテストスタブを作成する
- Data: applicable + migration: tenant スコープ doc の分離テスト (他テナントから参照不可) のテストスタブを作成する
- Infrastructure: N/A: 本 feature は追加インフラを新設しない
- Security: applicable + change: doc-edit-admin-only-qa021-sec2・ai-queue-authz-payload-secret-ban・markdown-sanitize-sec7-doc・doc-edit-audit-sec6 の 4 件を検証するテストスタブを作成する
- Quality: applicable + change: test-design.md に 5 テストカテゴリの合否基準を明記する
- Documentation: applicable + change: docs/features/feat-docs-cms/test-design.md を新規作成する
- Operations: N/A: AI キュー滞留監視の具体化は P09/P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub (本 task はテストスタブ作成のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task はテストスタブ作成のみで実変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-docs-cms/test-design.md (5 テストカテゴリの合否基準), apps/hub/src/features/docs-cms/__tests__/ (テストスタブ)
- Consumed artifacts: docs/features/feat-docs-cms/architecture-decision-record.md, docs/features/feat-docs-cms/design-review-notes.md, system-spec/security.md, system-spec/database.md
- Write scope/touches: docs/features/feat-docs-cms/test-design.md, apps/hub/src/features/docs-cms/__tests__/

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-docs-cms-p04) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-docs-cms-p04 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-docs-cms-p04) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: sys-docs-cms-p03 完了後に着手する。resource_scope (docs/features/feat-docs-cms/test-design.md, apps/hub/src/features/docs-cms/__tests__/) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- Markdown レンダラ/エディタ部品自体のテスト (design system 共通部品。owner は feat-hub-foundation)
- AI 実行基盤のサーバ側実装のテスト (D5 で不採用)
- 実装コード本体の作成 (本 task はテストスタブ作成のみ)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: test-design.md に tenant 分離・doc 編集 admin 限定・Markdown sanitize・doc 編集監査・AI キュー認可の 5 テストカテゴリの合否基準が明記されていること

## Rollout and rollback

- Rollout: test-design.md とテストスタブを作成し、P05 実装へ引き継ぐ
- Rollback trigger and steps: 合否基準が P02 設計と矛盾する場合、矛盾箇所を記録し sys-docs-cms-p02 または sys-docs-cms-p03 を再確認対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/security.md (qa-025 SEC2/SEC6/SEC7/SEC8), system-spec/database.md (qa-024)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-docs-cms
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-docs-cms-p03
