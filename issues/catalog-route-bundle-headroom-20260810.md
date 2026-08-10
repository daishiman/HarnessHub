---
graph_node_id: "issue-catalog-route-bundle-headroom-20260810"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["performance","bundle-budget","catalog","packages-ui"]
priority: "high"
start_date: "2026-08-10"
target_date: null
iteration: null
title: "catalog 全 route の G13 警告帯を解消し 5% 以上の余裕を作る"
owners: ["daishiman"]
created_at: "2026-08-10T11:41:26Z"
updated_at: "2026-08-10T11:53:00Z"
status: "active"
depends_on: []
related_nodes: ["issue-catalog-detail-bundle-headroom-20260808","issue-root-layout-theme-css-long-task-20260808","issue-hub-cwv-tbt-over-budget-20260724"]
resource_scope: ["packages/ui/src/i18n","packages/ui/src/components/Chip.tsx","packages/ui/src/index.ts","apps/hub/src/components/catalog","apps/hub/src/components/publish","apps/hub/scripts/check-client-bundle.mjs"]
purpose: "一つの route だけを軽く見せず、catalog 系 page route 全体の予算枯渇を構造的に解消する。"
goal: "/catalog、/catalog/[projectId]、/catalog/publish、/catalog/releases がいずれも 120 KiB 予算を 95% 未満しか使わない状態にする。"
scope_in: ["packages/ui の locale/status 語彙の読込境界","catalog route の client reference 境界","dynamic import の前後差実測","G13 全 catalog route 再計測"]
scope_out: ["G13 予算値の引き上げ","実測効果のない分割を残すこと","非 catalog route の個別最適化"]
acceptance: ["全 catalog page route の First Load JS 残余が予算の 5%以上ある","packages/ui の公開契約と deep import 禁止を守ったまま必要語彙だけを読み込む","分割前後の gzip byte 差を記録し、効果のない dynamic split は戻す","警告帯と超過の正負テストが継続して通る"]
architecture_refs: ["arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/catalog-route-bundle-headroom-20260810.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"ac6460ecf9ca5e093d8bc2161da38fa27843ae8401a0f22a25ef33d2959c54c3","evaluator":"2026-08-10 production build の G13 route 別計測","evidence_ref":"apps/hub/artifacts/client-bundle-report.json"}
source_lineage: {"imported_at":"2026-08-10T11:41:26Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "現 build で catalog 系 route が 95% 警告帯に残り、元課題の受入1・3を満たさないことを実測した。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/catalog-route-bundle-headroom-20260810.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-vwxc","linked_at":"2026-08-10T11:48:10Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-10T11:41:26Z","missing_sections":[],"status":"complete"}
---

# catalog 全 route の G13 警告帯を解消し 5% 以上の余裕を作る

## 概要

/catalog/[projectId] だけでなく /catalog/publish を含む catalog 系 page route 全体が 95% 警告帯にある。packages/ui の語彙読込境界と client component 境界を見直す。

## 背景と問題

HarnessHub-5vlq は警告帯を実装したが、現 build では /catalog/[projectId] の受入1が未達で、/catalog/publish はさらに余裕が少ない。受入3の「他 route に同種の枯渇なし」も成立しない。

## 現在の挙動

G13 上限超過はしないが、catalog 系 route は変更1本で超過し得る。警告により問題は可視化されたが、構造的余裕は未回復である。

## 期待する挙動

全 catalog page route が予算の95%未満で、5%以上の残余を持つ。

## 再現手順またはユースケース

Hubをproduction buildし、check-client-bundle.mjsで全catalog routeのgzip値と警告を確認する。

## 影響と優先度

次の通常変更でG13が赤くなるためhigh。予算値を上げずコード境界で解消する。

## スコープ

packages/uiのlocale/status語彙、catalog/publish部品、bundle計測を対象とする。非catalog routeの個別最適化は含めない。

## 関連グラフ

HarnessHub-5vlqの受入1・3を完了させるblocking follow-up。HarnessHub-2fo1とはpackages/ui変更範囲を共有する。

Beads 課題は `HarnessHub-vwxc`。`HarnessHub-5vlq` から blocking dependency として参照する。

## 受入条件

- 全catalog page routeの残余5%以上
- 公開package契約とdeep import禁止を維持
- 分割前後差を記録し効果のない分割を戻す
- G13正負テストPASS

## 検証証跡

起票時の production build は `/catalog/[projectId]` 118,565 / 122,880 バイト（残余4,315）、`/catalog/publish` 122,359 / 122,880 バイト（残余521）、警告13 route。`apps/hub/artifacts/client-bundle-report.json` と G13 CIログへ残す。
