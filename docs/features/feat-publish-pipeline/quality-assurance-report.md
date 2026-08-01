---
status: confirmed
layer: feature-quality
task: SYS-PUBLISH-PIPELINE-P09
parent_feature: feat-publish-pipeline
feature_package_id: feature-package/feat-publish-pipeline
source: docs/features/feat-publish-pipeline/refactoring-migration-note.md
feature_context_digest: sha256:7a4625914be99dd47f51c4c92698737ad8fe431319995457a6cadc5fd39d2f41
architecture_refs: [arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security]
---

# feat-publish-pipeline 品質保証報告

> **位置づけ**: P09 の成果物。qa-037 で確定した非機能要件を publish endpoint 群へ適用し、結果を記録する。

確認日: 2026-07-28

## 1. 対象と結果の一覧

| # | qa-037 の要件 | 判定 | 実装/証跡 |
|---|---|:--:|---|
| N1 | publish endpoint のレート制限 10 回/分 | **満たす (限界あり)** | §2 |
| N2 | Idempotency-Key の TTL 24 時間 | 満たす | §3 |
| N3 | Idempotency-Key のスコープ (tenant, endpoint) | 満たす | §3 |
| N4 | payload 不一致時 422 | 満たす | §3 |
| N5 | tenant/workspace の row-level スコープ隔離 | 満たす | §4 |
| N6 | secret scan の CI ゲート化 | 満たす | §5 |
| N7 | monotonic authz マトリクス参照 (判定の一元化) | 満たす | §6 |

## 2. N1 レート制限

### 2-1. 実装

`apps/hub/src/lib/publish/rate-limit.ts` (新設)。`withPublishMutation` の**先頭**で判定する。

```
withPublishMutation
  → checkPublishRateLimit()   ← ここ (本文を読む前)
  → request.text()
  → withIdempotency()
  → schema 検証
  → handler
```

判定を本文読み取りより前に置いたのは、拒否する要求に**本文 (最大 10 MiB の ZIP) の転送と冪等台帳の読み取りを払わせない**ため。

| 項目 | 値 | 根拠 |
|---|---|---|
| 上限 | 10 回 | qa-037 |
| 窓 | 60 秒 (固定窓) | qa-037 |
| 計数の単位 | `(tenantId, actorId, ledgerScope)` | §2-2 |
| 超過時の応答 | `429` + `{ "error": "rate_limited" }` | 他の失敗と同じ `{ error }` の形 |
| 必須 header | `retry-after` (秒、最低 1) | qa-037 |
| 観測用 header | `ratelimit-limit` / `ratelimit-remaining` / `ratelimit-reset` | 成功応答にも載せ、client が 429 を踏まずに減速できるようにする |

### 2-2. 計数の単位をこうした理由

- **テナント単位にしない**: 1 人の暴走が同じテナントの他の利用者を巻き込む (巻き添え拒否)。
- **actor 単位だけにしない**: endpoint をまたいだ合計で上限に当たり、「upload は詰まっていないのに submit が通らない」という読みにくい失敗になる。
- **workspace を含めない**: workspace を作り替えるだけで上限を回避できてしまう。
- `ledgerScope` は冪等台帳と同じ endpoint 識別子を使い回す (同じ概念に別名を作らない)。

### 2-3. 拒否時にカウントしない

上限に当たった要求は**消費しない**。数えると攻撃側の再送が窓を押し広げ、正当な利用者の復帰が遅れるためである (`rate-limit.test.ts`「拒否は数えない」)。

### 2-4. 限界 (明示)

カウンタは **Worker isolate 内のメモリ**に置いている。infrastructure-spec §2 の binding 台帳に KV も Durable Object も無く、台帳へ binding を足すのは feat-hub-foundation の責務で、本 feature が独断で `wrangler.jsonc` を触るのは越境になるためである。

結果として:

- 同一 isolate に載った要求列に対しては 10 回/分が**正確に**効く
- isolate をまたぐと実効上限が **(isolate 数 × 10) 回/分**まで緩む

