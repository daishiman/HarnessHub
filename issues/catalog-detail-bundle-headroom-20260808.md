---
graph_node_id: "issue-catalog-detail-bundle-headroom-20260808"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["performance","bundle-budget","g13","catalog","cwv"]
priority: "medium"
start_date: "2026-08-08"
target_date: null
iteration: null
title: "/catalog/[projectId] の G13 予算残 598 バイトを構造的に広げる"
owners: ["daishiman"]
created_at: "2026-08-08T08:00:00Z"
updated_at: "2026-08-08T10:00:00Z"
status: "active"
depends_on: []
related_nodes: ["issue-hub-cwv-tbt-over-budget-20260724"]
resource_scope: ["apps/hub/src/app/catalog","apps/hub/src/lib/catalog","apps/hub/next.config.ts"]
purpose: "First Load JS が G13 予算の 99.51% を消費している route の余裕を取り戻し、次に import を足した PR が誤った原因を追う状況を防ぐ。"
goal: "/catalog/[projectId] の予算残余が十分にあり、かつ予算に近づいた時点で超過前に検知できる状態にする。"
scope_in: ["client component 境界の棚卸し","初回描画に不要なパネルの遅延読込","予算 95% での警告帯の導入","G13 他 route の残余確認"]
scope_out: ["G13 予算値そのものの引き上げ (本番 CWV 実測という別根拠が要る)","packages/ui 側の変更 (所有権が別 worktree にある)"]
acceptance: ["/catalog/[projectId] の First Load JS 残余が予算の 5% 以上 (6,144 バイト以上) ある、または予算値の変更が本番 CWV 実測を根拠に正当化されている","予算に近づいたことを、予算超過で赤くなる前に検知できる手段がある","G13 の他 route の残余も同時に確認され、同種の枯渇が他に無いことが示されている"]
architecture_refs: ["arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/catalog-detail-bundle-headroom-20260808.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"f732df29ccf7fb9532205de1dd5b629afaf9491ebdebbd419c962378dff250cd","evaluator":"HarnessHub-aqi の G13 実測 (122,282 / 122,880 バイト)","evidence_ref":"docs/frontend-spec.md"}
source_lineage: {"imported_at":"2026-08-08T08:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "HarnessHub-aqi の CWV 是正実測で判明した予算枯渇。aqi の受入条件 (TBT 予算内) は満たすが、bundle 予算の余裕そのものは別課題として残る。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/catalog-detail-bundle-headroom-20260808.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-5vlq","linked_at":"2026-08-08T09:53:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-08T10:00:00Z","missing_sections":[],"status":"complete"}
---

# /catalog/[projectId] の G13 予算残 598 バイトを構造的に広げる

## 概要

`/catalog/[projectId]` の First Load JS が G13 予算に対して残り 598 バイト（0.49%）しかない。次に import を 1 本足した PR が理由なく赤くなる状態なので、余裕を構造的に取り戻す。

## 背景と問題

`HarnessHub-aqi`（Hub 本番 CWV の TBT 超過是正）の実測で判明した。

| 項目 | 値 |
|---|---|
| 実測 First Load JS | 122,282 バイト |
| G13 予算 | 122,880 バイト (120 KiB) |
| 残り | 598 バイト (0.49%) |

aqi の是正では `@harness-hub/schemas` の barrel 全量読み込み（9 feature 分・約 200 schema・raw 23.7 KB / gzip 7.9 KiB）を、必要な named export だけを再 export する薄いモジュール `apps/hub/src/lib/catalog/response-schemas.ts` 経由へ切り替えた。削減はしたが、この route はもともと重かったため 598 バイトまでしか戻せていない。

問題は数値そのものよりも**誤帰属**にある。予算を使い切った route では、次に import を足した PR で CI が赤くなる。赤くなるのはその PR なので原因は自分の import に見えるが、実際の原因は先に積み上がった予算消費である。

## 現在の挙動

- G13（bundle budget ゲート）は予算超過で初めて赤くなる。95% 消費でも緑のまま何も出ない
- `/catalog/[projectId]` は 99.51% を消費済み
- `optimizePackageImports` は named import しか書き換えないため、動的 import が残る箇所は route ごとに手作業で薄いモジュールを挟む必要がある。挟み忘れは同じ踏み方の再発になる

## 期待する挙動

`/catalog/[projectId]` の予算残余が十分あり、かつ予算に近づいた時点で、超過して赤くなる前に検知できる。

## 再現手順またはユースケース

1. `pnpm --filter @harness-hub/hub build` を実行する
2. G13 の bundle budget レポートで `/catalog/[projectId]` の First Load JS を確認する
3. 122,282 / 122,880 が表示され、残余が 598 バイトであることを確認する

## 影響と優先度

実ユーザーへの影響は現時点では無い（予算内なので CWV は守られている）。影響を受けるのは開発者で、この route へ触れる次の PR が誤った原因を追うことになる。優先度は medium。

**予算値を上げるのは是正ではない。** 122,880 は CWV good を守るための逆算値であり、緩めれば実ユーザーの TBT が悪化する。上げる判断をするなら本番 CWV 実測を根拠にする必要がある。

## スコープ

構造的に広げる候補は 3 つで、3 は 1/2 と排他ではない。むしろ先に 3 を入れると 1/2 の効果が可視化される。

1. **client component の境界を上げる** — `/catalog/[projectId]` のどこまでが本当に client である必要があるか棚卸しする。server component へ倒せた分はそのまま First Load JS から消える
2. **route 単位の遅延読込** — 初回描画に不要なパネル（詳細タブ・install descriptor 表示など）を `next/dynamic` へ回す
3. **予算の警告帯を設ける** — 予算の 95%（116,736 バイト）を超えたら CI で warn を出す。赤くはしないが、次に足す人へ先に伝わる

対象外は、G13 予算値そのものの引き上げ（本番 CWV 実測という別の根拠が要る）と、`packages/ui` 側の変更（所有権が別 worktree にある）。

## 関連グラフ

- `issues/hub-cwv-tbt-over-budget-20260724.md` — 本件の測定元。`optimizePackageImports` の namespace import 抜けもここで確定した
- `issues/root-layout-theme-css-long-task-20260808.md` — 同じ aqi 実測から切り出したもう 1 件

## 受入条件

1. `/catalog/[projectId]` の First Load JS 残余が予算の 5% 以上（6,144 バイト以上）ある、または予算値の変更が本番 CWV 実測を根拠に正当化されている
2. 予算に近づいたことを、予算超過で赤くなる前に検知できる手段がある
3. G13 の他 route の残余も同時に確認され、同種の枯渇が他に無いことが示されている

## 検証証跡

- aqi 是正時の G13 実測値 122,282 / 122,880
- `apps/hub/src/__tests__/dual-catalog-web/validator-load-boundary.test.ts` — 薄い再 export 経由であることを固定するテスト
- `docs/frontend-spec.md` §8 — 共通層 package 登録と namespace import の落とし穴の記述
