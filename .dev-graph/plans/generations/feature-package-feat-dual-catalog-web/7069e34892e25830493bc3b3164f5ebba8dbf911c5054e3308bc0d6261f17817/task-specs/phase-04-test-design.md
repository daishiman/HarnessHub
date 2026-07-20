# System task overlay: テストファースト設計 — axe自動検査・Playwright J1/J2ジャーニー×2 viewport・Lighthouse CWV予算・marketplace.jsonスキーマ検証・ポーリングbackoff契約のテスト設計

## Machine-readable registration fields

- feature_package_id: feature-package/feat-dual-catalog-web (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-dual-catalog-web", "macro-feature", "quality", "test-design"]
- related_nodes: ["feat-dual-catalog-web", "arch-harness-hub-frontend"]
- parent_feature: feat-dual-catalog-web
- phase_ref: P04
- classification: confidence=0.84, reason="quality_constraints 7件・acceptance 3件に対応するaxe自動検査・Playwright J1/J2ジャーニー(2 viewport)・Lighthouse CWV予算・marketplace.jsonスキーマ検証・ポーリングbackoff契約のテストケースを設計するP04タスク", candidates=[{artifact_kind: task, confidence: 0.84, candidate_path: tasks/feat-dual-catalog-web/sys-dual-catalog-web-p04.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P03 design-review-notes.md でレビュー済みの設計をもとに、goal-spec の acceptance 3 件と quality_constraints 7 件全てに対応するテストケース (Vitest 部品テスト、Playwright J1/J2 ジャーニー×2 viewport、axe 自動検査、Lighthouse CWV 計測、marketplace.json スキーマ検証、ポーリング backoff 契約テスト) を実装着手前に設計し、テストスタブを準備する。

## 背景

docs/frontend-spec.md では、テスト方針として Vitest (コンポーネント・辞書・状態マッピング・チャートの単体テスト) と Playwright (J1-J6 ジャーニー × 2 viewport [1280×800 / 390×844] + axe 統合) の併用が確定している。本 feature が担う画面は S01(一覧)/S02(詳細・インストール)/S03(公開状態表示)/S04(Workspace設定・Release履歴) であり、これに対応するジャーニーは J1(カタログ閲覧・導入)・J2(公開状態確認) を中心とする。axe 自動チェックは検出可能違反ゼロをリリース条件とし (qa-018)、CWV は Lighthouse で LCP 2.5 秒以下・INP 200 ミリ秒以下・CLS 0.1 以下を計測する。marketplace.json はスキーマ検証 (packages/schemas/dual-catalog-web/ の zod スキーマ) でフォーマット正当性を担保し、ポーリング (2 秒間隔からの backoff) はネットワークエラー時のリトライ上限・レート制御をテストで検証する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-dual-catalog-web, arch-harness-hub-frontend
- Entry gate: P03 (docs/features/feat-dual-catalog-web/design-review-notes.md) が作成済みであり、重大な指摘が残っていないこと
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: applicable + change: Playwright J1/J2 ジャーニー (2 viewport) のテストシナリオを設計する
- Backend: N/A: 本 task は frontend 消費側のテスト設計のみで backend 実装物を変更しない
- API: applicable + contract: install descriptor 取得・ポーリング backoff 契約のテストケース (正常系・エラー時リトライ上限) を設計する
- Data: N/A: 本 feature は独自ドメインテーブルを新設しない
- Infrastructure: N/A: CI ワークフロー構成は P05 で実装する。本 task はテストケース設計のみ
- Security: applicable + control: テナント分離境界を跨いだ catalog 表示が発生しないことのテストケースを設計する
- Quality: applicable + change: axe自動検査・Lighthouse CWV予算・marketplace.jsonスキーマ検証のテストケースを acceptance 3件・quality_constraints 7件と対応付けて設計する
- Documentation: applicable + change: docs/features/feat-dual-catalog-web/test-design.md を新規作成する
- Operations: N/A: 運用手順の具体化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend (P02 architecture-decision-record.md を踏襲)
- Deploy unit/environment: cloudflare-workers/hub (本 task はテスト設計のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task はテスト設計のみで実コードへの変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-dual-catalog-web/test-design.md (quality_constraints 7件・acceptance 3件対応のテストケース一覧), apps/hub/src/__tests__/dual-catalog-web/ (テストスタブ)
- Consumed artifacts: docs/features/feat-dual-catalog-web/design-review-notes.md, docs/features/feat-dual-catalog-web/requirements-baseline.md, docs/frontend-spec.md
- Write scope/touches: docs/features/feat-dual-catalog-web/test-design.md, apps/hub/src/__tests__/dual-catalog-web/

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-dual-catalog-web-p04) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-dual-catalog-web-p04 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-dual-catalog-web-p04) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-DUAL-CATALOG-WEB-P03] であり P03 完了後に着手する。resource_scope (docs/features/feat-dual-catalog-web/test-design.md, apps/hub/src/__tests__/dual-catalog-web/) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- テストの実際の実行 (本 task は設計・スタブ作成のみ。実行は P06 で行う)
- 実装コード本体の作成 (本 task はテスト設計のみ。実装は P05 で行う)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: test-design.md に quality_constraints 7件と acceptance 3件全てに対応するテストケースが記載され、apps/hub/src/__tests__/dual-catalog-web/ にスタブが作成されていること

## Rollout and rollback

- Rollout: test-design.md とテストスタブを作成し、quality_constraints/acceptance との対応漏れがないことを確認してから P05 (実装) へ引き継ぐ
- Rollback trigger and steps: quality_constraints とテストケースの対応漏れが判明した場合、test-design.md の対応表を修正し不足カテゴリを追加する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-dual-catalog-web.context.json` (`sha256:a0c5f78ef31fc345184884f4f48f60b0c9b2e5beaae7d9a83c0f789d13a6e9d3`)
- Phase responsibility: 全 acceptance と品質制約を実装前のテストケースへ写像する。
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

- System specification: system-spec/spec-state.json qa_log (qa-018, qa-009, qa-062)
- Detailed authoritative source: docs/frontend-spec.md (§ テスト方針)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md)
- Feature: feat-dual-catalog-web
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-DUAL-CATALOG-WEB-P03
