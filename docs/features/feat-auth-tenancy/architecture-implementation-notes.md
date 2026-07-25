---
status: confirmed
layer: feature-design
task: SYS-AUTH-TENANCY-P02
parent_feature: feat-auth-tenancy
---

# feat-auth-tenancy ADR 実装追補

[architecture-decision-record.md](./architecture-decision-record.md) の AD-9 と、P05〜P09 の実測で
確定した実装詳細を収める。決定の背景と AD-1〜AD-8 は ADR 本体を正本とする。

## 9. AD-9: 数値契約は `lib/auth/config.ts` の 1 箇所を正本にする

session `maxAge` 8h / `updateAge` 15 分 / device code TTL 10 分 / user code 8 文字 /
試行 5 回 / polling 5 秒 (加算幅 5 秒・上限 60 秒 §10.7) / access token 15 分 / refresh 90 日 / 失効 cache 60 秒を、
`apps/hub/src/lib/auth/config.ts` の 1 オブジェクトへ集約する。

テストは定数を再利用するだけでなく、仕様の期待値をリテラルで持つ。定数とテストを同時に
誤変更しても、backend/security spec との突合テストが差を検出できる構造にする。

## 10. 実装で確定した追補

### 10.1 認可 exemption は期待集合と厳密一致させる

`apps/hub/scripts/check-single-authz-middleware.mjs` は
`scripts/ci/shared-layer-registry.json` の route exemption と期待する 5 経路を集合比較する。
増加も減少も fail とし、登録簿への追記だけで認可を迂回できないようにする。

### 10.2 session claims に `workspace_ids` を含める

edge scope gate が DB 往復なしで所属を判定できるよう、session claims に `workspace_ids` を加える。
access token は発行時の `workspace_id` 1 件だけへ束縛し、被害範囲を session より狭くする。

これは `docs/security-spec.md` §2.1 と `system-spec/auth.md` qa-036 が **6 claim を列挙して「最小集合」と確定した値に対する追加**である。正本は spec-state.json からの compile 成果物であり、確定の書き換えには R4-reopen が要る。bd `HarnessHub-l2g9` で追跡する。

### 10.3 認証前 3 経路は `tenant_slug` を要求する

`POST /api/v1/device/code` / `POST /api/v1/device/token` /
`POST /api/v1/token/refresh` は principal が無いため、要求本文の `tenant_slug` を
`resolveTenantOidcConfig()` で解決する。未知の slug を既定 tenant へ補完しない。

### 10.4 拒否理由から HTTP status への対応

| 拒否理由 | status | 意味 |
|---|---:|---|
| `unauthenticated` / `revoked_session` | 401 | 再認証が必要 |
| `unresolved_resource` | 400 | 要求資源を一意に解決できない |
| `tenant_mismatch` | 404 | 他 tenant の資源の存在を伏せる |
| その他の認可拒否 | 403 | 資格情報を変えずには通らない |

### 10.5 provider-admin 越境は必ず監査する

provider-admin の越境は仕様上許可されるが、`withAuthz()` が許可・拒否にかかわらず
`provider.cross_tenant_access` を**アクセス先 tenant の監査列**へ append し、actor tenant は metadata に残す。
これにより顧客 workspace-admin が自テナントへの越境を確認できる。AC-1 が保証するのは
「許可されていない越境が 0 件」であり、正当な管理越境まで 0 件にすることではない。

### 10.6 action 語彙と資格情報種別を 1 表に集約する

`apps/hub/src/lib/authz/rules.ts` は security-spec §3.4 の全 action を持つ。
role だけでなく `session` / `access_token` / `either` を明示し、token principal では
role と scope の両方を要求する。未知 action と用途外の資格情報は拒否する。

`/{tenant_slug}/signin` は認証前に到達できる必要があるため、edge allowlist は
1 path segment の slug にだけ一致する正規表現で公開する。配下や似た path は公開しない。

### 10.7 polling 間隔は上限つきの加算・減算で動かす

