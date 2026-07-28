---
status: confirmed
layer: feature-design
task: SYS-AUTH-TENANCY-P13
parent_feature: feat-auth-tenancy
feature_package_id: feature-package/feat-auth-tenancy
feature_context_digest: sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5
---

# feat-auth-tenancy P13 リリース記録

- graph_node_id: `sys-auth-tenancy-p13`
- feature_context_digest: `sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5`
- **本番デプロイの実施状況: 未実施**

---

## 0. 結論を先に書く

**本番環境へのデプロイは実施していない。** 本記録はローカル core の準備状況と、
本番結線を含む未完了作業を、実施済みと混同しない形で記録するものである。

task spec の Trace rule が定めるとおり、**P13 は文書や計画で実装・証跡の欠落を代替できない。**
以下、実施したこと・実施していないことを分けて記録する。

---

## 1. 実施していない作業と、その理由

| # | 作業 | 状態 | 理由 |
| --- | --- | --- | --- |
| R1 | 本番 `idp_connections` への OIDC provider 設定登録 | ❌ 未実施 | 本番 IdP の issuer/client 資格情報をこの作業では取り扱わない |
| R2 | `apps/hub` の本番 Cloudflare Workers 環境へのデプロイ | ❌ 未実施 | draft PR のレビュー前に本番配信しない。本番 Secret の投入も本変更の権限外 |
| R3 | Dev tenant の Google Workspace OIDC provider 登録確認 | ❌ 未実施 | dev IdP の資格情報をこの作業では取り扱わない (手順は P12 runbook-oidc-provider-onboarding.md §2 に確定済み) |
| R4 | 本番スモークテスト (2 テナントログイン / role 4 種 / Device Flow E2E / 緊急失効 / dev provider 非存在の本番ビルド確認) | ❌ 未実施 | R1〜R3 がすべて前提 |
| R5 | acceptance 3 項目の**本番環境での**再確認 | ❌ 未実施 | R4 が前提 |

### 1.1 構造的前提の更新: Auth.js 結線は 2026-07-26 に完了

初回 release 判定時は Auth.js が未導入で route は 501 を返していた。
`HarnessHub-b7ng` で `@auth/core`・session claims bridge・テナント別 route・本番 DB ports は結線済み。
ただし R1〜R5 の本番資格情報投入・デプロイ・スモークは未実施のままであり、
「コード上の本番 composition 完了」と「本番環境へデプロイ済み」は区別する。

---

## 2. 実施した作業 (ローカル core と検証として完了しているもの)

| # | 項目 | 結果 |
| --- | --- | --- |
| A1 | 認証・認可 core (`lib/auth` / `lib/authz` / middleware / Device Flow API 6 経路) | ✅ 完了 (2026-07-26 に本番 composition root も結線) |
| A2 | テスト実行 (test-design.md の全 75 テスト ID) | ✅ 全件 pass / fail 0 件 (P06) |
| A3 | acceptance 3 項目の判定 | ✅ **3 件すべて pass** (2026-07-28 確定。AC-3 の条件は `HarnessHub-b7ng` / `HarnessHub-1f28` closed で解消) |
| A4 | 品質ゲート 6 件の実行 | ✅ 全件 pass。かつ **6 件すべて CI で fail-closed に結線済み** (P09 §4) |
| A5 | quality_constraints 7 件の充足判定 | ✅ **7 件すべて充足**。本番実ログイン確認は免除せず、P13 の独立した完了条件として維持 |
| A6 | 証跡の集約 | ✅ 完了 (P11) |
| A7 | 運用手順の確定 (5 手順) | ✅ 完了 (P12) |
| A8 | Dev tenant / 新規テナントの OIDC 登録手順の文書化 | ✅ 完了 (P08 §3 / P12 §3-4) |

---

## 3. デプロイ手順 (実施時に踏むべき順序)

R1〜R5 を実施できる条件が揃った時点で、次の順序で行う。
**この節は計画であり、実施記録ではない。**
各値の生成・Cloudflare入力・本番DB登録は
[production-auth-manual-setup.md](./production-auth-manual-setup.md)を正本手順として使う。

### Step 1: 前提条件の確認

- [x] `feat-domain-model-db` の P13 が完了し、control-plane DB が確立している (bd `HarnessHub-u6q.13` closed)
- [x] Auth.js が導入され、`adapter/authjs-handler.ts` が実結線されている (`@auth/core` 0.41.3 / `HarnessHub-b7ng` closed)
- [ ] 本番 Cloudflare Workers 環境の資格情報が利用可能である
- [ ] 本 feature の変更が commit / merge されている

