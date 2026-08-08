---
title: "稼働ビルドの素性と反映鮮度 — 実装確定追補"
layer: "system-spec-addendum"
feature: "feat-build-identity-deploy-freshness"
parent_addendum: "specs/harness-hub-post-signin-landing-observability-addendum.md"
recorded_at: "2026-08-08"
status: "confirmed"
---

# 稼働ビルドの素性と反映鮮度 — 実装確定追補 (2026-08-08)

親追補 [`harness-hub-post-signin-landing-observability-addendum.md`](./harness-hub-post-signin-landing-observability-addendum.md) の acceptance にある次の 2 点を、macro feature `feat-build-identity-deploy-freshness` として実装した。

1. 稼働中の成果物から、それが repository のどの commit に対応するかを**認証なしで**確認できる（acceptance 括弧表記の V6 = 稼働ビルドの素性）
2. 本番の稼働ビルドが既定 branch の HEAD より古い状態が続いていることを検出できる（acceptance 括弧表記の V7 = 反映鮮度）

本追補は確定した契約の索引である。判断の根拠と運用手順の正本は `docs/features/feat-build-identity-deploy-freshness/` 配下とする。

## 1. 確定した契約

- **素性の露出先は `/health`**。応答へ optional な `commit` を追加する。制約は `^[0-9a-f]{40}$`（40 桁小文字 hex）。短縮 sha・branch 名・大文字は素性として受け付けない。専用 endpoint は作らない — 見る場所が割れると、割れた分だけ実際には見られなくなる。
- **埋込は deploy 時注入**。CI が `wrangler deploy --var "HUB_COMMIT_SHA:${GITHUB_SHA}"` で渡す。`wrangler.jsonc` へは値を書かない（親追補 2.7 の規約と両立する）。commit sha は公開情報のため Secret にしない。
- **欠落は欠落のまま表す**。埋込が無い環境では `unknown` や空文字を入れず、`commit` の key ごと落とす。代替値を入れると「素性不明」と「素性 = その値」が区別できなくなる。
- **鮮度は「古いこと」ではなく「古い状態が続いていること」で測る**。既定 branch HEAD が入ってから一定時間（`DEFAULT_MAX_LAG_MINUTES`）を超えてなお稼働版が古いときだけ落とす。deploy には数分かかるため、更新直後の乖離まで落とすと CI が常に赤くなり、誰も見なくなる。経過時間の基準は committer date とする — author date は cherry-pick / rebase で過去のまま残り、「いつ既定 branch へ入ったか」を表さない。
- **しきい値の正本は 1 箇所**。検査 script の定数のみを正本とし、CI からは環境変数で上書きする。複数箇所へ数値を書くと「検査は 30 分・文書は 60 分」の食い違いが起き、運用判断が割れる。
- **fail-open にしない**。commit を申告しない版・形式不正・`/health` 到達不能・引数不備は、いずれも「検査をスキップして通す」ではなく**落とす**。通した瞬間、埋込配線が壊れている限り検査は永久に緑になる。これは親追補 2.11 で観測した「deploy が success を返し続ける」のと同型の失敗である。
- **鮮度検査の失敗では巻き戻さない**。鮮度検査で止まった時点で後続 smoke は未実行であり、「新しい版が壊れている」証拠が無い。ここで戻すと素性を確認できない古い版へ後退させるだけになる（親追補 2.11 で実際に起きた悪化ループ）。既存の version_gate 除外（親追補 2.12）と同じ立て付けである。
- **検査を一時的に無効化する手段は用意しない**。一時無効化は恒久化する。止めたい事情があるなら、検査ではなく deploy 経路の側を止める。

## 2. 検査 ID の重複について（整理せず記録する）

親追補内で `V6` / `V7` が **2 通りの対象を指している**。

| ID | 親追補 §4 の見出しが指すもの | acceptance 末尾の括弧が指すもの |
|---|---|---|
| V6 | 環境値の読み出し規律 | 稼働ビルドの素性（commit の露出） |
| V7 | 縮退の観測可能性 | 反映鮮度（HEAD からの乖離継続の検出） |

**どちらかへ寄せる再割当ては行わない。** ID を振り直すと、過去の議事録・issue 本文・実装コメントとの対応が切れる。ここでは重複の存在を明示的に記録するに留め、整理は独立した判断として扱う。以後この契約を参照するときは、ID ではなく対象名（「環境値の読み出し規律」「反映鮮度」等）で指すこと。

## 3. 検証状態

実装・テスト・CI 配線は完了し、静的ゲートと対象テストが緑である（`docs/features/feat-build-identity-deploy-freshness/test-results.md`）。

**本番での実測（実際に `/health` から commit が返ること）は未取得**であり、merge と deploy の後に `docs/features/feat-build-identity-deploy-freshness/release-record.md` へ追記する。未取得を「確認済み」とは扱わない。

## 4. 関連成果物

| 層 | パス |
|---|---|
| feature | `features/feat-build-identity-deploy-freshness.md` |
| tasks | `tasks/feat-build-identity-deploy-freshness/sys-build-identity-p01.md` 〜 `p13.md` |
| 運用・証跡 | `docs/features/feat-build-identity-deploy-freshness/` |
| architecture | `architecture/harness-hub-infrastructure.md`（2026-08-08 節） |
| 実装 | `apps/hub/scripts/check-deploy-freshness.mjs`、`packages/schemas/src/health.ts`、`apps/hub/src/app/health/*`、`.github/workflows/ci.yml` |
