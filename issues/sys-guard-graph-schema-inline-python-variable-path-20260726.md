---
graph_node_id: "issue-guard-graph-schema-inline-python-variable-path-20260726"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","dev-graph","guard","c10"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "dev-graph: guard-graph-schema が inline Python の変数経由 graph path 書換を見逃す"
owners: ["daishiman"]
created_at: "2026-07-25T20:43:11Z"
updated_at: "2026-08-03T10:26:18.055450Z"
status: "draft"
depends_on: []
related_nodes: ["feat-dev-pipeline-improvement","issue-guard-graph-schema-interpreter-write-coverage-20260726"]
resource_scope: ["plugins/dev-graph/hooks/","plugins/dev-graph/tests/","plugins/dev-graph/references/claude-code-hooks-contract.md","docs/features/feat-dev-pipeline-improvement/","system-spec/dev-workflow.md","system-spec/spec-state.json","specs/harness-hub-system-specification.md","architecture/harness-hub-dev-workflow.md","features/feat-dev-pipeline-improvement.md","tasks/feat-dev-pipeline-improvement/"]
purpose: "inline Python が変数や Path 式で組み立てた graph authority 書込みを、PreToolUse の時間契約を守った静的解析で遮断する"
goal: "C02 atomic writer を迂回する代表的な inline Python 書込みを fail-closed に検出し、読取と保護外領域を巻き込まない"
mvp_alignment: null
scope_in: ["python -c / heredoc の AST 解析と path 定数伝播","代表的な write API と rename/move の source/destination 判定","誤遮断・fail-open・性能・既知限界の回帰テスト","dev-workflow 仕様・設計・運用文書への反映"]
scope_out: ["exec/eval 内 source の再帰実行","任意の文字列難読化の実行","別 script file 本文の PreToolUse 解析","Harness Hub 製品 runtime の変更"]
acceptance: ["変数・Path・join・format・alias 経由の graph authority 書込みが exit 2 で遮断される","読取専用と .dev-graph/tmp/cache/templates は許可される","遮断判定は subprocess/network/graph 全件検証を起動しない","rename/replace/move の source と destination を双方判定する","仕様反映受領書と再実行可能な品質証拠が記録される"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-guard-graph-schema-inline-python-variable-path-20260726.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-28T00:24:44.679Z","origin_kind":"generated","source_digest":"e014a8f6ba6e6fbed10cacffacfa2d620dafd527f0324ba31d1f8b9536a23d0d","source_path":"issues/sys-orphan-external-ref-backlog-disposition-20260726.md#HarnessHub-f84o","source_plugin":"dev-graph","source_version":null}
classification_confidence: 1
classification_reason: "2026-07-28 orphan 再棚卸しで HarnessHub-f84o の本文と notes を確認し、未解決で実作業を持つため参照剥がし・close ではなく node 復元と判断"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-guard-graph-schema-inline-python-variable-path-20260726.md","confidence":1}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-f84o","linked_at":"2026-07-28T00:24:44.679Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: [{"base_branch":"main","closing_reference_verified":false,"head_branch":"devgraph/issue-guard-graph-schema-inline-python-variable-path-20260726","linked_at":"2026-08-03T10:26:00Z","merge_commit_sha":null,"merged_at":null,"pr_number":655,"repo":"daishiman/HarnessHub","state":"open","url":"https://github.com/daishiman/HarnessHub/pull/655"}]
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":["docs/features/feat-dev-pipeline-improvement/f84o-inline-python-guard-spec-reflection-receipt.md","https://github.com/daishiman/HarnessHub/pull/655"],"policy":"linked_pr_merged_all","reconciled_at":null,"source":"manual","status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-28T00:24:44.679Z","missing_sections":[],"status":"complete"}
---

# 概要

inline Python が変数や Path 式で組み立てた graph authority の書込み先を、C10 が
subprocess を起動せず静的に解決し、C02 atomic writer の迂回として遮断する。

## 背景と問題

PR #72 の C19 live-trial で、`.dev-graph/state/graph.json` を変数へ格納した Python が
C10 を通過した。旧判定は書込み API と保護 path の連続した字面に依存していたため、
`Path('.dev-graph') / 'state' / 'graph.json'` のような普通の組立てでも検出できなかった。

遮断を強める一方、HarnessHub-6in4 で解消した timeout fail-open を再導入せず、読取専用と
`.dev-graph/tmp/` / `cache/` / `templates/` を巻き込まないことが必要だった。

## 実装

- `guard-graph-schema.py` は entrypoint、静的遮断の順序、既存字面層を所有する。
- `guard_python_writes.py` は `python -c` / heredoc 抽出と write API 収集を所有する。
- `guard_python_path_eval.py` は AST 定数伝播による path 評価を所有する。
- 変数、Path 結合・parent・tail 置換、join、format、列、import 別名、identity 包み、bytes path を解決する。
- `open` / `os.open` / pathlib / shutil / os mutation を対象とし、rename / move は元と宛先の双方を変更として扱う。
- 解決不能でも authority prefix または `state/graph.json` tail が確定すれば fail-closed にする。

## 受入条件

- [x] 変数・Path・join・format・alias 経由の graph authority 書込みが exit 2 で遮断される。
- [x] 読取専用と保護外領域は許可される。
- [x] 遮断判定は subprocess / network / graph 全件検証を起動しない。
- [x] rename / replace / move の source と destination を双方判定する。
- [x] path 評価・write 収集・core case・境界 test を責務分割し、変更した手書き file は 500 行以下である。
- [ ] draft PR が main へ merge され、Beads / graph / GitHub の completion authority が一致する。

## 仕様・設計反映

`system-spec/spec-state.json` は単一 transition writer で `dev-workflow.web` を R4-reopen し、
最新 main の `qa-138` / `appr-027` を保持し、`qa-139` / `appr-028` として再確定した。
集約仕様、architecture、feature、P12/P13、plugin contract と
[仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/f84o-inline-python-guard-spec-reflection-receipt.md)
へ同一 wave で反映した。製品 API、DB schema、認証認可、UI、Cloudflare deploy unit は非変更。

## 既知の限界

`exec` / `eval` 内の再帰 source、任意文字列変換、別 script file 本文は C10 の時間契約外。
PostToolUse authority drift audit と C02 writer 規約で補完する。

## 検証証跡

最新 main 統合後に focused 257、Dev Graph 952 + 5 subtests、criteria 22、標準 CI
139 PASS / 5 WARN / 0 FAIL、fresh live-trial 9/9 PASS を確認した。behavior closure と PR URL は
仕様反映受領書と Beads notes へ記録する。
