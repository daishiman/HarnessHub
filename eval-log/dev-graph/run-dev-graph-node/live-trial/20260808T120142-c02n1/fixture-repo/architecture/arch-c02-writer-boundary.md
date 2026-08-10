---
graph_node_id: "arch-c02-writer-boundary"
artifact_kind: "architecture"
artifact_subtypes: ["backend","data"]
project_id: "c02fix"
domain: "dev-workflow"
tags: ["live-trial","c02-out1","architecture"]
priority: null
start_date: null
target_date: null
iteration: null
title: "単一 writer の書込境界と graph store の整合"
owners: ["dev-graph-harness"]
created_at: "2026-08-08T03:10:03Z"
updated_at: "2026-08-08T03:10:03Z"
status: "draft"
depends_on: []
related_nodes: ["iss-c02-mixed-routing","spec-c02-mixed-batch-contract"]
resource_scope: ["architecture/arch-c02-writer-boundary.md"]
purpose: null
goal: null
scope_in: []
scope_out: []
acceptance: []
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "architecture/arch-c02-writer-boundary.md"
template_id: "architecture"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-08T03:10:03Z","origin_kind":"manual","source_digest":"db95e0994a17f656d563447b0d7398f43cff896ba1081cfec061711e06001ad8","source_path":"mixed-artifacts.json","source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "構成と subtype (backend/data) の境界を定義するため architecture へ写像した"
classification_candidates: [{"artifact_kind":"architecture","candidate_path":"architecture/arch-c02-writer-boundary.md","confidence":0.99},{"artifact_kind":"specification","candidate_path":"specs/arch-c02-writer-boundary.md","confidence":0.19}]
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

# Architecture overview

content artifact と graph store の 2 ファイル更新を単一 transaction として扱い、書込を C02 単一 writer に集約する境界設計。artifact_kind から canonical content root への写像を writer 内部に閉じ込め、graph node と content path の対応を一意に保つ。

## Context and drivers

- Business/technical context: 混在バッチ登録で graph store と Markdown 実体が乖離すると、後段の status/next/render が二重正本を読む
- Quality attribute priorities: 整合性 > 復元可能性 > 実行時間
- Constraints: 外部ネットワークを使わず、caller repository 内で完結する

## Goals and non-goals

- Goals: 2 ファイル更新の atomicity、kind から path への決定論写像、中断時の before-image 収束
- Non-goals: tracker への投影、exact-13 package の phase 契約、可視化 HTML の生成

## System context and boundaries

- Users/external systems: dev-graph skill 呼出し元と caller repository のファイルシステム
- Trust/deployment/data boundaries: repository root を containment 境界とし、realpath が外へ出る read/write を禁止する
- Context diagram: 呼出し元 skill から C02 writer へ入り、writer だけが graph store と content root へ書く単一方向の流れ

## Container and component view

| Container/Component | Responsibility | Interface | Data owner | Deployment unit |
|---|---|---|---|---|
| upsert-node | 通常 node の atomic upsert | CLI 引数と node 入力 JSON | content artifact と graph store | dev-graph plugin scripts |
| node_transaction | WAL 準備と before/after image の durable 化 | Python 内部 API | .dev-graph 配下の WAL | dev-graph plugin scripts |
| validate-graph-schema | schema/domain/artifact の契約検査 | CLI と Python API | 検査結果のみ | dev-graph plugin scripts |

## Cross-cutting contracts

- Identity/access: graph_node_id を不変 identity とし、file_path は再計算可能な projection として扱う
- Errors/resilience: 契約違反は ContractError で fail-closed、部分適用を残さない
- Observability/audit: receipt に operation、graph_revision、sha256、write_count を必ず含める
- Configuration/secrets: .dev-graph/config.json の content_roots を唯一の配置正本とし、secret を保持しない
- Compatibility/versioning: schema_version と template_version を frontmatter へ固定する

## Subtype architecture

合成対象は backend と data の 2 subtype で、それぞれ下位節に実体を持つ。

- Frontend: N/A: 本 architecture は CLI と graph store の境界だけを対象とする
- Backend: 下記 Backend architecture 節に記載する
- Infrastructure: N/A: 追加の実行基盤を持たずローカル実行で完結する
- Data: 下記 Data architecture 節に記載する
- Security: N/A: 認証主体を持たず、containment 検証を Cross-cutting contracts に集約する

### Backend architecture

書込は C02 単一 writer に集約し、他経路からの直接書込を許さない。

- Runtime/framework: Python 3.10 以上の標準ライブラリのみ
- Pattern: 単一書込入口 + WAL による 2 ファイル atomic 更新
- Domain and module boundaries: 分類 (R1/R2)、本文合成 (R4)、書込 (R3) を別責務として分離する
- API and service contracts: CLI 引数と node 入力 JSON を入力、receipt JSON を出力とする
- Data and transaction behavior: graph store の排他 lock 取得後に artifact と graph を順に置換し、失敗時は rollback する
- Async processing: N/A: 非同期処理を持たない
- Security and resilience: 入力 path の realpath containment を検証し、外部 write を拒否する
- Operations and verification: dry-run と apply の 2 段で routing と schema を確認する

### Data architecture

graph.json は nodes 配列を正本とし、node と content path の対応を一意に保つ。

- Data domains and ownership: graph store は C02 が system of record を持つ
- Logical and physical model: node は graph_node_id を主キーとし、file_path は canonical root 配下の相対 path
- Access and consistency: 読取は lock 共有、書込は排他 lock で逐次化する
- Lifecycle and governance: 物理削除を行わず tombstoned で論理削除を表す
- Migration and recovery: WAL の before-image から中断位置に依らず収束する
- Data verification: validate-graph-schema.py が schema、domain、artifact parity を検査する

## Architecture decisions

| ADR | Decision | Alternatives | Trade-on rationale | Consequences |
|---|---|---|---|---|
| ADR-001 | 書込入口を C02 単一 writer に限定する | 各 skill が直接書く | 二重正本と部分適用を構造的に排除する | 書込経路の変更コストが writer に集中する |
| ADR-002 | 2 ファイル更新を WAL で保護する | artifact 先行書込のみ | 中断位置に依らず before-image へ収束する | WAL 残存時は読取側を fail-closed にする必要がある |

## Delivery, migration and rollback

- Build/deploy topology: plugin scripts をそのまま実行し、追加のビルド成果物を持たない
- Migration sequence: 既存 artifact の本文は保持し、必要時のみ明示指定で再生成する
- Rollback trigger/procedure: 例外・割込みで即 rollback、強制終了は次回起動時に WAL から復元する

## Risks and verification

- Risk/assumption: WAL が残ったまま読取系が起動すると部分状態を見せる恐れがある
- Architecture fitness test: validate-graph-schema.py の違反 0 件を書込前後で確認する
- Load/failure/security validation: 中断注入と再実行の冪等性 (operation=noop) を live-trial で観測する
