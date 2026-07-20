# System task overlay: ドキュメント/運用 — S15 運用手順・AI キュー監視・監査運用の runbook 作成

## Machine-readable registration fields

- feature_package_id: feature-package/feat-docs-cms (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-docs-cms", "studio-extension", "docs-cms", "documentation", "operations"]
- related_nodes: ["feat-docs-cms", "arch-harness-hub-frontend", "arch-harness-hub-backend"]
- parent_feature: feat-docs-cms
- phase_ref: P12
- classification: confidence=0.85, reason="P11 のエビデンスを踏まえ S15 運用手順・AI キュー滞留監視・doc 編集監査運用を runbook 化する P12 タスク", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-docs-cms/sys-docs-cms-p12.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

S15 一覧/閲覧/編集画面の運用手順、AI 下書きキュー (doc kind) の滞留監視方法、doc 編集監査 event の確認手順を runbook.md にまとめ、feature 引き継ぎ後の運用担当が参照できる状態にする。

## 背景

feature-execution-package-contract.md §3 は P12 を「ドキュメント/runbook/引き継ぎ」と定める。P05 実装時点では AI キュー滞留監視・監査運用の具体化を P09/P12 に委譲していたため、本 task でその具体化を完了させる必要がある。D5 の pull 型キューは push 型と異なりジョブが取得されないまま滞留するリスクがあるため、監視手順の明文化が運用上必須である。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-docs-cms, arch-harness-hub-frontend, arch-harness-hub-backend
- Entry gate: sys-docs-cms-p11 の evidence/index.md が作成済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: applicable + change: S15 一覧/閲覧/編集画面の操作手順を runbook.md に記載する
- Backend: N/A: backend 実装物自体は変更しない
- API: N/A: API 契約自体は変更しない
- Data: N/A: データスキーマ自体は変更しない
- Infrastructure: N/A: 本 feature は追加インフラを新設しない
- Security: applicable + change: doc 編集監査 event の確認手順と AI キュー認可 (Device Flow token) の運用手順を runbook.md に記載する
- Quality: N/A: 品質ゲート自体の確認は P09 で完了済み
- Documentation: applicable + change: docs/features/feat-docs-cms/runbook.md を新規作成する
- Operations: applicable + change: AI 下書きキュー (doc kind) の滞留監視手順を runbook.md に記載する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub (本 task は runbook 作成のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は文書化のみで実変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-docs-cms/runbook.md (S15 運用手順・AI キュー滞留監視手順・doc 編集監査確認手順)
- Consumed artifacts: docs/features/feat-docs-cms/evidence/index.md, docs/features/feat-docs-cms/architecture-decision-record.md
- Write scope/touches: docs/features/feat-docs-cms/runbook.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-docs-cms-p12) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-docs-cms-p12 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-docs-cms-p12) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: sys-docs-cms-p11 完了後に着手する。resource_scope (docs/features/feat-docs-cms/runbook.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- Markdown レンダラ/エディタ部品自体の運用ドキュメント (design system 共通部品。owner は feat-hub-foundation)
- AI 実行基盤のサーバ側運用ドキュメント (D5 で不採用)
- AiJob キュー共通層自体の運用ドキュメント一般化 (上流論点)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: runbook.md に S15 運用手順・AI キュー滞留監視手順・doc 編集監査確認手順の 3 項目が記載されていること

## Rollout and rollback

- Rollout: runbook.md を作成し、3 項目すべての記載を確認してから P13 リリース/デプロイへ引き継ぐ
- Rollback trigger and steps: runbook.md の記載が P11 エビデンスと矛盾する場合、矛盾箇所を記録し sys-docs-cms-p11 を再確認対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/ui-ux.md (qa-021 S15), system-spec/00-requirements-definition.md (D5), system-spec/security.md (qa-025 SEC6/SEC8)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-docs-cms
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-docs-cms-p11
