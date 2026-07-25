---
status: approved-with-conditions
layer: feature-design
task: SYS-AUTH-TENANCY-P07
parent_feature: feat-auth-tenancy
feature_package_id: feature-package/feat-auth-tenancy
feature_context_digest: sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5
---

# feat-auth-tenancy P07 受入記録

- graph_node_id: `sys-auth-tenancy-p07`
- feature_context_digest: `sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5`
- 判定根拠: `docs/features/feat-auth-tenancy/test-run-results.md` (P06) に記録された実行証跡のみ
- 総合判定: **2 項目 pass / 1 項目条件付き** (`next-auth` 実依存は未導入)

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

**判定: ⚠️ 条件付き (境界は成立、隔離対象の実依存は未導入)**

| 根拠テスト ID | 検査内容 | 結果 |
| --- | --- | --- |
| `T-BND-01` | `lib/auth/adapter/` 以外から Auth.js 固有 module (`next-auth` / `@auth/*` / `@next-auth/*`) の import が無い | exit 0 |
| `T-BND-02` | 公開入口 `adapter/index.ts` から**到達可能な**再輸出経路に Auth.js module が現れない | exit 0 |

実行証跡: `node apps/hub/scripts/check-auth-gates.mjs` — 走査 92 ファイル / 違反 0 件 (P06 §3)

### 検査が有効であることの確認

`T-BND-02` は意図的な違反 (`adapter/index.ts` → `adapter/__probe.ts` → `next-auth` の 2 段再輸出) を投入して
exit 1 での赤化と検出経路の出力を確認済み (P06 §3)。**入口 1 枚だけを見る検査では素通りする形**を
到達可能性解析で塞いでいる。

### 明記すべき前提: `next-auth` は現時点で未インストール

本リポジトリに `next-auth` パッケージは導入されておらず、
`apps/hub/src/app/api/auth/[...nextauth]/route.ts` は意図的に 501 `auth_provider_not_wired` を返す。

したがって AC-3 の現在の充足内容は次のとおりである。**これを「Auth.js を導入して隔離済み」と読み替えてはならない。**

- ✅ **成立している**: Auth.js 固有 API を扱ってよい場所が `adapter/` 1 箇所に限定され、その境界が機械検査で守られている。境界外への import と、入口経由の型の素通しの両方が塞がれている。
- ✅ **成立している**: `apps/hub/src/shared/auth/` の `AuthProvider` 抽象と `denyAllAuthProvider` (既定は全拒否 = fail-closed) により、Auth.js 未導入でも認証面が「開いた」状態にならない。
- ⏳ **未実施**: `next-auth` の実インストール、session claims bridge、dynamic tenant route の結線
  (`HarnessHub-b7ng`)。実依存が無い状態の静的隔離は、受入を完全充足した根拠にはしない。
- ✅ **導入後も同じ検査で守れる**: `T-BND-01`/`T-BND-02` は module 指定子と参照経路だけを見るため、`next-auth` のインストール有無に依存しない。導入した瞬間に、境界外 import があれば赤くなる。

---

## 総合判定

| acceptance 項目 | 判定 | 根拠 |
| --- | --- | --- |
| AC-1 テナント越境アクセスが分離テストで 0 件 | ✅ pass | `T-ISO-01`〜`T-ISO-07` (12 ケース) |
| AC-2 Device Flow の E2E (承認→token→失効) が成功する | ✅ pass | `T-DEV-E2E-01` (9 工程) |
| AC-3 Auth.js 依存が adapter 境界に隔離されている | ⚠️ 条件付き | 境界検査は pass、実依存・runtime 結線は `HarnessHub-b7ng` |

→ core 実装・検査は後続へ引き継げるが、AC-3 の完全充足と本番リリースには `HarnessHub-b7ng` が必要。
