# feat-auth-tenancy 運用手順書 (runbook)

- graph_node_id: `sys-auth-tenancy-p12`
- feature_context_digest: `sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5`
- 対象読者: HarnessHub の運用担当者 (provider-admin 権限を持つ人)

## この文書が扱う 5 つの手順

| # | 手順 | 使う場面 |
| --- | --- | --- |
| 1 | session 緊急失効 | 退職・アカウント侵害の疑い |
| 2 | Device Flow token の棚卸し / 失効 | CLI token の定期確認、端末紛失 |
| 3 | 新規テナントの OIDC provider 登録 | 新規顧客のオンボーディング |
| 4 | Dev tenant の OIDC provider 登録 | 開発/デモ環境の初期構築 |
| 5 | row-level-scope revisit 条件の監視 | 定期 (月次) |

> **前提**: 本 feature は `packages/db/schema/` を所有しない。手順中の DB 操作はすべて
> `feat-domain-model-db` が提供するリポジトリ層関数を経由する。テーブルへ直接 SQL を打たない
> (直打ちは監査を残さず、キャッシュ整合も壊す)。

---

## 1. session 緊急失効 (退職・侵害時)

### 1.1 いつ使うか

- 従業員の退職・契約終了
- アカウント侵害の疑い (不審なログイン、端末紛失)
- role を降格したが、即時に反映させたい

### 1.2 なぜ「ログアウトさせる」だけでは足りないか

Hub の session は **stateless JWT** (サーバー側に session の一覧を持たない方式) である。
発行済みの JWT は、サーバー側で「取り消す」ことが原理的にできない。
利用者のブラウザから cookie を消しても、**JWT の写しを持っている相手には効かない**。

そこで `session_revocations` テーブルに「この時刻より前に発行された session は無効」という
基準時刻 (`revoked_at`) を書き込み、認可のたびにそれと突き合わせる。

### 1.3 手順

1. 対象の `tenant_id` と `user_id` を特定する。
2. `feat-domain-model-db` のリポジトリ層関数で `session_revocations` に
   `(tenant_id, user_id, revoked_at = 現在時刻)` を記録する。
3. **最大 60 秒待つ。** 失効判定は TTL 60 秒でキャッシュされているため、
   すでに「失効していない」を掴んでいるインスタンスは最大 60 秒間そのまま通す。
4. 60 秒経過後、対象利用者のアクセスがすべて 401 になることを確認する。

### 1.4 反映タイミングの正確な理解

| 対象 | 反映 |
| --- | --- |
| session JWT (ブラウザ) | 最大 60 秒 (失効キャッシュ TTL) |
| role 変更 (降格・昇格) | 最大 15 分 (session `updateAge`)。**即時にしたい場合は本手順で失効させる** |
| Device Flow の access token | 最大 15 分 (access token TTL)。§2 も併用すること |

### 1.5 知っておくべき障害モード (fail-closed の代償)

失効判定は **fail-closed** (判定できないときは拒否側に倒す) で実装されている。
control-plane DB へ問い合わせできない場合、`isRevoked()` は `true` (失効扱い) を返す。

**したがって control-plane DB が全断すると、全ユーザーが認可を通れなくなる。**

これは可用性より安全を優先した意図的な設計である (逆に倒すと、DB 障害中は失効指示が
届かないまま全員が通ってしまう)。

- **症状**: 全テナントの全 API が一斉に 401 / 403 を返す。ログイン済みの利用者も弾かれる。
- **確認**: control-plane DB への接続を確認する。認証設定の変更を疑う前に **DB の生死を先に見る。**
- **復旧**: DB を復旧させれば自動で戻る。認証側の設定変更は不要。
- **やってはいけないこと**: 障害を回避するために fail-closed を fail-open へ変える。
  それは「DB が落ちている間だけ認可が無い」状態を作る。

---

## 2. Device Flow token の棚卸し / 失効

### 2.1 いつ使うか

- 定期棚卸し (使われていない CLI token の整理)
- 開発端末の紛失・盗難
- refresh token 再利用検知アラートを受け取ったとき

### 2.2 発行済み token の一覧確認

```
GET /api/v1/tokens
```

自分の token を一覧する。workspace-admin / provider-admin は所管範囲の token を一覧できる。
`revoked` 済みのものは一覧に出ない。

### 2.3 個別失効

```
DELETE /api/v1/tokens/:id
```

- **冪等 (べきとう＝何回実行しても結果が同じ)** である。既に失効済みの token を再度削除しても
  `revokedCount` は 1 を返す。運用スクリプトで再実行しても壊れない。
- 失効すると、その token による refresh は以後 `invalid_grant` で拒否される。

### 2.4 ⚠️ 失効しても 15 分間は生きている

