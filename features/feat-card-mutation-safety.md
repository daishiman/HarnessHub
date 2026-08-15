---
graph_node_id: "feat-card-mutation-safety"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "harness-hub"
domain: "data-safety"
tags: ["idempotency","etag","conflict","docs-cms","reliability"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "カード編集の二重送信と更新衝突の安全化 (冪等キー + ETag/If-Match)"
owners: ["daishiman"]
created_at: "2026-08-13T22:39:59Z"
updated_at: "2026-08-15T00:55:35.784176Z"
status: "active"
depends_on: []
related_nodes: ["arch-harness-hub-backend","arch-harness-hub-security","feat-docs-cms","feat-hearing-intake"]
resource_scope: ["apps/hub/src/app/api/v1/docs/route.ts","apps/hub/src/app/api/v1/docs/[id]/route.ts","apps/hub/src/app/api/v1/sheets/route.ts","apps/hub/src/app/api/v1/sheets/[id]/route.ts","apps/hub/src/app/(dashboard)/docs/new/document-create-form.tsx","apps/hub/src/app/(dashboard)/docs/document-edit-panel.tsx","apps/hub/src/app/(dashboard)/docs/[id]/edit/document-edit-page.tsx","apps/hub/src/app/(dashboard)/sheets/new/hearing-intake-wizard.tsx","apps/hub/src/app/(dashboard)/sheets/[id]/hearing-sheet-detail.tsx","apps/hub/src/features/docs-cms/dto.ts","apps/hub/src/features/hearing-intake/service.ts","apps/hub/src/lib/http","packages/schemas/docs-cms","packages/schemas/hearing-intake","packages/db/repository/docs-cms.ts","packages/db/repository/hearing-intake.ts","packages/db/repository/hearing-intake-queue.ts","packages/db/repository/mutation-safety.ts","packages/db/schema/docs-cms/schema.ts","packages/db/schema/hearing-intake/schema.ts","packages/db/schema/mutation-safety/schema.ts","packages/db/migrations/0015_card-mutation-safety.sql"]
purpose: "現状 (current) の Docs / Sheets 通常 CRUD は必須 Idempotency-Key と汎用 entity revision CAS を持たない。Docs には外部 import 専用の docs-import-<n> ETag があるが、通常の編集版ではない。再送の重複作成と古い表示からの後勝ち上書きを、UI と独立したデータ安全基盤で防ぐ。"
goal: "到達状態 (achieved): Docs / Sheets の通常 POST は tenant / workspace / resource / operation 複合スコープの 24h 冪等台帳で原子的に response replay され、通常 GET/POST/PATCH は外部 import と分離した entity revision ETag/If-Match CAS を使う。"
scope_in: ["Docs / Sheets の通常 POST に Idempotency-Key を必須化し、フォームを開いた時点で発行した UUID v4 を成功/ネットワーク失敗後の再送で同じまま使うプロトコル","Idempotency-Key の scope=tenant + workspace + resource + operation、TTL=24h、request の canonical payload hash、HTTP status / headers / body を復元できる response snapshot を共通台帳で扱う。idempotency-replayed ヘッダーのfalse/trueだけは初回/再生を示す outcome 依存の例外とする","同 key + 同 canonical payload hash は保存済み response replay、同 key + 異 payload は 422、Idempotency-Key 欠落/不正は 400 を返し、業務行作成前に fail-closed に止める","documents / hearing_sheets に正の整数の汎用 entity revision を追加し、通常 CRUD の additive schema / API / repository 変更で ETag / If-Match と応答 DTO へ公開する","PATCH は認可 route の workspace 境界の内側で、Docs=(common または tenant の既存 visibility) + resource id + expected revision、Sheets=tenant + workspace + resource id + expected revision の条件で原子更新する。成功時に revision を 1 増加し、不一致は現行 representation / ETag 付き 412 CAS を返す","Docs import 専用 docs-import-<n> と externalRevision / revisionFromIfMatch は外部同期 route だけに残し、通常 CRUD に流用しない。通常 entity revision と別 namespace / 別カラムで保つ","412 後に client の未保存入力を破棄せず、現行 representation と自分の draft から差分表示と明示的な再試行を可能にする応答契約。自動 merge はしない","本 feature は list-shell / block-authoring の UI feature に依存しないが、既存 Docs 作成/編集・Sheets 作成/状態変更 caller の必須 header と 412 draft 保持契約は所有する。list-shell の一覧表示構造と block-authoring の Markdown 本文は別 feature のままとする","Docs / Sheets の representation を書き換える AI writeback、予約公開、外部同期、status 変更、regenerate、queue completion/dead の全経路で entity revision を増加する"]
scope_out: ["Docs import 専用 docs-import-<n> ETag の意味・形式・externalRevision 状態機械の変更","Catalog / PublishRequest は対象外。それぞれの既存 idempotency 契約と publish/release 状態機械を維持する","リアルタイム共同編集 (CRDT / OT / WebSocket) と自動 3-way merge","カード一覧の表示構造、Markdown container 記法、semantic icon の実装","既存の認可ルール、tenant / workspace 所有境界、およびリソース別の業務状態遷移の置換"]
acceptance: ["Docs / Sheets の POST で同じ Idempotency-Key・scope・canonical payload hash を同時送信しても対象は 1 件だけ作成され、初回完了後の再送は保存済み status / headers / body を mapper の再実行なしで replay する","同じ Idempotency-Key の payload を変えると 422、key を省略または不正にすると 400 となり、業務行は作成されない","同じ key でも tenant / workspace / resource / operation のどれかが異なれば衝突せず、24h 経過後の扱いが決定論テストで固定される","Docs / Sheets の GET/POST/PATCH response が通常 entity revision ETag を返し、PATCH が If-Match を必須とする","同じ revision を使う同時 PATCH は 1 件だけが成功して revision を増やし、もう1件は後勝ち上書きせず現行 representation / ETag 付き 412 を返す","412 後も既存 Docs / Sheets caller は未保存 draft を保持し、現行値の表示と利用者の明示的再試行を可能にし、自動 merge を実行しない","外部 import route だけが docs-import-<n> を受理し、通常 Docs / Sheets CRUD はその ETag を受理せず別の entity revision を使う","Docs の作成行・replay wire snapshot・docs.create 監査は同一 DB transaction で確定し、一部だけの commit を許さない","Catalog / PublishRequest の idempotency・release/publish 状態契約は変化せず、カード一覧の表示構造と Markdown カード本文は変更しない"]
architecture_refs: ["arch-harness-hub-backend","arch-harness-hub-security"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-card-mutation-safety.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"06f577ed18ed1d8ef590e56ea593d599a9375d87b7cc947229065c8b7f8daed8","evaluator":"implement-mutation-safety-tdd","evidence_ref":"packages/db/__tests__/mutation-safety-repositories.test.ts"}
source_lineage: {"imported_at":"2026-08-13T22:39:59Z","origin_kind":"system-spec-harness","source_digest":"dbbd08788007feb6a8923a47ec8edbf8b20ac6153853d661da13d78140b7cdff","source_path":"system-spec/spec-state.json","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.9
classification_reason: "C14 マクロ分解 (qa-237・qa-238 から導出)"
classification_candidates: [{"artifact_kind":"feature","candidate_path":"features/feat-card-mutation-safety.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-08-15T00:54:09Z","evidence_refs":["packages/db/__tests__/mutation-safety-repositories.test.ts","apps/hub/tests/card-mutation-safety/http-contract.test.ts","tests/test_card_feature_contracts.py","packages/db/migrations/0015_card-mutation-safety.sql","beads:HarnessHub-6oi5"],"policy":"manual","reconciled_at":"2026-08-15T00:54:42Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-08-14T23:42:26Z","missing_sections":[],"status":"complete"}
---

# 目的

Docs / Sheets の通常作成ではネットワーク再送による二重作成を防ぎ、通常更新では古い表示からの後勝ち上書きを防ぐ。`docs-import-*` ETag は外部同期専用のまま保ち、通常 entity revision とは完全に分離する。

責務は Docs / Sheets の通常 create/update プロトコル、原子的な repository 制約、およびその必須 header を送る既存 create/edit caller である。カード一覧の表示構造・Markdown カード本文・Catalog・PublishRequest の状態機械は所有しない。

## 到達状態

実装済み。通常 POST は tenant / workspace / resource / operation を全て含む複合キーと UUID v4 の `Idempotency-Key`、canonical payload hash、24h TTL を使う。同一 payload は初回 snapshot から status / headers / body を復元し、再生であることを示す `idempotency-replayed` ヘッダーの false/true だけを outcome 依存の例外とする。異なる payload は 422、欠落・不正 key は 400 にする。

通常 GET/POST/PATCH は `"docs-N"` / `"sheets-N"` ETag を返し、PATCH は `If-Match` が必須。CAS の DB 所有述語は、意図的に workspace 列を持たない Docs では `(scope=common OR tenant_id=context.tenantId) + id + entity_revision`、Sheets では `tenant_id + workspace_id + id + entity_revision` とする。Docs でも route 先頭の workspace 認可境界と冪等台帳の workspace scope は維持する。

## スコープ

- スコープ内: Docs / Sheets 通常 POST の原子的冪等作成、通常 entity revision ETag/If-Match CAS、412 current representation、全 representation mutation 経路のrevision増分、既存 Docs 作成/編集・Sheets 作成/状態変更画面の header/競合 UI 配線。
- スコープ外: Catalog / PublishRequest、カード一覧の表示構造、Markdown カード本文、外部 import 専用 `docs-import-*` / `externalRevision` の意味変更。

## 受入

- [x] repository 結合テストが同 key 同 payload、同 key 異 payload、tenant/workspace/resource 分離、TTL 境界、同時 CAS を実 DB 制約で固定した。
- [x] API 契約テストが 400 / 413 / 422 / replay / 428 / 412 と、通常 ETag・外部 import ETag の相互非受理を証明した。
- [x] Docs AI writeback / 通常更新 / 予約公開 / 外部同期、Sheets status / regenerate / queue completion / dead の entity revision 増分を実 DB テストで固定した。
- [x] Docs 作成は document / replay snapshot / append-only audit を同一 transaction で確定し、後段監査失敗で「作成済み・監査なし」にならないことを固定した。Sheets 受付通知は既存 AD-5 の created-only best-effort 契約を維持し、HTTP 冪等保証の対象に含めない。
- [x] フォームを開いた時点の UUID v4 をネットワーク失敗後も維持し、412 時は未保存 draft を保ったまま現行値と明示的再試行を表示することを component テストで固定した。
- [x] Catalog / PublishRequest の既存契約はスコープ外とし、publish idempotency 回帰が GREEN である。

## アーキテクチャ参照

- `architecture_refs`: `arch-harness-hub-backend`, `arch-harness-hub-security`

## 機能間依存

- `depends_on`: なし。
- 依存理由: 既存 create/edit caller は本 feature の必須プロトコルを利用するが、カード一覧の表示構造を所有する list-shell と Markdown 本文構文を所有する block-authoring はこの完了を待つ側である。

## Handoff

実装は `packages/db/migrations/0015_card-mutation-safety.sql`、Docs / Sheets repository、4 API routes、public schemas / DTO、および既存作成・編集 caller へ接地した。カード一覧の表示構造・Markdown カード本文と deploy は対象外。
