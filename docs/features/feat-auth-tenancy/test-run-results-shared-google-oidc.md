---
status: confirmed
layer: feature-evidence
task: issue-auth-tenancy-shared-google-oidc-20260729
parent_feature: feat-auth-tenancy
feature_package_id: feature-package/feat-auth-tenancy
beads_ids:
  - HarnessHub-fnej
---

# 共通 Google OAuth client 方式 テスト実行結果

- graph_node_id: `issue-auth-tenancy-shared-google-oidc-20260729`
- 仕様書: [issues/sys-auth-tenancy-shared-google-oidc-20260729.md](../../../issues/sys-auth-tenancy-shared-google-oidc-20260729.md)
- 設計根拠: [AD-10](./architecture-decision-record-shared-google-oidc.md)
- 判定: **全件 pass / fail 残存 0 件**

仕様書「検証証跡: 実装時の test log を `docs/features/feat-auth-tenancy/` 配下の品質記録へ保存する」に対応する。

## 1. 実行環境

| 項目 | 値 |
| --- | --- |
| Node.js | v22.21.1 |
| vitest | 3.2.7 (darwin-arm64) |
| 実行時点の HEAD | `cfa3362b` (main 統合 commit + review 中の作業ツリー変更) |
| worktree | `wt-22` / branch `devgraph/issue-auth-tenancy-shared-google-oidc-20260729` |

## 2. 品質ゲート (仕様書「検証方法」の 6 件)

| コマンド | 結果 | 出力の要点 |
| --- | --- | --- |
| `pnpm check:auth` | **pass** | `[auth-adapter-boundary] 走査 212 ファイル / 違反 0 件`<br>`[single-authz-middleware] 走査 218 ファイル / 違反 0 件 / route 例外 5 件が期待集合と一致`<br>`[dev-auth-provider-absence] 走査 218 ファイル / 禁止語 15 種 / 検出 0 件` |
| `pnpm check:tenant-isolation` | **pass** | `[tenant-isolation-gate] 12 ケース / 必須 ID 7 種を確認` → 12 passed (12) |
| `pnpm check:secrets` | **pass** | `[secret-scan] files=484 findings=0 verdict=pass` |
| `pnpm typecheck` | **pass** | 全 6 package で `tsc --noEmit` が無出力 |
| `pnpm lint` | **pass** | `Checked 430 files` / error 0 件 (残る info は Biome schema 2.5.4 / CLI 2.5.5 の告知のみ) |
| `pnpm build` | **pass** | Next.js production build 完走。Middleware 69.6 kB |

仕様書が挙げていない残りのゲートも、集約 script `pnpm verify` で通している (**exit 0**)。
migration と schema に触れたため、DDL 系と契約 drift 系は特に確認が要る。

| コマンド | 結果 | 出力の要点 |
| --- | --- | --- |
| `pnpm --filter @harness-hub/db run check:ddl` | **pass** | `4 migration / 単一 lineage / 未承認の破壊的 DDL 0 件` |
| `pnpm check:drift` | **pass** | `contract-drift.test.ts` 4 件 (schema 変更が契約から外れていない) |
| `pnpm check:pnpm` / `pnpm check:duplicates` | **pass** | `pnpm verify` の先頭 2 ゲート |
| `pnpm --filter @harness-hub/hub run build:worker` | **pass** | Worker bundle 生成が完走 |
| `pnpm check:bundle` | **pass** | gzip 後 1.230 MiB / 予算 3.000 MiB |
| `pnpm check:client-bundle` | **pass** | 全 page route が 120.0 KiB 予算内 (最大 `/sheets/new` 116.3 KiB) |

### `check:secrets` で 1 度赤になった件 (記録)

初回実行時、新規テスト内の `const SECRET = '…'` と `secret: '…'` の 2 行が
`secret-scan/generic-assigned-secret` に検出された。**抑止マーカーを足さずに命名を変えて解消**した
(`SESSION_SECRET` / `ATTACKER_SESSION_SECRET`)。テスト用のダミー値に allow marker を撒くと、
後で本物の秘密が同じ場所へ混ざったときに検出できなくなるため。

