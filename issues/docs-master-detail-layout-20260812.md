---
graph_node_id: "issue-docs-master-detail-layout-20260812"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["ui-consistency","information-design"]
priority: "medium"
start_date: "2026-08-12"
target_date: null
iteration: null
title: "ドキュメント一覧に master-detail が要るかを実測で決める"
owners: ["daishiman"]
created_at: "2026-08-12T00:00:00Z"
updated_at: "2026-08-12T06:42:39.387427Z"
status: "done"
depends_on: []
related_nodes: []
resource_scope: ["docs/features/feat-docs-cms/information-design/S15.md","apps/hub/src/app/(dashboard)/docs/document-list.tsx"]
purpose: "情報設計シートが「残課題」として送った未決の判断を、実測に基づいて閉じる。"
goal: "master-detail の要否を実測で決着させ、S15 シートの記述を実測結果で置き換える。"
scope_in: ["続けて何本も読む使い方の実測","実測結果に基づく S15 シートの更新"]
scope_out: ["実測を経ない master-detail の先行実装","wide での table 採否 (2026-08-12 に採用で決着済み)"]
acceptance: ["続けて何本も読む使い方の有無を実測した記録が残る","S15 シートの pattern 選定表と future gate が実測結果で更新される","master-detail を実装する場合も、しない場合も、判断根拠がシートに残る"]
architecture_refs: ["arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/docs-master-detail-layout-20260812.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"c5471892488883a3be4d3629fea1a6c14dd3630514550856c4a7fa65c92eb5f3","evaluator":"2026-08-12 の /docs 幅出し分け実装にあわせた前提更新","evidence_ref":"issues/docs-master-detail-layout-20260812.md"}
source_lineage: {"imported_at":"2026-08-12T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":"docs/product/backlog.md","source_plugin":null,"source_version":null}
classification_confidence: 0.97
classification_reason: "台帳の宣言と実装の食い違いを埋める画面構成の課題であり、実装単位の課題に該当する。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/docs-master-detail-layout-20260812.md","confidence":0.97}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-ydf8","linked_at":"2026-08-12T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-08-12T05:21:46Z","evidence_refs":["docs/features/feat-docs-cms/information-design/S15.md"],"policy":"manual","reconciled_at":"2026-08-12T06:33:00Z","source":"reconciliation","status":"done"}
implementation_readiness: {"checked_at":"2026-08-12T00:00:00Z","missing_sections":[],"status":"complete"}
---

# ドキュメント一覧に master-detail が要るかを実測で決める

## 概要

`/docs` の一覧を master-detail (左に一覧、右に選んだものの本文) にするかどうかが未決のまま
残っている。情報設計シート `docs/features/feat-docs-cms/information-design/S15.md` が
明示的に「今回不採用 (残課題)」として送っている判断で、この課題はその決着を扱う。

## 背景と問題

S15 シートの pattern 選定は、当初 (2026-08-11) 次のとおり判定していた。

| 候補 | 当初判定 | 理由 |
|---|---|---|
| card-collection | **採用** | 読む対象を選ぶ画面なので、タイトルの可読性が最優先 |
| table | 不採用 | 4 項目なので入るが、タイトルが列幅に押し込まれて折り返す |
| master-detail | **今回不採用 (残課題)** | 一覧を残したまま本文を読めるが、本文が長いので画面の半分では読み切れない |

不採用の理由は「使い方が分からないから」ではなく「本文の長さと画面の半分が釣り合わない」
という具体的な観察で、シートは決着条件を **「文書を続けて何本も読む使い方が実際に
あるかの実測」** と書いている。実測しないまま作ると、作った側が使わない 2 ペインを
維持し続けることになる。

## 2026-08-12 の変更 (この課題の前提が動いた)

**`table` の判定が「不採用」から「wide で採用」へ変わった。**
起票時点のこの課題は「一覧はカードのまま」を前提に書かれていたので、その前提を差し替える。

変更の理由は 3 点 (詳細は S15 シートの「pattern 判定の変更」節)。

