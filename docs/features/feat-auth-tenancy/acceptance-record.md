---
status: confirmed
layer: feature-design
task: SYS-AUTH-TENANCY-P07
parent_feature: feat-auth-tenancy
feature_package_id: feature-package/feat-auth-tenancy
feature_context_digest: sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5
---

# feat-auth-tenancy P07 受入記録

- graph_node_id: `sys-auth-tenancy-p07`
- feature_context_digest: `sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5`
- 判定根拠: `docs/features/feat-auth-tenancy/test-run-results.md` (P06) に記録された実行証跡と、下記の再実行実測値のみ
- 初回判定 (2026-07-25): **2 項目 pass / 1 項目条件付き**
- **確定判定 (2026-07-28 再実行): 3 項目すべて pass**。AC-3 の条件は `HarnessHub-b7ng` (Auth.js 実結線) と
  `HarnessHub-1f28` (CI 結線) の closed により解消済み

> 本 task は「実行された証跡」だけを判定材料にする。未実行のもの・計画中のものは根拠にしない。

---

## AC-1 テナント越境アクセスが分離テストで 0 件

**判定: ✅ pass**

| 根拠テスト ID | 内容 | 結果 |
| --- | --- | --- |
| `T-ISO-01` | tenant A の principal が tenant B の resource へ | 拒否 `tenant_mismatch` |
| `T-ISO-02` | 2 テナント同時稼働で A のクエリ結果に B の行が混入しない | 混入 **0 件** |
| `T-ISO-03` | 同一 tenant 内の workspace 跨ぎ | 拒否 |
| `T-ISO-04` | provider-admin の越境 | **許可** + 監査 `provider.cross_tenant_access` 1 件 |
| `T-ISO-05` | provider-admin 以外の越境 | 全 role で拒否 |
| `T-ISO-06` | 他テナント資源は 404 (存在秘匿) / 同一テナント内の権限不足は 403 | 404 / 403 に分離 |
| `T-ISO-07` | tenant を跨いだ device_code / refresh token の流用 | 拒否 |

実行証跡: `apps/hub/tests/auth-tenancy/tenant-isolation.test.ts` — 12 ケース pass (P06 §2)

### 「0 件」の正確な意味

`T-ISO-04` の通り、**provider-admin の越境は仕様上「許可」である** (security-spec §3.1.3 / S-D9)。
したがって AC-1 の「越境 0 件」は「越境要求が 1 件も成功しない」ではなく、
**「認可されていない越境が 1 件も成功しない」**を意味する。この区別を曖昧にすると、
provider-admin の正当な運用アクセスを実装バグと誤認するか、逆に越境検査そのものを緩めることになる。

provider-admin の越境は**許可・拒否にかかわらず**必ず監査 `provider.cross_tenant_access` を残す
(`apps/hub/src/lib/authz/with-authz.ts`)。拒否したものだけ記録すると、
「通ってしまった越境」が痕跡なしで消えるため。

---

## AC-2 Device Flow の E2E (承認→token→失効) が成功する

**判定: ✅ pass**

根拠テスト ID: `T-DEV-E2E-01`
実行証跡: `apps/hub/tests/auth-tenancy/device-flow-e2e.test.ts` — 1 ケース pass (P06 §2)

E2E が通した工程 (CLI 利用者から見た一連の物語):

| # | 工程 | 検証内容 |
| --- | --- | --- |
| 1 | `POST /api/v1/device/code` | `user_code` が Crockford Base32 8 文字 (`/^[0-9A-HJKMNP-TV-Z]{8}$/`)、`verification_uri_complete` を返す |
| 2 | 承認前の polling | `authorization_pending` |
| 3 | ブラウザで承認 | 口頭で伝わる形 (小文字・ハイフン入り) の code を正規化して受理 |
| 4 | `POST /api/v1/device/token` | access token + refresh token を発行 |
| 5 | 保護 route 呼び出し | 200 / 対象 Project の `effectiveRole: 'owner'` |
| 6 | access token 期限直前の refresh | rotation 成功 → 旧 access token は 401 / 新 access token は 200 |
| 7 | token 一覧・個別失効 | 有効 token 1 件 → `revokeToken` で `revokedCount: 1` |
| 8 | 失効後の再利用 | refresh は拒否、access token も期限到来後に 401 |
| 9 | 監査イベント列 | `device.approve` → `token.issue` → `token.revoke` → `token.reuse_detected` |

### 受入判定の境界 (混同しないこと)

- **Hub 側 Device Authorization Flow** (code/approve/token・短命 access token・refresh rotation/reuse detection・本人/管理者失効) は本 package の所有物であり、上記 E2E で判定した。
- **OS 資格情報域への保存** (macOS Keychain / Windows Credential Manager) は `feat-publisher-plugin` が所有する consumer 実装である。**本 package は保存 API を実装していないし、実装したとも主張しない。** 本 package が提供するのは token response / rotation / revocation の公開 contract (`T-TOKC-01`〜`T-TOKC-04`) と downstream evidence key であり、Keychain 側の E2E 証跡は publisher package のものを相互参照する。循環依存は作らない。

