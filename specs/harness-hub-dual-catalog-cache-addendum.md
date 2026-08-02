---
graph_node_id: "spec-dual-catalog-cache-boundary"
artifact_kind: "specification"
artifact_subtypes: []
project_id: "harness-hub"
domain: "platform"
tags: ["dual-catalog","security","frontend","testing-qa","cache-boundary"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "Harness Hub Dual Catalog cache・認可境界追補"
owners: ["daishiman"]
created_at: "2026-08-01T09:00:00Z"
updated_at: "2026-08-02T08:46:51.546374Z"
status: "active"
depends_on: ["spec-harness-hub-requirements"]
related_nodes: ["feat-dual-catalog-web","arch-harness-hub-security","arch-harness-hub-frontend","arch-harness-hub-testing-qa"]
resource_scope: ["specs/harness-hub-dual-catalog-cache-addendum.md","system-spec/security.md","system-spec/frontend.md","system-spec/testing-qa.md"]
purpose: "dual catalog の cache と認可失敗表示が tenant 境界を越えない製品契約を固定する"
goal: "qa-110..112 と実装・回帰検査を一つの追跡可能な仕様境界として維持する"
scope_in: ["認証済み marketplace cache","catalog list/detail/release history の stale 表示","tenant/workspace/project scope 切替","一覧 query の要求回数"]
scope_out: ["製品 API と DB schema の変更","PublishRequest 状態機械と role 判定 owner の変更"]
acceptance: ["401/403/契約不正後に以前の catalog 内容を描画しない","同一 scope の一時障害だけ stale を許可し scope 切替後は再利用しない","認証済み marketplace は private cache と scope ごとの Vary を返す","一覧は入力中に通信せず submit 1 回につき 1 回だけ取得する"]
architecture_refs: ["arch-harness-hub-security","arch-harness-hub-frontend","arch-harness-hub-testing-qa"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "specs/harness-hub-dual-catalog-cache-addendum.md"
template_id: "specification"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"c2b6bb4aacc4d5e79a19e21e5aae578b168494b62e410b02b1b64576356d0f1c","evaluator":"system-spec-harness-final-review","evidence_ref":"docs/features/feat-dual-catalog-web/spec-reflection-receipt.md"}
source_lineage: {"imported_at":"2026-08-02T08:30:40Z","origin_kind":"system-spec-harness","source_digest":"ccec5f9db6ebdbe69e5936c1e8821058a782dd4c08c884bda399277345440f74","source_path":"system-spec/spec-state.json","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.99
classification_reason: "qa-110..112 の確定契約を横断参照する製品仕様追補"
classification_candidates: [{"artifact_kind":"specification","candidate_path":"specs/harness-hub-dual-catalog-cache-addendum.md","confidence":0.99},{"artifact_kind":"architecture","candidate_path":"architecture/harness-hub-security.md","confidence":0.52}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-08-01T09:00:00Z","missing_sections":[],"status":"complete"}
---

# Harness Hub Dual Catalog cache・認可境界追補

## 目的と成功状態

認証済み catalog の cache と失敗時表示が tenant 境界を越えず、同一 scope の一時障害だけ安全に継続表示できる状態を維持する。

## スコープ

- In: marketplace cache header、catalog の stale 表示、scope key、一覧 query の要求数。
- Out: 製品 API、DB schema、PublishRequest 状態機械、role 判定 owner の変更。

## 用語と主体

| Term/Actor | Definition/Responsibility |
|---|---|
| scope | tenant/workspace/project の組。cache 再利用可否の最小境界 |
| degraded | 同一 scope の一時障害中に、直前の検証済み値を表示する状態 |
| non-browse failure | 401/403/契約不正など、以前の値も閲覧させてはならない失敗 |
| Hub UI | scope key と失敗分類に従って表示を決める consumer |

## ユースケースとユーザーフロー

1. 利用者が一覧条件を入力しても通信せず、送信時に 1 回だけ取得する。
2. 同じ scope で一時障害になった場合は、縮退表示を付けて直前の値を利用できる。
3. 認可失敗または scope 切替後は、以前の catalog 内容を表示しない。

## 機能要件

- `FR-DC-001`: 401/403/契約不正後は list/detail/release history の旧内容を描画しない。
- `FR-DC-002`: cache key を tenant/workspace/project に束縛する。
- `FR-DC-003`: 同一 scope の 5xx 等だけ stale 表示を許可する。
- `FR-DC-004`: 入力中は取得せず submit 1 回につき 1 回取得する。

## 非機能要件

- Performance: 認証済み marketplace は private cache で最大 60 秒 fresh、最大 300 秒 stale とする。
- Availability/Reliability: 同一 scope の一時障害では直前値を継続利用できる。
- Accessibility/Usability: failure と degraded を既存の ErrorState/DegradationBanner で区別する。
- Security/Privacy: shared cache を禁止し、Cookie/tenant/workspace を `Vary` に含める。
- Maintainability/Operability: DC-TEN-06..10、DC-LIST-01、DC-MKT-07 を CI で実行する。

## UI・状態遷移

- 画面状態: loading、fresh、degraded、error。
- 遷移条件: 同一 scope の一時障害だけ fresh から degraded へ遷移する。
- Loading/Empty/Error: 401/403/契約不正では ErrorState のみを表示し、旧データを併置しない。

## ビジネスルールと検証

- `BR-DC-001`: stale の再利用条件は同じ scope key かつ browse 可能な一時障害であること。
- `BR-DC-002`: draft filter は適用 query ではなく、submit までは request を発生させない。

## API契約

N/A: endpoint と response schema は変更せず、既存 `/marketplace.json` の cache header だけを厳格化するため。

## データモデル

N/A: 永続化 schema は変更しない。UI 内の scope key は一時的な表示制御値である。

## 認証・認可

- Authentication: 既存 session 契約を維持する。
- Authorization: 既存 middleware の role 判定を維持し、client へ複製しない。
- Tenant/data boundary: tenant/workspace/project が一致する場合だけ直前値を再利用する。

## エラー・例外・回復

- Error taxonomy: 401/403/契約不正は non-browse、5xx/timeout は degraded 候補とする。
- Retry/Timeout/Fallback: 既存 backoff と Retry-After を維持する。
- Idempotency/Concurrency: submit generation ごとに 1 request とし、古い応答を新 query へ混ぜない。

## イベント・非同期処理

N/A: 新しい producer/consumer、queue、event は追加しない。

## 可観測性

- Logs/Metrics/Traces/Audit: 既存 fetch/CI 出力を使い、catalog 本文を log へ複製しない。
- Alert/SLO dashboard: CWV 本番実測は公開後の既存 gate で扱う。

## 互換性・移行・リリース

- Compatibility/versioning: API と DB の version 変更なし。
- Migration/backfill: N/A: 永続データ変更なし。
- Rollout/rollback: UI と route header を同じ commit で反映し、不具合時は同 commit を revert する。

## テストと受入条件

- [x] `AC-DC-001`: 成功後の 403 で旧 list/detail/history が描画されない。
- [x] `AC-DC-002`: 同一 scope の 503 は stale を維持し、scope 切替後の 503 は維持しない。
- [x] `AC-DC-003`: marketplace が private cache と scope ごとの `Vary` を返す。
- [x] `AC-DC-004`: 入力中は 0 request、submit 1 回は 1 request になる。

## 未決事項

- CWV 本番実測、2 社同時稼働 U5、低品質報告導線は release follow-up として維持する。
