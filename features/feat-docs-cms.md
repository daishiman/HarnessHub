---
graph_node_id: "feat-docs-cms"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["macro-feature","studio-extension","frontend"]
priority: "medium"
start_date: null
target_date: null
iteration: "Studio 拡張"
title: "Studio: ドキュメント CMS (common/tenant スコープ・AI 下書き)"
owners: ["daishiman"]
created_at: "2026-07-17T10:44:09Z"
updated_at: "2026-08-02T20:51:00.109559Z"
status: "active"
depends_on: ["feat-hub-foundation","feat-domain-model-db","feat-auth-tenancy"]
related_nodes: []
resource_scope: ["features/feat-docs-cms.md"]
purpose: "利用ガイド・FAQ 等のドキュメントを common (全テナント) / tenant (テナント限定) スコープで管理し (B7/I13)、S15 の閲覧/編集 UI と D5 pull 型 AI キューによる下書き生成を提供する"
goal: "ドキュメントがスコープ規則 (tenant 分離 + common 共有) 下で閲覧・編集でき、Markdown が sanitize 済みで描画され (SEC7)、AI 下書きがキュー経由で生成される状態"
scope_in: ["Doc エンティティ (scope=common/tenant・Markdown 本文)","S15 一覧/閲覧/編集 (編集は admin)","Markdown レンダラ + エディタ共通部品の消費 (XSS sanitize)","AI 下書き生成 (D5 キュー)","doc 編集の監査 event (SEC6)"]
scope_out: ["外部公開サイト生成","バージョン管理 (Git 連携)"]
acceptance: ["tenant スコープ doc が他テナントから参照できない (分離テスト)","Markdown 描画で XSS が sanitize される (テスト付き)","編集操作が監査 event に記録される"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-backend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-docs-cms.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"a899e69eb999800a5869499783aad943cea65d394af3e3046fd6631532cf3a85","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-docs-cms/a899e69eb999800a5869499783aad943cea65d394af3e3046fd6631532cf3a85/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-18T22:35:48Z","origin_kind":"generated","source_digest":"7e1a6753bec43aa5e758f148039c1af71517142bb6e039dc8b1de20638018d77","source_path":"specs/harness-hub-system-specification.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.9
classification_reason: "C14 マクロ分解 (Studio mockup 反映で確定した U7 拡張スコープ + I10-I14 から導出)"
classification_candidates: [{"artifact_kind":"feature","candidate_path":"features/feat-docs-cms.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-9wb","linked_at":"2026-07-18T01:43:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# Studio: ドキュメント CMS (common/tenant スコープ・AI 下書き)

> Studio 拡張 / macro feature (C14)。1 feature = 13 task への細分解は system-dev-planner (`/dev-graph plan`) が行う。
> 由来: Harness Studio mockup 反映 (qa-021〜030・U7 改訂 appr-004/005・D5/D6)。正本分析: docs/mockups/harness-studio-v2-analysis.md

## 目的

利用ガイド・FAQ 等のドキュメントを common (全テナント) / tenant (テナント限定) スコープで管理し (B7/I13)、S15 の閲覧/編集 UI と D5 pull 型 AI キューによる下書き生成を提供する

## 到達状態

ドキュメントがスコープ規則 (tenant 分離 + common 共有) 下で閲覧・編集でき、Markdown が sanitize 済みで描画され (SEC7)、AI 下書きがキュー経由で生成される状態

## スコープ

**対象 (in):**

- Doc エンティティ (scope=common/tenant・Markdown 本文)
- S15 一覧/閲覧/編集 (編集は admin)
- Markdown レンダラ + エディタ共通部品の消費 (XSS sanitize)
- AI 下書き生成 (D5 キュー)
- doc 編集の監査 event (SEC6)

**対象外 (out):**

- 外部公開サイト生成
- バージョン管理 (Git 連携)

## 受入

- tenant スコープ doc が他テナントから参照できない (分離テスト)
- Markdown 描画で XSS が sanitize される (テスト付き)
- 編集操作が監査 event に記録される

## アーキテクチャ参照

- [arch-harness-hub-frontend](../architecture/harness-hub-frontend.md)
- [arch-harness-hub-backend](../architecture/harness-hub-backend.md)

- 要件正本: [spec-harness-hub-requirements](../specs/harness-hub-system-specification.md)

## 機能間依存

- feat-hub-foundation
- feat-domain-model-db
- feat-auth-tenancy

## Handoff

- 次工程: `/dev-graph plan --feature-id <本 feature id> --feature-context features/<id>.context.json` (exact-13 task 仕様化)
- 昇格条件: confirmation_status=confirmed + evaluation_status=pass + implementation_readiness=complete で起票対象になる

## Production acceptance (2026-08-08 / `HarnessHub-p0lr`)

- production DB で document 作成、`doc_draft` enqueue/pull/complete、本文書戻しを 1 run で確認する。
- 別 tenant context では detail/list の双方から tenant document が見えず、Bearer read は `credential_not_allowed` になることを確認する。
- main `35a10b87` / hub-ci run `31253674292` で D1〜D6 と cleanup 残存行 0 を確認し、production acceptance を充足した。
- PR #681 / #682 の default-branch reconciliation を 2026-08-10 に確認し、`SYS-DOCS-CMS-P13` の durable completion evidence を記録した。

## S15 master-detail 不採用の決着 (2026-08-12 / `HarnessHub-ydf8`)

- wide/middle の table 採用理由（行どうしの比較）と master-detail 左ペイン縮小は構造的に両立しないため、master-detail は **不採用**。
- 連続閲覧の前後送りは代表タスクの必須依存ではなく future 案。再考条件は [S15 情報設計シート](../docs/features/feat-docs-cms/information-design/S15.md) に置く。
- 公開 API / DB schema / 認可 / deploy unit は変更なし。system-spec の S15 記述（一覧/閲覧/編集）とも矛盾しない。


## MVP 追補: ブログ運用 4 項目 + 予約公開 (2026-08-12 / HarnessHub-zkcl)

**Beads**: `HarnessHub-zkcl` / graph node: `issue-docs-cms-blog-essentials-integrate-20260812`

本 feature の scope_in を壊さず、運用に必要な最小の分類・公開予約を additive に追加する。

### 追加する能力

| 項目 | 契約 |
|---|---|
| カテゴリ | `category` text nullable。一覧は完全一致フィルタ |
| タグ | `tags` JSON 配列 (最大 20)。一覧は要素完全一致 |
| アイキャッチ | `thumbnail_url` + `thumbnail_source(auto/manual)`。手動値は本文更新で上書きしない |
| 要約 | `excerpt` + `excerpt_source(auto/manual)`。手動値は本文更新で上書きしない |
| 予約公開 | nullable `publish_at` (epoch ms)。`scheduled` は DB enum にせず `draft + future publish_at` から導出 |

### 受入 (MVP 最小)

- 未来の `publish_at` を持つ draft は一覧/詳細で「予約中」と見える
- 日次 cron は bounded batch (default/max 100, 安定順 CAS) で期限到来分だけ公開し `publish_at` を clear する
- main の画像 upload / external ETag+revision CAS / エラー詳細表示を退行させない
- migration は main lineage 上の `0014_docs-cms-scheduled-publishing` のみを予約公開 DDL とする

### 対象外

- 外部公開サイト生成・全文検索エンジン・バージョン履歴 UI
- `scheduled` を永続 status として追加すること
