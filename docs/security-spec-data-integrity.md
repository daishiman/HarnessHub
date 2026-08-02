---
status: confirmed
qa_ref: [qa-037, qa-042, qa-045, qa-046, qa-048, qa-050, qa-061, qa-072, qa-073, qa-074, qa-075]
layer: implementation-spec
sources:
  - system-spec/security.md
  - system-spec/auth.md
  - system-spec/00-requirements-definition.md
  - docs/backend-spec.md
  - docs/mockups/harness-studio-v2-analysis.md
doctrine_anchor: OWASP ASVS + Secrets Management Cheat Sheet
serves_goals: [G1, G2, G3, G4, G5]
---

# Data protection and audit integrity — 暗号化・Secret・監査

> [security-spec.md](security-spec.md) の分冊。旧節番号を維持し、既存の仕様参照との対応を保つ。

## 4. データ保護

### 4.1 封筒暗号化 (KEK/DEK) — S-D5 / S-D8 確定

```
[Workers Secret: KEK]  ──(AES-GCM で復号)──>  [DB: encryption_keys.dek_wrapped]  ──(AES-GCM で復号/暗号化)──>  [列データ]
        1 本・不動                                  DEK (テナント共通・版番号付き)                     users.salary / idp_connections.client_secret
```

| 項目 | 確定 |
|---|---|
| アルゴリズム | **AES-256-GCM** (Web Crypto API。Workers 標準 — 外部依存なし) |
| KEK | `ENCRYPTION_KEK` (Workers Secret binding)。**1 本のみ**。テナント数に依存しない |
| DEK | DB (`encryption_keys`) に **KEK で wrap して保存**。用途別 (`salary` / `idp_secret`) に分ける |
| IV | **レコードごとにランダム 96 bit**。再利用しない (GCM の nonce 再利用は致命的) |
| AAD | `"{table}:{column}:{row_id}"` を付加 | 暗号文の他行への移植 (cut-and-paste 攻撃) を防ぐ |
| 保存形式 | `{key_version}:{iv_b64}:{ciphertext_b64}:{tag_b64}` (単一 TEXT 列) |
| 復号の位置 | **認可 MW 通過後のリポジトリ層のみ**。DTO 境界を越えて平文を出さない |

#### 4.1.1 追加テーブル (backend-spec §2 への追加)

| テーブル | 主な列 | 制約・備考 |
|---|---|---|
| `encryption_keys` | `id`, `purpose`(`salary`/`idp_secret`), `key_version` INT, `dek_wrapped` TEXT (KEK で AES-GCM wrap), `status`(`active`/`retiring`/`retired`), `created_at`, `retired_at` | UNIQUE(purpose, key_version)。`active` は purpose ごとに 1 件。DEK 平文は**保存しない** |

#### 4.1.2 ローテーション手順

| 対象 | 手順 | 全行再暗号化 |
|---|---|---|
| **KEK** | 新 KEK を Workers Secret へ追加 → 全 DEK を旧 KEK で unwrap し新 KEK で wrap し直す (行数 = 数件) → 旧 KEK 削除 | **不要** |
| **DEK** | 新 `key_version` を `active` にし、旧を `retiring` へ → 新規書込は新 version → バッチで旧 version の行を再暗号化 → 旧を `retired` | 必要 (対象は `users.salary` と `idp_connections` のみ = 小規模) |
| 契機 | 定期: **年 1 回**。臨時: 侵害の疑い・退職者の DB アクセス失効時 | — |
| 復号互換 | `key_version` 列により**旧版の復号は常に可能**。`retired` の DEK は削除せず `status` のみ変更 (復旧可能性の確保) | — |

### 4.2 PII: `users.salary` (T4 / T13 対策)

| 観点 | 確定 |
|---|---|
| 分類 | **要保護 PII** (年収 JPY)。C4 改訂後も `tenant_data` とは区別するが、保持例外とは扱わない。削減効果の金額換算 (G5) に必要なため、以下の保護条件で保持する |
| 保存 | 封筒暗号化 (§4.1)。purpose=`salary` |
| 読取 | `users.read_salary` (workspace-admin 以上)。**member 向け DTO に列を含めない** (型レベルで別 DTO にする) |
| 書込 | `users.write_salary` (workspace-admin 以上)。**監査 event `user.salary_change`** — ただし**値は記録しない** (§5.2) |
| 読取の監査 | **`user.salary_read` を監査 event に追加** (SEC4「読取の監査記録」の実装。§5.2 の action 一覧に追加) |
| 集計での扱い | 個人の金額は `users.read_salary` 保持者のみ。**member には集計値のみ** (`metrics_rollups.saved_amount_jpy`)。1 名しかいない部門の集計は個人の金額と等価になるため、**dim=`department` の rollup は構成人数 < 3 のとき金額を返さない (k-匿名性 k=3)** |
| export | **常にマスク** (`***`)。日次 export・R2 バックアップ断面にも平文を残さない (qa-032 既存確定を維持) |
| 削除 | ユーザー削除時に列も削除。退職者は `status='inactive'` + salary を NULL 化できる導線を持つ |

