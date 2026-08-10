---
status: recorded
layer: feature-spec-reflection
spec_impact: reflected
reviewed_at: "2026-08-10"
feature_ids:
  - feat-dual-catalog-web
  - feat-hub-foundation
  - feat-publish-pipeline
  - feat-post-signin-scope-routing
dev_graph_node_ids:
  - issue-dual-catalog-polling-terminal-visibility-20260810
  - issue-publish-smoke-unwired-20260808
  - issue-catalog-detail-bundle-headroom-20260808
  - issue-root-layout-theme-css-long-task-20260808
  - issue-catalog-route-bundle-headroom-20260810
  - issue-production-smoke-cancel-cleanup-20260810
  - issue-ui-vrt-navigation-baseline-drift-20260810
beads_ids:
  - HarnessHub-h2pe
  - HarnessHub-pf5o
  - HarnessHub-5vlq
  - HarnessHub-2fo1
  - HarnessHub-vwxc
  - HarnessHub-aauo
  - HarnessHub-preq
---

# Hub MVP follow-ups (2026-08-10) — 仕様反映受領書

## 1. 依頼と目的

今回変更している Beads 課題群を最終レビューし、実装差分と仕様・設計の正本を一致させる。MVP のため評価は最小限とし、残件は follow-up issue として追跡する。

## 2. 結論

| Beads | 内容 | 受入 | 仕様影響 |
|---|---|---|---|
| `HarnessHub-h2pe` | polling fatal 即時停止 + visibility 復帰再開 | **達成**（focused 23 件 PASS） | あり（ADR / test-design / feature / architecture を更新） |
| `HarnessHub-pf5o` | publish smoke を Device Flow で CI 結線 | **実装達成**（本番 run 証跡は残件） | あり（testing-qa / specs / secrets 台帳 purpose） |
| `HarnessHub-5vlq` | G13 95% 警告帯 + headroom | **受入2のみ達成** | あり（frontend-spec / bundle 検査） |
| `HarnessHub-2fo1` | theme CSS 静的化 | **実装達成**（再計測・VRT は残件） | あり（ui-foundation / packages/ui export） |

## 3. 中学生向けの説明

1. **公開の進捗確認**: 直らない失敗（権限なしなど）で何度も聞きに行くのを止め、別のタブから戻ったときだけ安全に再開する。
2. **本番の自動点検**: 公開が壊れていないかを、毎回新しい仮の会社アカウントと短い合言葉で検査する。長い合言葉を金庫に置きっぱなしにしない。
3. **画面の荷物**: ページが運びすぎる荷物を、赤になる前に「もうすぐいっぱい」と警告する。
4. **見た目の色**: 色の決まりを HTML の中に毎回埋め込まず、1 枚のスタイル表として配る。

## 4. 専門的な説明

- `PollingState.lastFailureKind` + `isTerminalCatalogFailure()` で終端失敗を即時停止。`shouldResumeOnVisible()` は `shouldContinuePolling({ ...state, documentVisible: true })` の薄い wrapper として二重帳簿を防ぐ。
- `smoke:publish-production` は `acquireDeviceToken` で `publish:write` を取得し、`cleanupPublishThenIdentity` が publish 領域を消し切った tenant だけ identity 削除する。
- G13 は budget の 95% を警告帯、100% を fail とする。route handler は対象外。
- `@harness-hub/ui/tokens.css` は `buildTokenCssArtifact()` から生成し、コミット済み CSS と完全一致検査する。`sideEffects: ["*.css"]` で tree-shake 落としを防ぐ。

## 5. 反映先

| 層 | 反映内容 |
|---|---|
| `system-spec/` | `testing-qa.md` の publish smoke 完了境界を Device Flow 結線へ更新 |
| `specs/` | production coverage smoke 追補、UI foundation の FR-UIF-002 |
| `architecture/` | frontend（polling / tokens / G13）、testing-qa（publish smoke） |
| `features/` | dual-catalog / hub-foundation / publish-pipeline へ追記 |
| `tasks/` | 関連 feature の P13 に実行記録を追記 |
| `docs/` | dual-catalog ADR 一式、frontend-spec §8、本受領書 |
| `issues/` | 到達状況と follow-up 3 件（vwxc / aauo / preq） |

## 6. 影響なしと判断した範囲

- 公開 API の request/response schema、DB schema、ACTION_RULES の role 判定、Cloudflare deploy unit は変更しない。
- `system-spec/auth.md` など design_applications の展開差分は本 follow-up の製品要件ではなく、章本文の既存確定内容の再掲であるため、本受領の「新規契約」には数えない（差分自体は整合維持のため同梱し得る）。

## 7. 検証（MVP 最小）

| ゲート | 結果 |
|---|---|
| polling-contract + lifecycle | 14 + 9 PASS |
| production-smoke-script | 6 PASS |
| publish-smoke DB | 2 PASS |
| client-bundle-budget | 12 PASS |
| ui css-artifact | 4 PASS |
| actions-secrets check | 参照 16 / 台帳 16 一致 |

## 8. 残課題

- `HarnessHub-vwxc`: catalog 全 route の G13 余裕 5% 以上
- `HarnessHub-preq`: navigation VRT +197px の原因確定と baseline 方針
- `HarnessHub-aauo`: CI cancel 時の disposable tenant 独立回収
- `HarnessHub-pf5o` / `HarnessHub-2fo1` / `HarnessHub-5vlq`: 本番証跡・再計測・構造 headroom の未達分を notes で維持

## 9. 500 行制約

本受領書と変更した手書き Markdown / TypeScript は 500 行以下。生成物（`graph.json` / `spec-state.json` / `tokens.css`）は分割対象外。
