---
status: draft
layer: feature-design
task: issue-auth-tenancy-customer-managed-google-oidc-20260729
parent_feature: feat-auth-tenancy
feature_package_id: feature-package/feat-auth-tenancy
beads_ids:
  - HarnessHub-uk2i
---

# feat-auth-tenancy 運用手順書: 顧客持ち込み Google OAuth client の管理

- graph_node_id: `issue-auth-tenancy-customer-managed-google-oidc-20260729`
- 対象読者: HarnessHub 運用担当者 (`provider-admin`) / 顧客の Google Workspace 管理者
- 親文書: [runbook.md](./runbook.md)
- Google 側の client 作成手順 (詳細): [runbook-oidc-provider-onboarding.md](./runbook-oidc-provider-onboarding.md)
- 共通方式 (HarnessHub 所有の 1 client) の手順: [runbook-shared-google-oidc-rollout.md](./runbook-shared-google-oidc-rollout.md)

この文書は、**顧客が自分の Google Cloud project で作った OAuth client を HarnessHub へ持ち込み、
管理画面から登録・接続確認・有効化・rotation・無効化する**までを扱う。

これまで credential の投入は運用者による本番 DB 直接操作
([production-auth-manual-setup.md](./production-auth-manual-setup.md) §7) だった。
この feature 以降は `provider-admin` が管理画面から実行できる。**DB 直接操作は経路として残るが、
通常運用では使わない**。管理画面経由は監査 event が残り、rotation が CAS で原子的になるため。

> 秘密値 (client secret 全値) を本文・issue・PR・チャット・メール・スクリーンショットへ残さない。
> 管理画面が表示するのは末尾 4 文字 (last4) だけである。
> 各タスクは順番に 1 件ずつ実行し、完了ゲートを満たさないまま次へ進まない。

## 1. 責任境界 — どちらが何をするか

**この境界を取り違えると事故になる**。管理画面は Google の設定を代行していない。
画面の「登録」は HarnessHub 側の DB へ値を保存するだけで、Google 側には何も起きない。

| やること | 実施場所 | 実施者 | HarnessHub 側の状態変化 |
| --- | --- | --- | --- |
| OAuth client の作成・削除 | Google Cloud Console | 顧客の Workspace 管理者 | **なし** |
| redirect URI の登録・変更 | Google Cloud Console | 顧客の Workspace 管理者 | **なし** |
| client secret の追加・失効 | Google Cloud Console | 顧客の Workspace 管理者 | **なし** |
| 同意画面 / Audience / scope | Google Cloud Console | 顧客の Workspace 管理者 | **なし** |
| client ID / secret の登録 | Hub 管理画面 | HarnessHub `provider-admin` | 行を作成 or staging へ積む |
| 接続テスト | Hub 管理画面 | HarnessHub `provider-admin` | `tested_at` を更新 |
| 有効化 (切替) | Hub 管理画面 | HarnessHub `provider-admin` | ログインに使う credential が変わる |
| rotation / rollback | Hub 管理画面 | HarnessHub `provider-admin` | staging の昇格 / 破棄 |
| 無効化 | Hub 管理画面 | HarnessHub `provider-admin` | 顧客方式でのログインを止める |

**Google 側の `enabled/disabled` と Hub 側の `pending/active` を取り違えない。**
Google で secret を消しても Hub の行は消えない。Hub で無効化しても Google の client は生きている。
rotation 中は「Google 側に新旧 2 つの secret」「Hub 側に active 1 つ + pending 1 つ」が同時に存在する。

## 2. 実行タスク一覧

| ID | タスク | 完了時に得られるもの | 次 |
| --- | --- | --- | --- |
| C-01 | callback URL を確定して顧客へ渡す | 顧客が Google へ登録すべき 1 本の URL | C-02 |
| C-02 | 顧客が Google 側で client を用意する | client ID / client secret | C-03 |
| C-03 | Hub 管理画面へ登録する | `pending` の credential | C-04 |
| C-04 | 接続テストに通す | `tested` 記録 | C-05 |
| C-05 | 有効化する | 顧客方式でログインできる状態 | 完了 / R-01 |
| R-01 | secret を rotation する | 無停止で新 secret へ移行 | R-02 |
| R-02 | 旧 secret を Google 側で失効させる | 旧 secret の死亡確認 | 完了 |
| X-01 | 顧客方式をやめる / 止める | 無効化された接続 | — |

作業記録に残すのは、タスク ID・tenant slug・担当者・完了時刻・完了ゲート・**last4 だけ**である。

## C-01. callback URL を確定して顧客へ渡す

Hub の正規 origin から組む。Host ヘッダから組まない (Host 偽装で callback を差し替えられる)。

```text
https://<hub の正規 origin>/api/auth/<tenant slug>/callback/tenant-oidc
```