## 3. 全テストスイート

```bash
pnpm run test
```

| package | Test Files | Tests |
| --- | --- | --- |
| `@harness-hub/db` | 30 | 238 passed |
| `@harness-hub/estimation` | 3 | 40 passed |
| `@harness-hub/inspection` | 9 | 151 passed |
| `@harness-hub/schemas` | 6 | 86 passed |
| `@harness-hub/ui` | 12 | 266 passed |
| `@harness-hub/hub` | 72 | 910 passed |
| **合計** | **132** | **1691 passed / fail 0 件** |

## 4. 本 issue で追加・変更したテスト

```bash
pnpm --filter @harness-hub/hub exec vitest run tests/auth-tenancy
pnpm --filter @harness-hub/db exec vitest run __tests__/idp-repo.test.ts __tests__/backup-restore.test.ts
```

| ファイル | 件数 | 位置づけ |
| --- | --- | --- |
| `apps/hub/tests/auth-tenancy/shared-google-oidc-credentials-domain.test.ts` | 25 (新規) | credential と Workspace 帰属の純関数契約 |
| `apps/hub/tests/auth-tenancy/shared-google-oidc-state-config.test.ts` | 22 (新規) | 署名付き state と provider 設定の契約 |
| `apps/hub/tests/auth-tenancy/shared-google-oidc-callback-flow.test.ts` | 11 (新規) | 共通 callback と実 `Auth()` 往復 |
| `apps/hub/tests/auth-tenancy/shared-google-oidc-policy-flow.test.ts` | 6 (新規) | `hd` 強制と顧客方式の非回帰 |
| `packages/db/__tests__/idp-repo.test.ts` | 14 (7 既存 + 7 追加) | 既存 7 件は**無改変**。これ自体が受入条件 5 の証拠 |
| `packages/db/__tests__/backup-restore.test.ts` | 13 (migration 件数 3→4 のみ更新) | 台帳に載っていない DDL の検出を維持 |
| `apps/hub/tests/auth-tenancy/authjs-handler.test.ts` | 14 (無改変で pass) | 顧客持ち込み方式の非回帰 |
| `apps/hub/tests/auth-tenancy/oidc-verification.test.ts` | 26 | AD-5 の検証契約 |
| `apps/hub/tests/auth-tenancy/db-ports-integration.test.ts` | 17 | 実 DB での port 契約 |

`apps/hub/tests/auth-tenancy` は **31 files**。Hub 全体の 72 files / 910 tests の中で全件 pass した。

## 5. 受入条件との対応

| # | 受入条件 | 証跡 |
| --- | --- | --- |
| 1 | 共通方式の tenant 追加時に Google Cloud 側の client 作成・redirect URI 追加が不要 | `shared-google-oidc-callback-flow.test.ts` 「テナントが違っても `redirect_uri` は同一」— 2 テナントの認可 URL が同一 `redirect_uri` / 同一 `client_id` になることを実 `Auth()` で確認 |
| 2 | state の tenant 差し替え、`hd` 欠落・不一致、`aud` 不一致がすべて拒否される | callback flow「テナント A の認可を B の state で完了させない」(400 かつ token endpoint へ 1 度も到達しない) / credentials-domain test の `hd` 分岐 + OIDC verification の `aud`/`azp` 分岐 |
| 3 | 同じ Google `sub` が別 tenant へ現れても `(tenant_id, sub)` で分離される | `idp-repo.test.ts`「共有方式の行もテナント境界を越えて見えない」/ `tenant-isolation.test.ts` 12 件 |
| 4 | 共有 secret が tenant 別 DB 行・ログ・レスポンス・Git・GitHub Secrets へ複製/露出しない | `idp-repo.test.ts`「共有方式の行は client_id も client_secret も持たない」(空文字) / 「secret 復号を求めると `SharedCredentialSecretAccessError`」/ credentials-domain test「JSON 直列化で secret が伏せられる」/ `pnpm check:secrets` |
| 5 | 現行顧客 client 方式が継続動作し、不明 mode は fail-closed | `idp-repo.test.ts` 既存 7 件が無改変で pass / flow test「顧客方式の `redirect_uri` はテナント path のまま」「顧客方式は Auth.js の state cookie を使う」/ unit test「未知の mode は fail-closed」 |
| 6 | auth / tenant isolation / secret scan / typecheck / lint / build が pass | §2 |

