# System task overlay: 受入 — goal-spec acceptance 3 項目の確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-hearing-intake (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-hearing-intake", "studio-extension", "async-ai-queue", "acceptance"]
- related_nodes: ["feat-hearing-intake", "arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data"]
- parent_feature: feat-hearing-intake
- phase_ref: P07
- classification: confidence=0.87, reason="P06 のテスト結果を goal-spec の acceptance 3 項目に照らして受入判定する P07 タスク", candidates=[{artifact_kind: task, confidence: 0.87, candidate_path: tasks/feat-hearing-intake/sys-hearing-intake-p07.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P06 のテスト結果を goal-spec の acceptance 3 項目 (受付番号発番+生成中状態表示、AI キュー pull→書戻し完結でサーバ側課金なし、Markdown sanitize 済み描画) に照らして受入可否を判定する。

## 背景

acceptance はテスト個別項目の pass/fail とは別の粒度で「feature として提供すべき体験が成立しているか」を確認する必要がある。本 task は P06 のテスト結果を根拠として acceptance 3 項目それぞれを機械的に判定する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-hearing-intake, sys-hearing-intake-p06
- Entry gate: docs/features/feat-hearing-intake/test-run-report.md で全テストが pass 済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: applicable + change: acceptance 項目 1 (受付番号発番+生成中状態表示の非同期 UI パターン) の受入確認を行う
- Backend: applicable + change: acceptance 項目 2 (AI キューの pull→書戻し完結でサーバ側 AI 課金が発生しないこと) の受入確認を行う
- API: N/A: API 契約変更を伴わない受入確認のみ
- Data: N/A: データ構造変更を伴わない受入確認のみ
- Infrastructure: N/A: インフラ変更を伴わない受入確認のみ
- Security: applicable + change: acceptance 項目 3 (Markdown が sanitize 済みで描画されること、SEC7) の受入確認を行う
- Quality: applicable + change: acceptance 3 項目全件の判定結果を acceptance-report.md へ記録する
- Documentation: applicable + change: docs/features/feat-hearing-intake/acceptance-report.md を新規作成する
- Operations: N/A: 運用手順の確認は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend, arch-harness-hub-data
- Deploy unit/environment: cloudflare-workers/hub (受入確認のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は受入確認のみで対象物への変更を行わない

## 成果物

- Produced artifacts: docs/features/feat-hearing-intake/acceptance-report.md (acceptance 3 項目それぞれの判定結果と根拠)
- Consumed artifacts: docs/features/feat-hearing-intake/test-run-report.md, goal-spec.json
- Write scope/touches: docs/features/feat-hearing-intake/acceptance-report.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-hearing-intake-p07) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-hearing-intake-p07 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-hearing-intake-p07) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[sys-hearing-intake-p06] が完了するまで着手しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- acceptance 未達時の実装修正 (該当 task へ差し戻す)
- goal-spec 自体の変更 (dev-graph 側の再確定が必要)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: acceptance-report.md に acceptance 3 項目それぞれの pass/fail 判定と test-run-report.md への参照が記載されている

## Rollout and rollback

- Rollout: acceptance 3 項目全件 pass を確認後、P08 の refactoring/migration 判定へ引き継ぐ
- Rollback trigger and steps: acceptance いずれかが未達の場合、acceptance-report.md に未達理由を記録し、原因が実装にある場合は sys-hearing-intake-p05 を、設計にある場合は sys-hearing-intake-p02 を再実行対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-hearing-intake.context.json` (`sha256:d186363b613242215867a3dabda3c9a25690f884d363ae23de6d492538a09507`)
- Phase responsibility: 現行 context の acceptance 全件を P06 の実行証跡から判定する。
- Purpose: 業務課題から業務ツールが生まれる入口として、S10 の 4 ステップウィザード (削減試算付き)・受付番号採番・D5 pull 型 AI キューによるヒアリングシート生成・S11/S12 のシート管理を提供する (I11, J4)
- Goal: 非エンジニアがウィザードで課題を登録すると受付番号が発番され、AI キュー (D5) 経由で生成されたシートが S11/S12 に反映され status 管理 (admin) できる状態
- Scope in (all items are in-scope for the package; this phase owns the subset matching its responsibility):
- S10 ヒアリングウィザード (4 ステップ・自動試算表示)
- HearingSheet/FormData エンティティ + 受付番号採番
- AI 処理キュー (D5 pull 型) のジョブ投入・生成結果の書戻し受領
- S11 シート一覧 / S12 シート詳細 (status 変更は admin)
- ステップウィザード共通部品の消費
- Scope out:
- AI 実行基盤のサーバ側実装 (D5 で不採用)
- 構築工程の進行管理 (feat-build-pipeline-board)
- Acceptance (P04/P06/P07/P10/P11 must preserve exact coverage):
- ウィザード完了で受付番号が発番され「生成中」状態が表示される (非同期 UI パターン)
- AI キューのジョブが pull→書戻しで完結しサーバ側 AI 課金が発生しない
- シート本文の Markdown が sanitize 済みで描画される (SEC7)
- Architecture/source refs:
- architecture/harness-hub-frontend.md
- architecture/harness-hub-backend.md
- architecture/harness-hub-data.md
- specs/harness-hub-system-specification.md

This section is the current source closure and supersedes older counts or wording in this task when they conflict with the pinned feature context.

## 参照情報

- System specification: system-spec/security.md (qa-025 SEC7), system-spec/00-requirements-definition.md (D5)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md), arch-harness-hub-data (architecture/harness-hub-data.md)
- Feature: feat-hearing-intake
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-hearing-intake-p06
