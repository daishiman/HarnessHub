---
graph_node_id: "SYS-DEV-PIPELINE-IMPROVEMENT-P10"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-dev-pipeline-improvement"
domain: "documentation"
tags: ["feat-dev-pipeline-improvement","macro-feature","dev-pipeline","documentation"]
priority: null
start_date: null
target_date: null
iteration: null
title: "最終レビュー — 全 phase 成果の横断整合確認"
owners: ["daishiman"]
created_at: "2026-07-22T04:16:31Z"
updated_at: "2026-07-23T11:20:30.337742Z"
status: "closed"
depends_on: ["SYS-DEV-PIPELINE-IMPROVEMENT-P09"]
related_nodes: ["feat-dev-pipeline-improvement","arch-harness-hub-dev-workflow"]
resource_scope: ["docs/features/feat-dev-pipeline-improvement/final-review.md"]
purpose: "P01-P09 の成果物を横断し、baseline との乖離・acceptance の残未達・quality_constraints 違反の有無を最終確認して、P11 以降 (証跡固定・文書化・リリース) へ進む可否を判定する。"
goal: "P10 の受入条件と品質ゲートを満たし、再実行可能な検証証跡を残す"
scope_in: ["docs/features/feat-dev-pipeline-improvement/final-review.md"]
scope_out: ["Hub プロダクト本体機能 (Web/API/DB) の変更","dev-graph への新 verb 追加","bd CLI 本体の変更","graph.json 分割の実装 (トリガー記録のみ)","本 phase の責務外の成果物生成 (他 phase の write scope への書込)"]
acceptance: ["final-review.md に P01-P09 の成果物一覧・acceptance 充足状況・quality_constraints 6 件の適合判定が記録されている","未達 0 件で P11 へ進むか、残課題の差し戻し先または follow-up 起票が記録されている"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: "feat-dev-pipeline-improvement"
feature_package_id: "feature-package/feat-dev-pipeline-improvement"
phase_ref: "P10"
file_path: "tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-p10.md"
template_id: "task"
template_version: "1.1.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"9be3809dad465db6de2af20a8b475ae4d9e01d0abe544d5592f3cdf7de91a33b","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-dev-pipeline-improvement/9be3809dad465db6de2af20a8b475ae4d9e01d0abe544d5592f3cdf7de91a33b/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-22T04:16:31Z","origin_kind":"system-dev-planner","source_digest":"9be3809dad465db6de2af20a8b475ae4d9e01d0abe544d5592f3cdf7de91a33b","source_path":".dev-graph/plans/generations/feature-package-feat-dev-pipeline-improvement/9be3809dad465db6de2af20a8b475ae4d9e01d0abe544d5592f3cdf7de91a33b/task-specs/phase-10-final-review.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.87
classification_reason: "qa-067 の開発管理パイプライン改善 8 要件のうち P10 責務 (最終レビュー — 全 phase 成果の横断整合確認) を実行する task"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-p10.md","confidence":0.87}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-k2u.10","linked_at":"2026-07-21T16:50:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-07-22T11:38:20Z","evidence_refs":["docs/features/feat-dev-pipeline-improvement/final-review.md"],"policy":"manual","reconciled_at":"2026-07-23T11:10:47Z","source":"reconciliation","status":"done"}
implementation_readiness: {"checked_at":"2026-07-21T15:10:00Z","missing_sections":[],"status":"complete"}
---

