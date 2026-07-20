# System task overlay: 独立設計レビュー — S01-S04画面構成・install descriptor契約・ポーリング設計・marketplace.json生成方式の妥当性確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-dual-catalog-web (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-dual-catalog-web", "macro-feature", "quality", "design-review"]
- related_nodes: ["feat-dual-catalog-web", "arch-harness-hub-frontend"]
- parent_feature: feat-dual-catalog-web
- phase_ref: P03
- classification: confidence=0.83, reason="P02で確定した画面構成・install descriptor契約・ポーリング設計・marketplace.json生成方式を、実装着手前に独立観点で妥当性確認するP03設計レビュータスク", candidates=[{artifact_kind: task, confidence: 0.83, candidate_path: tasks/feat-dual-catalog-web/sys-dual-catalog-web-p03.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P02 architecture-decision-record.md で確定した S01-S04 画面構成、install descriptor 消費契約、ポーリング (2 秒間隔からの backoff) 実装方式、marketplace.json 生成パイプラインの方式決定を、設計者本人以外の独立観点でレビューし、実装 (P05) 着手前に問題を検出・是正する。

## 背景

system-task-spec-template.md が定める P03 (design-review) は、architecture decision が実装可能な粒度で確定しており、かつ cross-feature 境界 (feat-publish-pipeline・feat-stage0-distribution-gate) の消費方針に矛盾がないことを、設計フェーズと実装フェーズの間に独立して確認する役割を持つ。特に本 feature では、install descriptor のポーリング契約 (2 秒間隔からの backoff) が axe/CWV 品質ゲート (qa-018) と矛盾なく共存できるか (ポーリングによる再レンダリングが CLS/INP を悪化させないか)、marketplace.json 生成方式が feat-stage0-distribution-gate の判定結果を正しく消費しているか、という 2 点が主要なレビュー観点となる。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-dual-catalog-web, arch-harness-hub-frontend
- Entry gate: P02 (docs/features/feat-dual-catalog-web/architecture-decision-record.md) が作成済みであり、4系統の architecture decision が記載されていること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は設計成果物のレビューのみで frontend 実装物を変更しない
- Backend: N/A: 本 task は設計成果物のレビューのみで backend 実装物を変更しない
- API: applicable + contract: install descriptor 消費契約・ポーリング契約の妥当性 (エラー時のリトライ上限、レート制御) をレビューする
- Data: N/A: 本 feature は独自ドメインテーブルを新設しない
- Infrastructure: N/A: デプロイ単位の変更を伴わない
- Security: applicable + control: catalog 閲覧・install descriptor 消費経路のテナント分離 (deny-by-default) 方針が P02 で正しく反映されているかレビューする
- Quality: applicable + change: ポーリングによる再レンダリングが CWV (CLS/INP) を悪化させない設計になっているかをレビューする
- Documentation: applicable + change: docs/features/feat-dual-catalog-web/design-review-notes.md を新規作成する
- Operations: N/A: 運用手順の具体化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend (P02 architecture-decision-record.md の4系統決定を対象とする)
- Deploy unit/environment: cloudflare-workers/hub (本 task はレビューのみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task はレビューのみで実コードへの変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-dual-catalog-web/design-review-notes.md (P02 の4系統 architecture decision それぞれについての妥当性確認結果)
- Consumed artifacts: docs/features/feat-dual-catalog-web/architecture-decision-record.md, docs/features/feat-dual-catalog-web/requirements-baseline.md
- Write scope/touches: docs/features/feat-dual-catalog-web/design-review-notes.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-dual-catalog-web-p03) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-dual-catalog-web-p03 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-dual-catalog-web-p03) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-DUAL-CATALOG-WEB-P02] であり P02 完了後に着手する。resource_scope (docs/features/feat-dual-catalog-web/design-review-notes.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- P02 architecture decision の再設計そのもの (指摘があれば P02 へ差し戻し、本 task はレビュー結果の記録のみを行う)
- 実装コードの作成 (本 task はレビューのみ)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging/feature-package-feat-dual-catalog-web`
- Required evidence: docs/features/feat-dual-catalog-web/design-review-notes.md に P02 の4系統決定それぞれについてのレビュー結果 (問題なし、または是正指示と差し戻し先) が記載されていること

## Rollout and rollback

- Rollout: design-review-notes.md を作成し、指摘事項がない (または是正済み) ことを確認してから P04 (テストファースト設計) へ引き継ぐ
- Rollback trigger and steps: 画面構成・install descriptor契約・ポーリング設計・marketplace.json生成方式のいずれかに重大な指摘が見つかった場合、design-review-notes.md に指摘内容を記録し P02 へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/00-requirements-definition.md (I4, I6, I9), system-spec/spec-state.json qa_log (qa-003, qa-009, qa-018, qa-062)
- Detailed authoritative source: docs/features/feat-dual-catalog-web/architecture-decision-record.md
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md)
- Feature: feat-dual-catalog-web
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-DUAL-CATALOG-WEB-P02
