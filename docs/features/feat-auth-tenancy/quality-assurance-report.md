---
status: confirmed
layer: feature-design
task: SYS-AUTH-TENANCY-P09
parent_feature: feat-auth-tenancy
feature_package_id: feature-package/feat-auth-tenancy
feature_context_digest: sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5
---

# feat-auth-tenancy P09 品質保証レポート

- graph_node_id: `sys-auth-tenancy-p09`
- feature_context_digest: `sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5`
- 判定: **該当する品質ゲート 6 件すべて pass、かつ 6 件すべてが CI で fail-closed に結線済み**
- 初回 QA 時 (2026-07-25) は CI 未結線だったが、`HarnessHub-1f28` で結線済み。§1 の数値は 2026-07-28 の再実行実測値

---

## 1. 品質ゲート一覧と実行結果

実測日: **2026-07-28** (この表の数値はすべてこの日の再実行結果)。

| # | ゲート | 対応 quality_constraint | 実行コマンド | 結果 | CI 結線先 |
| --- | --- | --- | --- | --- | --- |
| G1 | テナント分離テスト | `tenant-workspace-row-level-scope-isolation-test-ci-d4` | `pnpm check:tenant-isolation` | ✅ 12 ケース pass / 必須 ID 7 種確認 / 越境成功 0 件 | `ci.yml` build & test (G4 名指し) + root `verify` |
| G2 | Auth.js adapter 境界隔離 | `auth-adapter-boundary-better-auth-migration-hedge-d3-qa020` | `node apps/hub/scripts/check-auth-adapter-boundary.mjs` | ✅ 走査 **127** ファイル / 違反 0 件 | `ci.yml` static-gates (G12) + root `check:auth` |
| G3 | 認可判定の単一集約 + route 例外の厳密一致 | `role4-authorization-matrix-single-middleware-deny-by-default-sec2` | `node apps/hub/scripts/check-single-authz-middleware.mjs` | ✅ 走査 **132** ファイル / 違反 0 件 / allowlist 3 件 / route 例外 5 件一致 | 同上 |
| G4 | dev 専用 provider 非存在 | `no-hub-native-account-idp-delegation-i7` | `node apps/hub/scripts/check-dev-auth-provider-absence.mjs` | ✅ 走査 **132** ファイル / 禁止語 15 種 / 検出 0 件 | 同上 |
| G5 | 数値契約の単一集約 | `session-jwt-staleness-emergency-revocation-qa036` ほか | `pnpm exec vitest run tests/auth-tenancy/session-revocation.test.ts` (`T-SESS-01`) | ✅ 23 ケース pass / 11 項目一致 (10 項目は仕様書リテラル、1 項目は ADR 実装追補 §10.7 の決定値) | `ci.yml` build & test + root `verify` |
| G6 | secret scan | (G6 / qa-038【2】) | `pnpm check:secrets` | ✅ 走査 **362** ファイル / 検出 0 件 / verdict=pass | root `verify` (`check:secrets`) |

一括再実行:

```bash
pnpm check:auth                    # G2 + G3 + G4 (1 本でも fail なら非ゼロ終了)
pnpm check:tenant-isolation        # G1 (対象実在 / 必須 ID 網羅 / skip 不在 も検査)
cd apps/hub && pnpm exec vitest run tests/auth-tenancy   # G1 + G5 を含む実行系 310 ケース
pnpm check:secrets                 # G6
node scripts/ci/check-shared-layer-duplicates.mjs        # 既存ゲート (§3)
```

---

## 2. 各ゲートの設計意図

### G1 テナント分離テスト (D4)

D4 は row-level-scope 方式 (1 つの DB を tenant_id 列で分ける) を採る。DB を物理分割しないため、
**「越境しないこと」はコードの正しさにしか依存しない**。したがって分離テストの CI 必須ゲート化が
D4 の revisit 条件確認の前提になる。

`T-ISO-02` は 2 テナント同時稼働状態で A のクエリ結果に B の行が 1 件も混入しないことを確認する。
`T-ISO-04` は provider-admin の越境が**許可**され、かつ監査 `provider.cross_tenant_access` が 1 件残ることを確認する
(「越境 0 件」の正確な意味は P07 acceptance-record.md §AC-1 参照)。

**revisit トリガー**: テナント数が 10 を超過した場合、または分離テスト失敗が頻発した場合に
DB-per-tenant を再評価する。監視手順は P12 runbook.md §3。

### G2 Auth.js adapter 境界隔離 (D3 caveat / qa-020)

