---
graph_node_id: "issue-list-header-search-q-support-20260812"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["ui-consistency","api-design"]
priority: "high"
start_date: "2026-08-12"
target_date: null
iteration: null
title: "ドキュメント・改善要望・利用者の一覧が検索語を受け取れない"
owners: ["daishiman"]
created_at: "2026-08-12T00:00:00Z"
updated_at: "2026-08-12T00:30:23Z"
status: "closed"
depends_on: []
related_nodes: []
resource_scope: ["apps/hub/src/components/shell/nav-items.ts","apps/hub/src/app/(dashboard)/docs/document-list.tsx","apps/hub/src/app/(dashboard)/feedback/feedback-list.tsx","apps/hub/src/app/(dashboard)/users/user-list.tsx"]
purpose: "探したい対象がある画面から、探す手段が消えている状態を解消する。"
goal: "3 画面の一覧が q での絞り込みに対応し、ヘッダーの検索欄が出る状態にする。"
scope_in: ["/docs・/feedback・/users の一覧 API への q 追加","画面ごとの検索対象の決定","searchTargets への登録","initialQuery の作法の適用"]
scope_out: ["横断検索 (1 つの欄で全領域を探す)"]
acceptance: ["3 画面の一覧 API が q を受け取る","ヘッダーの検索欄が 3 画面で出る","ヘッダーから来た検索語が、覚えていた絞り込み条件より優先される","検索対象が画面ごとに決められ、根拠が残る"]
architecture_refs: ["arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/list-header-search-q-support-20260812.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"d4c89150679b147ac172531a9097294cefa278daeb5acef57d2ca38d240d2feb","evaluator":"2026-08-12 の画面まわり統一作業での実読","evidence_ref":"issues/list-header-search-q-support-20260812.md"}
source_lineage: {"imported_at":"2026-08-12T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":"docs/product/backlog.md","source_plugin":null,"source_version":null}
classification_confidence: 0.96
classification_reason: "画面の情報設計と一覧 API の両方にまたがる改善であり、実装単位の課題に該当する。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/list-header-search-q-support-20260812.md","confidence":0.96}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-ry6v","linked_at":"2026-08-12T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-12T00:00:00Z","missing_sections":[],"status":"complete"}
---

# ドキュメント・改善要望・利用者の一覧が検索語を受け取れない

## 概要

ヘッダーの検索欄は `/sheets` と `/catalog` でしか出ない。
`/docs`・`/feedback`・`/users` では、一覧 API が検索語 (`q`) に対応していないため、
検索欄そのものを消している。**探したい対象があるのに探す手段が無い**画面が 3 つある。

## 背景と問題

`apps/hub/src/components/shell/nav-items.ts:217-231` の `searchTargets` に
載っているのは `/sheets` と `/catalog` の 2 つだけで、同ファイル
209-212 行のコメントが理由を明記している。

> 載せる条件は 1 つだけ = **一覧側が `q` での絞り込みに実際に対応していること**。
> 押しても何も起きない欄は、無い欄より悪い (壊れていると読まれる)。

**この判断自体は正しい。** 効かない検索欄を出すほうが害が大きい。
この課題が扱うのは、判断の前提のほう — つまり `q` に対応していない側を無くすこと。

3 画面とも、いま用意されている絞り込みは「状態」「スコープ」「部門」といった
**候補が固定の選択欄**だけで、名前や本文の一部を手がかりに探す手段が無い。
件数が増えると、カーソル送りで 25 件ずつ辿るしかなくなる。

## 現在の挙動

| 画面 | ヘッダーの検索欄 | 一覧の絞り込み |
|---|---|---|
| `/sheets` | 出る (`q` 対応済み) | 状態・部門・検索語 |
| `/catalog` | 出る (`q` 対応済み) | 対象・検索語 |
| `/docs` | **出ない** | スコープ・状態のみ |
| `/feedback` | **出ない** | 状態・種別のみ |
| `/users` | **出ない** | (選択欄のみ) |

## 期待する挙動

3 画面の一覧 API が `q` を受け取り、`searchTargets` に 3 行を足せば
ヘッダーの検索欄が出る状態になる。

**何を検索対象にするかは画面ごとに決める必要がある。**

- `/docs` — タイトル。本文まで含めるかは別途判断 (全文検索の基盤が無い)。
- `/feedback` — 受付番号と本文の要約。番号での直接引きは実用上よく使う。
- `/users` — 氏名。メールアドレスを含めるかは、一覧に出していない情報で
  引けてよいかの判断が要る。

`/sheets` が既に持っている「ヘッダーから来た検索語は、覚えていた絞り込み条件より優先する」
という規則 (`initialQuery`) を 3 画面にも同じ形で適用する。画面ごとに別の作法にしない。

## 再現手順またはユースケース

`/docs` を開き、ヘッダーを見る。`/sheets` では出ていた検索欄が無い。
タイトルの一部を覚えている文書を探す手段が、一覧を目で追うこと以外に無い。

## 影響と優先度

代表タスクは現状でも達成できるが、件数が増えるほど「探せない」ことが効いてくる。
`HarnessHub-2mu6` (一覧の使い勝手) と同じ層の課題で、優先度も揃えて **high**。

## スコープ

3 画面の一覧 API への `q` 追加、検索対象の決定、`searchTargets` への登録、
`initialQuery` の適用まで。**横断検索 (1 つの欄で全領域を探す) はこの課題では扱わない。**
いまのヘッダー検索は「見ている領域を絞り込む」ものとして設計されており、
その前提を変えるのは別の判断になる。

## 関連グラフ

- `apps/hub/src/components/shell/nav-items.ts:203-231` (`searchTargets` と載せる条件)
- `apps/hub/src/app/(dashboard)/sheets/hearing-sheet-list.tsx:47-63` (`initialQuery` の作法)
- `apps/hub/src/app/(dashboard)/docs/document-list.tsx`、
  `apps/hub/src/app/(dashboard)/feedback/feedback-list.tsx`、
  `apps/hub/src/app/(dashboard)/users/user-list.tsx`
- 関連課題: `HarnessHub-2mu6` (一覧の使い勝手)

## 受入条件

上記 acceptance のとおり。

## 検証証跡

2026-08-12 に `nav-items.ts` の `searchTargets` を実読し、登録が 2 領域だけであること、
`initialQuery` を受け取っているのが `/sheets` と `/catalog` の 2 画面だけであることを
grep で確認した。3 画面の一覧コンポーネントを実読し、絞り込みが選択欄だけであることを確認した。
