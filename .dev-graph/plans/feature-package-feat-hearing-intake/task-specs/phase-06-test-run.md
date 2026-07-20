# System task overlay: テスト実行 — 単体/結合/認可/a11y テストの実行と結果記録

## Machine-readable registration fields

- feature_package_id: feature-package/feat-hearing-intake (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-hearing-intake", "studio-extension", "async-ai-queue", "test-run"]
- related_nodes: ["feat-hearing-intake", "arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data"]
- parent_feature: feat-hearing-intake
- phase_ref: P06
- classification: confidence=0.87, reason="P04 のテストスタブ(受付番号発番/AI キュー認可/Markdown sanitize/試算表示サーバ計算限定/axe a11y)を P05 実装に対して実行し結果を記録する P06 タスク", candidates=[{artifact_kind: task, confidence: 0.87, candidate_path: tasks/feat-hearing-intake/sys-hearing-intake-p06.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P04 で定義した受付番号発番・AI キュー pull/書戻し認可・Markdown sanitize・試算表示サーバ計算限定・axe a11y の各テストを P05 の実装に対して実行し、結果を機械可読な形で記録する。

## 背景

P05 の実装完了だけでは受入の根拠にならないため、P04 の合否基準に対する実測結果を記録し、P07 の受入判定と P11 のエビデンス収集の入力とする。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-hearing-intake, sys-hearing-intake-p05
- Entry gate: apps/hub/src/app/(dashboard)/hearing-intake/, apps/hub/src/app/(dashboard)/hearing-sheets/, apps/hub/src/features/hearing-intake/, packages/schemas/hearing-intake/, packages/db/schema/hearing-intake/ が P05 で実装済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: applicable + change: S10-S12 の axe a11y テストと非同期 UI 状態遷移テストを実行する
- Backend: applicable + change: 受付番号発番の一意性テストと AI キュー pull/書戻し認可テスト (SEC8) を実行する
- API: applicable + change: HearingSheet/FormData/AiJob (hearing kind) の zod schemas 入出力検証テストを実行する
- Data: applicable + change: tenant_id/workspace_id スコープ列の分離テストを実行する (D4)
- Infrastructure: N/A: 既存共有 CI パイプライン上でテストを実行するのみで新規インフラ変更はない
- Security: applicable + change: 試算表示のサーバ計算値限定テスト (SEC5) と Markdown sanitize の XSS 防止テスト (SEC7) を実行する
- Quality: applicable + change: P04 合否基準に対する実測結果 (pass/fail) を test-run-report.md へ記録する
- Documentation: applicable + change: docs/features/feat-hearing-intake/test-run-report.md を新規作成する
- Operations: N/A: 運用監視テストは P09 で扱う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend, arch-harness-hub-data
- Deploy unit/environment: cloudflare-workers/hub (既存 CI 実行環境上でのテスト実行のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task はテスト実行のみで対象物への変更を行わない

## 成果物

- Produced artifacts: docs/features/feat-hearing-intake/test-run-report.md (テスト結果一覧・pass/fail・失敗時の再現手順)
- Consumed artifacts: docs/features/feat-hearing-intake/test-design.md, apps/hub/src/features/hearing-intake/__tests__/, apps/hub/src/app/(dashboard)/hearing-intake/, apps/hub/src/app/(dashboard)/hearing-sheets/
- Write scope/touches: docs/features/feat-hearing-intake/test-run-report.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-hearing-intake-p06) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-hearing-intake-p06 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-hearing-intake-p06) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[sys-hearing-intake-p05] が完了するまで着手しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- テスト失敗時の実装修正 (P05 を再実行対象として差し戻す)
- 共有 CI パイプライン設定 (.github/workflows/ci.yml) の変更

## Verification and evidence

- Automated commands: `pnpm install --frozen-lockfile`, `pnpm --filter hub build`, `pnpm --filter hub test`, `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: test-run-report.md に P04 定義の 5 テストカテゴリ全件の pass/fail 結果が記録されている

## Rollout and rollback

- Rollout: 全テスト pass 確認後、P07 の受入判定へ引き継ぐ
- Rollback trigger and steps: fail が発生した場合、test-run-report.md に失敗詳細を記録し sys-hearing-intake-p05 を再実行対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/security.md (qa-025 SEC5/SEC7/SEC8), system-spec/database.md (qa-024 D4), system-spec/ui-ux.md (qa-021)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md), arch-harness-hub-data (architecture/harness-hub-data.md)
- Feature: feat-hearing-intake
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-hearing-intake-p05