# System task overlay: 最終レビュー — 全 phase 成果の横断整合確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-dev-pipeline-improvement (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-dev-pipeline-improvement", "macro-feature", "dev-pipeline", "documentation"]
- related_nodes: ["feat-dev-pipeline-improvement", "arch-harness-hub-dev-workflow"]
- parent_feature: feat-dev-pipeline-improvement
- phase_ref: P10
- classification: confidence=0.87, reason="qa-067 の開発管理パイプライン改善 8 要件のうち P10 責務 (最終レビュー — 全 phase 成果の横断整合確認) を実行する task", candidates=[{artifact_kind: task, confidence: 0.87, candidate_path: tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-p10.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P01-P09 の成果物を横断し、baseline との乖離・acceptance の残未達・quality_constraints 違反の有無を最終確認して、P11 以降 (証跡固定・文書化・リリース) へ進む可否を判定する。

## 背景

最終レビューは実行済み evidence のみを根拠とし (trace rule)、残課題がある場合は該当 phase へ差し戻すか、follow-up 課題として beads へ起票して境界を明記する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-dev-pipeline-improvement, arch-harness-hub-dev-workflow
- Entry gate: goal-spec.json の feature_context_digest が sha256:16d9e07bc878c21e6054ba7f178d2d1fc5e303961a297f9a5949a20f328e5085 に一致し、features/feat-dev-pipeline-improvement.md の frontmatter と goal-spec の purpose/goal/scope_in/scope_out/acceptance が逐語一致すること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない
- 直前 phase (SYS-DEV-PIPELINE-IMPROVEMENT-P09) の完了に依存する (直列 DAG)。

## Workstream applicability

- Frontend: N/A: 本 feature は開発管理パイプラインの改善であり frontend 実装物を変更しない
- Backend: N/A: Hub 本体の backend 実装物を変更しない (scope_out)
- API: N/A: Hub 本体の API を変更しない (scope_out)
- Data: N/A: Hub 本体の DB/schema を変更しない (scope_out)
- Infrastructure: N/A: デプロイ基盤を変更しない。CI workflow の lint 追加は Quality/Operations で扱う
- Security: N/A: 本 phase は認可・秘密情報の取り扱いを変更しない
- Quality: N/A: 本 phase は検査・テストの変更を行わない
- Documentation: applicable + change: docs/features/feat-dev-pipeline-improvement/final-review.md を新規作成する
- Operations: N/A: 本 phase は運用手順を変更しない

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-dev-workflow (features/feat-dev-pipeline-improvement.context.json architecture_refs の正本参照)
- Deploy unit/environment: dev-tooling/repository (plugins/dev-graph の script・schema・規約文書。Cloudflare Workers へのデプロイは伴わない)
- Compatibility/migration/backfill: 既存 promoted package・証跡の digest を失効させない (quality_constraints digest-immutability)。実データ migration は P08 が所有する

## 成果物

- Produced artifacts:
- docs/features/feat-dev-pipeline-improvement/final-review.md
- Consumed artifacts: goal-spec.json, features/feat-dev-pipeline-improvement.context.json, architecture/harness-hub-dev-workflow.md, system-spec/dev-workflow.md (qa-067)
- Write scope/touches: docs/features/feat-dev-pipeline-improvement/final-review.md

## Tracker publication and completion

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-dev-pipeline-improvement-p10) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-dev-pipeline-improvement-p10 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-dev-pipeline-improvement-p10) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: 直前 phase 完了後にのみ着手する (直列 DAG)。resource_scope (docs/features/feat-dev-pipeline-improvement/final-review.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- Hub プロダクト本体機能 (Web/API/DB) の変更
- dev-graph への新 verb 追加
- bd CLI 本体の変更
- graph.json 分割の実装 (トリガー記録のみ)
- 本 phase の責務外の成果物生成 (他 phase の write scope への書込)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: final-review.md の判定が各 phase 成果物の実在と実測記録へ遡れること

## Inner goal-seek execution loop

- Methodology contract: `system-task-goal-seek/v1`
- Goal: P10 の Phase acceptance と Verification and evidence をすべて満たす
- Generic execution prompt: 目的・背景・前提条件・write scope・成果物・受け入れ条件を入力に、実装手段を固定せず最小の安全な変更を行う
- Rubric: acceptance 全件、回帰テスト、必須証跡、write scope、依存整合がすべて PASS
- Feedback loop: 実装→独立評価→finding を次の prompt へ反映→再実行し、`rubric verdict=PASS` まで反復する。上限到達時は fail-closed
- P13 spec/architecture writeback: N/A: P13 owns writeback

## Rollout and rollback

- Rollout: 成果物を write scope の範囲で作成・更新し、acceptance を満たしたことを確認してから次 phase へ引き継ぐ
- Rollback trigger and steps: 横断不整合が見つかった場合、該当 phase へ差し戻し final-review.md に履歴を残す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-dev-pipeline-improvement.context.json` (`sha256:16d9e07bc878c21e6054ba7f178d2d1fc5e303961a297f9a5949a20f328e5085`)
- Phase responsibility: 現行 context の purpose・goal・scope・acceptance のうち本 phase 責務の部分集合を所有する。
- Purpose: 開発管理パイプライン (dev-graph 11 verb・beads・plugin-plans・eval-log・成果物管理) の運用実態調査 (qa-067) で検出された整合性・肥大化・消化状態の課題を解消し、G1/G4/G5 を支える開発基盤の健全性を回復する
- Goal: qa-067 の 8 要件が実装され、解決済み事象の open 残置・eval-log 直下残置・未消化 findings が決定論検査で 0 件に収束し、再実行しても同じ結果になる状態
- Scope in (all items are in-scope for the package; this phase owns the subset matching its responsibility):
- lifecycle close-loop の機械化 (open 残置検出と md/graph/beads 3 表現の同時 close 導線)
- eval-log/ 配置規約の明文化と CI lint 強制
- improvement-handoff schema への disposition 必須化と未消化 findings の beads 起票
- tasks/ frontmatter status の意味論明記
- graph.json 肥大対策の再検討トリガー記録
- dev-graph 中核 handoff 31 findings の差分監査と disposition 遡及付与
- spec-drift-guardian の verdict close gate 配線
- 陳腐化文書の定期棚卸し GC の sync verb 運用組込み
- Scope out:
- Hub プロダクト本体機能 (Web/API/DB) の変更
- dev-graph への新 verb 追加
- bd CLI 本体の変更
- graph.json 分割の実装 (トリガー記録のみ)
- Acceptance (P04/P06/P07/P10/P11 must preserve exact coverage):
- 解決済み事象の open 残置を検出する決定論検査が存在し、issue-bd-bridge-notes-passthrough-20260721 が close-loop で閉じている
- eval-log/ 配置規約が README に明文化され、CI lint が直下残置・バイト同一重複・1MB 超の git 追跡を遮断する
- improvement-handoff schema に per-finding disposition と根拠 ref が必須化され、既存 21 ファイル 94 findings に消化状態が付与されている
- task template に status = 文書ライフサイクル (active/superseded) の意味論が明記され、実行状態の二重正本が無い
- graph.json 分割の再検討トリガーが仕様に記録されている
- spec-drift-guardian の C03/C04 verdict が close gate に配線され、proposal のみでの close が遮断される
- 陳腐化文書の棚卸し手順が sync verb 運用に組み込まれている
- Architecture/source refs:
- architecture/harness-hub-dev-workflow.md
- specs/harness-hub-system-specification.md
- system-spec/dev-workflow.md

This section is the current source closure and supersedes older counts or wording in this task when they conflict with the pinned feature context.

## Phase acceptance

- final-review.md に P01-P09 の成果物一覧・acceptance 充足状況・quality_constraints 6 件の適合判定が記録されている
- 未達 0 件で P11 へ進むか、残課題の差し戻し先または follow-up 起票が記録されている

## 参照情報

- goal-spec: goal-spec.json (parent_feature=feat-dev-pipeline-improvement, feature_context_digest=sha256:16d9e07bc878c21e6054ba7f178d2d1fc5e303961a297f9a5949a20f328e5085)
- 仕様正本: system-spec/dev-workflow.md qa-067 (開発管理パイプライン改善 8 要件)
- trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.
