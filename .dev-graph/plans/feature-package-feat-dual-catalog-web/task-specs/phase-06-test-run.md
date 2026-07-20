# System task overlay: テスト実行 — Vitest部品テスト・Playwright E2E・axe自動チェック・Lighthouse CWV計測の実行

## Machine-readable registration fields

- feature_package_id: feature-package/feat-dual-catalog-web (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-dual-catalog-web", "macro-feature", "quality", "test-run"]
- related_nodes: ["feat-dual-catalog-web", "arch-harness-hub-frontend"]
- parent_feature: feat-dual-catalog-web
- phase_ref: P06
- classification: confidence=0.84, reason="P04で設計したVitest部品テスト・Playwright J1/J2ジャーニー×2 viewport・axe自動チェック・Lighthouse CWV計測を実行し結果を記録するP06テスト実行タスク", candidates=[{artifact_kind: task, confidence: 0.84, candidate_path: tasks/feat-dual-catalog-web/sys-dual-catalog-web-p06.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P05 実装完了物に対して、P04 で設計した Vitest 部品テスト・Playwright J1/J2 ジャーニー (2 viewport)・axe 自動チェック・Lighthouse CWV 計測・marketplace.json スキーマ検証・ポーリング backoff 契約テストを実行し、結果を記録する。

## 背景

docs/frontend-spec.md のテスト方針に従い、Vitest はコンポーネント・状態マッピングの単体テスト、Playwright は J1(カタログ閲覧・導入)/J2(公開状態確認) ジャーニーを 1280×800 と 390×844 の 2 viewport で実行し axe 統合チェックを併用する。CWV は Lighthouse で LCP・INP・CLS を計測し、goal-spec acceptance の「CWV 全指標 good を実測で満たす」を機械的に判定する。axe は「検出可能違反 0 がリリース条件として CI に存在する」を判定根拠とする。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-dual-catalog-web, arch-harness-hub-frontend
- Entry gate: P05 (apps/hub/src/app/(workspace)/catalog/ 等) が実装済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task はテスト実行のみで frontend 実装物を変更しない
- Backend: N/A: 本 task はテスト実行のみで backend 実装物を変更しない
- API: N/A: 本 task は既存実装に対するテスト実行のみ
- Data: N/A: 本 feature は独自ドメインテーブルを新設しない
- Infrastructure: applicable + IaC/deploy: .github/workflows/hub-web-quality-gate.yml 上でテストを実行する
- Security: N/A: 本 task はテスト実行のみでセキュリティ制御の変更を伴わない
- Quality: applicable + tests/gates: Vitest・Playwright・axe・Lighthouse を実行し quality_constraints 7件の充足状況を記録する
- Documentation: applicable + change: docs/features/feat-dual-catalog-web/test-run-results.md を新規作成する
- Operations: N/A: 運用手順の具体化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend (P02 architecture-decision-record.md を踏襲)
- Deploy unit/environment: cloudflare-workers/hub (本 task はテスト実行のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task はテスト実行のみで実コードへの変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-dual-catalog-web/test-run-results.md (quality_constraints 7件全ての実行結果記録)
- Consumed artifacts: apps/hub/src/__tests__/dual-catalog-web/, apps/hub/src/app/(workspace)/catalog/, .github/workflows/hub-web-quality-gate.yml
- Write scope/touches: docs/features/feat-dual-catalog-web/test-run-results.md, apps/hub/src/__tests__/dual-catalog-web/

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-dual-catalog-web-p06) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-dual-catalog-web-p06 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-dual-catalog-web-p06) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-DUAL-CATALOG-WEB-P05] であり P05 完了後に着手する。resource_scope (docs/features/feat-dual-catalog-web/test-run-results.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- テスト fail 時のコード修正そのもの (本 task は実行と記録のみ。修正は P05 への差し戻し後に行う)
- 実装コードの新規作成

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging/feature-package-feat-dual-catalog-web`
- Required evidence: test-run-results.md に quality_constraints 7件全ての pass 結果 (axe違反0件・CWV全指標good実測値を含む) が記録されていること (fail が残る場合は差し戻し理由が明記されていること)

## Rollout and rollback

- Rollout: test-run-results.md を作成し、全テスト pass を確認してから P07 (受入) へ引き継ぐ
- Rollback trigger and steps: いずれかのテスト (axe違反検出・CWV budget超過を含む) が fail した場合、test-run-results.md に原因を記録し P05 (実装) へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/spec-state.json qa_log (qa-018)
- Detailed authoritative source: docs/frontend-spec.md (§ テスト方針)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md)
- Feature: feat-dual-catalog-web
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-DUAL-CATALOG-WEB-P05
