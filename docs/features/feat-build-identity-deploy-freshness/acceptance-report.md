---
status: confirmed
layer: feature-design
task: SYS-BUILD-IDENTITY-P07
parent_feature: feat-build-identity-deploy-freshness
feature_package_id: feature-package/feat-build-identity-deploy-freshness
---

# P07 受入判定 — 稼働ビルドの素性と鮮度

feature: `feat-build-identity-deploy-freshness`
判定日: 2026-08-08 / 判定: **PASS (5/5)**

受け入れ条件（P01）ごとに、充足の根拠を「どのファイルの何が担保しているか」で示す。
散文の自己申告ではなく、テストの exit code またはコードの実体を根拠にする。

## A1. 稼働成果物の commit を認証なしで確認できる

| 根拠 | 実体 |
|---|---|
| 契約 | `packages/schemas/src/health.ts` — `healthResponseSchema` に `commit`（optional / `^[0-9a-f]{40}$`）を追加 |
| 実装 | `apps/hub/src/app/health/route.ts` — `GET()` が `resolveCommit(env)` を `buildHealthResponse` へ渡す |
| 認証・キャッシュ | `/health` は既存どおり認証なし・`cache-control: no-store` |
| テスト | `apps/hub/tests/health/health.route.test.ts`「埋込があれば commit を応答に載せる」 |

**判定: 充足。**

## A2. CI の deploy 時に自動で埋め込まれ、手動更新に依存しない

| 根拠 | 実体 |
|---|---|
| 埋込 | `.github/workflows/ci.yml` の deploy step に `--var "HUB_COMMIT_SHA:${GITHUB_SHA}"` |
| 宣言 | `apps/hub/src/app/health/runtime-env.ts` の `RuntimeEnv.HUB_COMMIT_SHA?` |
| 規約両立 | `wrangler.jsonc` へ値を書かない（deploy 時注入） |
| テスト | `production-auth-gates.test.ts`「deploy 時に稼働成果物へ commit を埋め込む」 |

手動で更新する手順は存在しない。**判定: 充足。**

## A3. HEAD より古い状態が続くことを検出する

| 根拠 | 実体 |
|---|---|
| 検査本体 | `apps/hub/scripts/check-deploy-freshness.mjs`（`evaluateFreshness` + CLI） |
| 実行配線 | ci.yml `- name: 稼働ビルドの鮮度検査` / `id: deploy_freshness`、version_gate 直後・OIDC smoke 直前 |
| 証跡 | `--json /tmp/deploy-freshness.json` |
| テスト | `production-auth-gates.test.ts`「配信版一致の検査を通した直後、smoke の前に鮮度検査を実行する」 |

**判定: 充足。**

## A4. しきい値超過の fixture で検査が実際に落ちる

| 根拠 | 実体 |
|---|---|
| 判定単体 | `deploy-freshness.test.ts`「しきい値を超えて古いままなら stale で落とす」 |
| 本件再現 | 同「本件と同じ 4 日間の放置を再現しても stale で落とす」 |
| 境界 | 同「境界（乖離 = しきい値ちょうど）は stale 側に倒す」 |
| **CLI の exit code** | 同「しきい値を超えた古い版を配信していれば exit 1 で落ちる」— exit=1 かつ stderr に `::error::` |
| fail-open 抑止 | 同 `commit-unavailable` 5 パターン / `health-unreachable` / 引数不備 exit 2 |

文言検査ではなく **本物の module と本物の CLI** を動かして測っている。**判定: 充足。**

## A5. 露出が内部 path・secret・個人データを含まない

| 根拠 | 実体 |
|---|---|
| 構造的制約 | schema と `resolveCommit` の **両方** で `^[0-9a-f]{40}$` を強制。40 桁 hex 以外は通らないため、path・token・個人データは構造的に入り得ない |
| 欠落の扱い | 未埋込時は key ごと落とす（`unknown` 等の代替値を入れない） |
| テスト | `health.route.test.ts` `describe('resolveCommit')` — 大文字/空白の正規化、未設定・空文字・短縮 sha・branch 名・41 桁で `undefined` |
| 契約テスト | `packages/schemas/src/health.test.ts` — 同等の拒否ケース |

**判定: 充足。**

## 付随して確認したこと

- 鮮度検査の失敗が rollback を誘発しないこと（`DEPLOY_FRESHNESS_OUTCOME != success` の除外分岐）を
  `production-auth-gates.test.ts`「鮮度検査で止まったときは rollback しない」で固定した。
  これは受け入れ条件そのものではないが、**本件の悪化ループ（失敗 → rollback → 古い版への固定が強まる）**
  を再発させないための必須条件である。
