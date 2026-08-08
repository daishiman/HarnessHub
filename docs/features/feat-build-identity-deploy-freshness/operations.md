---
status: confirmed
layer: operations
task: SYS-BUILD-IDENTITY-P12
parent_feature: feat-build-identity-deploy-freshness
feature_package_id: feature-package/feat-build-identity-deploy-freshness
---

# P12 運用手順 — 稼働ビルドの素性と鮮度

feature: `feat-build-identity-deploy-freshness`

「本番で今どのコードが動いているのか」を確認し、鮮度検査が鳴ったときに何をするかを定める。

## 1. 稼働ビルドの確認手順

```bash
# いま本番で動いている成果物の commit
curl -s -H 'Cache-Control: no-cache' "$HUB_HEALTH_URL" | jq -r '.commit // "（未申告）"'

# 併せて version / 状態も見る
curl -s -H 'Cache-Control: no-cache' "$HUB_HEALTH_URL" | jq '{status, version, commit, checkedAt}'
```

`$HUB_HEALTH_URL` は GitHub Actions の repository variable と同じ値（`.../health`）。

読み方:

| 出力 | 意味 |
|---|---|
| 40 桁の hex | その commit が本番で動いている。`git log --oneline -1 <commit>` で内容を確認できる |
| `（未申告）`（key が無い） | **素性不明**。埋込（`wrangler deploy --var HUB_COMMIT_SHA`）が外れているか、その版が本 feature より前のもの |

`unknown` のような代替値は返らない。返らないこと自体が「素性不明」の申告である。

手元の HEAD と突き合わせるだけなら、判定込みで次を実行する。

```bash
pnpm --filter @harness-hub/hub run check:deploy-freshness --health-url "$HUB_HEALTH_URL"
```

## 2. 鮮度検査が鳴ったときの対応

CI の `稼働ビルドの鮮度検査` step が落ちると、判定は 4 分類のいずれかで出力される。
JSON 証跡は同 step が `/tmp/deploy-freshness.json` に残す。

### `stale` — 古い版が配信され続けている

**意味:** 既定 branch の HEAD が入ってから `DEFAULT_MAX_LAG_MINUTES` を超えても、本番は古い commit のまま。
これが 2026-08-07 の 4 日間と同じ状態である。

1. `served_commit` と `head_commit` を JSON 証跡から読み、`git log --oneline <served_commit>..<head_commit>`
   で「反映されていない変更」を特定する
2. 直近の deploy job が実際に走ったかを確認する（走っていない = 経路が止まっている）
3. 走ったのに古いままなら、`wrangler versions list` / `wrangler deployments list` で
   本番トラフィックが向いている version を確認する（過去の rollback で古い version に固定されている可能性）
4. 固定が原因なら、その固定を解除して再 deploy する

**やってはいけないこと:** ここで rollback を打つこと。古い版への固定を強めるだけになる（CI でも同じ理由で
自動 rollback から除外している）。

### `commit-unavailable` — 稼働版が commit を申告していない

**意味:** 埋込配線が外れている。**鮮度そのものは判定できていない。**

1. ci.yml の deploy step に `--var "HUB_COMMIT_SHA:${GITHUB_SHA}"` が残っているか確認
2. 残っていれば、その版が本 feature の merge 前に deploy されたものである可能性を確認（`version` を見る）
3. どちらでもなければ埋込経路の不具合として調査する

**「commit が読めないので検査をスキップして通す」は行わない。** 通した瞬間に、
埋込が壊れている限り検査が永久に緑になる。

### `health-unreachable` — `/health` へ到達できない

**意味:** 鮮度の問題ではなく、到達性の問題。ただし「検査できなかった」を「問題なし」とは読み替えない。

1. `$HUB_HEALTH_URL` の値が正しいか（repository variable の設定ミス）
2. 本番そのものが落ちていないか（`status` が返らない = より重い障害）
3. 一過性のネットワーク断なら再実行して再現するか確認する

### `lagging-within-grace` / `up-to-date` — 通過

`lagging-within-grace` は「HEAD 更新から間もない不一致」であり、deploy 進行中とみなして通す。
これが通過するのは正常。

## 3. 誤検出（false positive）の扱い

鮮度検査が落ちたが、実際には問題が無い、と判断したい場合。

**まず疑うべきは「本当に誤検出か」である。** 本件の 4 日間は、
現行しきい値の **192 倍** の乖離だった。しきい値の精度で誤判定が起きる領域ではない。

正当な誤検出になりうるのは、次のような場合に限られる。

| 状況 | 対応 |
|---|---|
| deploy が異常に長引いた（依存の再ビルド等）ため猶予を超えた | 再実行する。恒常化するなら `DEPLOY_FRESHNESS_MAX_LAG_MINUTES` の引き上げを**根拠つきで**検討する |
| 意図的に古い版を固定して運用している（障害対応中など） | その期間は deploy 経路自体を止めるべきで、検査だけを黙らせない |

**しきい値の変更は script 側の定数か CI の環境変数で行う。** 文書・workflow・script の複数箇所へ
数値を書き足さないこと（食い違いが起きると運用判断が割れる）。

**検査をスキップする手段は用意していない。** 「一時的に無効化」はそのまま恒久化するのが常であり、
無効化された検査は無いのと同じだからである。止めたい事情がある場合は、
検査ではなく deploy 経路の側を止める。

## 4. 定期的に見る場所

- deploy job の `稼働ビルドの鮮度検査` step の出力（`outcome` と `lag_minutes`）
- 障害の切り分け開始時に、まず `curl ... | jq -r .commit`

「修正したはずなのに直っていない」と感じたときは、**コードを疑う前にこの 1 行を叩く。**
今回の 4 日間は、この 1 行が無かったために失われた時間である。
