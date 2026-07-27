---
status: confirmed
layer: feature-design
task: SYS-AUTH-TENANCY-P06
parent_feature: feat-auth-tenancy
feature_package_id: feature-package/feat-auth-tenancy
feature_context_digest: sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5
---

# feat-auth-tenancy P06 テスト実行結果

- graph_node_id: `sys-auth-tenancy-p06`
- feature_context_digest: `sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5`
- 対象: `docs/features/feat-auth-tenancy/test-design.md` に定義された全 75 テスト ID
- 判定: **全件 pass / fail 残存 0 件**

---

## 1. 実行環境と再実行コマンド

| 項目 | 値 |
| --- | --- |
| Node.js | v22.21.1 |
| vitest | 3.2.7 (darwin-arm64) |
| 実行時点の HEAD | `47052fb` (作業ツリーに未コミット変更 19 件) |
| 実行ディレクトリ | `apps/hub` (worktree `task-20260725-054847-wt-3`) |

```bash
# 実行系テスト (T-AUTHZ / T-DEV / T-DEV-E2E / T-ISO / T-OIDC / T-SESS / T-TOKC)
cd apps/hub && pnpm exec vitest run tests/auth-tenancy

# 静的検査 (T-BND-01〜04)
node apps/hub/scripts/check-auth-gates.mjs

# hub 全体 (回帰確認)
pnpm --filter @harness-hub/hub test
```

---

## 2. 実行系テストの結果

`pnpm exec vitest run tests/auth-tenancy` — **Test Files 7 passed (7) / Tests 127 passed (127)**

| ファイル | 担当テスト ID | vitest ケース数 | 結果 |
| --- | --- | --- | --- |
| `tests/auth-tenancy/authz-matrix.test.ts` | `T-AUTHZ-01`〜`T-AUTHZ-13` | 22 | pass |
| `tests/auth-tenancy/device-flow.test.ts` | `T-DEV-01`〜`T-DEV-14` | 29 | pass |
| `tests/auth-tenancy/device-flow-e2e.test.ts` | `T-DEV-E2E-01` | 1 | pass |
| `tests/auth-tenancy/oidc-verification.test.ts` | `T-OIDC-01`〜`T-OIDC-18` | 26 | pass |
| `tests/auth-tenancy/session-revocation.test.ts` | `T-SESS-01`〜`T-SESS-14` | 23 | pass |
| `tests/auth-tenancy/tenant-isolation.test.ts` | `T-ISO-01`〜`T-ISO-07` | 12 | pass |
| `tests/auth-tenancy/token-contract.test.ts` | `T-TOKC-01`〜`T-TOKC-04` | 14 | pass |

> ケース数がテスト ID 数を上回るのは、1 つの ID を複数の `it()` に分けている箇所があるため
> (例: `T-AUTHZ-*` は 13 ID を 22 ケースへ展開し、中心の表引き 2 ケースで 42 action × 4 role を照合)。
> ID → ケースの対応はテストファイル内の `T-` プレフィックス付きテスト名で追跡できる。

### server-side Device Flow と downstream token contract の分離

Normative evidence 要求どおり、2 者は別 ID として実行している。

- **server-side Device Flow** (`T-DEV-01`〜`T-DEV-14`, `T-DEV-E2E-01`): Hub 側の code 発行・approve・token 交換・rotation・失効。本 package が所有。
- **downstream token contract** (`T-TOKC-01`〜`T-TOKC-04`): Hub が公開する token response / revocation の契約。consumer (Publisher/CLI) が依拠する面。
- **OS 資格情報域 (macOS Keychain / Windows Credential Manager) の保存テストは本 package では実行していない。** owner は `feat-publisher-plugin` であり、本 package はその E2E 証跡を相互参照する立場にある (実装したと主張しない)。

---

## 3. 静的検査 (T-BND) の結果

`node apps/hub/scripts/check-auth-gates.mjs` — **3 ゲート全て pass (exit 0)**

