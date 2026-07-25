# 概要

feat-auth-tenancy の実装が、確定済みの security 仕様を **2 点だけ超えている**。どちらも Publisher CLI から観測できる契約なので、実装側のコメントではなく仕様側の確定として記録し直す必要がある。

## 背景と問題

`docs/security-spec.md` は 2026-07-17 / 07-18 の往復ヒアリング (qa-036 / qa-041) でユーザー確認により確定した実装仕様正本で、本文末尾に **「本書の変更は `system-spec/spec-state.json` の確定セルに紐づく。内容変更には R4-reopen (根拠付き) が必要」** と明記されている。

実装 (P05) は、確定値では決まらない 2 箇所で判断を要した。判断そのものは根拠を持つが、**確定値の列挙に対する追加**であるため、実装側で決めきると「仕様書だけを読んだ Publisher CLI 実装者が正しい client を書けない」状態が残る。

## 現在の挙動

### D1. session JWT claims に `workspace_ids` が増えている

| 場所 | 記述 |
|---|---|
| `docs/security-spec.md` §2.1 の表 | `sub`(user_id) / `tenant_id` / `role` / `status` / `iat` / `exp` — 「認可 MW が DB 往復なしで判定できる**最小集合**」 |
| `system-spec/auth.md` qa-036 の回答 | 同じ 6 claim を列挙して確定 |
| 実装 `packages/schemas/auth-tenancy/session.ts` | 上記 6 つ + **`workspace_ids: string[]`** |

追加の理由は `docs/features/feat-auth-tenancy/architecture-implementation-notes.md` §10.2 に記録済み。edge の認可 middleware が Workspace 越境を DB 往復なしで弾くために所属集合が要る。載せない場合、edge は membership を判定できず全 Workspace スコープ要求が落ちる。

代償も同§に記録されている。**cookie が所属数に比例して膨らむ**こと、**membership 変更の反映が最大 `updateAge` (15 分) 遅れる**こと。後者は role/status と同じ受容済みの陳腐化だが、membership については確定記録が無い。

### D2. Device Flow polling interval に上限 60 秒と減衰 −5 秒が入っている

| 場所 | 記述 |
|---|---|
| `docs/security-spec.md` §2.2 の数値契約表 | polling `interval` = **5 秒** (`slow_down` 受信時は **+5 秒**) / 根拠 RFC 8628 §3.5 |
| 実装 `apps/hub/src/lib/auth/config.ts` | `devicePollIntervalSeconds: 5` / `devicePollBackoffSeconds: 5` / **`devicePollMaxIntervalSeconds: 60`** |
| 実装 `apps/hub/src/lib/auth/device-flow/service.ts` | `nextPollIntervalSeconds()` = +5 秒 (上限 60 秒) / **`relaxedPollIntervalSeconds()` = −5 秒 (下限 5 秒)** |

RFC 8628 §3.5 が定めているのは「`slow_down` を返したら `interval` を 5 秒増やす」までで、**上限も、規約どおり待った client への減衰も規定していない**。文面どおり増やすだけだと interval は単調増加し、`device_code` TTL (600 秒) を追い越す。そうなると client は「次に叩いてよい時刻」に達する前に code が失効し、**server の側から flow を詰ませる**。

実装は加算と減算を同じ幅で対にした。幅が同じなら「速く叩いて罰を受け、次の 1 回だけ守って帳消しにする」交互 polling が差し引き 0 にしかならない。上限 60 秒は TTL 600 秒に対し最悪でも 10 回叩けることを値の選択で担保する。詳細は同 notes §10.7。

ADR 追補は上限値について **「backend-spec / security-spec には無い本 feature の決定である」** と自ら明記しており、この issue はその申し送りを受けたものである。

## 期待する挙動

`docs/security-spec.md` と `system-spec/auth.md` だけを読んだ実装者が、

- session cookie に `workspace_ids` が載ること (と、それが最小集合の定義に含まれること) を知っている
- polling interval が server 側で 60 秒に頭打ちし、規約どおり待てば 5 秒まで戻ることを知っている

