# System task overlay: エビデンス収集 — acceptance 根拠・テスト結果・品質保証の証跡集約

## Machine-readable registration fields

- feature_package_id: feature-package/feat-hearing-intake (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-hearing-intake", "studio-extension", "async-ai-queue", "evidence"]
- related_nodes: ["feat-hearing-intake", "arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data"]
- parent_feature: feat-hearing-intake
- phase_ref: P11
- classification: confidence=0.85, reason="feature-execution-package-contract.md §7 が定める reproducible evidence 要件に従い P06/P07/P09/P10 の成果物を証跡として集約する P11 タスク", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-hearing-intake/sys-hearing-intake-p11.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

feature-execution-package-contract.md §7 が定める reproducible evidence 要件に従い、P06 のテスト結果・P07 の受入判定・P09 の品質保証結果・P10 の最終レビュー判定を再現可能な形で証跡として一箇所に集約する。

## 背景

feature の confirmation 判定 (system-dev-plan-evaluator の C12) は個別 task の記述だけでなく、再現可能な証跡の存在を要求する。本 task は分散している証跡を index 化し、再実行なしで判定の妥当性を追跡できる状態を作る。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-hearing-intake, sys-hearing-intake-p10
- Entry gate: docs/features/feat-hearing-intake/final-review-notes.md が P10 で作成済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は証跡集約のみで frontend 実装物を変更しない
- Backend: N/A: 本 task は証跡集約のみで backend 実装物を変更しない
- API: N/A: API 契約の変更を伴わない
- Data: N/A: データ構造の変更を伴わない
- Infrastructure: N/A: インフラ変更を伴わない
- Security: applicable + change: SEC5/SEC7/SEC8 適合の証跡 (P05 実装箇所・P06 テスト結果・P09 品質保証結果) への参照を index 化する
- Quality: applicable + change: acceptance 3 項目・quality_constraints 10 件それぞれの証跡へのリンクを evidence/index.md に整理する
- Documentation: applicable + change: docs/features/feat-hearing-intake/evidence/index.md を新規作成する
- Operations: N/A: 運用証跡は P12 の runbook.md 作成後に別途参照可能になる

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend, arch-harness-hub-data
- Deploy unit/environment: cloudflare-workers/hub (証跡集約のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は証跡集約のみで対象物への変更を行わない

## 成果物

- Produced artifacts: docs/features/feat-hearing-intake/evidence/index.md (P06/P07/P09/P10 各成果物への参照 index)
- Consumed artifacts: docs/features/feat-hearing-intake/test-run-report.md, docs/features/feat-hearing-intake/acceptance-report.md, docs/features/feat-hearing-intake/quality-assurance-report.md, docs/features/feat-hearing-intake/final-review-notes.md
- Write scope/touches: docs/features/feat-hearing-intake/evidence/index.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-hearing-intake-p11) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-hearing-intake-p11 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-hearing-intake-p11) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[sys-hearing-intake-p10] が完了するまで着手しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 証跡不足時の再テスト実施 (該当 task を再実行対象として差し戻す)
- confirmation 判定そのもの (system-dev-plan-evaluator の scope)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: evidence/index.md が P06/P07/P09/P10 の全成果物への参照を漏れなく含んでいる. Normative evidence: kind=sheet_generation、shared queue consumer、sheetEstimate server execution、estimate snapshot、tenant/role、enqueue/complete round-trip の contract testsを必須とする。

## Rollout and rollback

- Rollout: evidence/index.md 作成完了後 P12 のドキュメント/運用へ引き継ぐ
- Rollback trigger and steps: 参照先成果物の欠落が判明した場合、該当する P06/P07/P09/P10 を再実行対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-hearing-intake.context.json` (`sha256:d186363b613242215867a3dabda3c9a25690f884d363ae23de6d492538a09507`)
- Phase responsibility: P06・P07・P09・P10 の証跡を source digest 付きで集約する。
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

## Normative implementation closure (2026-07-19)

This section is normative for P11 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-hearing-intake.context.json; docs/backend-spec.md §2.3/§4.3/§4.11/§6.2; docs/shared-layers.md §2
- Effective phase contract: feature固有 AiJob schema や kind=hearing を作らず、共通 ai_jobs の kind=sheet_generation を consumer として使う。POST /api/v1/sheets は server-side packages/estimation の sheetEstimate を実行し estimate snapshot を保存してから、同一transactionでsheet_generationをenqueueする。共通 package/boundary の実装ownerは feat-hub-foundationであり、hearingは公開contractを消費する。P1は後発metrics完了を前提にしない。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `apps/hub/src/app/api/v1/sheets/`
- `apps/hub/src/features/hearing-intake/ai-job-adapter/`
- `apps/hub/src/features/hearing-intake/estimation-adapter/`
- Mandatory evidence: kind=sheet_generation、shared queue consumer、sheetEstimate server execution、estimate snapshot、tenant/role、enqueue/complete round-trip の contract testsを必須とする。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: system-spec/security.md (qa-025 SEC5/SEC7/SEC8)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md), arch-harness-hub-data (architecture/harness-hub-data.md)
- Feature: feat-hearing-intake
- Phase doc: N/A: feature-execution-package-contract.md §7 が reproducible evidence 要件の正本であり、本 run は個別 phase lifecycle 文書を追加生成しない
- Dependencies: sys-hearing-intake-p10