> **なぜ「集計値なら安全」ではないか**: 部門別集計は、その部門が 1〜2 名なら個人の年収を復元できる。mockup の「部門別」カードは実在するため、k-匿名性の閾値を仕様に持たせる。

### 4.3 テナント IdP client_secret (S-D5 確定)

| 観点 | 確定 |
|---|---|
| 保存 | **DB へ封筒暗号化保存** (§4.1、purpose=`idp_secret`)。`idp_connections.client_secret_enc` |
| **既存確定からの変更** | `backend-spec.md` §2.2 の「secret は Workers Secret の参照名のみ (`client_secret_ref`)。暗号化方式は feature P02」を**本節で置換**する (qa-032 の再オープン理由) |
| 変更根拠 | テナント IdP secret は**顧客ごとに動的に増えるデータ**であり、環境 binding では追加のたびに `wrangler secret put` + 再デプロイが必要になる。これは C1 (提供者 1 名の運用負荷) と C2 (顧客数に固定費・手間が比例しない) に反する。Workers の secret 数上限にも到達しうる |
| **「secret は環境 binding のみ」原則との関係** | 当該原則 (qa-020/qa-025) は **Hub 自身の静的 secret** (Turso token・R2 key・Resend key・AUTH_SESSION_SECRET・AUTH_ACCESS_TOKEN_SECRET・KEK) を対象とする。**テナント由来の動的 secret はこの原則の適用外**とし、封筒暗号化 + 認可 + 監査で保護する。この境界を §4.5 の表で明示する |
| 読取 | **復号は OIDC 認可要求の組立時のみ**。API レスポンス・ログ・エラーメッセージへ出さない (マスク済み `***` を返す) |
| 書込 | `provider-admin` のみ (テナント IdP 設定は提供者が顧客と合意して登録する)。監査 event `idp.connection_change` (値は記録しない) |

### 4.4 その他の要保護データ

| データ | 保護 |
|---|---|
| `publisher_tokens.refresh_token_hash` | **SHA-256 ハッシュのみ**。可逆暗号化しない (照合しか要らない) |
| `device_authorizations.device_code_hash` | **SHA-256 ハッシュのみ** |
| `user_code` | 平文保持だが TTL 10 分 + 照合後即失効 (§2.2) |
| `metrics_events.client_context_json` | **PII を含めない**。ハーネス slug・実行結果コードのみ。自由記述を受けない |
| `feedbacks.body` / `documents.body_md` | 利用者入力。sanitize は表示時 (§6.2)。保存は原文 (監査可能性のため) |
| `audit_events.summary_json` | **秘匿値を書かない** (§5.2) |

### 4.5 secret インベントリ (Workers Secret binding)

**この表にないものを Workers Secret に置かない。この表のものを DB・コード・ログに置かない。**

