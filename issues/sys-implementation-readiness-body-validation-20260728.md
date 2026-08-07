---
graph_node_id: "issue-implementation-readiness-body-validation-20260728"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","dev-graph","beads","c11","implementation-readiness","artifact-body"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "implementation_readiness=complete が本文全面プレースホルダで成立し、missing_sections が本文の節を一度も見ていない"
owners: ["daishiman"]
created_at: "2026-07-28T13:59:42Z"
updated_at: "2026-07-29T14:28:20Z"
status: "closed"
depends_on: []
related_nodes: ["feat-dev-pipeline-improvement","arch-harness-hub-dev-workflow"]
resource_scope: ["plugins/dev-graph/scripts/validate-graph-schema.py","plugins/dev-graph/tests/test_validate_graph_schema_c11_coverage.py","plugins/dev-graph/tests/test_upsert_node_body_preservation.py","plugins/dev-graph/templates/README.md","system-spec/dev-workflow.md","specs/harness-hub-system-specification.md","architecture/harness-hub-dev-workflow.md","features/feat-dev-pipeline-improvement.md","tasks/feat-dev-pipeline-improvement/"]
purpose: "本文が未記入の artifact を tracker 投影や system build handoff へ進めないよう、C11 readiness を本文実体へ係留する"
goal: "空本文・canonical placeholder・sentinel-only・code-example-only の必須節が implementation_readiness=complete にならない"
mvp_alignment: null
scope_in: ["required section 本文の deterministic 検査","missing_sections への未記入節名の反映","全 6 artifact kind の canonical template と mutation 回帰テスト","C02 template-only 作成・再生成の rollback 回帰","仕様・設計・task・feature・docs への契約反映"]
scope_out: ["required heading の名称移行と欠落 heading の新規拒否","既存 promoted task package の immutable source 書換","Harness Hub 製品 API・DB・認証認可・UI・Cloudflare deploy unit の変更"]
acceptance: ["canonical template の未記入 required section が incomplete となり節名を missing_sections に返す","全 6 artifact kind の実本文は受理し、見出しだけへ潰した mutation は拒否する","C02 の template-only 新規生成と placeholder 再生成を transaction rollback する","task 仕様書品質ゲート、plugin package gate、repository 品質ゲートが通る","仕様反映受領書と Beads 更新を完了し draft PR を作成する"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-implementation-readiness-body-validation-20260728.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-29T06:17:57Z","origin_kind":"generated","source_digest":"26ad9ea7e825da5bedd2ff3952fa7013065c1dbbfc5fc120cbc723bce86af95e","source_path":"system-spec/dev-workflow.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 1
classification_reason: "HarnessHub-4t9g の受入条件と qa-091 が C11 artifact 本文 readiness の単一責務を確定する"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-implementation-readiness-body-validation-20260728.md","confidence":1}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-4t9g","linked_at":"2026-07-29T06:17:57Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-29T06:17:57Z","missing_sections":[],"status":"complete"}
---

# 概要

Dev Graph C11 が artifact file と frontmatter の存在だけで
`implementation_readiness=complete` を返し、本文が canonical template の
placeholder のままでも tracker 投影と system build handoff へ進める欠陥を修正する。

## 背景と問題

2026-07-28 の C14 decompose live-trial では、feature と architecture を含む 5 artifact の
本文が template placeholder のまま生成された。それでも C11 は本文を一度も読まず、
readiness complete と missing_sections 空を返したため、後段 gate が実質的に無効だった。

## 現在の挙動

変更前は `artifact_findings()` が path、frontmatter、node parity だけを検査した。
必須節が空、angle-bracket placeholder のまま、`TODO` だけ、または見出しだけでも
本文由来の violation は作られなかった。

## 期待する挙動

C11 は artifact kind 別の canonical template と required section を照合する。
空本文、canonical placeholder、`TBD` / `TODO` / `未定` だけ、fenced code block だけの
節を `placeholder_only_section` とし、readiness を incomplete にして節名を
`missing_sections` へ返す。実内容を持つ child section がある構造 container は受理する。

## 再現手順またはユースケース

canonical template から frontmatter 付き artifact を作り、C11 を実行する。
変更前は complete、変更後は kind ごとの未記入節が `missing_sections` に列挙される。
同じ artifact の各節を具体文へ置換すると violation は 0 になる。

## 影響と優先度

readiness は Beads / GitHub tracker 投影と system build handoff の前提である。
未記入仕様から実装を開始すると、下流で要件を推測して誤実装するため優先度は high とする。

## スコープ

対象は C11 Markdown 本文 parser、C02 書込後 validation、全 6 artifact kind の回帰テスト、
plugin 契約と repository の仕様反映である。required heading 名称の全量移行、製品 API、
DB、認証認可、UI、Cloudflare deploy unit は対象外とする。

## 関連グラフ

- feature: `feat-dev-pipeline-improvement`
- architecture: `arch-harness-hub-dev-workflow`
- Beads: `HarnessHub-4t9g`

## 受入条件

- canonical template と本文 mutation が readiness incomplete になる。
- 未記入節名が `missing_sections` に返る。
- 実本文は全 artifact kind で受理される。
- C02 の template-only 作成と placeholder 再生成が rollback する。
- task 仕様書と repository の品質ゲート、仕様反映、Beads 更新、draft PR を完了する。

## 検証証跡

focused pytest、Dev Graph 全回帰、task package、plugin package、repository gate、
system-spec coverage、C03 compile、graph schema の結果を仕様反映受領書と Beads notes に記録する。