### Step 2: 本番テナントの OIDC provider 登録 (R1)

P12 runbook-oidc-provider-onboarding.md §1 の手順に従う。テナントごとに繰り返す。
`client_secret` は `idp_connections.client_secret_enc` へ envelope encryption
(暗号鍵で包んで保存する方式) で格納し、リポジトリやログへ平文で置かない。
復号に使う KEK (鍵を暗号化するための鍵) は Workers Secret `ENCRYPTION_KEK` で管理する。

### Step 3: `apps/hub` のデプロイ (R2)

```bash
pnpm verify        # 全ゲート (pnpm / duplicates / auth / lint / typecheck / build / build:worker / test / tenant-isolation / secrets / drift / bundle)
# 2026-07-25 以降、auth 3 ゲートと tenant 分離の名指しゲートは verify に含まれる (§5 参照)。
# 個別に確かめたいときのみ: pnpm check:auth / pnpm check:tenant-isolation
# デプロイは既存の Cloudflare Workers (OpenNext) 手順に従う
```

### Step 4: Dev tenant の登録確認 (R3)

P12 runbook-oidc-provider-onboarding.md §2 の手順に従う。

### Step 5: スモークテスト (R4)

| # | 項目 | 期待 |
| --- | --- | --- |
| S1 | 2 テナントそれぞれでログイン | 両方成功。互いの資源が見えない |
| S2 | role 4 種の認可判定サンプル | backend-spec §3.3 のマトリクスどおり |
| S3 | Device Flow E2E | code 発行 → approve → token 交換 → API 呼び出し成功 → 失効 |
| S4 | session 緊急失効 | `session_revocations` へ記録後、60 秒以内に 401 |
| S5 | dev 専用 provider 非存在の本番ビルド確認 | `node apps/hub/scripts/check-dev-auth-provider-absence.mjs` が exit 0 |

### Step 6: acceptance 3 項目の本番再確認 (R5)

| 項目 | 本番での確認方法 |
| --- | --- |
| AC-1 テナント越境 0 件 | S1 + 監査ログに `provider.cross_tenant_access` の `allowed: true` が provider-admin 以外で 0 件 |
| AC-2 Device Flow E2E | S3 |
| AC-3 Auth.js adapter 境界隔離 | `node apps/hub/scripts/check-auth-adapter-boundary.mjs` が exit 0 (デプロイ対象コミット上で) |

---

## 4. ロールバック手順 (実施時の備え)

1. **Cloudflare Workers を直前のデプロイへ戻す。** 本 feature は DB スキーマを変更しないため、
   Workers を戻すだけで状態は整合する (migration の巻き戻しは不要)。
2. `idp_connections` へ追加した行は `enabled = false` にする (削除しない。監査追跡のため)。
3. ロールバック後、S1〜S5 を再実行して以前の状態が回復していることを確認する。

**注意**: session 緊急失効 (`session_revocations` への書き込み) は**ロールバックしない**。
失効は「取り消してはいけない操作」であり、戻すと失効させたはずの session が復活する。

---

## 5. リリース判定に影響する既知の未達事項

P10 / P11 から引き継いだもの。**リリース前に解消することが望ましいが、本 feature の write scope 外である。**

| 項目 | 影響 | 引き継ぎ |
| --- | --- | --- |
| ~~`check-auth-gates.mjs` が CI へ未結線~~ | ✅ **解消 (2026-07-25)** | bd `HarnessHub-1f28` closed。`ci.yml` G12 + root `pnpm check:auth` |
| ~~分離テストが CI 必須ゲートとして名指しされていない~~ | ✅ **解消 (2026-07-25)** | bd `HarnessHub-1f28` closed。`scripts/ci/check-tenant-isolation-gate.mjs` + `test:tenant-isolation` |
| ~~`validate-system-plan.py` が `status=fail` (27 件)~~ | ✅ **解消**。2026-07-28 再実行で `status=pass` / violations **0 件** | bd `HarnessHub-mvdc` closed |
| ~~Auth.js 未導入 / 本番 AuthPorts adapter 未結線~~ | ✅ **解消 (2026-07-26)**。`@auth/core`・route・session bridge・DB ports を結線 | bd `HarnessHub-b7ng` / 仕様反映受領書 |
| `test-design.md` の `T-SESS-05` 文言が実装と不一致 | 文書の齟齬のみ (実装は安全側で正しい) | P04 改訂時 |
| ~~実装が確定仕様を 2 点超えている (session claims の `workspace_ids` / polling 上限 60 秒・減衰)~~ | 解消済み。R4-reopen とユーザー確認 `appr-010` を経て `qa-072` / `qa-073` として仕様へ反映 | bd `HarnessHub-l2g9` (closed) |

