# System task overlay: 最終レビュー — goal-spec 6件quality_constraints・3件acceptanceの全件最終合否判定

## Machine-readable registration fields

- feature_package_id: feature-package/feat-workspace-governance (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-workspace-governance", "macro-feature", "quality", "final-review"]
- related_nodes: ["feat-workspace-governance"]
- parent_feature: feat-workspace-governance
- phase_ref: P10
- classification: confidence=0.85, reason="P07受入・P09品質保証の結果を統合し、goal-spec quality_constraints 6件とacceptance 3件の全件最終合否をfeature全体として判定するP10タスク", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-workspace-governance/sys-workspace-governance-p10.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P07 (acceptance-record.md) と P09 (quality-assurance-report.md) の結果を統合し、goal-spec の acceptance 3 件と quality_constraints 6 件の全件について feature 全体としての最終合否を判定する。

## 背景

最終レビューは個別 phase の合否判定を単純に足し合わせるのではなく、P01 (requirements-baseline.md) で転記した goal-spec 原文と、P02〜P09 の全成果物を突き合わせ、feature 全体として一貫性・完全性・feature 境界順守 (feat-dual-catalog-web/feat-auth-tenancy への依存が正しく非コピーで扱われていること、feat-user-org-admin 所有 S17 が変更されていないこと、feat-publish-pipeline 所有の PublishRequest 状態機械本体が変更されていないこと) を最終確認する。判定は final-review-decision.md に「pass」または「差し戻し (差し戻し先 phase を明記)」のいずれかで記録する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-workspace-governance
- Entry gate: P09 (quality-assurance-report.md) が完了し、quality_constraints 6 件全件が横断的に pass と判定された状態であること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は最終レビュー文書化のみで frontend 実装物を変更しない
- Backend: N/A: 本 task は最終レビュー文書化のみで backend 実装物を変更しない
- API: N/A: 本 task は最終レビュー文書化のみ
- Data: N/A: 本 task は最終レビュー文書化のみ
- Infrastructure: N/A: 本feature は追加インフラを新設しない
- Security: applicable + verify: feature 境界順守 (cross-feature 非侵犯) を含む最終セキュリティレビューを行う
- Quality: applicable + change: acceptance 3 件・quality_constraints 6 件の全件最終合否を final-review-decision.md に記録する
- Documentation: applicable + change: docs/features/feat-workspace-governance/final-review-decision.md を新規作成する
- Operations: N/A: 運用最終確認は P13 で行う

## Architecture and deploy unit

- Architecture decisions: N/A: 本 task は既存 architecture decision の最終確認のみで新規決定を行わない
- Deploy unit/environment: cloudflare-workers/hub (本 task は最終レビューのみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は最終レビューのみで実コード・実 migration への変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-workspace-governance/final-review-decision.md (acceptance 3 件・quality_constraints 6 件の全件最終合否判定を含む)
- Consumed artifacts: docs/features/feat-workspace-governance/requirements-baseline.md, docs/features/feat-workspace-governance/acceptance-record.md, docs/features/feat-workspace-governance/quality-assurance-report.md
- Write scope/touches: docs/features/feat-workspace-governance/final-review-decision.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue番号 + dev-graph graph_node_id (sys-workspace-governance-p10) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-workspace-governance-p10 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-workspace-governance-p10) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-WORKSPACE-GOVERNANCE-P09] のため P09 完了後に着手する。resource_scope (docs/features/feat-workspace-governance/final-review-decision.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 実装コード・テストの修正 (差し戻しが必要な場合は該当 phase に理由を記録して差し戻すのみで、本 task 自体では修正しない)
- 新規 architecture decision の追加

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging/feature-package-feat-workspace-governance`
- Required evidence: final-review-decision.md に acceptance 3 件・quality_constraints 6 件全件の最終合否 (pass) と、feature 境界順守 (feat-dual-catalog-web/feat-auth-tenancy 非コピー、feat-user-org-admin S17 非変更、feat-publish-pipeline 状態機械非変更) の確認結果が記載されていること

## Rollout and rollback

- Rollout: final-review-decision.md を作成し、全件 pass が確認されてから P11 へ引き継ぐ
- Rollback trigger and steps: acceptance/quality_constraints のいずれかが最終的に不充足と判定された場合、final-review-decision.md に理由と差し戻し先 phase を記録し当該 phase へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/00-requirements-definition.md U9 (I8)
- Detailed authoritative source: .dev-graph/staging/feature-package-feat-workspace-governance/goal-spec.json (acceptance, quality_constraints フィールド)
- Architecture: N/A: 本 task は既存 architecture decision の最終確認のみ
- Feature: feat-workspace-governance
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-WORKSPACE-GOVERNANCE-P09 (品質保証)
