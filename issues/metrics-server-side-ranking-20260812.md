---
graph_node_id: "issue-metrics-server-side-ranking-20260812"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "backend"
tags: ["performance","api-design"]
priority: "medium"
start_date: "2026-08-12"
target_date: null
iteration: null
title: "効果測定の上位ランキングを画面側で切っている (件数が増えると破綻する)"
owners: ["daishiman"]
created_at: "2026-08-12T00:00:00Z"
updated_at: "2026-08-12T00:53:03Z"
status: "closed"
depends_on: []
related_nodes: []
resource_scope: ["apps/hub/src/features/metrics-tracking/view-model.ts","apps/hub/src/app/(dashboard)/dashboard/metrics-dashboard.tsx"]
purpose: "表示に使わないデータを転送し続ける構造を、件数が育つ前に直す。"
goal: "上位ランキングの並べ替えと件数の打ち切りをサーバ側へ移す。"
scope_in: ["/api/v1/metrics/summary の応答仕様の変更","topRanking の役割の縮小","上位件数の正本の決定"]
scope_out: ["部門別・推移など他の集計項目の実装変更 (規約の適用可否の判断までとする)"]
acceptance: ["API が上位 N 件だけを返す","画面側に並べ替えと件数の打ち切りが残らない","上位件数が画面と API の二重定義にならない"]
architecture_refs: ["arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/metrics-server-side-ranking-20260812.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"4b549a937a5093f088b523d3502ca13d56c2d81b3a250e7852f75800eddc2880","evaluator":"2026-08-12 の画面まわり統一作業での実読","evidence_ref":"issues/metrics-server-side-ranking-20260812.md"}
source_lineage: {"imported_at":"2026-08-12T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":"docs/product/backlog.md","source_plugin":null,"source_version":null}
classification_confidence: 0.96
classification_reason: "API の応答仕様と画面の責務分担の課題であり、実装単位の課題に該当する。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/metrics-server-side-ranking-20260812.md","confidence":0.96}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-uu28","linked_at":"2026-08-12T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-12T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 効果測定の上位ランキングを画面側で切っている (件数が増えると破綻する)

## 概要

`/metrics` の「削減額の大きいツール」上位一覧は、サーバが返した**全件**を
画面側で並べ替えて先頭 5 件に切っている。表示に使うのは 5 件だけなので、
ツールが増えるほど「使わないデータの転送と並べ替え」だけが増える。

## 背景と問題

`apps/hub/src/features/metrics-tracking/view-model.ts:96-101` の `topRanking` が

```ts
return [...ranking].sort((a, b) => b.savedAmountJpy - a.savedAmountJpy).slice(0, limit);
```

となっている。`ranking` は `/api/v1/metrics/summary` の応答をそのまま受けたもので、
API 側に件数の上限も並べ替えの指定も無い。

これは「間違った値が出る」種類の問題ではない。**出る値は正しく、遅くなるだけ**なので、
いま見ても壊れて見えない。ツールが数十件のうちは体感もしない。
問題になるのは、この画面が「全件を受け取れる」前提で書かれていることが、
件数の増加を検知する手がかりを画面から消してしまう点にある。

## 現在の挙動

1. 画面が `/api/v1/metrics/summary` を呼ぶ。
2. サーバは対象期間の全ツールの集計を返す。
3. 画面が受け取った配列を並べ替え、先頭 5 件だけ描く (残りは捨てる)。

## 期待する挙動

並べ替えと件数の打ち切りをサーバ側で行い、API は上位 N 件だけを返す。
`topRanking` は「サーバが決めた順序をそのまま描く」役割に縮む。

N を API のクエリで受けるか固定にするかは、この課題で決める。
固定にするなら、画面と API の両方に同じ数が書かれる状態を作らない
(どちらかを正本にする)。

## 再現手順またはユースケース

同一 Workspace に業務ツールを多数登録し、`/metrics` を開く。
応答の JSON に全件が含まれる一方、画面には 5 件しか出ないことを確認できる。

## 影響と優先度

現時点の登録件数では体感できる遅さは出ていない。データが育ってから効いてくる
性質の課題なので **medium**。ただし「集計はサーバで確定する」という規約を先に
決めておかないと、同じ形の実装が他の集計画面へ増える。

## スコープ

`/api/v1/metrics/summary` の応答仕様の変更と、`topRanking` の役割の縮小まで。
他の集計項目 (部門別・推移) の見直しは、同じ規約を当てるかどうかを含めて
この課題の中で判断する。

## 関連グラフ

- `apps/hub/src/features/metrics-tracking/view-model.ts:96-105` (`topRanking` / `toRankingChartData`)
- `apps/hub/src/app/(dashboard)/dashboard/metrics-dashboard.tsx:60-78` (取得)
- `packages/db/repository/metrics-tracking.ts` (集計の実体)

## 受入条件

上記 acceptance のとおり。

## 検証証跡

2026-08-12 に `view-model.ts` と `metrics-dashboard.tsx` を実読し、
並べ替えと `slice(0, limit)` が画面側にあること、取得時のクエリに
件数・順序の指定が無いことを確認した。
