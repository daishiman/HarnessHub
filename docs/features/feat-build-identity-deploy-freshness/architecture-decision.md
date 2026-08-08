---
status: confirmed
layer: feature-design
task: SYS-BUILD-IDENTITY-P02
parent_feature: feat-build-identity-deploy-freshness
feature_package_id: feature-package/feat-build-identity-deploy-freshness
---

# P02 アーキテクチャ決定 — 稼働ビルドの素性と鮮度

feature: `feat-build-identity-deploy-freshness`

主要な設計判断と、その代替案を採らなかった理由を残す。実装の詳細ではなく **判断** が対象。

## AD-1: commit の露出先は `/health` にする

**決定:** 既存の `/health` 応答へ optional な `commit` field を足す。専用 endpoint を新設しない。

**理由:** 障害時に人が最初に叩くのは `/health` である。別 endpoint にすると「そっちも見る」という手順が増え、
手順が増えたぶんだけ実際には見られなくなる。`/health` は既に `cache-control: no-store` で認証不要のため、
追加の配線なしで R1 を満たす。

**代替案と却下理由:**
- `/version` 新設 → 見る場所が 2 箇所に割れる
- HTTP response header で返す → JSON 契約 (`packages/schemas`) の drift ゲートに乗らず、契約として固定できない

## AD-2: 埋込は `wrangler deploy --var` で行う

**決定:** CI の deploy step で `--var "HUB_COMMIT_SHA:${GITHUB_SHA}"` を渡す。

**理由:** `wrangler.jsonc` には「この設定ファイルへ値は保存しない。Worker 向けの値は Cloudflare Secret へ置き、
ここでは必須名だけを宣言する」という規約がある。`--var` は deploy 時注入なので、この規約と両立したまま
値を渡せる。commit sha は公開情報なので Secret 扱いにする必要はない（Secret にすると deploy のたびに
Secret を書き換えることになり、監査ログが commit ごとに汚れる）。

**代替案と却下理由:**
- ビルド時に定数ファイルを生成して bundle へ焼き込む → 生成ファイルの commit 漏れ / ローカルビルドとの差異が発生する
- `wrangler.jsonc` の `vars` へ書く → 上記規約違反、かつ commit のたびに設定ファイルが変わる

## AD-3: 埋込が無いときは key ごと落とす

**決定:** commit が解決できないとき、`unknown` や空文字を入れず、応答から `commit` key 自体を落とす。

**理由:** `"commit": "unknown"` を返すと、**「素性不明」と「素性 = unknown という値」が区別できない**。
欠落は欠落のまま表すのが、後段の判定を fail-open にしない唯一の方法である。
schema 側でも `commit` は optional かつ `^[0-9a-f]{40}$` に限定し、他の値が入り得ないようにする。

## AD-4: 判定を fail-open にしない

**決定:** `resolveCommit` / `evaluateFreshness` は形式不正な commit を受け付けず、`commit-unavailable` として **落とす**。

**理由:** 「commit が読めなかったので判定をスキップして通す」を許すと、**埋込配線が壊れた瞬間に検査が永久に緑になる**。
これは今回の障害（success を返し続けた）と同じ形の失敗である。
「検査できなかった」を「成功」と混同しない。`/health` へ到達できない場合も同様に `health-unreachable` で落とす。

## AD-5: 「古いこと」ではなく「古い状態が続いていること」を測る

**決定:** 稼働版と HEAD の不一致だけでは落とさない。HEAD が既定 branch へ入ってから
`DEFAULT_MAX_LAG_MINUTES = 30` 分を超えてなお古いときだけ落とす。

**理由:** deploy には数分かかるので、HEAD 更新直後の乖離まで落とすと CI が常に赤くなり、誰も見なくなる
（警告の狼少年化）。30 分の根拠は、本 repository の deploy job（install → migration → opennext build →
wrangler deploy → 各 smoke）が通常 10 分台で終わることの倍の余裕。本件の 4 日間はこの **192 倍** であり、
しきい値の精度に依存せず検出できる。

しきい値は `check-deploy-freshness.mjs` の `DEFAULT_MAX_LAG_MINUTES` **1 箇所だけ** を正本とし、
CI からは `DEPLOY_FRESHNESS_MAX_LAG_MINUTES` で上書きする。値を複数箇所へ書くと
「検査は 30 分・文書は 60 分」の食い違いが起き、運用判断が割れる。

## AD-6: 経過時間の基準は committer date

**決定:** `git show -s --format=%cI HEAD`（committer date）を使う。author date は使わない。

**理由:** author date は cherry-pick や rebase をしても過去のまま残るため、
「いつ既定 branch へ入ったか」を表さない。経過時間の基準にできない。

## AD-7: 鮮度検査の失敗では rollback しない

**決定:** rollback step に `DEPLOY_FRESHNESS_OUTCOME != success` の除外分岐を入れる。

**理由:** 鮮度検査で止まった時点で、後続の smoke はまだ走っていない。
つまり **「新しい版が壊れている」という証拠が無い**。ここで戻すと、素性を確認できない古い版へ
こちらから後退させるだけになる。これは 2026-08-07 に実際に起きた「失敗 → rollback → 古い版への固定が強まる」
ループそのものである。同じ理由で `VERSION_GATE_OUTCOME` にも既に同型の除外がある。

## AD-8: 検査の実行位置は version_gate 直後・smoke 直前

**決定:** `配信版が今デプロイした版であることの検査`（version_gate）の直後、`本番 OIDC start-flow smoke` の直前。

**理由:** version_gate は「今 deploy した版が配信されたか」しか見ないので、**deploy 経路自体が長期間動いていない**
状態（今回）は捉えられない。鮮度検査はそこを埋める。smoke より前に置くのは、古い版に対して smoke を走らせて
「無関係な差分で赤くなる」状態を作らないため。

## AD-9: smoke 直前の再確認は鮮度検査と分ける

**決定:** 鮮度検査の直後、最初の smoke の直前に `assert-served-version.mjs` を置く。deploy step が控えた version id と `/health.version` が 3 回連続で一致した場合だけ smoke を開始する。

**理由:** 3 つの検査は似て見えても、答える問いが異なる。`version_gate` は新版が届いたか、鮮度検査は既定 branch の HEAD から長期間遅れていないか、ここで追加する再確認は **smoke が今から当たる版が deploy 版で安定しているか** を確認する。2026-08-07 の実測では前 2 者が通過したあと、hearing smoke が別 colo の旧版へ当たった。再確認で不一致・通信失敗・version 欠落が残れば、旧版を検査して無関係な失敗を作る前に fail-closed で停止する。

**rollback 境界:** 再確認失敗時は smoke が未実行なので、新版が壊れた証拠がない。どの版へ戻すかも確定しないため rollback は打たない。これは AD-7 の理由を伝播安定性へ適用したものである。
