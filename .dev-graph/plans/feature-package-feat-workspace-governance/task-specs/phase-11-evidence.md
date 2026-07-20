# System task overlay: エビデンス集約 — P04〜P10成果物の証跡パッケージ化

## Machine-readable registration fields

- feature_package_id: feature-package/feat-workspace-governance (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-workspace-governance", "macro-feature", "quality", "evidence"]
- related_nodes: ["feat-workspace-governance"]
- parent_feature: feat-workspace-governance
- phase_ref: P11
- classification: confidence=0.82, reason="P04テスト設計・P06テスト実行・P07受入・P09品質保証・P10最終レビューの各成果物を単一の証跡パッケージへ集約するP11タスク", candidates=[{artifact_kind: task, confidence: 0.82, candidate_path: tasks/feat-workspace-governance/sys-workspace-governance-p11.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P04 (test-design.md)・P06 (test-run-results.md)・P07 (acceptance-record.md)・P09 (quality-assurance-report.md)・P10 (final-review-decision.md) の各成果物を参照リンクとして単一の証跡パッケージ evidence-package.md に集約し、監査・追跡可能性を確保する。

## 背景

feature 全体の完了判定根拠は複数 phase の成果物に分散しているため、後続の運用・監査担当者が個別ファイルを辿らなくても全体像を把握できるよう、証跡へのポインタと結論のサマリを一箇所にまとめる。evidence-package.md は新たな判定を行わず、既存成果物への参照と既存結論の転記のみを行う。転記の際は各 phase の pass/fail 結論をそのまま引用し、独自の再判定は行わない。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-workspace-governance
- Entry gate: P10 (final-review-decision.md) が完了し、feature 全体の最終合否が pass と判定された状態であること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は証跡集約文書化のみで frontend 実装物を変更しない
- Backend: N/A: 本 task は証跡集約文書化のみで backend 実装物を変更しない
- API: N/A: 本 task は証跡集約文書化のみ
- Data: N/A: 本 task は証跡集約文書化のみ
- Infrastructure: N/A: 本feature は追加インフラを新設しない
- Security: N/A: 本 task はセキュリティ判定の再実施を行わず、既存判定結果の集約のみ
- Quality: applicable + change: P04/P06/P07/P09/P10 の成果物への参照と結論を evidence-package.md に集約する
- Documentation: applicable + change: docs/features/feat-workspace-governance/evidence-package.md を新規作成する
- Operations: N/A: 運用証跡は P13 で扱う

## Architecture and deploy unit

- Architecture decisions: N/A: 本 task は既存成果物の集約のみで新規決定を行わない
- Deploy unit/environment: cloudflare-workers/hub (本 task は証跡集約のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は証跡集約のみで実コード・実 migration への変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-workspace-governance/evidence-package.md (P04/P06/P07/P09/P10 の成果物への参照リンクと結論サマリを含む)
- Consumed artifacts: docs/features/feat-workspace-governance/test-design.md, docs/features/feat-workspace-governance/test-run-results.md, docs/features/feat-workspace-governance/acceptance-record.md, docs/features/feat-workspace-governance/quality-assurance-report.md, docs/features/feat-workspace-governance/final-review-decision.md
- Write scope/touches: docs/features/feat-workspace-governance/evidence-package.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue番号 + dev-graph graph_node_id (sys-workspace-governance-p11) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-workspace-governance-p11 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-workspace-governance-p11) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-WORKSPACE-GOVERNANCE-P10] のため P10 完了後に着手する。resource_scope (docs/features/feat-workspace-governance/evidence-package.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 各 phase 成果物の再判定・再実行 (集約と転記のみ)
- 新規テスト・新規実装の追加

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging/feature-package-feat-workspace-governance`
- Required evidence: evidence-package.md に P04/P06/P07/P09/P10 の成果物への参照リンクと各成果物の pass 結論が漏れなく集約されていること

## Rollout and rollback

- Rollout: evidence-package.md を作成し、P04〜P10 の全成果物への参照漏れがないことを確認してから P12 へ引き継ぐ
- Rollback trigger and steps: 参照先成果物に矛盾・欠落が判明した場合、evidence-package.md の集約内容を修正し不足参照を補う

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/00-requirements-definition.md U9 (I8)
- Detailed authoritative source: docs/features/feat-workspace-governance/final-review-decision.md
- Architecture: N/A: 本 task は既存成果物の集約のみ
- Feature: feat-workspace-governance
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-WORKSPACE-GOVERNANCE-P10 (最終レビュー)