| テスト ID | 実行主体 | 出力 | 結果 |
| --- | --- | --- | --- |
| `T-BND-01` | `apps/hub/scripts/check-auth-adapter-boundary.mjs` | 走査 92 ファイル / 違反 0 件 | pass |
| `T-BND-02` | 同上 (公開入口からの再輸出到達性解析) | 同上 | pass |
| `T-BND-03` | `apps/hub/scripts/check-dev-auth-provider-absence.mjs` | 走査 97 ファイル / 禁止語 15 種 / 検出 0 件 | pass |
| `T-BND-04` | 同上 (パスワード語群 = auth 実装 path 限定) | 同上 | pass |
| (SEC2 補強) | `apps/hub/scripts/check-single-authz-middleware.mjs` | 走査 97 ファイル / 違反 0 件 / allowlist 3 件 / route 例外 5 件一致 | pass |

### 検査が「本当に落ちる」ことの確認

緑の検査は、**落ちることを確かめないと緑の意味がない**。`T-BND-02` については意図的な違反を投入して赤化を確認した。

```
# 1. 現状               → OK: 走査 92 ファイル / 違反 0 件 (exit 0)
# 2. adapter/index.ts が __probe.ts を再輸出し、__probe.ts が next-auth を再輸出
#                        → NG: [authjs-type-reexport] ... 'next-auth' を通しており... (exit 1)
#                          検出経路: adapter/index.ts -> adapter/__probe.ts
# 3. 投入物を撤去して復元 → OK: 走査 92 ファイル / 違反 0 件 (exit 0)
```

投入物 (`__probe.ts`) はスクラッチパッドへ退避済みで、作業ツリーには残っていない
(`apps/hub/src/lib/auth/adapter/` は `authjs-config.ts` / `callbacks.ts` / `index.ts` / `session-provider.ts` の 4 枚)。

---

## 4. 回帰確認 (hub 全体)

`pnpm verify` 内の build 後回帰 — **Test Files 23 passed (23) / Tests 261 passed (261)**

本 feature の追加によって既存の shared-layers / health / security / worker / a11y のテストが壊れていないことを確認した。
Worker bundle を先に生成したため、bundle 実測テストを含めて skip 0 件で完走した。

---

## 5. 設計 (P04) と実装 (P05) の逸脱記録

test-design.md の文言と実装挙動が一致しない箇所を、**実装側に寄せた判断とその理由**として記録する。
いずれも実装を正とし、test-design.md 側の該当行は次回改訂時に追随させる (本 task の write scope 外)。

### 逸脱 1: `T-DEV-06` — 試行回数を数える範囲

- **設計の文言**: 「`user_code` 照合失敗 5 回 → `denied` へ遷移」
- **実装の挙動**: 存在しない `user_code` は**数えない**。認可レコードが特定できた後の失敗 (承認済み code の再利用など) のみを数える。
- **理由**: 存在しない code をどの認可に帰属させるかが決まらない。全 pending へ加算すると、攻撃者が適当な文字列を 5 回投げるだけで**他人の認可を潰せる DoS** になる。総当たり自体は security-spec §7.2 の rate limit (5 回/分) が担い、これは本 feature の所有物ではない。
- **該当実装**: `apps/hub/src/lib/auth/device-flow/service.ts` の `approve()` (`record === null` で即 `not_found` を返す分岐)

### 逸脱 2: `T-SESS-05` — 失効時刻ちょうどの扱い

- **設計の文言**: 「`iat >= revoked_at` の JWT → 通過」(= `iat == revoked_at` は通過)
- **実装の挙動**: `iat <= revoked_at` を失効とみなす (= `iat == revoked_at` は**失効**)
- **理由**: `revoked_at` も `iat` も秒精度なので、**失効操作と同じ秒に発行された session** が現実に存在しうる。この境界を「通過」に倒すと、緊急失効を打った直後 1 秒間に発行された session だけが生き残る。可用性より安全側を採った。
- **該当実装**: `apps/hub/src/lib/authz/revocation.ts` の `isBefore()`

