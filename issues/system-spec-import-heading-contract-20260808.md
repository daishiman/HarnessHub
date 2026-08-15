---
graph_node_id: "issue-system-spec-import-heading-contract-20260808"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["dev-graph","system-spec","heading-readiness","fail-closed"]
priority: "high"
start_date: "2026-08-08"
target_date: null
iteration: null
title: "dev-graph run-dev-graph-system-spec: specification見出し不整合でC02登録が構造的に失敗する"
owners: ["daishiman"]
created_at: "2026-08-08T10:00:00Z"
updated_at: "2026-08-09T21:05:41Z"
status: "done"
depends_on: []
related_nodes: ["feat-dev-pipeline-improvement","arch-harness-hub-dev-workflow","arch-harness-hub-testing-qa"]
resource_scope: ["plugins/dev-graph",".dev-graph/templates/template-contract.json","plugin-plans/dev-graph/templates/template-contract.json","system-spec","specs","architecture","features/feat-dev-pipeline-improvement.md","tasks/feat-dev-pipeline-improvement","docs/features/feat-dev-pipeline-improvement"]
purpose: "system-spec import の正当な本文形だけを許容し、不完全な architecture を fail-closed に拒否する。"
goal: "source lineage に基づく宣言型見出し contract と architecture/specification/task の対称な readiness 判定を確立する。"
scope_in: ["conditional trigger の contract 化","architecture heading_missing の有効化","3 template contract copy の同期","fixture と focused regression","新契約で検出された旧 specification / task artifact の標準見出し移行"]
scope_out: ["issue kind の見出し慣習整理","Harness Hub 製品 runtime","system-spec の意味内容変更"]
acceptance: ["index と requirements の正当形だけが conditional 緩和で PASS する","通常 architecture の不足見出しが fail-closed になる","3 contract copy が一致する","focused regression が PASS する","fresh C19 live trial が正規4 Skill・独立監査・C02登録を含め PASS する","repository 全体の graph schema gate が違反 0 で PASS する"]
architecture_refs: ["arch-harness-hub-dev-workflow","arch-harness-hub-testing-qa"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/system-spec-import-heading-contract-20260808.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"35d086703261948e3761e3a72df5c84b8b105b226657952c4840eb5c2b4dd913","evaluator":"focused regression + latest main C19 independent final review","evidence_ref":"docs/features/feat-dev-pipeline-improvement/o4zi-system-spec-import-heading-contract-spec-reflection-receipt.md"}
source_lineage: {"imported_at":"2026-08-08T10:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "system-spec import と dev-graph C11 readiness の横断的な repository tooling bug。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/system-spec-import-heading-contract-20260808.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-o4zi","linked_at":"2026-08-08T10:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: [{"base_branch":"main","closing_reference_verified":true,"head_branch":"devgraph/issue-system-spec-import-heading-contract-20260808","linked_at":"2026-08-08T14:20:00Z","merge_commit_sha":"0a8a2cf447e33f29e7856350b609d3bb70bfa80e","merged_at":"2026-08-09T20:22:09Z","pr_number":680,"repo":"daishiman/HarnessHub","state":"merged","url":"https://github.com/daishiman/HarnessHub/pull/680"}]
execution_contexts: []
completion_evidence: {"completed_at":"2026-08-09T20:22:09Z","evidence_refs":["docs/features/feat-dev-pipeline-improvement/o4zi-system-spec-import-heading-contract-spec-reflection-receipt.md","eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260809T132550Z-wt27-c19-ci-r1/verdict.json"],"policy":"linked_pr_merged_all","reconciled_at":"2026-08-09T20:58:58Z","source":"github_pr_merge","status":"done"}
implementation_readiness: {"checked_at":"2026-08-08T14:20:00Z","missing_sections":[],"status":"complete"}
---

# system-spec import の見出し契約と architecture readiness を一致させる

## 概要

`system-spec-harness` が生成する index、要件定義、通常章は同じ origin でも本文形が異なる。C11 が全 specification に 17 見出しを要求して index 登録を拒否する一方、architecture は検査対象外で空本文でも complete になる非対称を解消する。

## 背景と問題

C19 live trial で `system-spec/index.md` を specification として登録すると、compile 済み index の 4 見出しに対して template の 17 見出しが要求され、C02 は write_count=0 で停止した。同時に `HEADING_MISSING_KINDS` から architecture が漏れ、要件定義・通常章の不足を一切検出していなかった。

## 是正後の挙動

- system-spec index は source lineage が契約に完全一致する場合だけ 4 見出しの正当形を受理する。
- requirements definition は U1〜U9、通常 architecture は base 10 見出しを要求し、不足は `heading_missing` で fail-closed になる。
- trigger は template contract の宣言データから解決され、3 コピーは byte 一致をテストする。
- C19 で取り込む node body と source body の一致は、実行ロジックの複製ではなく lineage 付き素材の verbatim import として受理する。
- 新契約で検出された旧 specification 5 件・task 2 件を標準見出しへ移行した。500 行超の着地観測仕様は 122 行の正規 contract と既存の詳細調査資料へ責務分離した。

## 期待する挙動

- `origin_kind` と `source_path` の AND 一致を template contract に宣言する。
- index は 4 見出し、要件定義は U1〜U9、通常章は architecture 基本 10 見出しで検査する。
- task / specification / architecture を同じ heading_missing 経路へ載せる。
- contract の 3 コピーを同一バイト列に保つ。

## 再現手順またはユースケース

C19 の system-spec live trial fixture、または focused test `test_validate_graph_schema_c11_heading_readiness.py` を実行する。index、requirements、通常 architecture の 3 形を同じ `origin_kind=system-spec-harness` で入力し、source_path ごとの結果を比較する。

## 影響と優先度

priority: high。正当な system-spec import が構造的に登録不能である一方、不完全な architecture は通るため、fail-closed の向きが逆転している。製品 runtime への直接影響は無い。

## スコープ

対象は conditional trigger、heading readiness、live-trial fixture、template contract 同期、関連する正本文書。issue kind の見出し慣習、製品 API/DB/UI、system-spec 内容そのものは変更しない。

## 関連グラフ

- `feat-dev-pipeline-improvement`
- `arch-harness-hub-dev-workflow`
- `arch-harness-hub-testing-qa`
- Beads `HarnessHub-o4zi`

## 受入条件

- index / requirements の正当な形は PASS し、同じ origin の通常章へ誤って緩和が波及しない。
- architecture の不足見出しは fail-closed に列挙される。
- base template 完全準拠は conditional family 発火時も受理される。
- 空条件 rule は発火しない。
- 3 contract copy が一致し、focused regression が PASS する。
- repository 全体の graph schema gate が違反 0 で PASS する。

## 検証証跡

main マージ前の Dev Graph 全体 975 test / 5 subtests、マージ後の対象 5 files / 82 tests はすべて PASS。3 contract copy の byte parity も PASS。C19 は最新 main の正本 run `20260809T132550Z-wt27-c19-ci-r1`（独立評価 PASS、90.067 秒、network / upstream Skill call 0）を採用する。旧 artifact 160 違反も正規見出し移行後に 0 件へ収束した。詳細は仕様反映受領書を正とする。
