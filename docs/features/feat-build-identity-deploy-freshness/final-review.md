---
status: confirmed
layer: feature-release
task: SYS-BUILD-IDENTITY-P10
parent_feature: feat-build-identity-deploy-freshness
feature_package_id: feature-package/feat-build-identity-deploy-freshness
---

# P10 最終レビュー — 稼働ビルドの素性と鮮度

feature: `feat-build-identity-deploy-freshness`
レビュー日: 2026-08-08 / 判定: **実装完了・merge 可（最終レビュー指示により commit / push / draft PR を実施）**

## 変更の全体像（13 ファイル）

| 区分 | ファイル | 変更 |
|---|---|---|
| 契約 | `packages/schemas/src/health.ts` | `commit`（optional / 40 桁 hex）を schema と `buildHealthResponse` へ追加 |
| 契約 | `packages/schemas/openapi/components.json` | drift ゲート発火に伴う snapshot 再生成 |
| 実装 | `apps/hub/src/app/health/runtime-env.ts` | `HUB_COMMIT_SHA?` 宣言と `resolveCommit()` |
| 実装 | `apps/hub/src/app/health/route.ts` | `GET()` から `resolveCommit(env)` を渡す |
| 実装 | `apps/hub/scripts/check-deploy-freshness.mjs` | 鮮度検査（新規 181 行） |
| 実装 | `apps/hub/package.json` | `check:deploy-freshness` script |
| CI | `.github/workflows/ci.yml` | commit 埋込 / 鮮度検査 step / rollback 除外分岐 |
| テスト | `deploy-freshness.test.ts`（新規）, `production-auth-gates.test.ts`, `version-gate-behavior.test.ts`, `health.route.test.ts`, `health.test.ts`, `openapi.test.ts` | L1/L2/L3 の 3 層 |

## レビュー観点ごとの確認

### 目的に対して過不足がないか

**足りている。** 受け入れ条件 5 件は `acceptance-report.md` の通り全て根拠つきで充足。
**過剰も無い。** サインイン不具合そのものの修正は別 feature に属し、本 feature では触れていない。

### fail-open が残っていないか

commit 未申告・形式不正・`/health` 到達不能・引数不備の 4 経路すべてが非 0 で終了する。
「検査できなかった」を「成功」と読み替える経路は無い。

### 検査自体が壊れたときに気付けるか

L2 の挙動テストが本物の module と本物の CLI を動かしているため、判定式を書き換えれば落ちる。
workflow の文言検査（L3）だけに頼っていない。

### 悪化ループを再発させないか

2026-08-07 の悪化ループは「smoke 失敗 → rollback → 古い版への固定が強まる」だった。
鮮度検査の失敗は rollback から除外してある（`DEPLOY_FRESHNESS_OUTCOME != success`）。
これは既存の `VERSION_GATE_OUTCOME` の除外と同型で、workflow テストで配線を固定した。

### 情報露出

`/health` に足したのは 40 桁 hex に限定された commit sha だけ。schema と `resolveCommit` の
両方で正規表現を強制しているため、path・token・個人データは構造的に入り得ない。
commit sha は repository が public か否かに関わらず、成果物の同一性を示すためだけの値である。

## 指摘と対応

| 指摘 | 対応 |
|---|---|
| 鮮度検査を通す手段（スキップ flag）が無いのは運用上不便では | **意図的に用意しない。** 一時無効化はそのまま恒久化する。止めたい事情があるなら deploy 経路の側を止める。`operations.md` に明記した |
| しきい値 30 分の根拠が薄いのでは | 本件の 4 日間は 192 倍であり、しきい値の精度に依存せず検出できる。根拠は script のコメントと `architecture-decision.md` AD-5 に記載 |
| 本番での実測が無い | merge → deploy 後にしか取れない。`release-record.md` に確認手順を残し、**未取得を「確認済み」とはしない** |

## 残課題

- 本番 deploy 後の実測（`/health` から commit が返ること、鮮度検査 step が緑で通ること）
- 仕様追補内の検査 ID（V6 / V7）の指す対象が §4 見出しと acceptance で食い違っている点
  → P13 の書き戻しで明示的に記録した（黙って片方に寄せない）