**token を失効させても、すでに発行済みの access token は最大 15 分間有効なまま残る。**

これは stateless JWT + 短命 TTL 設計の帰結で、バグではない。

**端末紛失など、即時に遮断する必要がある場合は §1 の session 緊急失効を併用すること。**
session 緊急失効は `iat` (発行時刻) との突き合わせで判定するため、
発行済みの access token にも 60 秒以内に効く。

| 緊急度 | 手順 |
| --- | --- |
| 通常の棚卸し | §2.3 のみ |
| 端末紛失・侵害の疑い | §2.3 **+ §1** の両方 |

### 2.5 refresh token 再利用検知アラートへの対応

refresh token は使うたびに新しいものへ差し替わる (rotation)。
古い refresh token が再提示されると、Hub は**その token family を丸ごと失効させ**、
監査へ `token.reuse_detected` を記録する。

**⚠️ 重要: このイベントは正当な操作でも発生する。**

実装から見て、「利用者の手元に残っていた古い token」と「盗まれた token」は区別できない。
区別できない以上、安全側 (family 全失効) へ倒している。
そのため次のような**正当な操作でも `token.reuse_detected` が出る**。

- 利用者が自分の token を失効させたあと、その token で refresh を試した
- CLI が複数プロセスで同時に refresh した
- ネットワーク再送で同じ refresh 要求が 2 回届いた

**したがって `token.reuse_detected` を即インシデントとして扱わないこと。**

対応手順:

1. 監査ログで直前の `token.revoke` の有無を確認する。**直前に本人の失効操作があれば正常系**である。
2. 該当 `user_id` の直近の `token.issue` / `token.revoke` の並びを見る。
   短時間に複数プロセスからの発行があれば CLI の並行実行を疑う。
3. 上記いずれにも該当せず、かつ利用者本人に心当たりが無い場合のみ、侵害として扱う。
   → §1 の session 緊急失効を実施し、該当利用者へ連絡する。

---

## 3. 新規テナントの OIDC provider 登録

### 3.1 いつ使うか

新規顧客のオンボーディング時。テナントごとに IdP (Identity Provider＝ログインを預ける外部サービス) が異なる。

### 3.2 手順

1. **テナント側の IdP で OIDC アプリケーションを作成してもらう**
   (Google Workspace / Microsoft Entra ID / Okta など)。
2. **リダイレクト URI を登録してもらう**: `https://<hub-host>/api/auth/callback/<provider-id>`
3. **`issuer` / `client_id` / `client_secret` を受け取る**。
   - `client_secret` はメール等の平文経路で受け取らない。
4. **`idp_connections` へ登録する** (`feat-domain-model-db` のリポジトリ層関数経由)。

   | フィールド | 内容 |
   | --- | --- |
   | `tenant_id` | テナント ID |
   | `tenant_slug` | ログイン URL に現れる識別子 (`/{tenant_slug}/signin`) |
   | `issuer` | discovery document の `issuer` と**厳密一致**する値 |
   | `client_id` | OIDC クライアント ID |
   | `display_name` | 「〇〇でログイン」のボタン文言 |
   | `enabled` | `true` |

   `client_secret` は暗号化列 / Cloudflare Workers Secret へ格納する。
   **リポジトリへ平文で置かない** (`pnpm check:secrets` が検出して CI が落ちる)。

5. **`enabled = true` にする。**
6. **ログインを 1 回通す**: `https://<hub-host>/<tenant_slug>/signin`
   初回ログインで `users` 行が **role = member 固定**で自動作成される (JIT provisioning)。
7. **初期の workspace-admin を昇格させる**: 既存の provider-admin が対象利用者の role を変更する。
   反映は最大 15 分 (即時にしたい場合は §1 で session を失効させる)。

### 3.3 なぜ初回ログインの role が member 固定なのか

IdP が返す claim (グループ名や属性) を信用して role を決めると、
**テナント側の IdP 設定を変えるだけで Hub の権限が動いてしまう**。
Hub の権限は Hub 側でしか変えられない、という状態を保つために role は member 固定で作られ、
昇格は Hub 側の明示操作のみで行う (`UserDirectoryPort.createFromOidc` の契約)。

### 3.4 登録後の確認

- 別テナントの利用者が、この新規テナントの資源へ到達できないこと (越境が 404 になること)
- 監査に `provider.cross_tenant_access` が意図せず大量に出ていないこと

---

## 4. Dev tenant の OIDC provider 登録 (開発 / デモ環境)

### 4.1 原則: dev 環境も本番とまったく同じ経路を通す

**Hub には「dev 専用ログイン」も「デモ用アカウント」も存在しない。**
`SKIP_AUTH` のような環境変数で認証を緩める実装も置かない。

理由: 環境変数で切る実装は、その変数が誤って本番に入った瞬間に
**設定ミス 1 個で全認可が無効化される**。1 個のミスで全部が開くものは実装として置かない。