| binding 名 | 内容 | 用途 | ローテーション |
|---|---|---|---|
| `AUTH_SESSION_SECRET` / `AUTH_ACCESS_TOKEN_SECRET` | Auth.js session / Publisher access token の用途分離 JWT 署名鍵 | §2.1 / §2.2 | 年 1 回 (前者は全 session 失効、後者は全 Publisher access token の再発行を伴う) |
| `CWV_PROBE_SECRET` / `CWV_PROBE_TENANT_ID` / `CWV_PROBE_WORKSPACE_ID` | protected `/catalog` の CWV 実測専用。最大 5 分の ticket を固定した読み取り専用 tenant/workspace へ束縛し、通常の session / access token には使わない | security-spec-authentication §2.1.1 | 漏えい疑いまたは代表 scope 変更時。secret / ticket 値はログ・artifact・DB へ残さない |
| `ENCRYPTION_KEK` | 封筒暗号化の KEK | §4.1 | 年 1 回 (DEK re-wrap のみ) |
| `TURSO_DATABASE_URL` | Turso **DB 接続 URL**。token と組で接続が成立するため var ではなく secret で投入する (2026-07-28 追記。実装は起動時必須) | DB | DB 移設時 |
| `TURSO_AUTH_TOKEN` | Turso **DB 接続** token。CI の migrate/smoke も同名を使う。Platform API token (`TURSO_API_TOKEN`・`backup.yml` 専用) とは別物で相互流用しない | DB | 年 1 回 |
| `CRON_HEARTBEAT_URL` | scheduled handler が日次ジョブ完走時に ping する外形監視の heartbeat URL。**URL 自体が事実上の秘匿情報**のため var ではなく secret で投入する (infrastructure-spec §2/§5/§9。2026-07-28 追記) | §9 監視 | 監視側で再発行したとき |
| ~~`R2_ACCESS_KEY` / `R2_SECRET_KEY`~~ | **2026-07-25 廃止**。R2 は Workers binding + `wrangler` 経路のみとし専用キーを発行しない (infrastructure-spec §7 台帳と同期) | — | — |
| `RESEND_API_KEY` | メール送信 | §4.6 | 年 1 回 |
| ~~`AUTH_SECRET`~~ | **廃止予定・rollback 用に暫定残置** (2026-07-28)。qa-032 の静的 secret 5 種の 1 つだったが、§2.1/§2.2 の用途分離で `AUTH_SESSION_SECRET` / `AUTH_ACCESS_TOKEN_SECRET` へ分割済みで現行実装の参照は 0 件。**本番 Worker には投入されたまま**である | 旧 runtime への rollback | ローテーションしない。**削除条件**: 新 runtime の本番スモーク (feat-auth-tenancy P13 の R4) が pass し旧版への rollback 窓が閉じた時点で `wrangler secret delete` する |

- **DB に入る secret**: テナント IdP client_secret のみ (封筒暗号化・§4.3)。
- **コードに入る secret**: なし。CI で検査 (§8.2)。
- **ログに入る secret**: なし。エラーは RFC 9457 の `detail` に値を含めない。
- **2026-07-28 追記 (`HarnessHub-x2x9`)**: `TURSO_DATABASE_URL` と `CRON_HEARTBEAT_URL` は本番投入済みかつ実装が参照しているが本表から欠落していた。
  値も振る舞いも変えない記載漏れの補正であるため R4-reopen は行わず、実測に合わせて追記した。
  併せて infrastructure-spec §2 側の旧設計 (`SALARY_ENC_KEY` / `IDP_SECRET_<tenant_slug>`) を本表へ収束させた。
- **`AUTH_SECRET` を廃止予定行として載せる理由**: 本表は「この表にないものを Workers Secret に置かない」を規律としているため、
  **本番に存在するのに表に無い binding があると、棚卸しのたびに正体を判定できず「消してよいか分からないまま残る」**。
  R2 キー廃止行と同じ形式に揃え、削除条件を明記して期限付きの管理下に置いた。

### 4.6 メール (Resend) の PII 境界

| 項目 | 確定 |
|---|---|
| API key | `RESEND_API_KEY` (Workers Secret binding のみ) |
| 宛先 | **同一テナント内の `users.email` のみ**。テナント跨ぎ送信をコードで不可能にする (送信関数が `TenantCtx` を要求 — §3.6) |
| 本文 | **PII を含めない**。金額・年収・個人の削減額を本文に書かない。「Hub で確認してください」+ リンクのみ |
| 週次サマリー | 集計値のみ。個人金額は含めない (§4.2 の k-匿名性を適用) |

## 5. 監査と改竄防止

### 5.1 append-only の強制 (S-D6 確定)

Turso/SQLite には DB レベルの append-only 強制機構 (行レベル権限・トリガによる拒否の保証) が無いため、**アプリ層 + hash chain + CI 検査**の 3 点で担保する。

| 層 | 実装 |
|---|---|
| リポジトリ層 | `audit_events` に対する UPDATE/DELETE 関数を**実装しない** (存在しないものは呼べない) |
| 型 | `AuditRepo` は `append()` と `read()` のみを公開する interface |
| CI 検査 | `audit_events` に対する `update(`/`delete(`/`UPDATE `/`DELETE ` の出現を禁止検査 (§8.2) |
| **hash chain** | §5.4 |

### 5.2 監査対象 action

正本は `backend-spec.md` §3.8 (16 action)。**本書で 2 件追加**する (qa-032/qa-033 再オープンで反映)。