### 工程 8 に関する運用上の注意 (受入は pass だが記録する)

publisher token を失効させても、**発行済みの access token は最大 15 分間有効なまま**である
(stateless JWT + 短命 TTL の設計上の帰結)。侵害時に即座に切る必要がある場合は
session_revocations 経由の緊急失効を併用する。手順は P12 runbook に記載する。

---

## AC-3 Auth.js 依存が adapter 境界に隔離されている (D3 caveat)

**判定: ✅ pass (隔離対象の実依存が導入され、その状態で境界が成立している)**

| 根拠テスト ID | 検査内容 | 結果 |
| --- | --- | --- |
| `T-BND-01` | `lib/auth/adapter/` 以外から Auth.js 固有 module (`next-auth` / `@auth/*` / `@next-auth/*`) の import が無い | exit 0 |
| `T-BND-02` | 公開入口 `adapter/index.ts` から**到達可能な**再輸出経路に Auth.js module が現れない | exit 0 |

実行証跡 (2026-07-28 再実行): `node apps/hub/scripts/check-auth-gates.mjs` — 走査 **111 ファイル** / 違反 0 件

### 検査が有効であることの確認

`T-BND-02` は意図的な違反 (`adapter/index.ts` → `adapter/__probe.ts` → `next-auth` の 2 段再輸出) を投入して
exit 1 での赤化と検出経路の出力を確認済み (P06 §3)。**入口 1 枚だけを見る検査では素通りする形**を
到達可能性解析で塞いでいる。

### 初回は「隔離対象が存在しない隔離」だった — 現在は違う

初回受入時点では Auth.js パッケージが未導入で route は意図的に 501 を返しており、
「隔離すべき依存がまだ無い状態での境界検査」に過ぎなかったため条件付きとした。
**2026-07-26 `HarnessHub-b7ng` で `@auth/core` 0.41.3 を実インストールし、本番 runtime を結線済み**。
検査は「実在する依存」に対して走っており、条件は解消している。

- ✅ **隔離対象が実在する**: `apps/hub/src/lib/auth/adapter/authjs-handler.ts` が `@auth/core` の `Auth()` を
  テナント別設定で駆動する。`/api/auth/[...nextauth]/route.ts` が持つのは
  `authRuntime().authRoute(request)` の 1 行だけで、Auth.js 由来の型は 1 つも見えない。
- ✅ **境界が機械検査で守られている**: Auth.js 固有 API を扱ってよい場所が `adapter/` 1 箇所に限定され、
  境界外への import と、入口経由の型の素通しの両方が塞がれている (`T-BND-01` / `T-BND-02`)。
- ✅ **実結線が動作証跡を持つ**: `tests/auth-tenancy/authjs-handler.test.ts` 5 ケース、
  `tests/auth-tenancy/db-ports-integration.test.ts` 17 ケース pass (2026-07-28 実行)。
- ✅ **人手を介さず落ちる**: `pnpm check:auth` が root `verify` チェーンと `ci.yml` の `static-gates` job
  (G12) に結線済み (`HarnessHub-1f28`)。境界違反を入れると `pnpm verify` が exit 1 になる。
- ✅ **乗り換え余地は保たれている**: 検査は module 指定子と参照経路だけを見るため、
  Better Auth へ差し替えても同じ検査がそのまま効く。触る面は `adapter/` に閉じている (P08 §1.1)。

---

## 総合判定

| acceptance 項目 | 判定 | 根拠 |
| --- | --- | --- |
| AC-1 テナント越境アクセスが分離テストで 0 件 | ✅ pass | `T-ISO-01`〜`T-ISO-07` (12 ケース) |
| AC-2 Device Flow の E2E (承認→token→失効) が成功する | ✅ pass | `T-DEV-E2E-01` (9 工程) |
| AC-3 Auth.js 依存が adapter 境界に隔離されている | ✅ pass | `@auth/core` 実結線下で `T-BND-01`/`T-BND-02` 走査 111 ファイル / 違反 0 件 + CI 結線 |

**3 項目すべて pass。P07 の受入判定は確定である。**

2026-07-28 の再実行実測 (この判定の根拠):

| 検証 | コマンド | 結果 |
| --- | --- | --- |
| auth 3 ゲート | `pnpm check:auth` | 3/3 pass (走査 111 / 116 / 116 ファイル、違反 0 件) |
| テナント分離 CI ゲート | `pnpm check:tenant-isolation` | 12 ケース pass / 必須 ID 7 種を確認 |
| auth-tenancy テスト群 | `pnpm exec vitest run tests/auth-tenancy` | 10 ファイル / **149 ケース pass** |
| hub 全体 | `pnpm --filter @harness-hub/hub test` | **351 pass / 0 skip** (31 ファイル) |

> **本番環境での再確認は本 task の範囲外**である。AC-1〜AC-3 はいずれもコードとテストに対する判定であり、
> 本番 OIDC provider 登録下での再確認は P13 (`release-record.md`) が別途担う。ここでの pass を
> 「本番で動作することを確認した」と読み替えてはならない。