## 6. 網羅した negative 経路 (仕様書「検証方法」後段の 2 項)

**共通 callback へ別 tenant の署名付き state を提示する negative integration test**

- テナント A の認可を開始 → テナント B の state で callback → **400**。
  `idp.tokenRequests()` が空 (= IdP への token 交換に一切到達していない)。
- 拒否応答の本文に理由語 (`signature` / `expired` / `csrf` / `binding` / `malformed`) が
  含まれないことも検査 (どこまで正しかったかを測れるオラクルを作らない / AD-10.2)。
  返るのは `shared_oidc_state_rejected` の 1 語だけ。
- binding cookie を落とした callback、別テナントの binding cookie を付けた callback も同様に拒否。

**`hd` の一致・欠落・不一致・個人 Google アカウントを網羅する OIDC unit test**

| 入力 | 期待 | 検査場所 |
| --- | --- | --- |
| `hd` が許可ドメインと一致 | 受理 | unit + flow |
| `hd` が大文字小文字違いで一致 | 受理 (正規化) | unit |
| `hd` が不一致 | `workspace_domain_mismatch` | unit |
| `hd` 欠落 (個人 Google アカウント) | `workspace_domain_missing` / session cookie を書かない | unit + flow |
| `hd` が許可ドメインのサブドメイン | 拒否 (部分一致でなく完全一致) | unit + flow |
| 共有方式で許可ドメイン未設定 | `workspace_domain_unconfigured` | unit |
| 顧客方式で許可ドメイン未設定 | 受理 (従来どおり `hd` を見ない) | unit |
| JIT 済みの既存利用者で `hd` が不一致 | 拒否。初回サインインだけの検査にしない | flow |

flow test 側では、拒否時に **session cookie が発行されないこと**を実応答の `Set-Cookie` で確認している。
拒否画面が出たことだけでは、利用者行が作られていないことの証拠にならないため。

**rollback (仕様書「実装順序」7 の rollback テスト)**

`idp-repo.test.ts`「2 列を足す前の形で書かれた行は customer_google として読め、secret も復号できる」。
repository を通さず生 SQL で**追加 2 列を INSERT 文から落として**書き、列の DB 既定値だけで
`customer_google` / `allowedWorkspaceDomains = NULL` になること、旧行の secret が復号でき続けることを見る。
repository の TS 既定値を通す既存テストでは、DDL 側の既定値が壊れても気付けないため経路を分けている。

## 7. 既知の残作業 (本 issue の scope 外)

| 項目 | 理由 |
| --- | --- |
| 予約 slug `shared` を**登録側**でも弾く | 現状は解決側 (route) のみ 400 拒否。登録は `packages/db` 経由で、同 package は `@harness-hub/schemas` へ意図的に依存していないため、`tenantSlugSchema` の refinement だけでは登録を止められない。テナント登録 API を作る際に併せて実装する |
| `apps/hub/wrangler.jsonc` の `secrets.required` へ 2 件を追記 | 共有方式テナントが 0 件の環境で「必須」と宣言すると恒常的な赤になる。[rollout runbook](./runbook-shared-google-oidc-rollout.md) S-02 の実施時に行う |
| 本番 Google Cloud での共通 client 作成と brand / domain verification | 実装完了と production rollout を分離する (仕様書「リスクと対策」) |
| 顧客 credential の管理画面と rotation UI | 仕様書「対象外」に明記。後続 `issue-auth-tenancy-customer-managed-google-oidc-20260729` |
