# System task overlay: 受入 — axe検出可能違反0のCIゲート存在・CWV全指標good実測・Hub停止中の導入済みSkill動作継続の受入判定

## Machine-readable registration fields

- feature_package_id: feature-package/feat-dual-catalog-web (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-dual-catalog-web", "macro-feature", "quality", "acceptance"]
- related_nodes: ["feat-dual-catalog-web"]
- parent_feature: feat-dual-catalog-web
- phase_ref: P07
- classification: confidence=0.85, reason="goal-spec.json acceptance 3項目 (axe検出可能違反0のCIゲート存在、CWV全指標good実測、Hub停止中の導入済みSkill動作継続) を確認するP07受入タスク", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-dual-catalog-web/sys-dual-catalog-web-p07.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P06 test-run-results.md の結果をもとに、goal-spec の acceptance 3 件 (axe 検出可能違反 0 がリリース条件として CI に存在する、CWV 全指標 good を実測で満たす、導入済み Skill が Hub 停止中も動作継続する [§6.1 縮退]) を最終判定し、acceptance-record.md へ記録する。

## 背景

acceptance の前 2 件は P06 のテスト実行結果 (axe CI ゲート・Lighthouse CWV 実測値) から直接判定できる。3 件目の「導入済み Skill が Hub 停止中も動作継続する」は §6.1 の縮退設計 (qa-011) に基づき、Hub Worker が停止していても導入済み Skill・公開済み Web App が動作継続すること (新規公開・追加・更新のみ停止) を確認する。この確認は本 feature の実装 (catalog 閲覧・publish 状況表示) が Hub 稼働中のみ必要な機能であり、既に導入済みの Skill 動作自体には依存しないアーキテクチャになっていることの検証を含む。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-dual-catalog-web
- Entry gate: P06 (docs/features/feat-dual-catalog-web/test-run-results.md) が作成済みであり、quality_constraints 7 件が pass していること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は受入判定のみで frontend 実装物を変更しない
- Backend: N/A: 本 task は受入判定のみで backend 実装物を変更しない
- API: N/A: 本 task は既存実装に対する受入判定のみ
- Data: N/A: 本 feature は独自ドメインテーブルを新設しない
- Infrastructure: N/A: 本 task は受入判定のみでインフラ変更を伴わない
- Security: N/A: 本 task は受入判定のみでセキュリティ制御の変更を伴わない
- Quality: applicable + tests/gates: goal-spec acceptance 3件の最終判定を行う
- Documentation: applicable + change: docs/features/feat-dual-catalog-web/acceptance-record.md を新規作成する
- Operations: N/A: 運用手順の具体化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: N/A: 本 task は受入判定のみで新たな architecture decision を伴わない
- Deploy unit/environment: cloudflare-workers/hub (本 task は受入判定のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は受入判定のみで実コードへの変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-dual-catalog-web/acceptance-record.md (goal-spec acceptance 3件の確認結果と証跡)
- Consumed artifacts: docs/features/feat-dual-catalog-web/test-run-results.md, .dev-graph/staging/feature-package-feat-dual-catalog-web/goal-spec.json
- Write scope/touches: docs/features/feat-dual-catalog-web/acceptance-record.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-dual-catalog-web-p07) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-dual-catalog-web-p07 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-dual-catalog-web-p07) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-DUAL-CATALOG-WEB-P06] であり P06 完了後に着手する。resource_scope (docs/features/feat-dual-catalog-web/acceptance-record.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- acceptance 不充足時の実装修正そのもの (本 task は判定と記録のみ。修正は差し戻し先で行う)
- 新規テストケースの追加 (テスト設計は P04 の責務)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging/feature-package-feat-dual-catalog-web`
- Required evidence: acceptance-record.md に goal-spec acceptance 3件全ての確認結果 (pass) と証跡 (axe CIログ・CWV実測値・§6.1縮退動作確認記録) が記載されていること

## Rollout and rollback

- Rollout: acceptance-record.md を作成し、acceptance 3件全て pass を確認してから P08 (リファクタリング/マイグレーション) へ引き継ぐ
- Rollback trigger and steps: acceptance 3件のいずれかが不充足の場合、acceptance-record.md に理由を記録し P05 (実装) または P02 (設計) へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/spec-state.json qa_log (qa-011, qa-018)
- Detailed authoritative source: .dev-graph/staging/feature-package-feat-dual-catalog-web/goal-spec.json
- Architecture: N/A: 本 task は受入判定のみで architecture 参照を新たに追加しない
- Feature: feat-dual-catalog-web
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-DUAL-CATALOG-WEB-P06
