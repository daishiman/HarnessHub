# System task overlay: 再現可能な証跡 — P06/P07/P09/P10の証跡集約と再現手順確立

## Machine-readable registration fields

- feature_package_id: feature-package/feat-dual-catalog-web (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-dual-catalog-web", "macro-feature", "quality", "evidence"]
- related_nodes: ["feat-dual-catalog-web"]
- parent_feature: feat-dual-catalog-web
- phase_ref: P11
- classification: confidence=0.82, reason="P06(テスト実行)/P07(受入)/P09(品質保証)/P10(最終レビュー)の証跡を集約し、再現コマンド列を確立するP11証跡タスク", candidates=[{artifact_kind: task, confidence: 0.82, candidate_path: tasks/feat-dual-catalog-web/sys-dual-catalog-web-p11.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P06 (テスト実行)・P07 (受入)・P09 (品質保証)・P10 (最終レビュー) で得られた証跡 (axe CI ログ、Lighthouse CWV 実測値、テナント分離確認記録、§6.1 縮退動作確認記録等) を evidence-summary.md へ集約し、第三者が再現可能なコマンド列を確立する。

## 背景

goal-spec の quality_constraints 7 件はいずれも machine-verifiable な受入基準として記述されており、リリース後の監査や再現検証のために、各制約の判定に用いたコマンドと出力を一箇所に集約しておく必要がある。本 task はその集約作業を担い、P12 (文書化) の runbook.md からも参照される基礎資料となる。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-dual-catalog-web
- Entry gate: P10 (docs/features/feat-dual-catalog-web/final-review-record.md) が作成済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は証跡集約のみで frontend 実装物を変更しない
- Backend: N/A: 本 task は証跡集約のみで backend 実装物を変更しない
- API: N/A: 本 task は証跡集約のみで API 契約を変更しない
- Data: N/A: 本 feature は独自ドメインテーブルを新設しない
- Infrastructure: N/A: 本 task は証跡集約のみでインフラ変更を伴わない
- Security: N/A: 本 task は既存確認結果の集約のみでセキュリティ制御の変更を伴わない
- Quality: applicable + tests/gates: quality_constraints 7件それぞれの再現コマンド列を確立する
- Documentation: applicable + change: docs/features/feat-dual-catalog-web/evidence-summary.md を新規作成する
- Operations: N/A: 運用手順の具体化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: N/A: 本 task は証跡集約のみで新たな architecture decision を伴わない
- Deploy unit/environment: cloudflare-workers/hub (本 task は証跡集約のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は証跡集約のみで実コードへの変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-dual-catalog-web/evidence-summary.md (quality_constraints 7件の再現コマンド列と結果)
- Consumed artifacts: docs/features/feat-dual-catalog-web/test-run-results.md, docs/features/feat-dual-catalog-web/acceptance-record.md, docs/features/feat-dual-catalog-web/quality-assurance-report.md, docs/features/feat-dual-catalog-web/final-review-record.md
- Write scope/touches: docs/features/feat-dual-catalog-web/evidence-summary.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-dual-catalog-web-p11) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-dual-catalog-web-p11 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-dual-catalog-web-p11) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-DUAL-CATALOG-WEB-P10] であり P10 完了後に着手する。resource_scope (docs/features/feat-dual-catalog-web/evidence-summary.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 新規テスト・確認作業の実施 (本 task は既存証跡の集約のみ)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: evidence-summary.md に quality_constraints 7件それぞれの再現コマンド列と対応する結果が記載されていること

## Rollout and rollback

- Rollout: evidence-summary.md を作成し、再現コマンド列が全て記載済みであることを確認してから P12 (文書化・runbook・引き継ぎ) へ引き継ぐ
- Rollback trigger and steps: 集約対象の証跡に欠落・矛盾が見つかった場合、該当する P06/P07/P09/P10 へ差し戻し再取得を依頼する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-dual-catalog-web.context.json` (`sha256:a0c5f78ef31fc345184884f4f48f60b0c9b2e5beaae7d9a83c0f789d13a6e9d3`)
- Phase responsibility: P06・P07・P09・P10 の証跡を source digest 付きで集約する。
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

- System specification: goal-spec.json
- Detailed authoritative source: docs/features/feat-dual-catalog-web/test-run-results.md
- Architecture: N/A: 本 task は証跡集約のみで architecture 参照を新たに追加しない
- Feature: feat-dual-catalog-web
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-DUAL-CATALOG-WEB-P10
