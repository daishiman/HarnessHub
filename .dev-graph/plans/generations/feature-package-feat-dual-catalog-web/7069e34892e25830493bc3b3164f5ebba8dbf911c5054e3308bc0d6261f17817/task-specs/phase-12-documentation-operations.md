# System task overlay: 文書化・runbook・引き継ぎ — カタログ利用者/管理者向け手順・marketplace.json形式文書・障害時縮退runbook・更新通知導線の文書化

## Machine-readable registration fields

- feature_package_id: feature-package/feat-dual-catalog-web (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-dual-catalog-web", "macro-feature", "documentation", "runbook"]
- related_nodes: ["feat-dual-catalog-web"]
- parent_feature: feat-dual-catalog-web
- phase_ref: P12
- classification: confidence=0.82, reason="利用者/管理者向けカタログ操作手順、marketplace.json形式の文書化、Hub障害時の§6.1縮退運用runbook、plugin更新通知導線の運用手順を確立するP12文書化タスク", candidates=[{artifact_kind: task, confidence: 0.82, candidate_path: tasks/feat-dual-catalog-web/sys-dual-catalog-web-p12.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P11 evidence-summary.md までの成果物をもとに、カタログ利用者/管理者向け操作手順、marketplace.json 形式仕様の文書化、Hub 障害時の §6.1 縮退運用 runbook、plugin 更新通知導線の運用手順を runbook.md へ確立し、P13 (リリース/デプロイ) へ引き継ぐ準備を整える。

## 背景

本 feature は S01(一覧)/S02(詳細・インストール)/S03(公開状態表示)/S04(Workspace設定・Release履歴) の 4 画面を提供し、利用者は業務ツールの発見・導入、管理者は Workspace 設定・Release 履歴確認を行う。marketplace.json は feat-stage0-distribution-gate が確定した配布経路 (URL 型 marketplace または Bootstrap Installer) への連携出力であり、その形式仕様を文書化することで運用者が出力内容を検証できるようにする。Hub 障害時には §6.1 縮退設計 (qa-011) により導入済み Skill・公開済み Web App が動作継続するが、この間 catalog UI 自体は新規公開・更新の表示ができなくなるため、運用者向けの縮退時対応手順 (何が止まり何が継続するか、利用者への案内文言) を runbook 化する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-dual-catalog-web
- Entry gate: P11 (docs/features/feat-dual-catalog-web/evidence-summary.md) が作成済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は文書化のみで frontend 実装物を変更しない
- Backend: N/A: 本 task は文書化のみで backend 実装物を変更しない
- API: N/A: 本 task は文書化のみで API 契約を変更しない
- Data: N/A: 本 feature は独自ドメインテーブルを新設しない
- Infrastructure: N/A: 本 task は文書化のみでインフラ変更を伴わない
- Security: N/A: 本 task は文書化のみでセキュリティ制御の変更を伴わない
- Quality: N/A: 本 task は文書化のみで新規テストを追加しない
- Documentation: applicable + docs: docs/features/feat-dual-catalog-web/runbook.md を新規作成する
- Operations: applicable + runbook/monitoring: Hub 障害時§6.1縮退運用手順、plugin更新通知導線の運用手順を確立する

## Architecture and deploy unit

- Architecture decisions: N/A: 本 task は文書化のみで新たな architecture decision を伴わない
- Deploy unit/environment: cloudflare-workers/hub (本 task は文書化のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は文書化のみで実コードへの変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-dual-catalog-web/runbook.md (利用者/管理者向け操作手順・marketplace.json形式仕様・Hub障害時§6.1縮退runbook・plugin更新通知導線運用の4項目)
- Consumed artifacts: docs/features/feat-dual-catalog-web/evidence-summary.md, docs/infrastructure-spec.md
- Write scope/touches: docs/features/feat-dual-catalog-web/runbook.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-dual-catalog-web-p12) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-dual-catalog-web-p12 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-dual-catalog-web-p12) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-DUAL-CATALOG-WEB-P11] であり P11 完了後に着手する。resource_scope (docs/features/feat-dual-catalog-web/runbook.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 承認キュー UI (Stage 2 Governance) の運用手順 (本 feature のスコープ外)
- PublishRequest 状態機械自体の運用手順 (owner=feat-publish-pipeline)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: runbook.md にカタログ利用者/管理者向け操作手順・marketplace.json形式仕様・Hub障害時§6.1縮退runbook・plugin更新通知導線運用の4項目全てが記載されていること

## Rollout and rollback

- Rollout: runbook.md を作成し、4項目全てが記載済みであることを確認してから P13 (リリース/デプロイ) へ引き継ぐ
- Rollback trigger and steps: runbook.md の手順が実装と矛盾することが判明した場合、該当箇所を修正し本 task を再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-dual-catalog-web.context.json` (`sha256:a0c5f78ef31fc345184884f4f48f60b0c9b2e5beaae7d9a83c0f789d13a6e9d3`)
- Phase responsibility: 検証済み実装の運用・runbook・handover を文書化し、先行 phase の前提にしない。
- Purpose: 利用者・管理者が Skill/WebApp を発見・導入できる dual catalog UI と配布出口 (marketplace 出力 / Bootstrap Installer 連携) を、WCAG 2.2 AA + CWV good (qa-018) の品質で提供する
- Goal: 2 社の顧客 Workspace が同時にカタログを閲覧・導入でき (U5)、a11y/速度の品質ゲートが CI で強制される状態
- Scope in (all items are in-scope for the package; this phase owns the subset matching its responsibility):
- dual catalog 閲覧 UI (レスポンシブ)
- publish 状況表示 (ポーリング)
- marketplace.json 出力 + 採用配布経路連携
- axe 自動チェック CI
- CWV 計測 (LCP/INP/CLS)
- Scope out:
- 承認キュー UI (Stage 2)
- native アプリ
- Acceptance (P04/P06/P07/P10/P11 must preserve exact coverage):
- axe 検出可能違反 0 がリリース条件として CI に存在する
- CWV 全指標 good を実測で満たす
- 導入済み Skill が Hub 停止中も動作継続する (§6.1 縮退)
- Architecture/source refs:
- architecture/harness-hub-frontend.md
- architecture/harness-hub-backend.md
- specs/harness-hub-system-specification.md

This section is the current source closure and supersedes older counts or wording in this task when they conflict with the pinned feature context.

## 参照情報

- System specification: system-spec/spec-state.json qa_log (qa-003, qa-011)
- Detailed authoritative source: docs/infrastructure-spec.md
- Architecture: N/A: 本 task は文書化のみで architecture 参照を新たに追加しない
- Feature: feat-dual-catalog-web
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-DUAL-CATALOG-WEB-P11