RFC 8628 §3.5 が定めているのは「`slow_down` を返したら `interval` を **5 秒増やす**」までで、
**上限も、規約どおり待った client への減衰も規定していない**。規約の文面どおりに増やすだけだと
間隔は単調増加し、device_code の TTL (10 分) を追い越す。そうなると client は
「次に叩いてよい時刻」に達する前に code が失効し、server の側から flow を詰ませることになる。

本 feature は加算と減算を対にする。

| 契機 | 動き | 到達点 |
|---|---|---|
| `interval` 未満の polling (`slow_down`) | +`devicePollBackoffSeconds` (5 秒) | 上限 `devicePollMaxIntervalSeconds` = **60 秒** |
| `interval` を守った polling (`authorization_pending`) | −`devicePollBackoffSeconds` (5 秒) | 下限 `devicePollIntervalSeconds` = **5 秒** |

- **増減幅を同じにする理由**: 幅が同じなら「速く叩いて罰を受け、次の 1 回だけ守って帳消しにする」
  交互 polling は差し引き 0 にしかならない。減衰幅を加算幅より大きくすると、この交互 polling が
  実質的に罰を免れる。初期値へ一気に戻す実装 (reset) も同じ理由で採らない。
- **上限 60 秒の根拠**: TTL 600 秒に対し最悪でも 10 回は叩ける。server が強制する待ち時間が
  TTL を越えないことを、値の選択そのもので担保する。
- **下限 5 秒の根拠**: 発行応答で client へ告げた `interval` そのもの。ここより下げると、
  告知値どおりに叩いている client を後から `slow_down` にできてしまう。
- **限界 (正直に書く)**: 上限が縛るのは **server が強制する**間隔だけである。client が自分側で
  持つ間隔は RFC どおり `slow_down` のたびに +5 秒され、そちらに上限は無い。client が減衰を
  知らずに増やし続けて TTL 内に叩かなくなる可能性は残るが、これは client 実装の責務であり
  server からは是正できない。

上限値は backend-spec / security-spec には無い**本 feature の決定**である。`config.ts` の
`devicePollMaxIntervalSeconds` にコメントで出所を明記し、`T-SESS-01` の期待値表にも
仕様書由来でない旨を書いた。実装は `apps/hub/src/lib/auth/device-flow/service.ts` の
`nextPollIntervalSeconds()` / `relaxedPollIntervalSeconds()`、検査は `T-DEV-04` と補 1〜3。

上限と減衰は Publisher CLI から観測できる契約なので、実装コメントのままにはしない。
qa-041 の R4-reopen で確定し直す申し送りを bd `HarnessHub-l2g9` に起票済み。

## 11. 未解決事項

| 事項 | 現状と引受先 |
|---|---|
| Auth.js 実結線 | `next-auth` 未導入。依存追加、JWT bridge、dynamic tenant route 結線が必要 |
| 本番 auth port adapter | DB は land 済みだが Device Flow/Workspace の永続化契約差を schema owner と解消する必要がある |
| 認証 gate の CI 結線 | 手動 pass。follow-up `HarnessHub-1f28` |
| 確定仕様を超えた 2 決定 (§10.2 `workspace_ids` / §10.7 polling 上限・減衰) | 正本は手編集不可。qa-036 / qa-041 の R4-reopen へ送る follow-up `HarnessHub-l2g9` |
| Workers rate limit | feat-hub-foundation の binding 結線が必要 |
| 本番 OIDC / deploy | P13。依存・資格情報・commit/push/PR が前提 |

## 12. 参照

- [requirements-baseline.md](./requirements-baseline.md)
- [backend-spec.md](../../backend-spec.md) §3.2 / §3.3 / §4.1
- [security-spec.md](../../security-spec.md) §2 / §3 / §7
- [harness-hub-security.md](../../../architecture/harness-hub-security.md)
- [harness-hub-backend.md](../../../architecture/harness-hub-backend.md)
- [shared-layers.md](../../shared-layers.md)