| 追加 action | 契機 | 根拠 |
|---|---|---|
| `user.salary_read` | salary の復号読取 (一覧・詳細・export) | SEC4「読取の監査記録」の実装 (T4/T11) |
| `idp.connection_change` | テナント IdP 設定の追加・変更・削除 | §4.3 (顧客 IdP へのなりすまし経路のため) |
| `token.reuse_detected` | refresh token の再利用検知 | §2.2 (窃取検知) |
| **`provider.cross_tenant_access`** | **provider-admin が自テナント以外の resource へ到達した全操作** (読取を含む) | §3.1.3 (越境を許す代わりの統制。`withAuthz()` が自動記録する) |
| `token.refresh_race` | refresh rotation の CAS 敗北 (並行提示されたが窃取と確定できない側) | HarnessHub-v22l。`token.reuse_detected` と混同しない (§2.2 rotation 実装のコメント参照) |

**記録内容の原則**:

| 記録する | 記録しない |
|---|---|
| `actor_type` / `actor_id` / `action` / `entity_type` / `entity_id` / サーバ時刻 | **値そのもの** (salary の金額・client_secret・token) |
| 変更の**事実**と対象 (`summary_json` に `{"field":"salary","changed":true}`) | 変更前後の値 |
| `provider-admin` の全操作 (T11) | — |

> **なぜ変更前後の値を記録しないか**: 監査ログは workspace-admin が閲覧できる (§3.4 `audit.read`)。値を書くと、監査ログ自体が PII の第 2 の保管場所になり、§4.2 の暗号化・マスクを迂回する経路になる。

### 5.3 provider-admin の透明性 (T11 対策)

| 対策 | 内容 |
|---|---|
| 全操作の監査 | `provider-admin` の操作も例外なく `audit_events` に記録する (`actor_type='user'`) |
| **顧客による監視** | `workspace-admin` は**自テナントの監査を閲覧できる** (`backend-spec.md` §3.3 既存確定)。provider-admin が自テナントのデータへアクセスした事実を顧客が確認できる |
| salary 読取 | provider-admin による `user.salary_read` も記録され、顧客管理者から見える |
| 残余リスク | 提供者は DB に直接到達できるため、アプリを経由しないアクセスは記録されない (N1)。**これを仕様として明示する** |

### 5.4 hash chain (T6 対策・S-D6 確定)

#### 5.4.1 追加列 (backend-spec §2.2 `audit_events` への追加)

| 列 | 型 | 内容 |
|---|---|---|
| `seq` | INTEGER | **テナント内の連番** (1 始まり)。UNIQUE(tenant_id, seq) |
| `prev_hash` | TEXT | 直前 event の `event_hash` (seq=1 は `"genesis"`) |
| `event_hash` | TEXT | 本 event の hash (下式) |

#### 5.4.2 chain の scope: **テナント単位** (グローバル 1 本にしない)

| 案 | 採否 | 理由 |
|---|---|---|
| テナント単位 chain | **採用** | 監査の読み手 (workspace-admin) の検証範囲と一致する。テナント間で書込が直列化しない |
| グローバル 1 本 chain | 不採用 | 全テナントの監査書込が 1 本の chain に直列化し、`seq` 採番が全体のボトルネックになる。D4 (row-level scope) の分離思想とも合わない |

#### 5.4.3 計算式

```
event_hash = SHA-256(
  prev_hash || "\n" ||
  tenant_id || "\n" || seq || "\n" ||
  actor_type || "\n" || actor_id || "\n" ||
  action || "\n" || entity_type || "\n" || entity_id || "\n" ||
  canonical_json(summary_json) || "\n" ||
  created_at
)
```

- `canonical_json` = キー辞書順・空白なしの決定論的シリアライズ (JCS 相当)。**同じ event が常に同じ hash になること**が検証の前提。
- append は `BEGIN IMMEDIATE` トランザクション内で「最終 seq/hash の取得 → 新 event の insert」を行い、`UNIQUE(tenant_id, seq)` で並行 append の競合を検出する (競合時は再試行)。

#### 5.4.4 検証

| 種別 | 頻度 | 内容 |
|---|---|---|
| 通常検証 | 監査画面の閲覧時 (表示範囲のみ) | 表示する連続区間の chain を再計算して一致を確認。不一致は画面に**警告を表示** |
| 全体検証 | **日次 cron** (`backend-spec.md` §7 の cron に追加) | テナントごとに chain 全体を検証。不一致・seq 欠番を検出したら provider-admin へ通知 + `audit.chain_broken` を通知系へ |
| 検出できるもの | 中間行の削除・改竄・挿入 | — |
| 検出できないもの | **chain 全体の再計算による改竄** (提供者による) | N1 の残余リスク。外部 WORM 退避は C1 の運用負荷に見合わないため採らない |
