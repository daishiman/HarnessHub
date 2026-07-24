---
graph_node_id: "issue-build-trace-doc-coverage-schema-drift-20260723"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality-gate","skill-design","reg-001","build-trace","schema-drift"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "validate-build-trace.py の doc_coverage schema drift で全 skill-design 評価に REG-001 (high) が誤計上される"
owners: ["daishiman"]
created_at: "2026-07-24T08:23:21Z"
updated_at: "2026-07-24T08:23:21Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["issues/sys-build-trace-doc-coverage-schema-drift-20260723.md","scripts/validate-build-trace.py","tests/scripts-root/test_root__validate_build_trace_doc_coverage.py"]
purpose: "scripts/validate-build-trace.py が期待する build-trace JSON schema (top-level doc_coverage dict) が初期構築 commit 6a46c39 以来の実データ 3 形式と乖離し、skill-design rubric の REG-001 (high) が被評価 skill へ一律誤計上される。無関係な SKILL.md 変更 (例: HarnessHub-hiu の schedule doc 修正, score 74<80 FAIL) が巻き添え減点される状態を解消する"
goal: "証跡データ (eval-log) を書き換えず、validator が実データ 3 形式 (dict / list / component trace) を自動判別して fail-closed で検証し、リポジトリ実在の健全な build trace 全件が exit 0 になっている"
scope_in: ["scripts/validate-build-trace.py の 3 形式自動判別対応","tests/scripts-root/test_root__validate_build_trace_doc_coverage.py の回帰テスト拡充","実在 build trace 全件の exit 0 確認"]
scope_out: ["証跡データ (eval-log) の書き換え (証跡改ざんに該当)","skill-design rubric.json REG-001 定義の変更 (check 文はそのまま成立)","plugins/harness-creator 側 validate-build-trace.py の変更"]
acceptance: ["リポジトリ実在の build trace 12 ファイル全てで exit 0 になる","dict 形式の旧 B-3 契約 (ch11/13/14/15/16 必須・true) が維持される","list 形式で PASS=evidence 必須 / N/A=reason または evidence 必須が検証される","component trace 形式で components[].id/sha256 と components_total/components_existing の整合が検証される","python3 -m pytest tests/ が全件 PASS する"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-build-trace-doc-coverage-schema-drift-20260723.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-24T08:23:21Z","origin_kind":"manual","source_digest":null,"source_path":"scripts/validate-build-trace.py","source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "検証 script の schema 乖離により評価ゲートが誤 FAIL する欠陥を追跡する issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-build-trace-doc-coverage-schema-drift-20260723.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-07-24T08:23:21Z","missing_sections":[],"status":"incomplete"}
---

# 概要

`scripts/validate-build-trace.py` が期待する build-trace JSON schema (top-level `doc_coverage` dict) が実データと乖離し、skill-design 評価の REG-001 (high) が全 skill に誤計上される。

## 背景と問題

初期構築 commit 6a46c39 以来、eval-log の実データには 3 形式が併存する:

1. **dict 形式** (旧 B-3 契約): `{"doc_coverage": {"ch11_templates": true, ...}}`
2. **list 形式** (skill 単位 `skill-build-trace.json`。正本: `plugins/harness-creator/skills/run-build-skill/references/reproducibility-trace-schema.md`): `{"doc_coverage": [{"doc": "11-templates", "status": "PASS", "evidence": ...}]}`
3. **component trace 形式** (plugin 単位 `eval-log/<plugin>/_plugin/build-evidence/*/build-trace.json`): `doc_coverage` を持たず `components[]` を持つ別種の成果物

validator は 1 の dict 形式しか受理しないため、2・3 の健全な実証跡が exit 1 で FAIL する。skill-design rubric (`plugins/harness-creator/skills/assign-skill-design-evaluator/references/rubric.json`) の REG-001 は「scripts/validate-plugin-completeness.py と scripts/validate-build-trace.py が exit 0 で通る」を check とするため、被評価 skill に high として一律誤計上され、無関係な SKILL.md 変更 (例: HarnessHub-hiu の schedule doc 修正、score 74<80 FAIL) が巻き添え減点される。

## 現在の挙動

- `eval-log/dev-graph/_plugin/build-evidence/20260713/build-trace.json` (component trace 形式) → `missing top-level key: doc_coverage` で exit 1
- skill 単位 `skill-build-trace.json` (list 形式) → `doc_coverage must be an object/dict` で exit 1
- 検知証跡: `eval-log/core/2026-07-22-score.jsonl` の REG-001 finding、content-review verdict notes (2026-07-22)

## 期待する挙動

証跡データ (eval-log) は書き換えず、validator が実データ 3 形式を自動判別して検証する。dict 形式は旧 B-3 契約を維持、list 形式は必須章 11/13/14/15/16 を harness-creator 側 `_completion_status_ok` と同契約 (PASS=evidence 必須 / N/A=reason または evidence 必須) で検証、component trace 形式は `components[].id/sha256` と `components_total`/`components_existing` の非負整数・整合を検証する。どの形式にも該当しない入力は fail-closed で exit 1。

## 再現手順またはユースケース

1. `python3 scripts/validate-build-trace.py eval-log/dev-graph/_plugin/build-evidence/20260713/build-trace.json`
2. 修正前: exit 1 (`missing top-level key: doc_coverage`) / 修正後: exit 0 (`component trace PASS`)

## 影響と優先度

- 影響範囲: system (skill-design 評価の全件)
- 深刻度: high
- 緊急度: REG-001 誤計上が無関係な変更の評価 FAIL を誘発し、評価ゲートの信頼性を損なうため

## スコープ

- In: `scripts/validate-build-trace.py` の 3 形式自動判別対応 / `tests/scripts-root/test_root__validate_build_trace_doc_coverage.py` の回帰テスト拡充
- Out: 証跡データ (eval-log) の書き換え / rubric.json REG-001 定義の変更 / `plugins/harness-creator` 側 validate-build-trace.py の変更

## 関連グラフ

- 原因/親ノード: なし (初期構築時からの schema 乖離)
- 関連仕様: なし (製品仕様 system-spec/specs/architecture への影響なし)
- 関連アーキテクチャ: なし
- 解決タスク: 本 issue 内で完結 (branch `devgraph/issue-build-trace-doc-coverage-schema-drift-20260723`)

## 受入条件

- [x] リポジトリ実在の build trace 12 ファイル全てで exit 0 になる
- [x] dict 形式の旧 B-3 契約 (ch11/13/14/15/16 必須・true) が維持される
- [x] list 形式で PASS=evidence 必須 / N/A=reason または evidence 必須が検証される
- [x] component trace 形式で components[].id/sha256 と total/existing の整合が検証される (負数・文字列・bool は拒否)
- [x] `python3 -m pytest tests/` が全件 PASS する

## 検証証跡

- コマンド/テスト: `python3 -m pytest tests/scripts-root/test_root__validate_build_trace_doc_coverage.py -q` (64 件 PASS) / `python3 -m pytest tests/ -q` (7337 passed, 5 skipped) / `python3 scripts/lint-test-discovery-coverage.py` (orphan 0) / `python3 scripts/validate-plugin-completeness.py` (22 plugins OK)
- 証跡 path: `tests/scripts-root/test_root__validate_build_trace_doc_coverage.py` (統合スモーク `test_repo_evidence_traces_pass` が実証跡 12 ファイルの exit 0 を回帰検証)

## 追跡

- Beads: HarnessHub-hkx (external_ref: dev-graph:issue-build-trace-doc-coverage-schema-drift-20260723)
