# System task overlay: テスト実行 — 単体/結合/tenant 分離/認可/sanitize テストの実行と結果記録

## Machine-readable registration fields

- feature_package_id: feature-package/feat-docs-cms (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-docs-cms", "studio-extension", "docs-cms", "test-run"]
- related_nodes: ["feat-docs-cms", "arch-harness-hub-frontend", "arch-harness-hub-backend"]
- parent_feature: feat-docs-cms
- phase_ref: P06
- classification: confidence=0.87, reason="P04 のテストスタブ (tenant 分離/doc 編集 admin 限定/Markdown sanitize/doc 編集監査/AI キュー認可) を P05 実装に対して実行し結果を記録する P06 タスク", candidates=[{artifact_kind: task, confidence: 0.87, candidate_path: tasks/feat-docs-cms/sys-docs-cms-p06.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P04 で定義した 5 テストカテゴリ (tenant 分離・doc 編集 admin 限定・Markdown sanitize・doc 編集監査・AI キュー認可) を P05 実装に対して実行し、pass/fail 結果を記録する。

## 背景

P05 実装が P04 のテストスタブを満たすことを機械的に確認しなければ、P07 の受入判定と P10 の最終レビューが根拠を持てない。特に tenant 分離テストは D4 のアプリ層強制方式が構造的保証を持たないため CI 必須であり (qa-006/qa-024)、本 task の実行結果がその証跡になる。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-docs-cms, arch-harness-hub-frontend, arch-harness-hub-backend
- Entry gate: sys-docs-cms-p05 の実装が完了し、pnpm build が成功していること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: applicable + change: S15 編集 UI の admin 限定表示分岐テストと Markdown プレビューの sanitize 済み HTML 描画テストを実行する
- Backend: applicable + change: Doc REST 資源の認可 MW テストと AI 下書きキュー投入/受領テストを実行する
- API: applicable + contract: zod スキーマ検証テスト (不正 payload 拒否) を実行する
- Data: applicable + migration: tenant スコープ doc の分離テストを実行する
- Infrastructure: N/A: 本 feature は追加インフラを新設しない
- Security: applicable + change: doc-edit-admin-only-qa021-sec2・ai-queue-authz-payload-secret-ban・markdown-sanitize-sec7-doc・doc-edit-audit-sec6 の 4 件のテスト結果を記録する
- Quality: applicable + change: test-run-report.md に 5 テストカテゴリ全件の pass/fail 結果を記録する
- Documentation: applicable + change: docs/features/feat-docs-cms/test-run-report.md を新規作成する
- Operations: N/A: AI キュー滞留監視の具体化は P09/P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub (本 task はテスト実行のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task はテスト実行のみで実変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-docs-cms/test-run-report.md (5 テストカテゴリ全件の pass/fail 結果)
- Consumed artifacts: docs/features/feat-docs-cms/test-design.md, apps/hub/src/features/docs-cms/__tests__/, apps/hub/src/features/docs-cms/
- Write scope/touches: docs/features/feat-docs-cms/test-run-report.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-docs-cms-p06) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-docs-cms-p06 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-docs-cms-p06) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: sys-docs-cms-p05 完了後に着手する。resource_scope (docs/features/feat-docs-cms/test-run-report.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- Markdown レンダラ/エディタ部品自体のテスト実行 (design system 共通部品。owner は feat-hub-foundation)
- AI 実行基盤のサーバ側実装のテスト (D5 で不採用)
- 実装コードの修正 (fail が発生した場合の修正は P05 へ差し戻す)

## Verification and evidence

- Automated commands: `pnpm install --frozen-lockfile`, `pnpm --filter hub build`, `pnpm --filter hub test`, `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: test-run-report.md に P04 定義の 5 テストカテゴリ全件の pass/fail 結果が記録されていること

## Rollout and rollback

- Rollout: test-run-report.md を作成し、全件 pass を確認してから P07 受入へ引き継ぐ
- Rollback trigger and steps: fail が発生した場合、test-run-report.md に失敗詳細を記録し sys-docs-cms-p05 を再実行対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/security.md (qa-025 SEC2/SEC6/SEC7/SEC8), system-spec/database.md (qa-024), system-spec/ui-ux.md (qa-021 S15)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-docs-cms
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-docs-cms-p05
