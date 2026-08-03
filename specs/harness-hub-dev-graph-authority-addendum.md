---
graph_node_id: "spec-harness-hub-dev-graph-authority-addendum"
artifact_kind: "specification"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["dev-graph","beads","authority","quality-gate"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "Harness Hub Dev Graph / Beads authority 追補"
owners: ["daishiman"]
created_at: "2026-08-02T11:56:44Z"
updated_at: "2026-08-02T12:13:53Z"
status: "active"
depends_on: ["spec-harness-hub-requirements"]
related_nodes: ["arch-harness-hub-dev-workflow","issue-guard-script-file-indirection-20260726","issue-guard-graph-schema-inline-python-variable-path-20260726","issue-guard-graph-schema-newline-segment-split-20260728","issue-bd-free-field-write-route-20260721"]
resource_scope: ["specs/harness-hub-dev-graph-authority-addendum.md","system-spec/dev-workflow.md","architecture/harness-hub-dev-workflow.md"]
purpose: "Dev Graph と Beads の正本更新を事前遮断・実行後監査・保存時検証・単一 bridge で保護する"
goal: "qa-138 の C10/C11/C28 authority 契約と実装・品質証拠を一つの追跡可能な仕様境界として維持する"
scope_in: ["C10 command guard","PostToolUse drift audit","C11 exact envelope","C28 Beads bridge"]
scope_out: ["製品 API の変更","製品 DB schema の変更","認証認可・UI・deploy unit の変更"]
acceptance: ["inline path と改行 segment の直接書込みを C10 が拒否する","script-file drift と初回 invalid state を PostToolUse が fail-closed に検出する","C02・C11・監査が同じ exact-4-key envelope を使う","C28 が Beads 自由フィールドを正規 bridge 経由で更新する"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "specs/harness-hub-dev-graph-authority-addendum.md"
template_id: "specification"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"7fd613b24a1b65b21cecae6e7bb54c3b68841ed485662409ae8346ee66df9d91","evaluator":"validate-coverage-matrix.py","evidence_ref":"system-spec/spec-state.json"}
source_lineage: {"imported_at":"2026-08-02T13:18:41Z","origin_kind":"system-spec-harness","source_digest":"d354adf3f05a030b4cb514285777099ed0c4d457213d66affdd14f3a3bc71682","source_path":"system-spec/dev-workflow.md","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.99
classification_reason: "qa-138 の Dev Graph / Beads authority 契約を aggregate から、qa-134 の責務境界と qa-070 文書行数ゲートに従って分冊する仕様追補"
classification_candidates: [{"artifact_kind":"specification","candidate_path":"specs/harness-hub-dev-graph-authority-addendum.md","confidence":0.99},{"artifact_kind":"architecture","candidate_path":"architecture/harness-hub-dev-workflow.md","confidence":0.64}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-08-02T12:13:53Z","missing_sections":[],"status":"complete"}
---

# Harness Hub Dev Graph / Beads authority 追補

## 目的と成功状態

Dev Graph と Beads の正本更新を、事前遮断・実行後監査・保存時検証・単一 mutation bridge の四境界で守り、script file や inline command からの迂回を検出できる状態を維持する。

## スコープ

- In: C10 command guard、PostToolUse drift 監査、C11 exact envelope、C28 Beads bridge、関連する品質証拠。
- Out: Harness Hub 製品の外部 API、DB schema、認証認可、UI、Cloudflare deploy unit。

## 用語と主体

| 用語 | 定義 |
|---|---|
| canonical store | `.dev-graph/state/graph.json` と `.dev-graph/config.json` の正本ファイル |
| exact-4-key envelope | graph store 最上位の許可 key を過不足なく固定する保存形状 |
| C10 | command 文字列だけで確定できる危険な直接書込みを実行前に止める guard |
| C11 | 保存済み graph の schema と envelope を fail-closed で検証する validator |
| C28 | Beads mutation を正規 CLI 契約へ変換する単一 bridge |

## ユースケースとユーザーフロー

1. inline Python や改行区切り shell が正本へ直接書く場合、C10 が実行前に拒否する。
2. script file 経由で正本が変化した場合、PostToolUse が stat・digest・revision・envelope を突合する。
3. C02 writer が保存する際、C11 と共有 module が exact envelope を検証する。
4. Beads の自由フィールド更新は C28 を通り、公開引数を正規 `bd` 引数へ変換する。

## 機能要件

- `FR-DGA-001`: inline 変数から復元できる canonical path と独立した改行 segment を C10 が検出する。
- `FR-DGA-002`: 監査 baseline は size・mtime・ctime・digest・revision を保持し、invalid state を採用しない。
- `FR-DGA-003`: C02・C11・監査は同じ exact-envelope 定義を利用する。
- `FR-DGA-004`: C28 は `priority`・`assignee`・`labels` を direct `bd update` なしで更新する。

## 非機能要件

- Safety: 未検査・不正形状・初回 invalid state を成功へ読み替えない。
- Maintainability: script-file の意味解析を C10 に重複実装せず、責務を三層へ分離する。
- Portability: 証拠と契約 path はリポジトリ相対で保存する。
- Size: ソースコードとテストには一律の数値行数上限を設けず、責務境界と変更容易性で分離する。実行時 context の `SKILL.md` 本文は 300 行、`prompts/*.md|yaml` は 500 行、qa-070 の正規文書は 300 行を、それぞれ機械検査する。

## UI・状態遷移

N/A: repository 内の開発管理 contract であり、製品 UI と画面状態を変更しない。

## ビジネスルールと検証

- confirmed drift と初回 invalid state は clean baseline へ昇格させない。
- rollback advisory は shell segment が VCS 操作だけの場合に限定する。
- 公開 `--labels` は replacement 型の `bd --set-labels` へ変換し、順序依存の add/remove を持たない。

## API契約

N/A: 製品 API は変更しない。対象は repository 内 CLI と hook の内部契約だけである。

## データモデル

Dev Graph store の最上位 envelope と revision/digest の整合性だけを強化し、製品 DB schema は変更しない。

## 認証・認可

N/A: 製品認証認可は変更しない。書込 authority は C02 と C28 の既存所有境界を継承する。

## エラー・例外・回復

不正な直接書込みは非 0 終了で拒否する。confirmed drift は自動修復せず、VCS-only の場合だけ復旧候補を案内し、混在 writer では原因を限定しない。

## イベント・非同期処理

PostToolUse が tool 完了後に監査する。非同期 queue や製品イベントは追加しない。

## 可観測性

監査結果、live-trial verdict、criteria receipt、task 品質ゲートを相対 path の append-only 証拠として保持する。

## 互換性・移行・リリース

既存 C02/C10/C11/C28 の公開入口を維持する。最新 main の C28 実装を継承し、この branch で重複実装しない。

## テストと受入条件

- inline path、改行 segment、script-file drift、ctime、初回 invalid、VCS-only 判定の正負例が通る。
- exact envelope の余剰 key・欠落 key を C02/C11/監査が同じ基準で拒否する。
- 9 skill の live trial と repository CI が合格し、仕様反映受領書から証拠へ追跡できる。

## 未決事項

- なし。PR review と merge は delivery 上の残作業として Beads を open のまま追跡する。

## 正本と履歴

- qa-138 / appr-027: `system-spec/spec-state.json` と `system-spec/dev-workflow.md`
- 設計: `architecture/harness-hub-dev-workflow.md`
- 今回の判断と検証: `docs/features/feat-dev-pipeline-improvement/guard-authority-c10-c11-c28-spec-reflection-receipt.md`
- C28 継承判断: `docs/features/feat-dev-pipeline-improvement/dc7-bd-free-field-write-route-spec-reflection-receipt.md`
- bridge 内部分割: `docs/features/feat-dev-pipeline-improvement/w7n7-bd-bridge-split-spec-reflection-receipt.md`