末尾 `/`、wildcard、大文字、`tenant-oidc` 以外の provider 名を加えない。
管理画面の接続カードにこの URL がコピーできる形で表示されるので、そこから取る。

**完了ゲート**: 顧客へ渡した URL が管理画面の表示と 1 文字も違わない。

## C-02. 顧客が Google 側で client を用意する

詳細手順は [runbook-oidc-provider-onboarding.md](./runbook-oidc-provider-onboarding.md) の G-02〜G-07。
このタスクで HarnessHub 側は何もしない。顧客から受け取るのは次の 3 点だけである。

- client ID (全値)
- client secret (全値。1Password vault 経由。チャット・メールで受け取らない)
- 許可する Google Workspace ドメイン (任意。空なら Google が通した全アカウントを受け入れる)

**完了ゲート**: issuer が `https://accounts.google.com` であり、C-01 の callback URL が
Google 側の Authorized redirect URIs に**そのまま**登録されている。

## C-03. Hub 管理画面へ登録する

`設定 > 認証` を開き、`provider-admin` で「登録」フォームへ client ID / client secret /
許可ドメインを入力する。API を直接叩く場合は `POST /api/v1/admin/oidc-connections`。

このとき**そのテナントに Google 接続が既にあるかどうか**で挙動が変わる。
`(tenant_id, issuer_url)` は一意なので、Google 接続は 1 テナント 1 行しか持てない。

| 登録前の状態 | 登録後 | 現在のログイン | 監査 `change` |
| --- | --- | --- | --- |
| 接続なし | 新しい行が `pending` で作られる | まだ顧客方式では入れない | `registered` |
| 顧客方式の接続あり | 既存行の staging に積まれる (`active` のまま) | **今までの credential で継続** | `credential_staged` |
| 共通方式の接続あり | 既存行の staging に積まれる (`active` のまま) | **共通 client で継続** | `mode_switch_staged` |
| 無効化された接続あり | 新 credential を staging し、行を `pending` へ戻す | **まだログイン不可** | `reactivation_staged` |

**登録しただけでは切り替わらない**。既存接続がある場合、画面は「新しい client へ切り替える」
ボタンが出るまで何も変えない。これは意図した設計で、C-04 のテストに通るまで
現行ログインを人質に取らないためである。

**完了ゲート**: 画面に表示された現行または staging の `last4` が、顧客から受け取った
secret の末尾 4 文字と一致する。無効化後の再開でも、古い credential を直接戻さず、
新 credential の登録 → pending 側テスト → 有効化を必ず通す。

## C-04. 接続テストに通す

接続カードの「接続をテスト」を押す。API は `POST /api/v1/admin/oidc-connections/{id}/test`。

Hub は保存済み credential を復号し、Google の token endpoint へ**わざと不正な認可コード**で
1 回だけ交換要求を出す。Google の応答が `invalid_grant` なら「不正な code が拒否された」、
`invalid_client` なら「client ID / secret が拒否された」と読める (RFC 6749 §5.2)。
この probe（疎通確認）は discovery と client ID / secret の組を利用者なしで確認するためのものだが、
**Google Cloud Console に callback URL が正しく登録されたことまでは証明しない**。

- staging がある場合はそちらを検査する (`target: "pending"`)。合格すると `pending_tested_at` が入る。
- staging が無い場合は現行 credential を検査する (`target: "current"`)。
- 共通方式の行そのものは検査できない (409 `not_customer_managed`)。共有 client の健全性は
  この feature の管理面の外にある。

**テスト失敗は 200 で返る** (`passed: false` + `failure_reason`)。要求は正しく処理されており、
結果が不合格なだけだからである。監査には `rotation_test_failed` / `test_failed` が残る。

**完了ゲート**: `passed: true`。**停止条件**: `invalid_client` が出た → C-02 へ戻る
(client ID か secret の取り違え)。callback URL の一致は C-05 の実ブラウザ login で確認する。
Google の `redirect_uri_mismatch` は認可画面へ遷移する実フローで発生するため、出た場合は C-01 へ戻る。

## C-05. 有効化する

「新しい client へ切り替える」(または「有効化する」) を押す。
API は `POST /api/v1/admin/oidc-connections/{id}/activate`。

ここで初めてログインに使う credential が変わる。昇格は **1 回の UPDATE** で
client ID / secret / 方式 / 許可ドメインを同時に入れ替える。片方だけ新しくなる瞬間は無い。

- C-04 を通していない状態で押すと 409 `invalid_transition`。テスト未実施の credential は昇格しない。
- 監査は `activated` (初回) / `rotation_activated` (staging の昇格)。

**完了ゲート**: 対象テナントの利用者 1 名が実際にブラウザから login できる。
**停止条件**: login できない → C-06 相当の rollback (下記 R-01 の「戻し方」) を先に実行する。

## R-01. secret を rotation する (無停止)

