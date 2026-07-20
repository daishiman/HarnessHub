# System task overlay: リリース/デプロイ — Cloudflare Workers(wrangler)へのロールアウト・rollback手順・Stage 1完了判定

## Machine-readable registration fields

- feature_package_id: feature-package/feat-dual-catalog-web (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-dual-catalog-web", "macro-feature", "operations", "release-deploy"]
- related_nodes: ["feat-dual-catalog-web"]
- parent_feature: feat-dual-catalog-web
- phase_ref: P13
- classification: confidence=0.84, reason="apps/hub の catalog UI・marketplace.json出力をwranglerでCloudflare Workersへロールアウトし、rollback手順とStage 1完了条件(U5: 2社同時稼働)を判定するP13リリースタスク", candidates=[{artifact_kind: task, confidence: 0.84, candidate_path: tasks/feat-dual-catalog-web/sys-dual-catalog-web-p13.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P12 runbook.md までの成果物をもとに、apps/hub の catalog UI・marketplace.json 出力パイプラインを wrangler を用いて Cloudflare Workers へ本番ロールアウトし、smoke test を実施し、rollback 手順を確立するとともに、U5 (2 社以上の顧客 Workspace 同時稼働) の Stage 1 完了条件充足を判定する。

## 背景

apps/hub は @opennextjs/cloudflare 経由で単一 Cloudflare Worker としてデプロイされる規約になっている (docs/infrastructure-spec.md)。本 task では、S01-S04 画面と marketplace.json 出力を含む本番デプロイを実施し、catalog 一覧表示・詳細表示・publish 状況ポーリング・marketplace.json 配信・axe/CWV ゲート通過を含む smoke test を実行する。U5 成功基準 (2 社以上の顧客 Workspace で Hub が同時稼働し、それぞれの Workspace で公開と再利用が成立していること) の判定は提供者代表が行い、根拠を記録する運用となっているため、本 task はその判定に必要な証跡 (複数 Workspace での catalog 表示確認等) を整備する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-dual-catalog-web
- Entry gate: P12 (docs/features/feat-dual-catalog-web/runbook.md) が作成済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task はデプロイ・smoke testのみで frontend 実装物を変更しない
- Backend: N/A: 本 task はデプロイ・smoke testのみで backend 実装物を変更しない
- API: N/A: 本 task はデプロイ・smoke testのみで API 契約を変更しない
- Data: N/A: 本 feature は独自ドメインテーブルを新設しない
- Infrastructure: applicable + IaC/deploy: wrangler により apps/hub を Cloudflare Workers へロールアウトする
- Security: N/A: 本 task はデプロイ・smoke testのみでセキュリティ制御の変更を伴わない
- Quality: applicable + tests/gates: smoke test (catalog表示・publish状況ポーリング・marketplace.json配信・axe/CWVゲート通過) を実行する
- Documentation: applicable + change: docs/features/feat-dual-catalog-web/release-record.md を新規作成する
- Operations: applicable + runbook/monitoring: rollback 手順を確立し、U5 Stage 1 完了条件の判定根拠を記録する

## Architecture and deploy unit

- Architecture decisions: N/A: 本 task はデプロイのみで新たな architecture decision を伴わない
- Deploy unit/environment: cloudflare-workers/hub (wrangler CLI による本番デプロイ)
- Compatibility/migration/backfill: N/A: 本 feature は新規実装であり互換性移行を伴わない

## 成果物

- Produced artifacts: docs/features/feat-dual-catalog-web/release-record.md (本番デプロイ完了記録、smoke test結果、rollback手順、U5 Stage 1完了判定根拠)
- Consumed artifacts: docs/features/feat-dual-catalog-web/runbook.md, docs/infrastructure-spec.md
- Write scope/touches: docs/features/feat-dual-catalog-web/release-record.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-dual-catalog-web-p13) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-dual-catalog-web-p13 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-dual-catalog-web-p13) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-DUAL-CATALOG-WEB-P12] であり P12 完了後に着手する。resource_scope (docs/features/feat-dual-catalog-web/release-record.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 承認キュー UI (Stage 2 Governance) のリリース (本 feature のスコープ外)
- feat-publish-pipeline・feat-stage0-distribution-gate 側の個別デプロイ (それぞれの feature package が所有)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: release-record.md に本番デプロイ完了記録とsmoke test (catalog一覧表示・詳細表示・publish状況ポーリング・marketplace.json配信・axe/CWVゲート通過を含む) 全項目のpass結果が記載されていること

## Rollout and rollback

- Rollout: wrangler で本番へデプロイし、smoke test 全項目 pass を確認してから release-record.md へ記録する
- Rollback trigger and steps: smoke test のいずれかが fail した場合、本番デプロイを直前の安定版へロールバックし、release-record.md に原因を記録した上で該当する P05/P09 へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-dual-catalog-web.context.json` (`sha256:a0c5f78ef31fc345184884f4f48f60b0c9b2e5beaae7d9a83c0f789d13a6e9d3`)
- Phase responsibility: release/deploy/close-out と rollback 証跡を残し、N/A でも理由を確定する。
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

- System specification: system-spec/00-requirements-definition.md (U5)
- Detailed authoritative source: docs/infrastructure-spec.md
- Architecture: N/A: 本 task はデプロイのみで architecture 参照を新たに追加しない
- Feature: feat-dual-catalog-web
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-DUAL-CATALOG-WEB-P12