1. 依頼者が `/docs` と `/feedback` の 2 画面で「幅で使い分ける」を選んだ。
   幅ごとに別のかたちを配れるなら、wide の見比べと narrow の読み切りは両立する。
2. 不採用の理由だった「タイトルが列幅に押し込まれて折り返す」は、
   タイトル列に幅を指定しないことで消える (他 3 列を固定し、余りを吸わせる)。
3. 7 列の `/feedback` で成立している形が、4 列の `/docs` で成立しない理由が無い。

**この変更は master-detail の要否そのものを決めていない。** 決着条件 (続けて何本も読む
使い方があるか) は変わらない。ただし master-detail を採るときの形は変わる:
左ペインが「カードの縦積み」ではなく「表」になるため、狭くなった左ペインで表の 4 列が
成立するかを併せて確かめる必要がある (成立しないなら、右ペインを開いている間だけ
左を card-collection へ落とす、という選択肢になる)。

## 現在の挙動

`apps/hub/src/app/(dashboard)/docs/document-list.tsx` は `DataTable` を
`narrowAs="card-collection"` で使っている。広い画面では表、狭い画面ではカード。
**これはシートの現在の判定と一致しており、実装の不備ではない。**
詳細は `/docs/[id]` へ移動して読む。

列は タイトル / 適用範囲 / 状態 / 更新日時 の 4 列で、**タイトル列だけ `width` を持たない**。
この 1 点が上記「変更の理由 2」の実体なので、テストで固定してある
(`apps/hub/tests/ui-foundation/list-ergonomics.test.tsx` LISTERG-06)。

## 期待する挙動

実測の結果しだいで次のどちらかに決着する。

- **続けて何本も読む使い方がある** → master-detail を実装し、S15 シートの pattern 選定表と
  future gate を更新する。併せて、左ペインを表のままにするかを決める。
- **1 本読み切って終わる使い方が大半** → master-detail を「不採用」に確定し、残課題から外す。
  シートの記述を「実測により不採用確定」に書き換える。

どちらに転んでも、シート側の記述を実測結果で置き換えるところまでが完了。

## 再現手順またはユースケース

`/docs` を広い画面で開き、複数のドキュメントを続けて読もうとすると、1 件ごとに
一覧へ戻る。絞り込み条件とスクロール位置は保持されるので、戻る操作そのものの
負担は小さい。この「小さい負担」が積み重なって問題になるかどうかが、実測したい点。

## 影響と優先度

現状でも代表タスク (「共通の公開済み手順書を 1 本開いて読み切る」) は達成できる。
未決を未決のまま放置しないための課題なので medium。

## スコープ

実測の実施と、その結果に基づく S15 シートの更新まで。master-detail の実装は、
実測が「必要」と出た場合にのみ行う。**実測を経ずに 2 ペインを先に作らない。**

`table` を wide で採るかどうかは、この課題の対象から外れた (2026-08-12 に決着済み)。

## 関連グラフ

- `docs/features/feat-docs-cms/information-design/S15.md` の pattern 選定表と
  「pattern 判定の変更」節、future gate。
- `apps/hub/src/app/(dashboard)/docs/document-list.tsx`、
  `apps/hub/tests/ui-foundation/list-ergonomics.test.tsx` (LISTERG-06)。
- **profile の正本が参照先に存在しない件は `HarnessHub-nqo5` として別課題に切り出した。**
  `docs/frontend-ui-foundation-spec.md` は「画面ごとの profile の割当は
  `docs/screen-inventory.md` を正本とする」と定めているが、`screen-inventory.md` に
  profile 列は無い (S15 行は ID / 画面 / 主な role / Stage / 優先度 / 担当 feature /
  根拠 の 7 列のみ)。実質の正本は各シートの pattern 選定表になっている。

## 受入条件

上記 acceptance のとおり。

## 検証証跡

2026-08-12 に `docs/features/feat-docs-cms/information-design/S15.md` と
`apps/hub/src/app/(dashboard)/docs/document-list.tsx` を実読し、実装がシートの
現在の判定 (wide = table / narrow = card-collection) と一致していることを確認。
`docs/screen-inventory.md` の S15 行と表頭を実読し、profile 列が存在しないことを確認。
