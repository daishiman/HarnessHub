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
updated_at: "2026-08-11T05:13:29Z"
status: "closed"
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

## 分割前後の実測 (2026-08-10, HarnessHub-vwxc 対応)

同一 commit ベースの production build を 3 回行い、`node apps/hub/scripts/check-client-bundle.mjs --report ...`
で First Load JS の gzip byte を計測した。予算は 122,880 バイト、警告帯は 95%（116,736 バイト）。

| route | 対応前 | 手当1後 | 手当2後 | 最終 (手当3後) | 差分 | 最終消費率 |
| --- | --- | --- | --- | --- | --- | --- |
| /catalog/publish | 122,196 | 120,161 | 119,234 | 115,625 | -6,571 | 94.1% |
| /catalog | 118,458 | 116,422 | 116,422 | 116,458 | -2,000 | 94.8% |
| /catalog/[projectId] | 118,436 | 116,401 | 116,401 | 116,437 | -1,999 | 94.8% |
| /catalog/releases | 117,137 | 115,102 | 115,102 | 115,138 | -1,999 | 93.7% |

手当と、その効果の帰属:

1. **`packages/ui/src/tokens/token-names.ts` の切り出し（全 route 一律 -2,033〜-2,036）**
   部品は `internal/style.ts` 経由で `colorVariableName` と `chartSeriesTokens` しか使わないが、
   これらが `tokens.ts` に同居していたため、同 module が top-level import する
   `tokens/contrast.js`（WCAG 比率計算）と light/dark の色 **値** 表・`buildThemeCss` まで
   client chunk へ到達可能になっていた。実測でも共有 chunk 内に `parseHexColor` の
   エラーメッセージ「色は #rgb または #rrggbb 形式で指定してください」が載っていた。
   名前だけを依存ゼロの葉 module へ降ろした結果、共有 chunk `6463` が 6,197 → 4,161 gzip。
   全 route が同額下がるのはこの chunk が全 route の First Load に入るため。

2. **`PublishWizard` の遅延読込を `next/dynamic` → `React.lazy` へ（/catalog/publish のみ -927）**
   `(workspace)` グループで `next/dynamic` を使うのはこの 1 箇所だけで、loadable の追加ランタイム
   （async-local-storage の shim を含む）が共有 chunk へ寄らず route chunk が全額負担していた。
   `app/error.tsx` 群が既に記録している判断と同じ。page chunk 7,915 → 6,991 gzip。

3. **状態追跡と HTTP adapter の遅延化（/catalog/publish のみ -3,609）**
   `PublishWizardTracker.tsx` に polling の停止判定と結果表示をまとめ、公開要求が生まれてから
   読み込む。既定 port は `lazy-publish-journey-port.ts` の委譲経由にし、fetch 境界を初回呼び出しまで
   遅らせた。port の差し替え口（`PublishWizardProps.port`）は変えていない。

戻した分割: なし（3 手当すべてが実測で効いた）。
**採用しなかった案**: `i18n` の en 辞書を動的読込にする案（見積 -750 前後）は、上記 3 手当で
全 catalog route が 95% 未満に入ったため入れていない。効果のない/不要な分割を残さない方針に従う。

G13 正負テスト `apps/hub/tests/ci/client-bundle-budget.test.ts` は 12 件 PASS。
`packages/ui` 382 件、`apps/hub` 1,669 件 PASS。

### ZIP 変更競合の修正後実測 (2026-08-11)

ZIP 変更直後の submit が旧 checkpoint を読む競合を、実行時依存ゼロの同期 helper と
archive/checkpoint の同時差し替えで修正した後に production build を再実行した。
`/catalog/publish` は 115,874 / 122,880 バイト（94.3%、残余 7,006 バイト）で、
競合修正前の最終値 115,625 バイトから +249 バイト。95% 警告帯（116,736 バイト）未満を維持した。
`PublishWizardTracker` と既定 HTTP adapter の遅延読込境界は変更していない。

### 付随して見つかった別件 (本課題の変更が原因ではない)

VRT (`vitest --config vitest.browser.config.ts`) の `catalog-navigation` light/dark 2 件が
「基準 1024x1739 / 実際 1024x1936」で失敗する。原因は本課題の変更ではなく、基準画像の更新漏れ:

- 基準画像 `apps/hub/tests/browser/__vrt__/{darwin,linux}/catalog-navigation-*.png` の最終更新は `2209f8ad` (#683)。
- その後 `c2705286` (#692) が `tests/browser/catalog/entries-shell.tsx` へ `WorkspaceSwitcher` の
  見本 (navigation group) を 18 行追加し、`packages/ui/src/shell/ShellHeader.tsx` も変更しているが、
  基準画像は再生成されていない。navigation ページが 1 見本分 (197px) 縦に伸びたのはこのため。
- 本課題の変更は token の **名前** を葉 module へ移しただけで、色・寸法の値も `mediaUp` も
  マークアップも 1 バイトも変えていないため、描画高さには影響しない。

基準画像の再生成は本課題の受入条件外かつ scope_out (非 catalog route の個別最適化に相当) なので、
ここでは行わず別課題として扱う。