この原則は `apps/hub/scripts/check-dev-auth-provider-absence.mjs` が
禁止語検査として恒久的に強制している (`T-BND-03` / `T-BND-04`)。

### 4.2 手順

1. **提供者 (HarnessHub 運営) 自身の Google Workspace** で OIDC アプリケーションを作成する。
   - `issuer`: `https://accounts.google.com`
   - リダイレクト URI: `https://<dev-hub-host>/api/auth/callback/google`
2. **Google Cloud Console の OAuth 同意画面を「内部 (Internal)」に設定する。**
   提供者ドメインのアカウントだけがログインでき、外部アカウントは弾かれる。
3. dev 環境の control-plane DB に Dev tenant を作成する (`tenant_slug: dev` など)。
4. §3.2 の手順 4〜5 と同じ形で `idp_connections` へ登録する。
   `client_secret` は `wrangler secret put` で dev 環境の Workers Secret へ入れる。
5. `https://<dev-hub-host>/dev/signin` からログインし、提供者アカウントで通ることを確認する。
6. 提供者アカウントを provider-admin へ昇格させる (初回のみ)。

### 4.3 デモ用アカウントが必要になったら

**Google Workspace 側でアカウントを作る。** Hub 側に作らない。
Hub にデモ用ログインを実装すると、それは本番にも存在する認証バイパスになる。

---

## 5. row-level-scope revisit 条件の監視

### 5.1 背景

D4 の決定により、テナント分離は **row-level-scope 方式** (1 つの DB を `tenant_id` 列で論理的に分ける)
で実現している。DB を物理的に分けていないため、
**「越境しないこと」はコードの正しさにしか依存しない。**

この方式には明示的な revisit (再評価) 条件が付いている。

| revisit トリガー | 再評価する内容 |
| --- | --- |
| **テナント数が 10 を超過** | DB-per-tenant (テナントごとに DB を分ける方式) への移行 |
| **分離テストの失敗が頻発** | 同上 |

### 5.2 監視手順 (月次)

1. **テナント数を数える。**
   - 10 以下 → 現状維持。次回へ。
   - **11 以上 → 再評価を起票する** (§5.3)。
2. **分離テストの失敗履歴を確認する。**
   直近 3 か月で `tests/auth-tenancy/tenant-isolation.test.ts` が
   **2 回以上失敗している場合は「頻発」とみなし、再評価を起票する。**
   - 失敗が 1 回でも、原因が「越境が実際に発生していた」場合は即座に再評価対象とする
     (検査の不安定さではなく、方式の限界の兆候であるため)。
3. **監査ログで `provider.cross_tenant_access` の件数推移を確認する。**
   provider-admin 以外の `allowed: true` が 1 件でもあれば**即インシデント**である
   (仕様上ありえない。実装バグを意味する)。

### 5.3 再評価を起票するときに書くこと

- 現在のテナント数と、直近 3 か月の増加ペース
- 分離テストの失敗回数と原因の内訳 (越境の実発生 / テスト不安定 / 実装変更に伴う一時的失敗)
- 現行方式で困っている具体的な事象 (性能・法規制・顧客要求など)

**テナント数 10 は「越えたら必ず移行する」閾値ではなく、「立ち止まって考える」閾値である。**
移行判断そのものは、上記の事実を揃えたうえで別途行う。

### 5.4 分離テストが落ちたときの一次対応

**分離テストの失敗は、越境が実際に起きうる状態を意味する。他のテスト失敗と同列に扱わない。**

1. 失敗したケース ID (`T-ISO-01`〜`T-ISO-07`) を特定する。
2. 該当する変更をリリース済みなら、**ロールバックを最優先で検討する。**
3. 監査ログで、実際に越境アクセスが成立した形跡がないか確認する。
4. 成立していた場合は、影響テナントへの通知を含むインシデント対応へ移行する。

---

## 付録: 参照コマンド

```bash
# 認可・境界の静的検査を一括実行
node apps/hub/scripts/check-auth-gates.mjs

# テナント分離テストのみ実行
cd apps/hub && pnpm exec vitest run tests/auth-tenancy/tenant-isolation.test.ts

# 認証・認可の全テスト
cd apps/hub && pnpm exec vitest run tests/auth-tenancy

# secret のハードコード検査
pnpm check:secrets
```

## 付録: 本 runbook が扱わない範囲

| 範囲 | owner |
| --- | --- |
| `session_revocations` テーブル自体の backup / restore | `feat-domain-model-db` |
| Publisher / CLI 側の OS 資格情報域 (Keychain 等) の運用 | `feat-publisher-plugin` |
| 承認キュー / 監査 UI の運用 | `feat-workspace-governance` |