### 逸脱 3: `T-TOKC-03` — 失効済み token の HTTP status

- **設計の文言**: 「失効済み token での API 呼び出し → 401」
- **実装の変更**: `denyStatusFor('revoked_session')` を 403 から **401** へ変更した (設計に合わせる方向の修正)
- **理由**: 403 を返すと client は「権限不足」と解釈して再認証せずに諦める。失効は「資格情報が切れた」側であり、RFC 6750 §3.1 の `invalid_token` も 401 を規定している。
- **該当実装**: `apps/hub/src/lib/authz/with-authz.ts` の `denyStatusFor()`

### 逸脱 4: `T-DEV-E2E-01` — 失効後の判定順序

- **発見内容**: 失効済み refresh token を、device_code の TTL (10 分) を超えた時点で再提示すると、返るのは `invalid_grant` ではなく **`expired_token`** だった。
- **原因**: `exchangeToken()` の判定順序が **TTL → denied → consumed → slow_down → pending → approved** であり、TTL 判定が単回使用判定より手前にある。
- **判断**: **実装を正とした**。TTL 切れの code に対して「使用済みかどうか」を答えると、期限切れ code の状態が外から観測できてしまう。期限で一律に切るほうが情報の漏れが少ない。E2E の期待値を `expired_token` へ修正し、コメントで到達不能な分岐であることを明記した。
- **意義**: この 1 件は**単体テスト 7 ファイルすべてが個別に pass していても検出できなかった**。各段が正しくても、段の**順序**は E2E でしか露出しない。

### 逸脱 5: `T-DEV-E2E-01` — 失効時の監査イベント列

- **発見内容**: 「token 失効 → その token で refresh」の順で操作すると、監査に `token.revoke` に加えて **`token.reuse_detected`** が出る。
- **判断**: 実装を正とした。失効済み refresh token の提示は、実装から見て「利用者の手元に残っていた古い token」と「盗まれた token」を区別できない。区別できない以上、家族全失効 + 検知イベントを出す側に倒すのが正しい。
- **E2E の期待値**: `['device.approve', 'token.issue', 'token.revoke', 'token.reuse_detected']`
- **運用への影響**: 正当な利用者の操作でも `token.reuse_detected` が出うる。**アラート運用でこれを即インシデントと扱わない**旨は P12 runbook に記載する。

---

## 6. 既知の制約 (fail ではないが記録する)

1. **初回検証時は Auth.js 未結線だったが、2026-07-26 に解消済み** (`HarnessHub-b7ng`)。`@auth/core` は adapter 内へ隔離し、実 route・session claims bridge・本番 DB ports を統合テストで検証した。現行結果は [spec-reflection-receipt.md](./spec-reflection-receipt.md) を参照。
2. **初回検証時は CI 未結線だったが、2026-07-25 に解消済み**。`check-auth-gates.mjs` は root `verify` と CI G12 へ結線され、テナント分離テストも名指しゲートになった。
   → **解消済み (2026-07-25 / `issue-auth-tenancy-ci-wiring-20260725`)**: `ci.yml` の G12 と root `pnpm check:auth` へ結線。あわせて `tenant-isolation.test.ts` を `scripts/ci/check-tenant-isolation-gate.mjs` + `test:tenant-isolation` で名指しゲート化した。

---

## 7. 判定

| 判定項目 | 結果 |
| --- | --- |
| test-design.md の全 75 テスト ID に実行主体が割り当てられているか | ✅ 割当済み (実行系 71 + 静的検査 4) |
| 全テスト ID が pass しているか | ✅ pass (fail 0 件) |
| P05 への差し戻しが必要か | ❌ 不要 |

→ **P07 (受入) へ引き継ぎ可能**。
