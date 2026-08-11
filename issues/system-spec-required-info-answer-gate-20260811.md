---
graph_node_id: "issue-system-spec-required-info-answer-gate-20260811"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["system-spec-harness","elicitation","information-design","fail-closed","follow-up"]
priority: "medium"
start_date: "2026-08-11"
target_date: null
iteration: null
title: "required-info回答をwriterで決定論的に接地検査する"
owners: ["daishiman"]
created_at: "2026-08-11T07:05:25Z"
updated_at: "2026-08-11T07:10:30.998059Z"
status: "active"
depends_on: ["spec-harness-hub-information-design-addendum"]
related_nodes: ["spec-harness-hub-information-design-addendum"]
resource_scope: ["plugins/system-spec-harness/skills/run-system-spec-elicit/references/spec-state-contract.md","plugins/system-spec-harness/scripts/apply-spec-transition.py","plugins/system-spec-harness/scripts/validate-coverage-matrix.py","plugins/system-spec-harness/skills/run-system-spec-elicit/tests"]
purpose: "required-infoの質問順とprose gateだけでなく、回答・理由・依存完了をspec-state writerがfail-closedで検査する"
goal: "UIありでscreen-information-priorityが未接地ならfrontend確定を拒否し、UIなしの理由付きN/Aだけを安全に非block化する"
scope_in: ["required_info_answers の item別状態契約","qa_ref または N/A reason の接地","depends_on 完了順と条件分岐のwriter検査","frontend/UI-UX confirmed のfail-closed gate","positive/negative/resume回帰テスト"]
scope_out: ["画面情報設計の内容変更","UI実装とvisual regression test","required-infoカタログの新規項目追加"]
acceptance: ["spec-stateがrequired_info_answers[item_id,status,qa_ref|reason]を保持する","依存未完了またはUIあり未回答でfrontend/UI-UX confirmedを拒否する","UIなしの理由付きN/Aは後続をblockしない","apply-spec-transitionとvalidate-coverage-matrixが同じ契約を検証する","positive/negative/resumeの回帰テストが通る"]
architecture_refs: ["arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/system-spec-required-info-answer-gate-20260811.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"03b365f827aa941205ee22be5c229453a2d9482018ae101647b206327aee69b8","evaluator":"30思考法レビューの残界分析","evidence_ref":"eval-log/elegant-review/harness-hub-information-design-20260811/review.md"}
source_lineage: {"imported_at":"2026-08-11T07:05:25Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "情報設計要件の反映は完了したが、spec-stateのitem別回答接地を機械強制する実装は独立したfollow-upである"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/system-spec-required-info-answer-gate-20260811.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-9wdm","linked_at":"2026-08-11T07:10:08.580772Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-11T07:05:25Z","missing_sections":[],"status":"complete"}
---

# required-info回答をwriterで決定論的に接地検査する

## 背景

画面情報設計の質問順、UI有無分岐、blocking itemは要件とR2/R3 promptへ反映済みである。一方、現行spec-stateはrequired-info item別の回答状態を持たず、回答未接地をwriter自身が拒否できない。

## 完了条件

acceptanceに記載したitem別状態・依存順・条件N/A・frontend確定拒否を、transition writerとcoverage validatorの双方で決定論的に検証し、positive/negative/resumeテストで固定する。

## 境界

本issueはfail-closedな実行ゲートの実装だけを扱い、確定済みの画面情報設計規範やUI実装は変更しない。