状態。

## 再現手順またはユースケース

1. `docs/security-spec.md` の §2.1 JWT claims 行と、`packages/schemas/auth-tenancy/session.ts` の `sessionClaimsSchema` を突き合わせる → 実装側に `workspace_ids` が 1 つ多い
2. `docs/security-spec.md` §2.2 の polling `interval` 行と、`apps/hub/src/lib/auth/config.ts` の `AUTH_NUMERIC_CONTRACT` を突き合わせる → 実装側に `devicePollMaxIntervalSeconds` と減衰規則が多い
3. feat-publisher-plugin の実装者が仕様書だけを根拠に polling client を書く → 上限と減衰を知らず、`slow_down` のたびに自前 interval を無限に増やし、TTL 内に叩かなくなりうる

## 影響と優先度

- 影響範囲: system (仕様記録の完全性) / 下流 feature (feat-publisher-plugin の client 実装)
- 深刻度: medium — 現行実装は動作しており、セキュリティ上の穴ではない。壊れるのは「仕様書を信じた下流実装」
- 緊急度: feat-publisher-plugin の Device Flow client 着手前まで。それ以降は誤実装が実際に発生しうる

## なぜ本 PR で正本を直さなかったか

| 反映先 | 直せない理由 |
|---|---|
| `system-spec/auth.md` | `spec-state.json` の `qa_log` から compile される成果物。手編集は**ユーザーが確認した事実の書き換え**にあたり、再 compile で消える |
| `specs/` `architecture/` | `source_digest` で正本章を指す wrapper。`arch-harness-hub-security` は `scope_out` に「正本章の内容複製」を明示 |
| `docs/security-spec.md` | 本文が R4-reopen を要求。加えて `scripts/doc-line-limit-allowlist.json` の **baseline 910 行・縮小のみ許す ratchet** 対象で、加筆は `lint-doc-line-limit.py` が CI で落とす |
| `docs/backend-spec.md` | 同 ratchet 対象 (baseline 434 行) |

行数を増やさない「置換」なら ratchet は通るが、置換内容の確定自体が R4-reopen の対象であるため、確定を経ずに書き換えることはしない。

## スコープ

- In: qa-036 / qa-041 の R4-reopen、`spec-state.json` への確定登録、`system-spec/auth.md` の再 compile、`docs/security-spec.md` の該当 2 行の置換
- Out: 実装の変更 (確定結果が現行と異なる場合にのみ改修)、`docs/security-spec.md` の 300 行分割 (`HarnessHub-3d8`)、feat-auth-tenancy の他の未達 (`HarnessHub-1f28` / `HarnessHub-b7ng`)

## 関連グラフ

- 原因/親ノード: `feat-auth-tenancy`
- 関連仕様: `spec-harness-hub-requirements`
- 関連アーキテクチャ: `arch-harness-hub-security`
- 解決タスク: (R4-reopen 実施時に採番)

## 受入条件

- [ ] `spec-state.json` の `qa_log` に、session claims への `workspace_ids` 追加の可否と根拠がユーザー確認付きで登録されている
- [ ] `spec-state.json` の `qa_log` に、polling interval の上限値 (現行実装は 60 秒) と減衰規則の可否がユーザー確認付きで登録されている
- [ ] `docs/security-spec.md` §2.1 の claims 行と §2.2 の polling 行が確定内容と一致し、`lint-doc-line-limit.py` が exit 0 のままである
- [ ] `packages/schemas/auth-tenancy/session.ts` と `apps/hub/src/lib/auth/config.ts` の値が確定内容と一致する

## 検証証跡

- コマンド/テスト: `python3 scripts/lint-doc-line-limit.py --repo-root .` / `pnpm --filter @harness-hub/hub run test`
- 証跡 path: `docs/features/feat-auth-tenancy/architecture-implementation-notes.md` §10.2 / §10.7
