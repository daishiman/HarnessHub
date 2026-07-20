# System task overlay: 品質・セキュリティ・運用保証 — テナント分離(deny-by-default)・§6.1縮退設計運用確認・SLOダッシュボード・WCAG/CWV最終確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-dual-catalog-web (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-dual-catalog-web", "macro-feature", "security", "quality-assurance"]
- related_nodes: ["feat-dual-catalog-web", "arch-harness-hub-backend"]
- parent_feature: feat-dual-catalog-web
- phase_ref: P09
- classification: confidence=0.85, reason="テナント分離(deny-by-default)がcatalog閲覧・install descriptor消費経路に一貫適用されていること、§6.1縮退設計(Hub停止中もSkill/WebApp動作継続)の運用確認、SLOダッシュボード反映、WCAG 2.2 AA/CWV goodの最終確認を行うP09品質保証タスク", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-dual-catalog-web/sys-dual-catalog-web-p09.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P08 の移行整理を経た実装に対し、テナント分離 (deny-by-default) が catalog 閲覧・install descriptor 消費経路に一貫適用されていること、Hub 障害・停止時の §6.1 縮退設計 (導入済み Skill・公開済み WebApp の動作継続) が運用面で確認済みであること、SLO ダッシュボードへの CWV 反映、WCAG 2.2 AA/axe/CWV の最終確認を行い、quality-assurance-report.md へ記録する。

## 背景

feat-auth-tenancy が所有する単一認可ミドルウェア (apps/hub/src/lib/authz/) を本 feature は消費するのみであるが、catalog 閲覧・install descriptor 消費の全経路でこのミドルウェアが正しく適用され、他テナントの Workspace データが混入しないことを確認する必要がある (deny-by-default)。また qa-011/qa-019 が定める §6.1 縮退設計は SLO の前提であり、Hub Worker 停止時にも導入済み Skill・公開済み Web App が動作継続することを運用観点で確認する。SLO ダッシュボードには CWV (LCP/INP/CLS) の継続計測値を反映し、WCAG 2.2 AA・axe・CWV の最終確認を本 feature のリリース直前ゲートとして実施する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-dual-catalog-web, arch-harness-hub-backend
- Entry gate: P08 (docs/features/feat-dual-catalog-web/refactoring-migration-note.md) が作成済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は品質・セキュリティ・運用保証確認のみで frontend 実装物を変更しない
- Backend: N/A: 本 task は確認のみで backend 実装物を変更しない
- API: N/A: 本 task は確認のみで API 契約を変更しない
- Data: N/A: 本 feature は独自ドメインテーブルを新設しない
- Infrastructure: N/A: 本 task は確認のみでインフラ変更を伴わない
- Security: applicable + control: apps/hub/src/lib/catalog/ の全経路でテナント分離 (deny-by-default) が適用されていることを確認する
- Quality: applicable + tests/gates: WCAG 2.2 AA・axe・CWV の最終確認、SLO ダッシュボードへの CWV 反映確認を行う
- Documentation: applicable + change: docs/features/feat-dual-catalog-web/quality-assurance-report.md を新規作成する
- Operations: applicable + runbook/monitoring: §6.1 縮退設計の運用確認 (Hub 停止時の Skill/WebApp 動作継続) を行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-backend (テナント分離・§6.1縮退設計の根拠)
- Deploy unit/environment: cloudflare-workers/hub (本 task は確認のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は確認のみで実コードへの変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-dual-catalog-web/quality-assurance-report.md (テナント分離確認結果・§6.1縮退設計運用確認結果・SLO反映確認・WCAG/axe/CWV最終確認の4項目)
- Consumed artifacts: apps/hub/src/lib/catalog/, docs/features/feat-dual-catalog-web/refactoring-migration-note.md, docs/security-spec.md
- Write scope/touches: apps/hub/src/lib/catalog/, docs/features/feat-dual-catalog-web/quality-assurance-report.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-dual-catalog-web-p09) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-dual-catalog-web-p09 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-dual-catalog-web-p09) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-DUAL-CATALOG-WEB-P08] であり P08 完了後に着手する。resource_scope (apps/hub/src/lib/catalog/) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 単一認可ミドルウェア自体の実装変更 (owner=feat-auth-tenancy。本 task は消費側の適用確認のみ)
- §6.1 縮退設計そのものの再定義 (system-spec qa-011 が正本。本 task は運用確認のみ)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: quality-assurance-report.md にテナント分離(deny-by-default)確認結果・§6.1縮退設計の運用確認結果・SLOダッシュボードへのCWV反映確認・WCAG 2.2 AA/axe/CWV最終確認の4項目全てが記載されていること

## Rollout and rollback

- Rollout: quality-assurance-report.md を作成し、4項目全て確認済みであることを確認してから P10 (独立最終レビュー) へ引き継ぐ
- Rollback trigger and steps: テナント分離または§6.1縮退設計の確認で不整合が見つかった場合、apps/hub/src/lib/catalog/ の該当実装を修正し本 task を再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-dual-catalog-web.context.json` (`sha256:a0c5f78ef31fc345184884f4f48f60b0c9b2e5beaae7d9a83c0f789d13a6e9d3`)
- Phase responsibility: 品質・security・operations・CI gate を現行正本に照らして保証する。
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

- System specification: system-spec/spec-state.json qa_log (qa-011, qa-018, qa-019)
- Detailed authoritative source: docs/security-spec.md
- Architecture: arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-dual-catalog-web
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-DUAL-CATALOG-WEB-P08