「無制限」よりは確実に厳しく、「厳密な分散カウンタ」よりは緩い。厳密化は follow-up (§8 F4)。

> `runtime.ts` が禁じている in-memory 実装 (ADR AD-8) とは**別種**である。AD-8 が禁じるのは永続すべき**業務状態**の in-memory 代替で、それは未結線を 200 応答で隠す。レート制限のカウンタは本来 ephemeral (一時的＝失われても業務状態が壊れない) な値である。

### 2-5. 証跡

| テスト | 件数 | 内容 |
|---|---:|---|
| `apps/hub/tests/publish-pipeline/rate-limit.test.ts` | 15 | 上限・窓の起点・境界 burst・拒否非計数・bucket 独立・掃除・Retry-After の下限 1 秒 |
| `routes-auth.cases.ts` の「上限」節 | 3 | route 経由で 10 回通過 → 11 回目 429、成功応答の残量 header、endpoint 別計数 |

### 2-6. 窓の起点と境界 burst (実測して訂正)

本 phase の初稿は「窓は壁時計の 1 分境界で切れる」「境界では最大 2 倍 = 20 回通る」と書いていた。**どちらも実装と違っていた**ので実測に基づき訂正する。

- **窓の起点は壁時計の 1 分境界ではなく、その bucket の最初の消費時刻**である。`T0 + 59_000` で使い切った場合、窓が明けるのは `T0 + 60_000` ではなく `T0 + 119_000` になる。`floor(now / windowMs)` で切る実装を想定して読むと 1 分ずれる。
- **境界 burst は 2 倍ではなく `2 × 上限 − 1` = 19 回**である。窓を立てる最初の 1 回は必ず窓の頭で消費されるため、窓末尾に寄せられるのは `上限 − 1` 回までになる。

いずれも `rate-limit.test.ts` の「窓は壁時計の 1 分境界ではなく最初の 1 回に紐づく」「境界の burst は (2 × 上限 − 1) 回」で数値を固定した。**許容する判断は変えていない** (qa-037 の狙いは費用の暴走を止めることで、1 ms の 19 回はその目的を損なわない)。固定した理由は、滑走窓や epoch 揃えへ黙って変えられたときに CI で落とすためである。

滑走窓にしなかったのは、残量が連続的になり `Retry-After` を正確に返せなくなるためである。

## 3. N2/N3/N4 冪等鍵

| 項目 | 値 | 証跡 |
|---|---|---|
| TTL | `IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000` | `idempotency.ts` |
| スコープ | `(tenantId, ledgerScope)` — endpoint ごとに独立 | `idempotency.test.ts` |
| 指紋 | `${method}\n${pathname}\n${rawBody}` の SHA-256 | 同上 |
| 同一鍵 + 同一 payload | 先着の応答をそのまま返す (`idempotency-replay: true`) | `routes-request.cases.ts` |
| 同一鍵 + **異なる** payload | `422` | `idempotency.test.ts` |
| 鍵の無い変更要求 | `400 idempotency_key_required` | `routes-request.cases.ts` |
| 記録対象 | 2xx のみ (失敗を再生しない) | `idempotency.test.ts` |

`idempotency.test.ts` 26 件すべて pass。

**本 phase で是正した点**: 応答の再構成が `204`/`304` 等の本文を持てない status (`NULL_BODY_STATUSES`) で `TypeError` になる形だった。現行の publish 経路は本文付き応答しか返さないため実害は出ていなかったが、将来 `204` を返す endpoint を足した瞬間に 500 になる。

## 4. N5 tenant/workspace 隔離

`node scripts/ci/check-tenant-isolation-gate.mjs` → **OK: 12 ケース / 必須 ID 7 種を確認**。

publish 側の実装上の要点:

- `publishScopeOf(authz)` は `tenantId` を **principal ではなく resource** から取る。`withAuthz` が既に越境を落としており、ここまで来た `resource.tenantId` は「操作してよいと判定されたテナント」である。principal 側から取ると provider-admin の正当な越境操作が自テナントへ書き込まれる。
- 他テナントの資源を指す要求は **403 ではなく 404** を返す。403 だと資源の存在が読めてしまう (`routes-auth.cases.ts`)。

