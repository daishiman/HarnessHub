---
graph_node_id: "issue-validator-contract-version-20260724"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["system-dev-planner","c12-validation","content-addressed","contract-version","fail-closed"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "validate-system-plan の promoted package 遡及契約を契約 version 台帳で互換化する"
owners: ["daishiman"]
created_at: "2026-07-24T23:20:15Z"
updated_at: "2026-07-24T23:45:00Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["plugins/system-dev-planner/scripts/validate-system-plan.py","plugins/system-dev-planner/scripts/validate-task-spec-contract.py","plugins/system-dev-planner/scripts/validate-json-schema-subset.py","plugins/system-dev-planner/scripts/promote-system-plan.py","plugins/system-dev-planner/assets/validation-contract-baseline.json","plugins/system-dev-planner/references/feature-execution-package-contract.md","plugins/system-dev-planner/tests/test_contract_versioning.py"]
purpose: "promote 済み feature-execution-package は canonical digest で内容が確定しており、後から強化された C12 契約 (Inner goal-seek execution loop 節・P13 spec/architecture writeback) を満たすよう修正できない。修正すれば digest が変わり published_digest を記録済みの receipt が偽になる。そこで validator 側に契約 version と台帳を持たせ、各 package を promote 時点で妥当だった契約で再検証できるようにする。新規 package は台帳に存在しないため常に最新契約で fail-closed 検証され、緩和経路にはならない"
goal: "既 promote 済み 18 generation の再検証が digest を一切変えずに status=pass へ収束し、かつ新規生成 package は最新契約 1.1.0 で fail-closed 検証されたままであること"
scope_in: ["CONTRACT_VERSIONS (1.0.0 / 1.1.0) と契約 version 解決ロジックの追加","validation-contract-baseline.json 台帳の新規作成と既 promote 18 generation の登録","実ファイル群から再計算した canonical digest による免除解決 (manifest 申告値は使わない)","promote 経路への免除無効化 (baseline={}) と AST ベースの境界テスト","validate-system-plan.py の 500 行超過に対する責務単位分割","契約正本 feature-execution-package-contract.md への §2.4 追記"]
scope_out: ["promote 済み package 本体の編集 (digest 不変性の破壊で受け入れ不可)","staging-manifest.json 申告 digest による免除判定 (改ざん可能で fail-open)","C14 build-system-handoff.py の JSON Schema サブセット統合 (C12 へのビルド依存を作るため意図的に非対象)","dev-graph 3 skill の live-trial 再取得 (HarnessHub-1y6 で追跡)"]
acceptance: ["再現コマンド (feat-doc-governance-portability / feat-stage0-distribution-gate / feat-mvp-first-scheduling) が violations 0 で status=pass を返す","report が contract_version と contract_baseline_exemption を返し免除された pass を下流が識別できる","台帳未登録 digest・digest 計算不能対象・台帳欠落のいずれも最新契約へ倒れる (fail-closed)","promote 経路の validate 呼び出しが全て baseline={} を渡す (AST テストで機械検証)","planner pytest が全件 PASS し、1 ファイル 500 行以下を維持している"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-validator-contract-version-20260724.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-24T23:20:15Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.9
classification_reason: "content-addressed package への遡及契約適用という C12 validator の欠陥を追跡する issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-validator-contract-version-20260724.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-8vx","linked_at":"2026-07-24T23:20:15Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-24T23:20:15Z","missing_sections":[],"status":"complete"}
---

# 概要

promote 済み feature-execution-package は canonical digest で内容が確定しているため後から強化された C12 契約を満たせず、現行 validator が遡及要求して exit 2 になる。validator に契約 version と台帳を持たせ、promote 時点で妥当だった契約で再検証できるようにする。

## 背景と問題

`feature-execution-package` の promote 済み generation は、決まったファイル集合に対する sha256 の canonical digest で同定される content-addressed（内容そのものが識別子になる方式）成果物である。生成物を 1 byte でも編集すると digest が変わり、`published_digest` を記録済みの promotion/registration receipt が偽になる。

2026-07-22 (`367ba5c`) に C12 契約が強化され、13 task spec へ「Inner goal-seek execution loop」節と「P13 spec/architecture writeback」marker が必須化された。この契約は promote 済み generation にも遡及適用されるが、当該 generation は上記の digest 不変性により修正できない。結果として、正当に promote された過去の package が恒久的に検証不能になる。

## 現在の挙動

```
python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . \
  --staging .dev-graph/plans/generations/feature-package-feat-doc-governance-portability/d33c318d...
```

- `task-spec-section-missing` × 13
- `inner-goal-seek-contract` × 13
- `p13-spec-architecture-writeback` × 1
- exit code 2

`feat-stage0-distribution-gate` (`30b40c7f...`) でも同型 27 violations を再現。

## 期待する挙動

promote 済み package は digest を一切変えずに `status=pass` / `violations=0` で再検証でき、かつ新規生成 package は最新契約 1.1.0 で fail-closed（判定に迷う入力は不合格側へ倒す方式）検証されたまま維持される。

## 再現手順またはユースケース

1. 上記コマンドを既 promote 済み generation に対して実行する。
2. 修正後は `status=pass` / `contract_version=1.0.0` / `contract_baseline_exemption=true` / `violations=0` を確認する。
3. 台帳未登録の新規 staging に対して実行し `contract_version=1.1.0` / `contract_baseline_exemption=false` を確認する。

## 影響と優先度

- 影響範囲: system: C12 決定論ゲート。promote 済み 18 generation の再検証・監査経路が全面的に不能。
- 深刻度: high
- 緊急度: 既 package の再検証が通らないと evaluator/promoter の回帰確認と監査追跡が成立せず、後続 feature の plan 昇格判断が根拠を失う。

## スコープ

- In: 契約 version 定義と台帳解決、実ファイル再計算 digest による免除、promote 経路の免除無効化、責務単位のファイル分割、契約正本への追記。
- Out: promote 済み package 本体の編集、manifest 申告 digest による判定、C14 の JSON Schema サブセット統合、dev-graph 3 skill の live-trial 再取得 (HarnessHub-1y6)。

## 関連グラフ

- 原因/親ノード: なし (validator 自体の欠陥)
- 関連仕様: なし (Hub 製品仕様ではなく plugin 内部契約。正本は `plugins/system-dev-planner/references/feature-execution-package-contract.md` §2.4)
- 関連アーキテクチャ: なし
- 解決タスク: beads `HarnessHub-8vx`

## 受入条件

- [x] 3 package の再現コマンドが `violations=0` / `status=pass` を返す
- [x] report が `contract_version` と `contract_baseline_exemption` を返す
- [x] 台帳未登録 digest・digest 計算不能対象・台帳欠落が全て最新契約へ倒れる
- [x] promote 経路の `validate` 呼び出しが全て `baseline={}` を渡す (AST テストで機械検証)
- [x] planner pytest 全件 PASS かつ 1 ファイル 500 行以下

## 検証証跡

- コマンド/テスト: `python3 -m pytest plugins/system-dev-planner/tests -q` (122 passed) / `plugins/system-dev-planner/tests/test_contract_versioning.py` (12 tests)
- 証跡 path: `docs/features/feat-validator-contract-version/spec-reflection-receipt.md`