---

## 6. 2026-07-28 本番 read-only 事前確認

本番状態を変更せず、デプロイ可否の前提だけを確認した。

| 確認 | 実測結果 | 判定 |
| --- | --- | --- |
| `GET /health` | HTTP 200。既存 runtime / DB / R2 は `ok` | ✅ 既存リリースは稼働 |
| `GET /api/auth/nonexistent/session` | HTTP 500、応答本文なし | ❌ 現行本番の auth route は利用不能 |
| `wrangler secret list` | `AUTH_SECRET` / `CRON_HEARTBEAT_URL` / `TURSO_AUTH_TOKEN` / `TURSO_DATABASE_URL` のみ | ❌ 新 runtime の必須 Secret が不足 |
| `wrangler.jsonc` の vars | `HUB_ENV` / `ENVIRONMENT` のみ | ❌ 新 runtime の必須 auth vars が不足 |

新 runtime が要求する未投入項目:

- Secret: `AUTH_SESSION_SECRET` / `AUTH_ACCESS_TOKEN_SECRET` / `ENCRYPTION_KEK`
- Variable: `AUTH_ALLOWED_ORIGINS` / `AUTH_DEVICE_VERIFICATION_URI` / `AUTH_CANONICAL_ORIGIN`
- Data/credential: 2 テナント分の OIDC issuer / client ID / client secret と、本番 `idp_connections` 行

`/health` は既存の基盤依存を確認できるが、上記 auth 設定の完全性までは検査しない。
この状態でデプロイしても P13 のスモーク条件を満たせないため、**本番変更は行わなかった**。

手動投入手順の作成時に確認した運用 UI の不足は、ローカルで解消した。

- `AUTH_DEVICE_VERIFICATION_URI` の想定先である `/device` ページを実装
  (follow-up: bd `HarnessHub-k3n6` closed)
- 対象 28 ケース、型検査、lint、Next.js build、ローカル HTTP 200 を確認
- 本番には未デプロイのため、実環境の Device Flow は未確認

サインイン画面の form action は handler 契約
`/api/auth/<tenant_slug>/signin/tenant-oidc`へ修正し、回帰テストを追加済みである。

入力手順、確認方法、ロールバック、および上記ブロッカーの詳細は
[`production-auth-manual-setup.md`](./production-auth-manual-setup.md) を正本とする。

---

## 7. 本記録の判定

| 判定項目 | 結果 |
| --- | --- |
| 本番デプロイを実施したか | ❌ 未実施 (§1) |
| ローカル core・テスト・品質保証・運用手順が完了しているか | ✅ 完了 (§2) |
| Auth.js・本番 DB adapter のコード結線が完了しているか | ✅ 完了 (`HarnessHub-b7ng` closed / `@auth/core` 0.41.3) |
| control-plane DB の本番前提が揃っているか | ✅ `HarnessHub-u6q.13` closed |
| 本番 auth 設定・OIDC 資格情報が揃っているか | ❌ 未充足 (§6) |
| ローカルの本番ログイン導線が成立しているか | ✅ URL契約を修正し回帰テスト済み (§6) |
| Device 承認の画面導線が成立しているか | ⚠️ ローカル実装・検証済み。本番デプロイと実フロー確認は未実施 (§6) |
| 未実施事項を実施済みと混同せず記録したか | ✅ §1 に理由つきで列挙 |
| 文書や計画で実装・証跡の欠落を代替していないか | ✅ 代替していない。§3 は計画であることを明記 |

**本 feature は「本番リリース済み」ではない。** ローカル core・テスト・品質保証・運用手順・
Auth.js の本番 composition、サインイン先 URL の修正、`/device` のローカル実装は完了している。
一方、本番 IdP / Cloudflare の認証設定・資格情報投入、commit/push/PR、デプロイ、
そして R1〜R5 の本番実施が必要である。
**P13 はこれらが揃うまで open のままとする。文書での代替はしない。**