3 つの規則を静的に検査する。いずれも「名前と参照経路」から決定的に決まるため、
実行環境にも Auth.js パッケージのインストール有無にも依存しない
(初回 QA 時は未導入、現在は `@auth/core` 導入済みだが、検査内容は変わっていない)。

1. Auth.js 固有 module (`next-auth` / `@auth/*` / `@next-auth/*`) の import が `adapter/` の外に無い (`T-BND-01`)
2. `adapter/` 配下への参照が公開入口 `adapter/index.js` 経由に閉じている
3. 公開入口から**到達可能な**再輸出経路に Auth.js module が現れない (`T-BND-02`)

規則 3 は幅優先探索で再輸出グラフを辿る。入口 1 枚だけを見る検査では、
`index.ts` → `callbacks.ts` → `next-auth` の 2 段再輸出が素通りするため。
**意図的な違反を投入して exit 1 での赤化を確認済み** (P06 §3)。

### G3 認可判定の単一集約 (SEC2 / qa-020)

「認可判定が 1 箇所にある」は宣言では守れない。守れないまま増えると、
route ごとに少しずつ違う role 比較が生えて、認可マトリクステストが実態を覆わなくなる。

検査するのは **role 判定の語彙**の出現場所である。

- 判定を意味する識別子: `ROLE_ORDER` / `ROLE_RANK` / `roleRank` / `roleOrder` / `minRole` / `requiredRole` / `hasRole` / `requireRole` / `isAdmin` / `canAccess` / `checkPermission` / `ACTION_RULES`
- role 文字列リテラルの比較・順序づけ: `x === 'owner'` / `'member' !== x` / `['provider-admin', ...]`

これらが `apps/hub/src/lib/authz/` の外に現れたら fail。

**`effectiveRole` は意図的に検査語彙へ含めていない。** あれは判定の*結果*であり、
handler が受け取って読むのは wrapper 設計そのもの (禁じたら `decide()` の意味が無い)。
結果を使って**再判定**する形 (`authz.effectiveRole === 'workspace-admin'`) は role リテラル比較側で捕まる。

#### allowlist (3 件) — 理由つき

| path | 理由 | 検出語彙数 |
| --- | --- | --- |
| `packages/schemas/auth-tenancy/primitives.ts` | role の**型**定義 (`z.enum`)。値の意味付けはせず、判定は `lib/authz` が行う | 1 |
| `apps/hub/tests/auth-tenancy/authz-matrix.test.ts` | backend-spec §3.3 の matrix を仕様側から書き下す表。実装を参照すると検査が自己言及になる | 12 |
| `apps/hub/tests/auth-tenancy/tenant-isolation.test.ts` | role × action の越境不可を総当たりする分離テスト。期待値として role 語彙を持つ | 1 |

**allowlist を足すのは検査を弱める操作である。** 増やす前に「その場所で本当に判定してよいか」を疑うこと。
そのため本検査は、**検出語彙が 0 件になった allowlist エントリを `stale-allowlist-entry` として fail させる**。
「例外だらけだが緑」は検査が死んでいる状態そのもので、消し忘れた 1 行が後から本物の違反を吸収してしまう。
実際、初回実行時に 2 件の死んだ除外 (`device-flow.test.ts` / `support/in-memory-ports.ts`) を検出して削除した。

### G4 dev 専用 provider 非存在 (I7 / qa-036)

禁止語を 2 群に分け、群ごとに射程を変えている。詳細と全パターン一覧は
P08 refactoring-migration-note.md §2。走査範囲から外している場所は検査結果 JSON の
`excluded_from_scan` に記録し、**穴を黙って作らない**。

### G5 数値契約の単一集約

`docs/backend-spec.md §3.2` の数値がコードへ散らばっていないことを確認する。
正本は `apps/hub/src/lib/auth/config.ts` の `AUTH_NUMERIC_CONTRACT` 1 オブジェクト。

| 項目 | 値 |
| --- | --- |
| session `maxAge` | 8 時間 |
| session `updateAge` | 15 分 |
| device_code TTL | 10 分 |
| polling interval | 5 秒 |
| `slow_down` の加算幅 | 5 秒 |
| polling interval の上限 | 60 秒 (`docs/security-spec.md` §2.2 = `qa-073` で確定。起点は ADR 実装追補 §10.7) |
| user_code 桁数 | 8 |
| user_code 最大試行 | 5 回 |
| access token TTL | 15 分 |
| refresh token TTL | 90 日 |
| 失効キャッシュ TTL | 60 秒 |