1. **Google 側**で client secret を追加する。**旧 secret はまだ消さない**。Google は 1 client に
   複数 secret を持てる。ここで旧を消すと、その瞬間から Hub のログインが落ちる。
2. **Hub 側**で「secret を差し替える」から新 secret を登録する
   (`POST /api/v1/admin/oidc-connections/{id}/rotation`)。行は `active` のまま、staging に積まれる。
   監査 `rotation_staged`。
3. **Hub 側**で接続テスト (C-04)。staging 側が検査される。監査 `rotation_tested`。
4. **Hub 側**で有効化 (C-05)。ここで新 secret が本番になる。監査 `rotation_activated`。
5. **Google 側**で旧 secret を失効させる (R-02)。

**戻し方 (rollback)**: 手順 4 の前なら、「取り消す」
(`DELETE /api/v1/admin/oidc-connections/{id}/rotation`) で staging を捨てる。
現行 credential は一切触っていないので、ログインは中断しない。監査 `rotation_discarded`。
手順 4 の後に問題が出た場合は、旧 secret をまだ Google 側に残してあるので、
旧 secret を改めて登録 → テスト → 有効化で戻す (だから R-02 を急がない)。

**完了ゲート**: 新 secret の `last4` が接続カードの現行表示になっている。

## R-02. 旧 secret を Google 側で失効させる

R-01 の手順 4 完了後、対象テナントで実際のログインが 1 回成功したことを確認してから、
**Google Cloud Console** で旧 secret を削除する。Hub 側の操作は無い。

**完了ゲート**: Google 側に残る secret が新しいものだけであり、その後もログインが成功する。
**停止条件**: 削除後にログインが落ちた → Hub が旧 secret を掴んだままである。
接続カードの `last4` を確認し、新 secret を登録し直す。

## X-01. 顧客方式をやめる / 止める

`POST /api/v1/admin/oidc-connections/{id}/disable`。監査 `disabled`。

**無効化しても共通方式へ自動で切り替わらない**。顧客方式が失敗したときに共有 client へ
暗黙 fallback すると、契約上の認証境界 (顧客の Google project がログインを統制する) が
黙って変わってしまうため、fail-closed にしてある。共通方式へ移す場合は、
[runbook-shared-google-oidc-rollout.md](./runbook-shared-google-oidc-rollout.md) の手順で
明示的に切り替える。

**完了ゲート**: 対象テナントで顧客方式のログインが拒否される。

**再開方法**: C-03 で新しい client ID / secret を登録する。行は `pending` へ戻るが、
その時点ではログインに使われない。C-04 の pending テストと C-05 の有効化を順に通す。

## エラー時の戻り先

| HTTP | error | 意味 | 戻り先 |
| --- | --- | --- | --- |
| 403 | — | `provider-admin` ではない | 権限の確認。`workspace-admin` でも操作できない |
| 404 | `connection_not_found` | 対象が無い / **他テナントの接続** | tenant を確認。越境は 404 に畳んである |
| 409 | `not_customer_managed` | 共通方式の行に顧客方式の操作をした | 方式の確認 |
| 409 | `invalid_transition` | 今の状態では受け付けられない (未テストの昇格、無効化済み現行 credential のテスト) | 一つ前の手順へ |
| 409 | `rotation_not_staged` | staging が無いのに昇格/破棄しようとした | R-01 の手順 2 へ |
| 409 | `state_conflict` | **他の誰かが同時に同じ接続を操作した** | 画面を再読み込みして状態を読み直し、再試行 |
| 400 | `invalid_request` | 入力が schema に合わない | 入力値の確認 |
| 200 | `passed: false` | 接続テスト不合格 (要求自体は成功) | `failure_reason` を見て C-02 / C-01 へ |

409 系はいずれも「要求は正しいが、今の状態では通せない」である。要求を書き換えて再送しない。

## 監査で追えること

action は `idp.connection_change` の 1 種類で、変化の種別は `metadata.change` に入る。
`registered` / `credential_staged` / `mode_switch_staged` / `reactivation_staged` / `tested` / `test_failed` /
`rotation_staged` / `rotation_tested` / `rotation_test_failed` / `rotation_discarded` /
`rotation_activated` / `activated` / `disabled`。

**監査に残るのは成立した変更だけ**である (認可失敗・入力不正は別の経路)。
metadata に載る credential 情報は `client_secret_last4` / `pending_client_secret_last4` だけで、
secret 全値はどの経路にも出ない。

## 公式資料

- [Google OAuth 2.0 client の管理](https://support.google.com/cloud/answer/15549257)
- [Google OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google OAuth 2.0 best practices](https://developers.google.com/identity/protocols/oauth2/resources/best-practices)
- [RFC 6749 §5.2 (token endpoint のエラー応答)](https://datatracker.ietf.org/doc/html/rfc6749#section-5.2)
- 現行の手動投入手順: [production-auth-manual-setup.md](./production-auth-manual-setup.md)
