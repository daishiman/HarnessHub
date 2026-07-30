---
graph_node_id: "issue-live-trial-scenario-contract-required-20260730"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","dev-graph","live-trial","acceptance-criteria","scenario-contract"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "criteria-test が scenario_contract 欠落の live-trial 受領書を許容する"
owners: ["daishiman"]
created_at: "2026-07-30T05:08:29Z"
updated_at: "2026-07-30T05:42:16Z"
status: "closed"
depends_on: []
related_nodes: ["issue-decompose-live-trial-audit-defects-20260726"]
resource_scope: ["plugins/dev-graph/tests/test_skill_criteria_evidence.py","eval-log/dev-graph/run-dev-graph-schedule/","system-spec/testing-qa.md","specs/harness-hub-system-specification.md","architecture/harness-hub-testing-qa.md","features/feat-dev-pipeline-improvement.md","tasks/feature-package/feat-dev-pipeline-improvement/"]
purpose: "qa-089 で required_observations と scenario 契約を live-trial 合格条件にした一方、受領側の criteria-test は scenario_contract が存在するときだけ検査していた。そのため古い形式や欠落した受領書が、観測の充足を証明せずに合格できる偽陽性を除去する"
goal: "verify_by=live-trial の criteria evidence は正準 positive scenario と非省略の scenario_contract を必須とし、全 required_observations・引数・task 契約・証拠参照を照合できない受領書を必ず不合格にする"
mvp_alignment: null
scope_in: ["criteria evidence の検証で正準 positive scenario と scenario_contract を必須化する","required_observations 全件、unobserved の空、引数、task 契約、証拠参照の一致を検査する","C15 schedule の live-trial を実走して現行契約を満たす受領書へ更新する","品質仕様・設計・feature・task と仕様反映受領書を同期する"]
scope_out: ["run-dev-graph-schedule skill 本体のスケジューリング動作変更","公開 API・データモデル・認証認可・利用者向け UI の変更","legacy verdict schema 自体から optional field を削除する破壊的変更"]
acceptance: ["scenario_contract が欠落した live-trial verdict を criteria-test が合格させない","C15 の新しい live-trial 受領書が required_observations 4 件を全て観測し、引数と durable evidence を照合できる","qa-089 の仕様意図が system-spec・specs・architecture・features・tasks に同期される","関連品質ゲートと feature package validator が成功する"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-live-trial-scenario-contract-required-20260730.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-30T05:08:29Z","origin_kind":"manual","source_digest":null,"source_path":"plugins/dev-graph/tests/test_skill_criteria_evidence.py","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.98
classification_reason: "既存 qa-089 の合格契約を受領側テストが省略可能として扱う実装欠陥であり、製品機能ではなく開発品質 feature の独立した修正単位である"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-live-trial-scenario-contract-required-20260730.md","confidence":0.98}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-yn71","linked_at":"2026-07-30T05:10:59Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-07-30T05:42:16Z","evidence_refs":["plugins/dev-graph/tests/test_skill_criteria_evidence.py","eval-log/dev-graph/run-dev-graph-schedule/live-trial/20260730T041426Z-wt16-pxwo-schedule/verdict.json","eval-log/dev-graph/run-dev-graph-schedule/live-trial/20260730T041426Z-wt16-pxwo-schedule/evidence/schedule-execution.json","docs/features/feat-dev-pipeline-improvement/live-trial-scenario-contract-required-spec-reflection.md"],"policy":"manual","reconciled_at":"2026-07-30T05:42:16Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-07-30T05:08:29Z","missing_sections":[],"status":"complete"}
---

# 概要

`qa-089` は live-trial（実環境に近い試験）の合格条件として、正準の positive
scenario、全 `required_observations`、実行引数、task 契約、durable evidence
（後から再確認できる証拠）を結び付けることを要求している。

しかし受領側の `test_skill_criteria_evidence.py` は、verdict に
`scenario_contract` が存在するときだけ、その内容を検査していた。
field 自体が無い古い受領書は検査を素通りできるため、観測を証明していなくても
criteria evidence が合格する偽陽性が残っていた。

# 対応

- `verify_by=live-trial` の evidence では正準 positive scenario を必須にする。
- verdict の `scenario_contract` を非省略にする。
- `required_observations` の全観測、`unobserved=[]`、実行引数、宣言済み task 契約、
  evidence ref の包含と実在を検査する。
- C15 schedule scenario を実走し、現行契約を満たす受領書へ更新する。
- 変更の意味を品質仕様・設計・feature・task と仕様反映受領書へ同期する。

# 受け入れ条件

1. `scenario_contract` が欠落した受領書は criteria-test で不合格になる。
2. C15 の新規 live-trial は required observation 4 件を 4 件とも観測し、
   引数と durable evidence を照合できる。
3. task 仕様書の品質ゲート、live-trial lint、関連テストが成功する。
4. 仕様影響と製品影響の境界が各正本へ記録される。

# 影響境界

本変更は HarnessHub の開発品質保証に影響する。`run-dev-graph-schedule` 本体の
スケジューリング、公開 API、データモデル、認証認可、利用者向け UI は変更しない。

# 完了確認

- criteria acceptance で `scenario_contract` を必須化し、required/observed の
  同数・同順と run 内 evidence の実在まで再照合した。
- field 欠落と observed 欠落の負例を追加した。
- C15 fresh live-trial は required observation 4/4、独立 evaluator PASS。
- task package、system-spec、graph、Dev Graph 721 件、repository 7640 件、
  CI/local parity 136 PASS / 4 既存 WARN / 0 FAIL を確認した。
- qa-100 / appr-017 と全ドキュメント層へ反映し、仕様反映受領書を記録した。