**テスト側はこの定数を期待値に使わない。** 仕様書のリテラル値 (`8 * 60 * 60` ではなく `28800`) を
テストに書いて突き合わせる。定数を参照するだけのテストは、定数を書き換えた瞬間に一緒に緑になり、
値の誤りを検出できなくなる (`T-SESS-01`)。

### G6 secret scan

OIDC `client_secret` や token 署名鍵がハードコードされていないことを確認する。
既存の `packages/inspection` の `scan:secrets` を再利用しており、本 feature 用に新規スクリプトは作っていない
(検査の重複は、片方だけが更新されて食い違う原因になる)。

`TenantOidcConnection` に secret フィールドが存在しないのは設計上の措置である
(アプリケーション層へ渡した値は必ずログ・エラー・シリアライズのどこかから漏れる)。

---

## 3. 既存ゲートとの重複回避

route handler が `withAuthz()` を通っているかの検査 (`unwrapped-route-handler` / C2) は、
**既存の `scripts/ci/check-shared-layer-duplicates.mjs` が `registry.route_handler_policy` 経由で既に実装している**。
本 task で同等のスクリプトを新規作成すると、2 つの検査が別々に育って食い違う。したがって新規作成せず、既存ゲートを再実行して確認した。

```
$ node scripts/ci/check-shared-layer-duplicates.mjs
[duplicate-detector] OK: 登録共通層 12 件 + 運用機構 4 件 / 走査 274 ファイル / 違反 0 件
```

---

## 4. fail-closed 結線 — 完了

初回 QA (2026-07-25) 時点では「検査は存在し pass するが、CI が自動で落としてはくれない」状態だった。
`apps/hub/package.json` と `.github/` が本 feature の write scope 外だったためで、
`HarnessHub-1f28` へ分離した。**その結線は完了しており、残件は無い。**

| 項目 | 状態 | 結線先 |
| --- | --- | --- |
| `apps/hub/scripts/check-*.mjs` の実装 | ✅ 完了 | — |
| `apps/hub/package.json` への script 追加 | ✅ 完了 | `check:auth-gates` / `test:tenant-isolation` |
| `.github/workflows/` への結線 | ✅ 完了 | `static-gates` job の G12、`build & test` job の「G4 名指し tenant 分離テスト」 |
| root `pnpm verify` への組み込み | ✅ 完了 | `check:auth` (3 番目) と `check:tenant-isolation` (`test` の直後) |

### 4.1 「本当に落ちるか」の再実測 (2026-07-28)

結線されていても検査が実質無効なら意味がないので、**赤くなることを実際に確認した**。

| 投入した違反 | 実行 | 結果 |
| --- | --- | --- |
| `apps/hub/src/lib/authz/` から `@auth/core/types` を import (境界外) | `pnpm check:auth` | **exit 1** / `authjs-import-outside-adapter` を該当行つきで検出 |
| `tenant-isolation.test.ts` の `T-ISO-01` を `it.skip` 化 | `node scripts/ci/check-tenant-isolation-gate.mjs` | **exit 1** / 無効化されたケースを行番号つきで検出 |
| いずれも撤去後 | 同上 | **exit 0** に復帰 (最終HEADは走査 127/132/132 ファイル、12 ケース / 必須 ID 7 種) |

これで D4 の「分離テスト CI 必須ゲート化」と qa-020 / qa-036 の「CI で機械検証」は、
宣言ではなく**実測された遮断挙動**として満たされている。

---

## 5. 判定

| 判定項目 | 結果 |
| --- | --- |
| 該当する品質ゲートがすべて実装され pass しているか | ✅ 6/6 pass (§1 / 2026-07-28 実測) |
| ゲートが「落ちること」を確認したか | ✅ G1・G2 は意図的違反を投入して exit 1 を実測 (§4.1)。G3 は死んだ allowlist を検出して実際に赤化した |
| 既存ゲートとの重複を作っていないか | ✅ C2 は既存スクリプトを再利用 (§3) |
| CI への fail-closed 結線が完了しているか | ✅ 完了 (`HarnessHub-1f28` closed)。手動実行だけに依存する経路は無い |

**→ P09 は完了。保留していた `HarnessHub-1f28` は closed であり、差し戻し条件は残っていない。**
本節の結果は P10 final-review-record.md の QC-2 / QC-4 / QC-5 / QC-6 の判定材料として引き渡す。
