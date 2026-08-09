---
graph_node_id: "spec-c02-mixed-batch-contract"
artifact_kind: "specification"
artifact_subtypes: []
project_id: "c02fix"
domain: "dev-workflow"
tags: ["live-trial","c02-out1","specification"]
priority: null
start_date: null
target_date: null
iteration: null
title: "混在バッチ登録の入出力契約"
owners: ["dev-graph-harness"]
created_at: "2026-08-08T03:10:03Z"
updated_at: "2026-08-08T03:10:03Z"
status: "draft"
depends_on: []
related_nodes: ["iss-c02-mixed-routing"]
resource_scope: ["specs/spec-c02-mixed-batch-contract.md"]
purpose: null
goal: null
scope_in: []
scope_out: []
acceptance: []
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "specs/spec-c02-mixed-batch-contract.md"
template_id: "specification"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-08T03:10:03Z","origin_kind":"manual","source_digest":"db95e0994a17f656d563447b0d7398f43cff896ba1081cfec061711e06001ad8","source_path":"mixed-artifacts.json","source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "入力契約/出力契約を定義する規範文書であるため specification へ写像した"
classification_candidates: [{"artifact_kind":"specification","candidate_path":"specs/spec-c02-mixed-batch-contract.md","confidence":0.99},{"artifact_kind":"document","candidate_path":"docs/spec-c02-mixed-batch-contract.md","confidence":0.15}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-08T03:10:03Z","missing_sections":[],"status":"complete"}
---

# 目的と成功状態

1 回の入力バッチが issue/task/specification/architecture/document を 1 件ずつ含むときの登録契約を定める。成功状態は、5 件すべてが kind ごとの canonical content root に存在し、graph.json の file_path と実ファイル path が一致し、部分適用が残っていない状態である。

## スコープ

- In: 混在バッチの入力契約、kind から content root への写像、atomic 登録、連続更新時の frontmatter と path の整合
- Out: exact-13 package 登録、Beads/GitHub への投影、render/schedule の表示契約

## 用語と主体

| Term/Actor | Definition/Responsibility |
|---|---|
| 混在バッチ | 複数 artifact_kind を 1 件ずつ含む単一入力 JSON |
| C02 単一 writer | graph store と content artifact を同一 transaction で更新する唯一の書込入口 |
| canonical content root | artifact_kind から決定論的に写像される保存先ディレクトリ |

## ユースケースとユーザーフロー

1. 利用者が 5 kind を含むバッチを用意し、run-dev-graph-node の add を呼ぶ。
2. writer が kind ごとに content root を決定し、dry-run で routing 先を提示する。
3. 同じ入力で apply し、graph revision と保存 path を receipt で受け取る。

## 機能要件

- `FR-001`: バッチ内の各成果物は artifact_kind と本文を持ち、kind ごとの canonical content root へ写像される。
- `FR-002`: 登録は artifact と graph store の 2 ファイルを単一 transaction として扱い、部分適用を残さない。
- `FR-003`: 同一入力の再実行は operation=noop、write_count=0 を返す。
- `FR-004`: feature は C14 macro contract 由来の lineage を持つときだけ受理し、通常 routing では生成しない。

## 非機能要件

- Performance: 5 件の逐次登録が 1 分以内に完了する
- Availability/Reliability: 中断時は WAL から before-image へ収束し、部分状態を読ませない
- Accessibility/Usability: receipt は保存 path と body_source を人間可読な JSON で返す
- Security/Privacy: repository 外の realpath へ read/write しない
- Maintainability/Operability: 契約違反は fail-closed とし、成功終了の陰に隠さない

## UI・状態遷移

- 画面/CLI/API状態: dry-run preview と apply の 2 状態を持つ
- 遷移条件: dry-run で schema/path 判定が PASS した同一入力だけが apply へ進む
- Loading/Empty/Error: 空 graph からの初回登録を許し、契約違反時は非 0 終了で停止する

## ビジネスルールと検証

- `BR-001`: artifact_kind と file_path の先頭要素が対応しない入力は path_parity_error として拒否する。
- `BR-002`: 既存ノードの file_path 変更は upsert では行わず、明示的な migration を要求する。

## API契約

N/A: 本仕様はローカル CLI と graph store の契約であり、公開 API endpoint を追加・変更しない。API 変更は伴わない。

## データモデル

- Entity/Value: graph node (graph_node_id を不変 identity とする)
- Fields/Types/Nullability: artifact_kind は enum、file_path は canonical root 配下の相対 .md path、parent_feature/feature_package_id/phase_ref は非 feature 由来 task 以外 null
- Relations/Constraints/Indexes: depends_on/related_nodes は既存 node id を参照し、dangling 参照を許さない
- Ownership/Retention/Migration: graph.json の nodes 配列を正本とし、物理削除せず tombstoned で表す

## 認証・認可

- Authentication: ローカル実行者の OS 権限に従う
- Authorization: 書込は C02 単一 writer 入口に限定する
- Tenant/data boundary: repository_id が config と graph store で一致することを要求する

## エラー・例外・回復

- Error taxonomy: ContractError を非 0 終了で返し、違反内容を JSON で列挙する
- Retry/Timeout/Fallback: 同一入力の再実行は冪等で、noop を返す
- Idempotency/Concurrency: graph store の排他 lock を取得し、逐次化する

## イベント・非同期処理

- Producer/Consumer: N/A: 本契約は同期的なローカル書込だけを扱う
- Delivery/Ordering/Deduplication/DLQ: N/A: 非同期配信を持たない

## 可観測性

- Logs/Metrics/Traces/Audit: receipt に graph_revision、sha256、body_source、write_count を記録する
- Alert/SLO dashboard: N/A: ローカル CLI のため常時監視対象を持たない

## 互換性・移行・リリース

- Compatibility/versioning: schema_version 1.0.0、template_version 1.0.0 を維持する
- Migration/backfill: 既存 artifact の本文は保持し、template へ暗黙に戻さない
- Rollout/rollback: 中断時は WAL 復元、論理的な取消は tombstoned で表す

## テストと受入条件

- [ ] `AC-001`: 5 kind の混在バッチを登録すると、5 件とも kind に対応する content root へ保存される
- [ ] `AC-002`: 登録済みノードを連続更新しても frontmatter の kind と保存 path が一致する
- [ ] `AC-003`: features/ に C14 macro contract 外のノードが生成されない
- Contract/integration/e2e/security/performance: validate-graph-schema.py による契約検査と live-trial の実走観測で担保する

## 未決事項

- 混在バッチを 1 コマンドで一括登録する batch 入口の提供可否は、C02 の owner が次回契約改訂で判断する。