## 5. N6 secret scan の CI ゲート化

**既存機構で充足**。二重に作らない。

| 機構 | 役割 | 実測 |
|---|---|---|
| `packages/inspection/scripts/scan-secrets.mjs` | monorepo 全体の走査 (G6) | 1 file / 1 test passed |
| `packages/inspection/src/secret-scan-gate.test.ts` | 検出 0 件を CI で固定 | 同上 |
| `createDefaultSecretScanRules()` | CI ゲートと公開検査が**同じ実装**を共有 | `publish-inspection.test.ts` |

本 phase で追加したのは「公開検査側にも同じ preset が結線されている」ことの固定 (P08 §4-2) であり、ゲートそのものは既存を使っている。

抑制の口は 2 つだけ: 行内マーカー `secret-scan:allow` (行単位・レビュー可能) と、ベンダー公式のサンプル値 (`KNOWN_PUBLIC_EXAMPLE_SECRETS`、**値単位**)。ディレクトリやファイル単位の除外は行わない — 除外しすぎるとゲートが素通りするため。

## 6. N7 authz マトリクス参照の一元化

`node apps/hub/scripts/check-single-authz-middleware.mjs` → **OK: 走査 168 ファイル / 違反 0 件 / allowlist 3 件 / route 例外 5 件が期待集合と一致**。

**本 phase で 1 件の違反を検出し是正した**。現在の `routes-auth.cases.ts` に当たるテスト名へ `minRole` という語が含まれており、ゲートが「認可判定の語彙が `lib/authz/` の外に現れている」として検出していた。ゲートは文字列リテラルも走査するため、説明のつもりで書いた語が違反になる。テスト名を「要求される最小ロールは owner」へ書き換えて解消した。

> この検出は**過剰ではない**。認可判定の語彙が route 側に現れ始めることが判定分散の最初の兆候であり、「テスト名だから良い」という例外を認めると境界が緩む。

## 7. 全体の再実行結果 (2026-07-30 landing review)

| コマンド | 結果 |
|---|---|
| `pnpm --filter hub test` | 68 files / 842 passed、Lines 80.52% / Branches 87.90% |
| `pnpm --filter @harness-hub/inspection test` | 9 files / 151 passed |
| `pnpm --filter @harness-hub/db test` | 30 files / 231 passed |
| `pnpm --filter @harness-hub/schemas test` | 6 files / 86 passed |
| `pnpm typecheck` | workspace 6 project / exit 0 |
| `pnpm lint` | 423 files / error 0 |
| `check-tenant-isolation-gate.mjs` | OK |
| `check-single-authz-middleware.mjs` | OK |
| `check-shared-layer-duplicates.mjs` | OK (違反 0) |
| `check-publish-inspection-gate.mjs` | OK (違反 0) |
| `check-db-schema-boundary.mjs` | OK (違反 0) |

landing review では共有層検査が、P13 smoke runner の DB deep import 2 件と
test support の公開名衝突 1 件を検出した。`createPublishSmokeDbProbe` facade へ
fixture・証跡・cleanup を閉じ、apps/hub から schema table を排除したうえで、
負例付き境界ゲートを再実行して 501 ファイル / 違反 0 件を確認した。

## 8. follow-up

| # | 内容 | 優先 |
|---|---|:--:|
| F4 | レート制限カウンタを Durable Object / KV へ移す (isolate 跨ぎで上限が緩む)。binding 台帳への追加は feat-hub-foundation の責務 | 中 |
| F5 | `Idempotency-Key` 必須であることが OpenAPI / 仕様書に未記載 | 中 |
| F6 | 検査ルール版数を payload に含め、submit 時に照合する (検査後にルールが変わると判定が古い) | 低 |
| F7 | `src/lib/publish/db-ports.ts` (280 行) が未検査 (カバレッジ 2.6%) | 中 |
