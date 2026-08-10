---
graph_node_id: "issue-dev-workflow-tier-vocabulary-full-vs-critical-20260809"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "operations"
tags: ["spec-drift","verification-tier","reopen","follow-up"]
priority: "medium"
start_date: "2026-08-09"
target_date: null
iteration: null
title: "dev-workflow.md の tier 語彙が full と critical で分裂している"
owners: ["daishiman"]
created_at: "2026-08-09T00:00:00Z"
updated_at: "2026-08-09T03:49:46.824609Z"
status: "closed"
depends_on: []
related_nodes: ["issue-dev-workflow-tier-selector-absent-stale-20260809"]
resource_scope: ["system-spec/spec-state.json","system-spec/dev-workflow.md","plugins/system-spec-harness/skills/run-system-spec-elicit/scripts/apply-spec-transition.py"]
purpose: "仕様章と実装で最上位 tier の呼び名が食い違う状態を解消し、章の閉列挙をそのまま実装契約として読めるようにする。"
goal: "dev-workflow.md 上の tier 閉列挙が実装と同じ 3 値 (mvp / standard / critical) を指すと機械的に読める状態になっている。"
scope_in: ["spec-state への用語対応 (full = critical の旧称) の追補 entry 追加","R4-reopen 経由での該当セル再確定と章の再生成"]
scope_out: ["tier 規則そのものの変更","3 tier の定義変更","既登録 qa_log entry の逐語書き換え"]
acceptance: ["dev-workflow.md の tier 閉列挙が mvp / standard / critical を指す","既登録 qa_log entry の逐語が改変されていない","確定セルの更新が apply-spec-transition.py 経由のみで行われている","validate-coverage-matrix.py が exit 0 を維持している"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/dev-workflow-tier-vocabulary-full-vs-critical-20260809.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-09T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "確定章と実装の用語不一致を解消し、章だけを読んで実装できる状態を保つ。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/dev-workflow-tier-vocabulary-full-vs-critical-20260809.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-kr1i","linked_at":"2026-08-09T03:42:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-08-09T03:42:00Z","evidence_refs":["system-spec/testing-qa.md#qa-217","docs/features/feat-dev-pipeline-improvement/verification-tiering-final-review-spec-reflection-receipt.md"],"policy":"manual","reconciled_at":"2026-08-09T03:42:00Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-08-09T00:00:00Z","missing_sections":[],"status":"complete"}
---

## 背景

`system-spec/dev-workflow.md` は最上位 tier を 4 箇所で `full` と書いている。

- `:76` 閉列挙 — ``tier`` (mvp | standard | full)
- `:84` 「full tier へ昇格したときも過去の mvp 判定を消さず…」
- `:98` 「full を既定にしないのは…」
- `:100` 「`absent` が残っている run は…full tier 相当の再検証が必要」

一方、実装 (`scripts/select-verification-tier.py` / `build-verification-plan.py` /
`scripts/validate-tier-decision.py`) と qa-208 / qa-214 の確定内容は、いずれも `critical` を
最上位 tier 名として使う。章の閉列挙を実装契約として読むと、実装側の `critical` は
「閉列挙外の値」に見える。

## なぜ即時に直さなかったか

1. 当該章は `status: confirmed` であり、`plugins/system-spec-harness/hooks/guard-confirmed-chapter-overwrite.py`
   が Edit を PreToolUse で遮断する。変更は C01/C03 の単一 writer (根拠付き R4-reopen) 経由のみ。
2. `full` の出所は spec-state.json の qa_log 逐語である可能性が高い。qa_log の既登録 entry は
   逐語不改変が契約 (`run-system-spec-elicit` Gotchas 6) なので、逐語の置換そのものが契約違反になる。

つまり正しい対処は「語の置換」ではなく「用語対応の追補」である。

## やること

1. spec-state へ「`full` は `critical` の旧称」を示す統合 entry を**新規**追加する
   (既存 entry の逐語は触らない)。
2. 該当セルを `reopen` (reason 付き) し、`confirm` で再確定して `set-approval` で承認記録へ紐づける。
3. `compile-spec-doc.py` で章を再生成し、閉列挙が `mvp | standard | critical` になったことを確認する。

## やらないこと

tier の定義そのものは変えない。本 issue は呼び名の一致だけを扱う。定義を触ると
「用語統一のついでに検査深度が変わった」経路ができ、後から差分の意図を読み分けられなくなる。
