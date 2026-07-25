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
| R1 | 本番 `idp_connections` への OIDC provider 設定登録 | ❌ 未実施 | control-plane DB が未確立。前提となる `feat-domain-model-db` の P13 が完了していない |
| R2 | `apps/hub` の本番 Cloudflare Workers 環境へのデプロイ | ❌ 未実施 | 本番資格情報を保持していない。また現行の作業指示で commit / push が禁止されており、デプロイ対象のコミットが存在しない |
| R3 | Dev tenant の Google Workspace OIDC provider 登録確認 | ❌ 未実施 | dev 環境の control-plane DB が未確立 (手順は P12 runbook-oidc-provider-onboarding.md §2 に確定済み) |
| R4 | 本番スモークテスト (2 テナントログイン / role 4 種 / Device Flow E2E / 緊急失効 / dev provider 非存在の本番ビルド確認) | ❌ 未実施 | R1〜R3 がすべて前提 |
| R5 | acceptance 3 項目の**本番環境での**再確認 | ❌ 未実施 | R4 が前提 |

### 1.1 追加の構造的前提: `next-auth` が未導入

R1〜R5 の前提として、そもそも `next-auth` (または Better Auth) が導入されていない。
`apps/hub/src/app/api/auth/[...nextauth]/route.ts` は 501 `auth_provider_not_wired` を返す。

**したがって、仮に control-plane DB と本番資格情報が揃っていても、
現時点で `/{tenant_slug}/signin` からの実ログインは通らない。**

これは D3 caveat (Better Auth への乗り換え余地を残す) に沿った意図的な状態であり、
依存導入は別途の意思決定として扱う (P10 QC-1 / QC-4)。

---

## 2. 実施した作業 (ローカル core と検証として完了しているもの)

| # | 項目 | 結果 |
| --- | --- | --- |
| A1 | 認証・認可 core (`lib/auth` / `lib/authz` / middleware / Device Flow API 6 経路) | ✅ 完了 (本番 composition root は未結線) |
| A2 | テスト実行 (test-design.md の全 75 テスト ID) | ✅ 全件 pass / fail 0 件 (P06) |
| A3 | acceptance 3 項目の判定 | ⚠️ 2 件 pass / 1 件条件付き (Auth.js 実依存は未導入) |
| A4 | 品質ゲート 6 件の実行 | ✅ 全件 pass (P09) |
| A5 | quality_constraints 7 件の充足判定 | ⚠️ 充足 3 / 条件付き充足 4。P10 は再レビュー待ち |
| A6 | 証跡の集約 | ✅ 完了 (P11) |
| A7 | 運用手順の確定 (5 手順) | ✅ 完了 (P12) |
| A8 | Dev tenant / 新規テナントの OIDC 登録手順の文書化 | ✅ 完了 (P08 §3 / P12 §3-4) |

---

## 3. デプロイ手順 (実施時に踏むべき順序)

R1〜R5 を実施できる条件が揃った時点で、次の順序で行う。
**この節は計画であり、実施記録ではない。**

### Step 1: 前提条件の確認

- [ ] `feat-domain-model-db` の P13 が完了し、control-plane DB が確立している
- [ ] `next-auth` (または Better Auth) が導入され、`adapter/authjs-config.ts` が実結線されている
- [ ] 本番 Cloudflare Workers 環境の資格情報が利用可能である
- [ ] 本 feature の変更が commit / merge されている

### Step 2: 本番テナントの OIDC provider 登録 (R1)

P12 runbook-oidc-provider-onboarding.md §1 の手順に従う。テナントごとに繰り返す。
`client_secret` は Workers Secret へ格納し、リポジトリへ平文で置かない。

### Step 3: `apps/hub` のデプロイ (R2)

```bash
pnpm verify        # 全ゲート (lint / typecheck / build / build:worker / test / secrets / drift / bundle)
node apps/hub/scripts/check-auth-gates.mjs   # ⚠️ verify に含まれていない (§5 参照)
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
| `check-auth-gates.mjs` が CI へ未結線 | 境界検査・単一集約検査・dev provider 検査が**自動では走らない**。人間が忘れれば検査は動かない | bd `HarnessHub-1f28` (`apps/hub/package.json` へ 1 行追加 + root `verify` から呼ぶ) |
| 分離テストが CI 必須ゲートとして名指しされていない | hub テストスイート内では実行されるが、将来テストが分割・スキップされたとき静かに外れうる | bd `HarnessHub-1f28` (同課題に統合) |
| `validate-system-plan.py` が `status=fail` (27 件) | plan package の task-spec 側の記述欠落。実装成果物の欠陥ではない (P11 §9) | bd `HarnessHub-mvdc` |
| `next-auth` 未導入 | 実ログインが通らない | 別途の意思決定 |
| 本番 AuthPorts adapter 未結線 | Device/Token API の composition root が例外になる | bd `HarnessHub-b7ng` |
| `test-design.md` の `T-SESS-05` 文言が実装と不一致 | 文書の齟齬のみ (実装は安全側で正しい) | P04 改訂時 |
| 実装が確定仕様を 2 点超えている (session claims の `workspace_ids` / polling 上限 60 秒・減衰) | 仕様書だけを読んだ Publisher CLI 実装者が誤った client を書きうる。実装は安全側で正しい | bd `HarnessHub-l2g9` (qa-036 / qa-041 の R4-reopen) |

---

## 6. 本記録の判定

| 判定項目 | 結果 |
| --- | --- |
| 本番デプロイを実施したか | ❌ 未実施 (§1) |
| ローカル core・テスト・品質保証・運用手順が完了しているか | ✅ 完了 (§2) |
| Auth.js・本番 DB adapter を含むリリース準備が完了しているか | ❌ `HarnessHub-b7ng` が未完了 |
| 未実施事項を実施済みと混同せず記録したか | ✅ §1 に理由つきで列挙 |
| 文書や計画で実装・証跡の欠落を代替していないか | ✅ 代替していない。§3 は計画であることを明記 |

**本 feature は「本番リリース済み」でも「デプロイするだけの状態」でもない。**
ローカル core と検証は完了しているが、Auth.js・本番 AuthPorts/DB adapter の実結線、
依存 feature、資格情報、commit/push/PR、本番 smoke が残っている。
