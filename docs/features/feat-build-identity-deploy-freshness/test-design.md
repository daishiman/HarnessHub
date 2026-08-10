---
status: confirmed
layer: feature-design
task: SYS-BUILD-IDENTITY-P04
parent_feature: feat-build-identity-deploy-freshness
feature_package_id: feature-package/feat-build-identity-deploy-freshness
---

# P04 テスト設計 — 稼働ビルドの素性と鮮度

feature: `feat-build-identity-deploy-freshness`

## 設計方針

**「workflow にその文言が書いてある」だけでは合格にしない。** 判定式を書き間違えて常に通過するようになっても、
文言検査は緑のままだからである（P03 の F4）。そこで検査を 3 層に分ける。

| 層 | 何を測るか | 対象ファイル |
|---|---|---|
| L1 契約 | `/health` の JSON 契約に `commit` が正しい制約で入っているか | `packages/schemas/src/health.test.ts`, `openapi.test.ts` |
| L2 挙動 | 判定関数と CLI が **実際にどう振る舞うか** | `apps/hub/tests/ci/deploy-freshness.test.ts` |
| L3 配線 | CI の step 順序・env 配線・rollback 除外が繋がっているか | `apps/hub/tests/ci/production-auth-gates.test.ts` |

## L1: 契約 (`packages/schemas`)

- `commit` が 40 桁小文字 hex を通す
- `commit` の欠落を許容する（optional）
- 短縮 sha / 大文字 / branch 名 / 空文字 / 41 桁を **拒否** する
- OpenAPI の property 一覧に `commit` が現れる（公開されないと利用側が「読める field」だと分からない）
- `openapi/components.json` snapshot が schema と一致する（契約 drift ゲート）

## L2: 挙動 (`apps/hub/tests/ci/deploy-freshness.test.ts`)

### `evaluateFreshness`（本物の module を子プロセスで import）

| ケース | 期待 |
|---|---|
| 稼働版 == HEAD | `up-to-date` / ok=true / lag=0 |
| 不一致・HEAD 更新から 5 分（許容 30 分） | `lagging-within-grace` / ok=true |
| 不一致・60 分経過（許容 30 分） | `stale` / ok=false |
| **本件と同じ 4 日間の放置を再現** | `stale` / ok=false |
| 境界（乖離 = しきい値ちょうど） | `stale`（猶予側に倒さない） |
| commit が 未埋込 / 空文字 / 短縮 sha / 大文字 / branch 名 | いずれも `commit-unavailable` / ok=false |
| servedCommit と headCommit が両方空（`===` 成立） | ok=false（一致を理由に通さない） |

### CLI（本物を localhost stub `/health` へ向けて起動し exit code で測る）

| ケース | 期待 exit |
|---|---|
| 稼働版が HEAD と一致 | 0 |
| しきい値超過（`--max-lag-minutes 0`） | 1 + stderr に `::error::` |
| commit を申告しない版 | 1 |
| `/health` へ到達不能 | 1 |
| `--health-url` も `HUB_HEALTH_URL` も無い | 2（引数不備） |

## L3: 配線 (`apps/hub/tests/ci/production-auth-gates.test.ts`)

- deploy step に `--var "HUB_COMMIT_SHA:${GITHUB_SHA}"` がある
- step 順序が `version_gate < 鮮度検査 < OIDC smoke`
- 鮮度検査 step が `run check:deploy-freshness` / `id: deploy_freshness` /
  `--health-url "$HUB_HEALTH_URL"` / `--json`（証跡）を持つ
- rollback の env に `DEPLOY_FRESHNESS_OUTCOME` が配線され、
  `!= "success"` の除外分岐と「鮮度検査で停止」メッセージがある

## 実装上の落とし穴（テスト側）

- **`execFileSync` は使えない**（CLI 起動側）。同一プロセスに立てた `/health` サーバがイベントループ停止で
  接続を受け付けられず、子プロセスの fetch が必ず `health-unreachable` になる。`execFile` の Promise ラップで
  非同期起動すること。この誤りは実際に踏み、テストが 6 分以上ハングして全 CLI ケースが誤った outcome を返した。
- `env` を丸ごと差し替えない。`HUB_HEALTH_URL` だけを分割代入で外す
  （`PATH` などが消えて別の理由で落ちると、検査の意味が変わる）。
