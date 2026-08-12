---
status: confirmed
qa_ref: [qa-034, qa-038, qa-039]
layer: implementation-spec
sources: [system-spec/infrastructure.md, system-spec/maintenance-ops.md, system-spec/security.md, system-spec/database.md, docs/backend-spec.md, docs/mockups/harness-studio-v2-analysis.md, system-spec/00-requirements-definition.md]
---

# Harness Hub infrastructure 実装仕様書 (リソース構成・運用詳細正本)

> **位置づけ**: system-spec 確定章 (infrastructure / maintenance-ops) と docs/backend-spec.md を実装可能な粒度へ展開した詳細正本。確定 QA (qa-003/011/019/026/027/031/032/033) と decision (D1-D6) に反する記述はできない。矛盾を発見した場合は R4-reopen の根拠として扱う。
> **確定状態**: §12 の 4 論点は 2026-07-17 のユーザー確認 (qa-034) で確定済み。本書に【要確認】は残っていない。
> **2026-07-21 改訂**: 環境構成 (§2/§4/§6/§7/§10/§12) を **qa-038 準拠 (常設 staging なし・preview は PR ごとに使い捨て)** へ、CI/CD (§7) を **ci.yml 単一 workflow への deploy 統合**へ追随させた。feat-hub-foundation P03 の指摘 R-01/R-02 に対するユーザー確定 (2026-07-21) を反映したもの。
> **2026-07-26 実装反映**: qa-011 / qa-019 の既確定方針を変えず、日次バックアップを restore CLI と同じ JSONL 形式へ統一し、GitHub Actions の secret / variable を機械可読台帳と CI 突合ゲートで管理する形へ具体化した。

## 1. リソーストポロジ (C2: 固定費 0 円構成)

```text
[利用者ブラウザ] ──HTTPS──▶ Cloudflare Workers (単一 Worker, D1)
[Publisher CLI]  ──HTTPS──▶   ├─ Next.js (@opennextjs/cloudflare): Hub Web + /api/v1
                              ├─ R2 binding: packages (immutable) / backups / tenant-data (encrypted)
                              ├─ @libsql/client (HTTP) ──▶ Turso Free (control-plane DB, D2)
                              ├─ Resend API (メール補助, D6)
                              └─ cron triggers (§5)
[GitHub Actions] ── CI/CD (§7) + 日次 DB export (§10) ──▶ wrangler deploy / R2
[外形監視 (§9)]  ──▶ GET /health (3〜5 分間隔) + cron heartbeat
```

| リソース | サービス / プラン | 用途 | 根拠 |
|---|---|---|---|
| Hub 実行環境 | Cloudflare Workers Free (単一 Worker) | Next.js SSR + REST API + cron | D1 / qa-003 |
| R2 実体 | Cloudflare R2 Free (10GB) | immutable PackageRegistry + DB バックアップ + tenant_data 暗号化実体 | qa-004 / C4 |
| control-plane DB | Turso Free (libSQL, HTTP 接続) | 全 27 テーブル (backend-spec §2) | D2 / qa-004 |
| メール送信 | Resend Free (3,000 通/月・100 通/日) | 通知補助チャネル (アプリ内が正本) | D6 / qa-026 |
| CI/CD + バッチ | GitHub Actions Free | test → deploy / 日次 DB export | qa-011 |
| 外形監視 | Better Stack Free (10 monitors・3 分間隔) | /health 死活 + cron heartbeat + SLO 計測 | qa-019 / qa-034 |
| AI 実行基盤 | **なし** (D5 pull 型: Claude Code セッションが消費) | インフラ追加ゼロ | qa-026 |

## 2. Cloudflare Workers 構成 (wrangler.jsonc 正本)

- **エントリ**: `@opennextjs/cloudflare` の build 出力 (`.open-next/worker.js` + assets binding)。`compatibility_flags: ["nodejs_compat"]`。
- **命名**: `harness-hub` (production)。**常設 staging worker は持たない** (qa-038 確定 / §6)。preview は PR ごとの使い捨て。
- **binding 台帳 (非 secret)**:

| binding | 種別 | 値 / 対象 | 用途 |
|---|---|---|---|
| `PACKAGES_BUCKET` | R2 | `harness-hub-packages` | PackageRegistry (immutable) |
| `BACKUPS_BUCKET` | R2 | `harness-hub-backups` | DB export 保管 (§10) |
| `TENANT_DATA_BUCKET` | R2 | `harness-hub-tenant-data` | tenant_data の暗号化済み実体。PackageRegistry / backup と分離 |
| `ASSETS` | assets | `.open-next/assets` | 静的アセット (edge 配信) |
| `CF_VERSION_METADATA` | version_metadata | Cloudflare 採番の version id | `/health` の `version` に載せ「いま配信されている版」を応答から特定可能にする (§9)。build 時注入と違い **rollback 後も実配信版と一致する**ため、障害時のロールバック判断の一次情報になる (2026-07-21 追加) |
| `HUB_COMMIT_SHA` | var (deploy 時 `--var` 注入) | `GITHUB_SHA` (40 桁 hex) | `/health` の optional `commit` に載せ「いま配信されている版が repository のどの commit か」を認証なしで特定する (§9 / V6)。`wrangler.jsonc` へは値を書かない。未埋込時は key ごと欠落させ、代替値 (`unknown`) を入れない (2026-08-08 追加 / `feat-build-identity-deploy-freshness`) |
| `AUTH_CANONICAL_ORIGIN` / `AUTH_ALLOWED_ORIGINS` / `AUTH_DEVICE_VERIFICATION_URI` | var | 環境別 URL (§8) | Host ヘッダに依存しない OIDC callback、変更系 Origin 許可、Device Flow の確認画面 URL |
| `ENVIRONMENT` | var | `production` / `preview` | 環境分岐 (ログ・通知の抑制)。常設 staging は持たない (§6) |

- **secret 台帳 (`wrangler secret put`。コード・DB へ平文を持ち込まない = qa-020)**:

> **正本は [security-spec-data-integrity.md §4.5](security-spec-data-integrity.md) の secret インベントリ**であり、本表はそれを infrastructure 視点で再掲する。
> 差分が出たら §4.5 を正として本表を直す。**この表にないものを Workers Secret に置かない。**

| secret 名 | 用途 | ローテーション |
|---|---|---|
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | libSQL 接続 | token 失効時・年 1 回 |
| `AUTH_SESSION_SECRET` | Auth.js session JWT cookie 署名 | 年 1 回 (全セッション失効を伴う) |
| `AUTH_ACCESS_TOKEN_SECRET` | Publisher access token JWT 署名 | 年 1 回 (短命 access token の再発行を伴う) |
| `CWV_PROBE_SECRET` / `CWV_PROBE_TENANT_ID` / `CWV_PROBE_WORKSPACE_ID` | protected `/catalog` の CWV 実測専用。最大 5 分の ticket 署名鍵と、読み取り専用の固定 tenant/workspace を束縛する。通常 session / access token の鍵と共有しない。未投入時は計測だけを fail-closed で停止する | 署名鍵は漏えい疑い・年 1 回、固定 scope は代表環境を変更するとき |
| `ENCRYPTION_KEK` | 封筒暗号化の KEK (base64 32 byte)。**1 本のみでテナント数に依存しない**。`users.salary` (purpose=`salary`) と `idp_connections.client_secret_enc` (purpose=`idp_secret`) の DEK を wrap して `encryption_keys` へ保存する (security-spec-data-integrity §4.1/§4.3) | 年 1 回。**DEK の re-wrap のみで列の再暗号化は不要** |
| `SHARED_GOOGLE_OAUTH_CLIENT_ID` / `SHARED_GOOGLE_OAUTH_CLIENT_SECRET` | 共有 Google OAuth client (環境単位で 1 組)。名前の正本は `apps/hub/src/lib/auth/shared-credentials.ts`。**Worker の起動要件ではない** (未投入でも顧客持ち込み方式のテナントは動き、片方欠落は `readSharedGoogleCredentials` が null に倒す) が、**2026-08-02 に本番投入済み**のため runbook S-02 に従い `secrets.required` へ宣言し、消失を deploy 前に検知する対象とする | 年 1 回 |
| `RESEND_API_KEY` | メール送信 (SEC9)。**2026-08-02 時点で実装からの参照が無い** (planned)。投入しても効果が無く用途不明の credential を増やすだけなので、実装と同じ変更で required へ移すまで投入しない | 年 1 回 |
| `CRON_HEARTBEAT_URL` | scheduled handler が日次ジョブ完走時に ping する外形監視の heartbeat URL (§5/§9)。URL 自体が事実上の秘匿情報のため wrangler.jsonc の var ではなく secret で投入する | 監視側で再発行したとき |

- **2026-07-28 台帳訂正 (`HarnessHub-x2x9`)**: 本表は旧設計の `SALARY_ENC_KEY` と `IDP_SECRET_<tenant_slug>` を載せ、
  実装が起動時に必須とする `ENCRYPTION_KEK` を欠いていた。両者はいずれも `ENCRYPTION_KEK` 1 本の封筒暗号化へ統合済みで、
  実装 (`packages/db/repository/crypto.ts`) にも `apps/hub/src/lib/authz/runtime.ts` にも該当 binding は存在しない。
  **旧表のまま本番投入すると `ENCRYPTION_KEK` 未投入で Worker が起動時例外になる**ため、実装と §4.5 に合わせて訂正した。
  テナント IdP の client secret は Workers Secret ではなく `idp_connections.client_secret_enc` へ封筒暗号化で保存する。

- **2026-08-02 実投入ゲートの追加 (`HarnessHub-o2i.13`)**: 本表の機械可読な正本を `scripts/ci/worker-secrets-registry.json` に置き、`scripts/ci/check-worker-secrets.mjs` が **台帳 ↔ `wrangler.jsonc` の `secrets.required` ↔ 本番の実投入**を三方向で突合する。静的突合は静的ゲート job と `pnpm verify`、実投入突合 (`--live`) は deploy job が **deploy より前に**実行する (失敗しても本番は前進していないため、赤は「古い版が動き続ける」で済む)。requirement 語彙は `required` / `optional` / `planned` / `legacy` で、`wrangler.jsonc` の宣言と 1:1 対応するのは `required` だけ。未投入が恒常的な赤になるとゲート全体が無視される方向へ効くため、投入と同じ変更で `required` へ移す (共有 Google OIDC runbook S-02 と同じ判断)。
  **契機**: 本番 Worker へ `AUTH_ACCESS_TOKEN_SECRET` が未投入のまま稼働していたことを実測した。`wrangler.jsonc` は同名を `secrets.required` に宣言し、テストもその**宣言**を検査していたが、「宣言した secret が実際に入っているか」は誰も見ていなかった。GitHub 側に `check-actions-secrets.mjs --live` がありながら Cloudflare 側に等価物が無い非対称が穴の本体である。発覚が遅れたのは middleware が fail-closed だったため — 鍵が無いとき Bearer を cookie へ fallback させず `principal=null` に倒す設計は正しいが、副作用として「鍵が無い」と「token が不正」が同じ 401 へ潰れ、設定漏れが障害として立ち上がらなかった。**同日 `wrangler secret put` で投入済み**。
  **検査対象の境界**: 乖離しうるのは `wrangler deploy` が押し込まない帯域外設定 (Workers Secret / R2 bucket / Actions secret / Turso migration) だけで、`vars`・binding・cron trigger・compatibility flag は deploy が本設定ファイルから押し込むため乖離しない。棚卸し結果と根拠は `scripts/ci/check-worker-secrets.mjs` の冒頭コメントに置く。

- **サイズ予算**: Worker bundle ≤ 3 MiB (gzip, Free 上限) を CI ゲートで計測 (§7)。恒常超過は Workers Paid ($5/月) 移行と C2 再交渉をユーザーへ差し戻す (D1 caveat)。
- **CPU 予算**: Workers Free は CPU 10ms/呼出。API はポーリング統一 (qa-031) で接続保持なし。cron の集計は chunk 処理 (§5) で 1 呼出の CPU を抑える。恒常超過時は D1 caveat と同じ経路で Paid 移行を再交渉。
- **レート制限 (SEC8)**: Cloudflare の Rate Limiting Rule (Free 枠) を認証系 (`/api/v1/device/*`) に割当て、その他はアプリ層 (認可ミドルウェア前段) の IP + principal 制限で補完。数値は feature P02。

## 3. R2 バケット設計

R2 の bucket、object key、書込境界、保持期間の詳細正本は
[infrastructure-storage-spec.md](infrastructure-storage-spec.md) に分離した。§1 のトポロジ、§2 の binding 台帳、§10 の backup/DR と合わせて参照する。

## 4. Turso 構成 (D2)

- DB: `harness-hub-prod` (常設はこの 1 つのみ。qa-038 確定 / §6)。preview・restore drill 用の DB は都度作成し使い捨てる。リージョンは東京近接 (AWS ap-northeast-1 系) を選択。
- 接続: `@libsql/client` (HTTP) のみ。native binding はないため、接続情報は §2 の secret 台帳で管理。
- migration: `drizzle-kit generate` で SQL を生成しリポジトリ管理 → CI の deploy job (§7) が **deploy 前に production へ直接適用** (qa-038【5】。常設 staging を経由しない)。破壊的 DDL は expand/contract 3 段階を強制 (§7 G7)。**SQLite 方言互換を維持し、D1 退避経路を温存する** (D2 ヘッジ。Drizzle は libSQL/D1 両対応)。
- 無料枠 (公式確認 2026-07-17): ストレージ 5GB・読取 5 億行/月・書込 1,000 万行/月・100 DB。
- 使用量監視 (qa-031 の帰結): 日次 cron (§5) が Turso Platform API から usage を取得し、**閾値 70% で admin 通知 (アプリ内)・90% で保持期間導入の R4-reopen 起票を促す**。metrics_events 無期限保持の代償措置。R2 は binding の list をページングして tenant-data / packages bucket 別の bytes を測り、同じ 70% / 90% 閾値で構造化ログへ通知する。

## 5. cron トリガ設計 (Workers cron + GitHub Actions cron)

backend-spec §7 の 6 ジョブを、cron trigger 数上限と CLI 依存 (turso dump) を考慮して 3 系統に集約する。時刻は UTC (JST = UTC+9)。

> **上限の単位 (2026-07-25 実測で確定)**: Cloudflare Free プランの cron trigger 上限 **5 本は Worker 単位ではなくアカウント単位**である。**同一 Cloudflare アカウントに載る全プロジェクトで枠を共有する**ため、本 Worker の cron 本数だけでは登録可否が決まらない。上限超過時の API 応答は `{"code":10072,"message":"You have exceeded the limit of 5 cron triggers."}` だが、**`wrangler` はこの本文を出力せず「A request to the Cloudflare API failed.」としか表示しない**。切り分けは Cloudflare API を直接叩くこと (手順は [features/feat-hub-foundation/runbook.md](features/feat-hub-foundation/runbook.md) §4.1)。
>
> この制約は「3 系統への集約」という上の設計判断を**強める**。Hub 単独では 2 本で収まっていても、アカウント側の空き枠が無ければ登録できないためである。cron を増やす変更は、本 Worker の本数ではなく**アカウント全体の残枠**を先に数えてから設計する。

| cron 式 (UTC) | 実行主体 | ジョブ (順次実行・ジョブ単位 try/catch) |
|---|---|---|
| `0 15 * * *` (JST 0:00) | Workers scheduled handler | ① metrics rollup (日次) → ② Turso/R2 使用量監視 → ③ orphan_candidate 通知 → ④ token/認可コード掃除 → ⑤ ドキュメント予約公開 (`docs-scheduled-publish`)。新しい trigger は増やさない。期限到来 draft を `publish_at ASC, id ASC` の安定順・default/max 100件で公開し、`publishedCount/hasMore` を構造化ログへ残す |
| `0 0 * * 1` (JST 月 9:00) | Workers scheduled handler | 週次 rollup 確定 + 週次サマリメール (opt-in、100 通/日制限のバッチ分割 = D6/qa-027) |
| `0 17 * * *` (JST 2:00) | GitHub Actions (`backup.yml`) | DB export → gzip → R2 `harness-hub-backups` へ upload (§10) |

- scheduled handler は `event.cron` で dispatch する単一実装。各ジョブは冪等 (再実行安全) とし、失敗はジョブ単位で記録して後続を止めない。予約公開は処理済み行を `published + publish_at=NULL` にするため再実行対象から外れる。repository transactionは外部同期revisionまで揃え、Hubは返却文書ごとに監査eventを順次追記する。監査追記失敗は構造化ログへ残して予約公開ジョブを失敗扱いにするが、既に公開したDB行との原子性は主張しない。
- 日次相乗りの通常時は、予約時刻を過ぎてから次の成功 run までの追加遅延が 24 時間未満 (説明上は最大 24 時間程度) になる。これは cron が成功し batch に積み残しが無い場合の設計粒度であり、Cloudflare 側の schedule 遅延、失敗、`hasMore=true` の backlog に対する SLA ではない。`hasMore` は後続 run が必要な観測信号として alert/runbook へ渡す。
- **cron heartbeat**: 日次バッチ完了時に外形監視の heartbeat URL へ ping し、「cron が動かなかった」ことを検知する (qa-027 の cron 失敗監視。Better Stack の heartbeat monitor を利用 = qa-034)。
- rollup は `metrics_events` の未処理分のみを chunk 読取 (cursor) して集計し、1 呼出の CPU 10ms 予算に収める。生イベントのオンライン集計禁止 (B3) はここでも維持。

## 6. 環境構成 (qa-038 確定: 常設 staging を持たない / 2026-07-21 改訂)

> **改訂理由**: qa-034 は「production + staging の 2 環境」を確定していたが、**後発の qa-038【3】が常設 staging を明示的に否定**している（Worker / Turso DB / R2 バケット / secret を 2 組常時維持すると無料枠消費と運用導線が二重化し、C1・C2 と衝突するため）。2026-07-21 のユーザー確認により **qa-038 を正**と確定した。§12 の確定記録 #1 を上書きする。

| 環境 | Worker | DB | 用途 |
|---|---|---|---|
| local | `wrangler dev` (ローカル) | ローカル libSQL ファイル | 開発。secret は `.dev.vars` (git 管理外) |
| preview | PR ごとに払い出し、**PR close で破棄** | production DB は使わない (検証用の一時 DB またはローカル fixture) | PR 単位の動作確認。常設しない |
| production | `harness-hub` (§8 のドメイン) | `harness-hub-prod` | 本番 |

- **常設 staging は持たない**。migration の検証は preview と CI の破壊的 DDL 検査 (§7 G7) で行い、restore drill (§10) は一時 DB を都度作成して実施する。
- 環境ごとに R2 バケットは分離しない (packages は content-addressed で衝突しない)。preview は専用 prefix `preview/` を使用する。

## 7. CI/CD (GitHub Actions, qa-011)

| workflow | trigger | 内容 |
|---|---|---|
| `ci.yml` | PR / push (main・feature branch) / `workflow_dispatch` | **静的ゲート → install → test → bundle → deploy を単一 workflow 内で連鎖**（下記）。deploy job は main の push または main を明示した dispatch だけで実行され、全ゲート通過が前提 |
| `backup.yml` | cron `0 17 * * *` | `export-control-plane.ts` で決定論的 JSONL を生成 → gzip → R2 へ **`wrangler r2 object put --remote` で upload → 再 download + `cmp` で往復検証** → 成功を heartbeat 通知 |
| `cwv.yml` | 週次 cron / 手動 dispatch | `HUB_PUBLIC_URL` の同一 HTTPS origin に固定した protected `/catalog` を Lighthouse で計測。通常 session ではなく短命 read-only ticket を使い、未設定・計測不能を good と数えない |

- **backup.yml の export / upload 経路 (2026-08-03 tenant_data 反映)**: `packages/db/scripts/export-control-plane.ts` が生成する JSONL を日次保存形式の正本とする。全 control-plane table（Studio 拡張と `tenant_data_tombstones` を含む）を出力し、`extract-tenant-data-tombstones.ts` が後続 snapshot から manifest を抽出する。古い snapshot を復元するときは `restore-control-plane.ts --tombstone-manifest <manifest>` を必須にし、削除済み object 参照を再出現させない。upload は R2 アクセスキーを追加発行せず `wrangler` を用い、再 download 後の `cmp` で byte 一致まで確認する。Turso CLI / `TURSO_API_TOKEN` / `TURSO_DATABASE_NAME` はこの経路では不要。
- **成果物の採否判定は `verify-export-artifact.ts` に一本化する (2026-08-03 tenant_data 反映)**: workflow の shell で header を `grep` したり行数を `awk` で数えたりしない。判定の実体は `parseExportArtifact` (`packages/db/backup/export.ts`) で、header 形式・`format_version`・`allTables`（Studio 拡張を含む）との**集合一致**・header 宣言行数と実際の行数の一致まで fail-closed に見る。workflow 側に弱い検査を二重に置くと、**弱い方が先に判定してしまう**。実際、旧実装の「データ行 0 なら不採用」がこれに当たり、migration 済みだがまだ利用の無い本番 DB を 3 夜連続で失敗させていた (詳細は §10)。

**`ci.yml` の品質ゲート（qa-038【2】の required status checks に対応）**

> **正本は [docs/shared-layers.md](shared-layers.md) の「CI 品質ゲート登録簿 (G1〜G14)」** (2026-08-04 追記, `HarnessHub-yhc3`)。下表はデプロイ経路の文脈で参照するための要約であり、fail 条件・実行段・根拠 QA・local 入口を含む完全な定義は登録簿側にある。**ゲートを増減するときは登録簿を先に改訂し、本表はその写しとして追随させる** (以前は本表が G12 を、登録簿が G14 を落とすという双方向のドリフトが起きていた)。
| # | ゲート | 内容 |
|---|---|---|
| G1 | pnpm 強制 | corepack で pin + `packageManager` 検証 + `package-lock.json` / `npm-shrinkwrap.json` / `yarn.lock` / `bun.lockb` の混入検出 |
| G2 | lint / format | 静的整形検査 |
| G3 | typecheck | TypeScript strict |
| G4 | unit / integration test | tenant 分離 (SEC3)・検査 pipeline 挙動同値 (qa-010)・共通層 contract を含む |
| G5 | bundle 予算 (Worker) | OpenNext build 出力の gzip サイズ ≤ 3 MiB。**サーバー側実行コードのみ**が対象で、ブラウザへ配る client JS は G13 が別途測る |
| G6 | secret scan | 検査ロジック共有 package を CI からも呼ぶ (qa-038【2】) |
| G7 | 破壊的 DDL 検査 | drizzle migration の expand/contract 3 段階違反を検出 |
| G8 | OpenAPI / zod drift 検査 | 生成物と実装の乖離を検出 (qa-009) |
| G9 | axe a11y | 部品単体 + 画面結合の 2 段 (qa-018) |
| G10 | 共通層 duplicate detector | owner package 外の同名 export / 境界迂回 import に加え、**運用機構 (§3) の owner artifact 実在**と**認可 wrapper を迂回した route handler** を検出 |
| G11 | Core Web Vitals | main 反映後の定期計測 (PR 単位では Actions 無料枠を圧迫するため) |
| G12 | 認証・認可 静的検査 | `apps/hub/scripts/check-auth-gates.mjs` の 3 検査 — Auth.js 境界隔離 (D3) / 認可判定の単一集約 + route 例外の厳密一致 (SEC2 / AD-4) / dev 専用 provider の非存在 (I7)。静的ゲート段 |
| G13 | client JS 予算 | `next build` 出力から route ごとの First Load JS を gzip 実測し 120 KiB / route 超過で fail (G5 の Worker 予算とは別軸。qa-018 / frontend-spec §8) |
| G14 | OIDC / owner認可 release contract | tenant別OIDC開始フローと、owner関係roleを含む認可表・tenant分離を名指しで再実行 |

**ゲートが空振りしないための実行順序と前提検査 (2026-07-21 追記)**

- **Worker 成果物の生成は G4 より前**に行う。`check:bundle` と bundle contract test は `.open-next` を前提とするため、G4 の後に生成していた旧構成では bundle 検査が CI で常時 skip されていた (P10 F-15)。
- `pnpm --filter <pkg> run <script>` は **script 不在でも exit 0 になり得る**ため、G6 / G7 / G8 は実行前に `scripts/ci/check-required-package-script.mjs` で package.json 上の script 実在を fail-closed 検査する。ゲートの「緑」が「検査した結果の緑」であることを構造的に担保する。
- **Actions 設定台帳の突合**: `scripts/ci/actions-secrets-registry.json` を用途・種類・必須度・利用 workflow の正本とし、`scripts/ci/check-actions-secrets.mjs` が workflow の実参照と双方向で照合する。静的ゲートでは構造 drift を、手動 `--live` では GitHub 上の実投入状況も fail-closed で検査する。
- **G11 protected route の測定境界 (2026-08-02 / qa-133)**: `cwv.yml` は任意 URL を受け取らず、`HUB_PUBLIC_URL` の `/catalog` に限定する。GitHub Actions は通常の `AUTH_SESSION_SECRET` / `AUTH_ACCESS_TOKEN_SECRET` を持たず、`HUB_CWV_PROBE_*` から最大 5 分の署名 ticket を発行する。Worker は同じ secret と固定 tenant/workspace で検証し、URL から ticket を除去して `__Host-` / HttpOnly / Secure / SameSite=Strict Cookie へ移す。ticket・secret は Actions log、Lighthouse JSON、CWV report、artifact に保存しない。Worker/GitHub secret の投入、本番 deploy、初回実測は外部状態なので、投入前は workflow を失敗させ未計測として扱う。詳細と手順は [CWV probe 仕様反映受領書](features/feat-hub-foundation/cwv-probe-credential-spec-reflection-receipt.md) と feature runbook §1.1 を正とする。

- **`deploy.yml` への分離は行わない (2026-07-21 改訂)**。理由: feat-hub-foundation の acceptance「CI が test→deploy を完走する」は**単一 workflow run 内での連鎖**を判定条件としており、2 workflow に分けると別 run になって構造的に判定不能になる。ユーザー確認により `ci.yml` への統合を確定した。
- **main の明示再実行 (2026-08-01 / `HarnessHub-o2i.13`)**: 通常経路は main merge による push のまま維持する。docs-only merge など、`on.push.paths` の対象外で deploy run が起動しなかった場合だけ、`workflow_dispatch` で main の同一 commit を再配備できる。dispatch も `static-gates` と `test` を省略せず、feature branch では deploy しない。これは手元の Wrangler 操作や手動承認 gate を追加するものではなく、同じ CI の再実行経路である。
- deploy job の内容: 必須設定preflight → **Worker secret実投入検査** → productionへdrizzle migrate → `wrangler deploy`（`--var HUB_COMMIT_SHA:${GITHUB_SHA}`） →
  post-deploy `GET /health` → **配信版一致ゲート** → **稼働ビルド鮮度検査** → **smoke 直前の配信版再確認** → **OIDC start-flow smoke** → **DB/R2本番スモーク6項目** →
  **hearing実データE2E/SEC8スモーク** → 失敗時`wrangler rollback` (直前versionへ)。
  **常設stagingを経由しない** (§6 / qa-038【5】)。
- **配信版一致ゲート (2026-08-07 追補 / 「deploy 成功 ≠ 配信更新」)**: Workers は version (アップロード済みの版) と deployment (実際に配信される版) が別概念で、`wrangler deploy` 成功後も配信が入れ替わらない状態が成立する。deploy step が捕捉した version id (`steps.deploy.outputs.deployed_version`) を、直後のゲートが `/health` の `version` (§2 の `CF_VERSION_METADATA` 由来 = いま実行されている版) と突合する。Cloudflare は colo ごとに切替時刻が違うため単発の一致では足りず、**連続 3 回一致** (間隔 3 秒・上限 90 秒・`VERSION_GATE_STREAK` 等で調整可) を通過条件とし、不一致を観測したら計数を 0 へ戻す。期限内に到達しなければ `deployments list` / `versions list` を診断出力して exit 1 で止める (以降の smoke を古いコードへ走らせないための fail-closed)。通過判定は `/health` の JSON だけを根拠にし、wrangler の一覧出力は診断に限定する (表示仕様変更でパース失敗が素通りになるのを避けるため)。要求の正本は [観測性 addendum §2.11-2.12 の V7-a..f](../docs/features/feat-post-signin-landing-surface/landing-observability-investigation.md)、回帰固定は `apps/hub/tests/ci/production-auth-gates.test.ts` (記述) と `version-gate-behavior.test.ts` (実挙動を exit code で検査)。
- **稼働ビルド鮮度検査 (2026-08-08 / `feat-build-identity-deploy-freshness`)**: 配信版一致ゲートの直後・各 smoke の直前に、`apps/hub/scripts/check-deploy-freshness.mjs` が `/health.commit` と既定 branch HEAD を突合する。version_gate は「今 deploy した版が配信されたか」しか見ないため、**deploy 経路自体が長期間動いていない状態**（2026-08-07 の 4 日間未反映）は捉えられない。鮮度検査は不一致そのものではなく HEAD 到達からの**乖離継続時間**で判定し、しきい値の正本は script 定数 `DEFAULT_MAX_LAG_MINUTES` 1 箇所とする。commit 未申告・形式不正・到達不能は fail-closed で落とす。鮮度検査失敗時は自動 rollback の対象外（smoke 未実行のため「新版が壊れている」証拠が無く、戻せば素性不明の古い版へ後退するだけになる）。契約正本は [build-identity 実装追補](../specs/harness-hub-build-identity-deploy-freshness-addendum.md)、運用は [operations.md](features/feat-build-identity-deploy-freshness/operations.md)。
- **smoke 直前の配信版再確認 (2026-08-08 追補 / `HarnessHub-u9zq`)**: 配信版一致ゲートと最初の smoke の間には稼働ビルド鮮度検査が挟まる。その間に配信が旧版へ戻れば、ゲートを通したにもかかわらず smoke が旧版を検査する。run 31224919542 の実測では新旧の混在が**同一 colo (IAD) 内**で観測されており、切替は拠点単位ではなく拠点内でも段階的に進む。したがって「ゲート通過 = 以降ずっと新版」とは扱えない。`scripts/ci/assert-served-version.mjs` が smoke 直前に `/health` を再観測し、**連続 3 回一致** (間隔 2 秒・上限 60 秒) に達したときだけ通す。二つの検査は不一致の意味が違う — 配信版一致ゲートの不一致は「まだ届いていない」(待てば解消しうる途中経過)、こちらの不一致は「届いた版が保てていない」(smoke が旧版を検査する状態そのもの) である。通信失敗・HTTP エラー・JSON 不正・`version` 欠落はいずれも**不一致として数え**て連続計数を 0 へ戻す (取得できなかったことを「変化なし」と読み替えない)。一度一致してから崩れた場合は `flapped=true` として区別し、観測ごとの `cf-ray` 由来 colo とあわせて `--json` の証跡へ残す。**この検査の失敗も rollback しない** (下記 rollback 契約)。回帰固定は `apps/hub/tests/ci/smoke-version-recheck.test.ts` (実 HTTP サーバへ実プロセスを当てて exit code で検査) と `production-auth-gates.test.ts` (step 順序と rollback 抑止の記述)。
- **deploy preflight (2026-07-30追補)**: GitHub Actionsが未登録値を空文字へ変換する性質を踏まえ、
  migration前に`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_R2_API_TOKEN` /
  `CLOUDFLARE_ACCOUNT_ID` / Turso 2件 / `HUB_HEALTH_URL` / `HUB_PUBLIC_URL`の
  存在を一括確認する。欠落時は設定名だけを出して停止し、secret値は出力しない。
- **OIDC start-flow smoke (2026-07-30追補)**: HarnessHub tenantのprovider/callback、
  未登録tenantの404、CSRF cookie/token、native form POST後のGoogle 302、
  `response_type=code`、identity scope、`state`、`nonce`、PKCE S256を本番URLで確認する。
  人のGoogle資格情報をCIへ置かないためcallback後の実ログイン/JITは自動化せず、
  release recordの手動E2E証跡と分ける。
- **hearing実データE2E/SEC8スモーク (2026-08-02追補 / `HarnessHub-o2i.13`)**:
  `pnpm --filter @harness-hub/hub run smoke:hearing-production` がDB/R2スモークの直後に走る。
  **新しいsecretを要求せず**、既存の`TURSO_*`と`vars.HUB_PUBLIC_URL`だけで成立させる。
  session専用の提出はrouteと同じrepository→service合成をserver側で実行し、TOKEN資格の
  `ai-jobs/pull`・`complete`は本番URLへ実HTTPで送る。Device Flowの`code`/`token`は認証不要
  endpointなので署名鍵なしで**本物のaccess token**を取得でき、sessionが要るapproveだけをDBの
  CASで代行する。状態変更要求には必ず`origin`を付ける (無いと`untrusted_origin`で認可判定へ
  到達せず検査が空振りする)。使い捨てtenant 2件は`finally`で全行削除し、**残行数0でなければ失敗**
  させる。検査はDevice token取得・受付番号発番・同一transaction enqueue・SEC5 (年収非保存)・
  SEC8 (他tenantに204 / header詐称に404 `tenant_mismatch`（資源存在を伏せる） / 非claim tokenに403 `not_owner`)・
  workspace header必須の400・claim後のDB状態・complete後の`review`往復・session専用契約の
  `credential_not_allowed`の10点。
- **owner認可の名前付きゲート (2026-07-30追補)**: G14は`owner`をDB roleとして扱わず、
  tenant境界確認後に対象resourceとの関係から合成する既存契約を、全action×role表、
  非owner拒否、cross-tenant拒否とともに名指しで再実行する。
- **migrate step の契約 (2026-07-25 / P13 実装確定)**: `packages/db/scripts/migrate-deploy.ts` を `--dry-run` → 本適用の 2 段で呼ぶ。`TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` が空なら step を **exit 1 で止める** (未投入のまま deploy へ進むと「migrate 済み」の緑が意味を失うため)。台帳は drizzle 公式の `__drizzle_migrations` を単一の正とし、`__drizzle_migrations` 不在のみ applied=0 と解釈して他の SQL 例外は再送出する (接続不能を「未適用」と誤読しないため)。適用後件数が journal 件数と一致しない場合は exit 1。
- **本番スモークテスト (2026-07-25 / P13 実装確定)**: `packages/db/scripts/smoke-production.ts --url <turso> --r2-bucket <name>` が S1 接続 / S2 ULID 単調性 / S3 release 不変性 / S4 R2 往復 / S5 audit chain / S6 export→restore dry-run を検査し、**6 項目すべての ok** と検証データ cleanup 成功を満たさない限り exit≠0。通常実行では作成した行と R2 オブジェクトの削除を `finally` で試み、実行された cleanup の失敗自体をスモーク失敗として扱う。ただし force-cancel / runner 消失ではプロセス内 `finally` を保証できない。DB tenant fixture は専用 lease と runner 独立 sweeper で再試行するが、cron の15分は設定間隔であり、GitHub Actions の schedule 遅延を含む回収時刻の上限や SLA は保証しない。
- デプロイは main merge で全自動 (qa-034 確定)。path filter で run が起動しなかった場合のみ main の明示 dispatch で同じ全ゲートを再実行する。手動 gate は置かず、post-deploy health + smoke + rollback を防波堤とする。
- **rollback step の契約 (2026-07-25 / P13 実装確定)**: `if: failure()` で起動し、**`wrangler rollback` は deploy step が success のときだけ**実行する (deploy 前に落ちた失敗で直前 version を巻き戻すと、無関係な回帰を持ち込むため)。**DB は自動 rollback しない** — migration は expand-only (§7 G7) で前方互換なので、旧 code は新 schema 上で動作する。step の exit code は rollback 自体の成否のみを表し、元の失敗を打ち消さない。**配信版一致ゲートが失敗した場合も rollback しない (2026-08-07 追補)** — 配信されているのが元から旧版なら、戻す対象は存在せず、そこで `wrangler rollback` を打つと未昇格の原因である古い版への固定をこちらから強めてしまう。実際 2026-08-07 に、8/4 の失敗時 rollback で固定された版 (`2e4a6c5b`) が 2 run 連続で配信され続け、smoke が古いコードを検査して失敗し、その失敗がまた rollback を呼ぶ悪循環になっていた。**稼働ビルド鮮度検査の失敗も rollback しない (2026-08-08 追補)** — 鮮度検査で止まった時点で後続 smoke は未実行であり、「新 version が壊れている」証拠が無い。戻すと素性を確認できない古い版へ後退するだけになる（version_gate 除外と同型）。**smoke 直前の配信版再確認の失敗も rollback しない (2026-08-08 追補 / `HarnessHub-u9zq`)** — この時点でも smoke は 1 件も走っておらず「新 version が壊れている」証拠が無い。加えてこの失敗は「配信版が deploy した版で安定していない」状態そのものなので、`wrangler rollback` を打っても**どの版へ戻るのかが確定しない**。戻す判断の材料が無い以上、戻さないのが正しい。
- **GitHub Actions secret / variable 台帳 (2026-07-29 実装反映)**: 正本は [`scripts/ci/actions-secrets-registry.json`](../scripts/ci/actions-secrets-registry.json)。手動投入が必須なのは secret 6 件 (`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_R2_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` / `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` / `BACKUP_HEARTBEAT_URL`) と variable 2 件 (`HUB_HEALTH_URL` / `HUB_PUBLIC_URL`) の計 8 件。任意は secret 1 件 (`NOTION_TOKEN`) と variable 3 件 (`NOTION_DB_SKILL_LIST` / `INTAKE_NOTION_DATABASE_ID` / `NOTION_DB_IMPROVEMENT_REQUEST`)、`GITHUB_TOKEN` は Actions 自動注入である。値や投入済み判定を文書へ複製せず、`node scripts/ci/check-actions-secrets.mjs --live` の結果を現在状態の正とする。
- **Notion 系 5 件は「任意だが条件付き必須」(2026-07-28 / `HarnessHub-5u5k`)**: これらはメタ層 (`governance-check.yml`) 専用で、プロダクト層の deploy には関与しない。`NOTION_TOKEN` 未投入なら該当 step は skip し workflow は成功するが、**投入した場合は DB ID 3 件 (variable) がすべて必要**であり、欠けていれば `prepare notion config` step が exit 1 で落ちる (未設定のまま「検査したつもりの緑」を出さないため)。DB ID に秘匿性は無いので secret ではなく variable で持つ。判定は job-level env の真偽値 `HAS_NOTION_TOKEN` 経由で行う — step-level `if` から同じ step の `env:` を参照すると、Actions の評価順 (`if` → `env` の順) により式が恒久的に false になり、secret を投入しても step が永久に skip される fail-open になるため (再発は `scripts/lint-workflow-step-guard.py` が全 workflow に対し fail-closed で遮断する)。

- **R2 専用アクセスキーは発行しない (2026-07-25 確定)**。`R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_ACCOUNT_ID` の 3 件は wrangler 経路へ統一したため台帳から削除した (§4.5 が「Workers binding 利用時は不要」としていた線に実装を寄せた)。
- **Cloudflare token の最小権限分離 (2026-07-29 / `HarnessHub-bda4`)**: `CLOUDFLARE_API_TOKEN` は Workers deploy / rollback 専用で R2 write を持たせず、`CLOUDFLARE_R2_API_TOKEN` は backup と本番 smoke の R2 往復専用で Workers Scripts を持たせない。Wrangler の `r2 object put/get --remote` は Cloudflare REST API を使い、bucket-scoped の `Workers R2 Storage Bucket Item Write` は S3 互換 API 専用で利用できないため、R2 token は account-scoped の `Workers R2 Storage Write` とする。実環境への投入状態と workflow 実走結果は台帳の `--live` 検査と Actions run を証跡とし、文書だけで達成扱いにはしない。
- **main反映後の障害記録 (2026-07-30)**: PR #612後の`hub-ci` run
  `30518334455`は、R2専用token未登録によりS4のWrangler object putで失敗した。
  S1〜S3とcleanupは成功し、Worker rollbackも成功した。追補preflightは同じ欠落を
  migration/deploy前に検出するが、token発行・GitHub投入・main完走の外部証跡が揃うまで
  `HarnessHub-bda4`を完了扱いにしない。
- GitHub Actions 無料枠 (private repo 2,000 分/月) は §11 の予算表で管理。

## 8. ドメイン・DNS・TLS・メール (qa-034 確定: 既存保有ドメイン流用)

- Hub URL: 既存保有ドメインのサブドメイン `hub.<domain>` を Cloudflare DNS で Worker routes へ割当 (追加費用 0 円・C2 完全維持)。TLS は Universal SSL (自動)。
- **Resend 送信ドメイン** (qa-026 で初期構築に含めると確定): 送信サブドメイン (例: `mail.<domain>`) に SPF (`TXT`)・DKIM (`TXT` ×3)・Return-Path (`CNAME`) を Cloudflare DNS へ登録。DMARC (`p=none` から開始) も併設。
- OIDC callback URL はドメイン確定後に各テナント IdP へ登録するため、**ドメインは Stage 1 開始前に確定が必要** (後変更は全テナント設定変更を伴う)。
- workers.dev サブドメインは preview 専用とし、production では無効化 (重複コンテンツ・混同防止)。

## 9. 監視・SLO 運用 (qa-019 / qa-027)

- **/health endpoint**: `GET /health` (認証なし・rate limit 対象外)。Turso `SELECT 1` + R2 head を検査する。
  - **応答契約 (2026-07-21 調停 / 2026-08-08 commit 追加)**: `{ status, version, commit?, checkedAt, dependencies[] }`。`dependencies[]` の各要素は `{ name, status, latencyMs, detail? }` で、`name` に `db` / `r2` / `runtime-config` が入る。本節は当初 `{ status, db, r2, version }` と書いていたが、`packages/schemas` の契約スキーマ・実装・test-design が `dependencies[]` 形を採っており二重正本になっていた (P10 指摘 F-11)。**依存を追加するたびにトップレベルのキーが増える形は契約が破壊的に変わる**ため、配列形を正本とする。
  - **`commit` (2026-08-08 / V6)**: optional。値は 40 桁小文字 hex（`^[0-9a-f]{40}$`）のみ。`version` は Cloudflare 採番の版 id なので「いま配信されている版」は分かっても「それが repository のどの commit か」は分からない。`commit` がその対応を認証なしで返す。埋込が無い環境では key ごと欠落させ、`unknown` 等の代替値は入れない（「素性不明」と「素性 = その値」を区別するため）。供給は deploy 時の `HUB_COMMIT_SHA`（§2）。
  - **critical の区分 (2026-07-21 確定)**: **Turso 失敗のみ down (HTTP 503)**、**R2 失敗は degraded (HTTP 200 + body で通知)** とする。本節は当初「失敗時 503」と一括していたが、§10 の縮退マトリクスが「R2 停止 → catalog 閲覧は継続。publish/install のみ停止」と定めており、応答できている時間まで 503 にすると SLO のエラーバジェットを過剰消費する (誤計測) ため区分する。§10 を正とした調停。
  - **未プロビジョニング時**: secret 未投入は `down` (503) とする。200 を返すと外形監視が可用性ありと誤計測し SLO 計測そのものが壊れるため。初回構築の順序制約は runbook §1 を参照。
- **外形監視 (Better Stack Free, qa-034)**: production `/health` を 3 分間隔で監視 + cron heartbeat (§5) + status page (常設 staging monitor は不要 = §6)。無料枠 10 monitors・heartbeat 10 本・商用利用可 (公式確認 2026-07-17)。SLO 99.5%/月の一次計測源。
- **SLO 運用**: 可用性 99.5%/月 (許容停止 約 3.6 時間/月 = 30 日あたり 12,960 秒)。エラーバジェット消費は外形監視の downtime + Workers analytics の 5xx 率で算定し、**消費 70% で警告し信頼性作業を優先・消費 100% で公開機能の変更を凍結** (qa-019)。本節は当初 100% の凍結のみを定めていたが、凍結まで無反応だと是正が間に合わないため、§4 の Turso 使用量監視と同じ 70% 警告段を 2026-07-25 に追加した。
- **監視設定の正本 (config as code, 2026-07-25 確定)**: Better Stack へ投入する monitor / heartbeat / status page の要求内容は [`apps/hub/monitoring/better-stack.monitors.json`](../apps/hub/monitoring/better-stack.monitors.json)、SLO 算定規則とエラーバジェット方針は [`apps/hub/monitoring/slo-dashboard.json`](../apps/hub/monitoring/slo-dashboard.json) を機械可読な正本とする。**ダッシュボード上の手動設定を正本にしない** (レビュー・再現・差分追跡ができず、設定が消えたことを検知できないため)。設定値の回帰は `apps/hub/tests/monitoring/monitoring-config.test.ts` (HF-A3-SLO-001) が固定する。
  - **適用状態の分離 (fail-closed)**: 「設定を書いた」ことと「外部へ適用した」ことを `application_state` / `applied_at` / `external_id` で区別し、実適用まで `pending_credentials` / `null` を保つ。さらに外部資源が存在しても monitor 停止などで収集不能なら SLO 側を `verdict.status = collection_blocked`（観測開始日時なし）とする。**設定ファイルや external ID の存在を「監視稼働」「99.5% 達成」と読み替えない** (§9 の計測が動いていないのに受入条件 A3 を合格にしてしまうのを防ぐ)。
  - **観測状態の実測 (2026-08-01 追加, fail-closed)**: `verdict` は散文や dashboard の見た目ではなく [`apps/hub/scripts/verify-slo-observation.mjs`](../apps/hub/scripts/verify-slo-observation.mjs) の実測を正本とする。公開 status page の `/index.json`（**認証不要**＝API token を持たない者でも検証できる）から `status_history` を読み、**進行中の当日と `not_monitored`（無データ）の日を窓から除いた**観測済み日数・downtime 秒を数え、`slo-dashboard.json` の `verdict` と突合する（一致 exit 0 / 不一致 exit 1 / **実測不能 exit 2**）。
    - **`not_monitored` を「監視停止」と読まない**: これは「その日は監視対象が存在せずデータが無い」を表し、status page の HTML アイコンは**現在状態ではなく 30 日履歴全体の代表**である。2026-07-28 にこれを paused と誤読して `collection_blocked` を記録した実例があるため、判断は必ず `/index.json` の `status` フィールドで行う。
    - **観測完了 ≠ 合格**: 観測済みが 30 日に達した時点の verdict は `observation_complete_pending_application_error_rate` であり、`blocker: workers-analytics-5xx-rate-not-collected` を保つ。外形監視は算定式の片側にすぎず、**外形単独で 99.5% 達成を主張しない** (qa-019)。
    - **運用判定と開発完了の分離 (2026-08-02 / qa-123)**: 30 日観測と Workers Analytics 5xx 率の最終判定は qa-019 / qa-116 のまま維持する。一方、ユーザーが当該 follow-up の追加追跡を不要と判断した場合は `completion_evidence.status=not_applicable` で delivery closure から切り離せる。これは waiver（追跡免除）であり SLO PASS ではない。再開時は issue を reopen または再起票し、同じ CLI / runbook / 生データ契約で再検証する。
  - **秘密の扱い**: Better Stack API token と heartbeat URL は設定ファイルへ保存せず、API token は投入時のみ環境変数 (`BETTER_STACK_API_TOKEN`)、heartbeat URL は用途別に Worker secret `CRON_HEARTBEAT_URL` と GitHub Actions secret `BACKUP_HEARTBEAT_URL` へ渡す (§2 secret 台帳と同じ規律)。設定ファイルが保持するのは binding 名だけで、2 本は別の heartbeat 資源へ結び付ける。
- **Workers 側**: observability logs 有効化 + Workers analytics (p95 レイテンシ・エラー率)。SLO ダッシュボードは Cloudflare dashboard + 外形監視の status page で代替 (追加サービスなし)。
- **アプリ内運用通知 (インフラ追加なし、qa-027)**: AI キュー滞留・Resend 送信失敗・ingest 異常値・Turso 使用量閾値は notifications (アプリ内) で provider-admin へ通知。
- **ポストモーテム**: ユーザー影響のある障害は blame-free 振り返りを issue 化し、再発防止を自動化候補へ接続 (qa-019)。

## 10. バックアップ・DR (qa-019)

- **RPO ≤ 24h**: 日次 export (backup.yml)。`export-control-plane.ts` の JSONL を gzip し R2 へ保存する。salary / client secret は暗号文のまま転写し、export 経路で復号しない (qa-032)。
  - **全テーブル 0 行の断面も「採用する」(2026-07-28 実装反映 / `HarnessHub-vns9`)**。空の DB を写した断面は restore すれば空の DB が再現するため、「復元できないバックアップを成功と数えない」(qa-019) には反しない。逆に 0 行を失敗にすると、稼働直後のまだ利用の無い期間じゅう日次 backup が赤で埋まり、**本物の障害がその赤の中に紛れる**。ただし採用は無言では行わず `::warning::` を残す (「バックアップは取れている」という読み違えを防ぐため)。
  - この「採用する」は **§10 の restore drill の「空 DB の復元は drill 成立の根拠にしない」と矛盾しない**。前者は*日次成果物として保存に値するか*の判定、後者は*復元手順が実証されたと言えるか*の判定であり、判断対象が異なる。空断面は保存されるが、drill の成立根拠には数えない。
  - artifact 単体では**「現行 `allTables` と同じ schema 集合を持つ別 DB を見ていた」ことは切り分けられない**。`verify-export-artifact` が保証するのは現行 schema 集合・形式・行数整合までで、接続先 URL 自体の正当性は GitHub Secret (`TURSO_DATABASE_URL`) の運用境界で管理する。現時点の `allTables` は29テーブルだが、固定件数ではなく schema barrel を正本とする。
- **RTO ≤ 4h (目標)**: runbook — (1) 空の一時 DB または新 Turso DB を用意 → (2) `restore-control-plane.ts` で最新 JSONL を restore → (3) report の `ok` / `chainOk` と table / index 数を確認 → (4) 障害復旧時だけ secret の URL/token 差替 → (5) `/health` 確認。
- **restore drill**: 四半期ごとに**一時 DB** へ実 restore し、行数・整合検査まで実施 (常設 staging は持たない = §6)。**復元できないバックアップを成功と数えない** (qa-019)。
  - **単一経路の検証 (2026-07-26 実装反映)**: backup.yml が保存する JSONL を空 DB へ `restore-control-plane.ts` で戻し、header / schema / 行数 / audit hash chain / salary・secret 暗号断面を同じ CLI で検査する。日次形式・四半期 drill・本番復旧の入力形式とコマンドを揃え、別経路だけが緑になる偽成功を作らない。
  - **空 DB の復元は drill 成立の根拠にしない**。実データを含む断面で実走する (P13 は本番の実データ 7 行断面で実施)。
  - **既存 DB への誤上書きは fail-closed で止まる**: スキーマ適用済み DB へ再 restore すると `CREATE TABLE` 衝突で exit 1 となることを実測済み。
- **縮退マトリクス (§6.1 の実装形)**:

| 依存障害 | 影響 | 縮退動作 |
|---|---|---|
| Turso 停止 | 全 API 不可 | Hub Web は縮退バナー表示。**導入済み Skill・公開済み WebApp は影響なし** (§6.1)。新規公開・追加・更新のみ停止 |
| R2 停止 | package 取得/upload 不可 | catalog 閲覧は継続 (DB のみ)。publish/install を一時停止表示 |
| Resend 停止 | メール不達 | アプリ内通知が正本のため情報欠落なし (D6)。リトライ + 失敗ログ |
| テナント IdP 停止 | 当該テナントのみログイン不可 | 他テナントへ影響なし。既存セッションは有効期限まで継続 |
| GitHub Actions 停止 | deploy/backup 停止 | 稼働中 Hub に影響なし。backup 欠落は heartbeat 未達で検知し手動 export |

## 11. 無料枠予算表 (C2 ガード)

| サービス | 無料枠 (確認 2026-07-17) | 監視方法 / 閾値 |
|---|---|---|
| Workers | 10 万 req/日・CPU 10ms/呼出・bundle 3MiB | Cloudflare analytics 月次レビュー。req 70% で警告 |
| **Workers cron trigger** | **5 本 / Cloudflare アカウント全体**（Worker 単位ではない = §5。他プロジェクトと枠を共有する） | TODO(human) |
| R2 | 10GB・Class A 100万/月・Class B 1,000万/月 | 同上 + backup lifecycle (§3) で増加抑制 |
| Turso | 5GB・読取 5 億行/月・書込 1,000 万行/月 | **日次 cron 監視 (§5)。70% 警告 / 90% で R4-reopen** |
| Resend | 3,000 通/月・100 通/日 | 送信キューのバッチ分割 (D6)。失敗ログ月次レビュー |
| GitHub Actions | 2,000 分/月 (private) | 月次レビュー。CI 時間の恒常増は cache 改善で対処 |
| Better Stack | 10 monitors・heartbeat 10・3 分間隔 (Free) | monitor 数を予算内に維持 (production + heartbeat 3 本で開始) |

- 予算超過が恒常化した場合の第一エスカレーションは Workers Paid ($5/月) であり、C2 (固定費ゼロ) の再交渉としてユーザーへ差し戻す (D1 caveat と同経路)。

## 12. 確定記録 (2026-07-17 ユーザー確認 = qa-034)

| # | 項目 | 決定 | 備考 |
|---|---|---|---|
| 1 | 環境構成 | ~~production + staging の 2 環境~~ → **qa-038 により上書き (2026-07-21)**: 常設 staging を持たず preview は PR ごとに使い捨て | 上書き理由: 2 組常時維持は無料枠消費と運用導線を二重化し C1・C2 と衝突する (qa-038【3】)。migration 検証は CI の破壊的 DDL 検査、restore drill は一時 DB で代替 (§6/§7/§10) |
| 2 | 独自ドメイン | **既存保有ドメインを流用** (AI 推奨に同意) | `hub.<domain>` + `mail.<domain>` のサブドメイン運用 (§8)。追加費用 0 円で C2 完全維持。Resend SPF/DKIM は qa-026 どおり初期構築 |
| 3 | 外形監視 | **Better Stack Free** (AI 推奨に同意) | 10 monitors・3 分間隔・heartbeat・status page・商用利用可 (§9)。UptimeRobot Free は 2024-12 以降非商用限定のため棄却 (Vercel Hobby と同型の規約リスク回避) |
| 4 | 本番デプロイ | **main merge で全自動** (AI 推奨に同意) | 単一 `ci.yml` 内で 全ゲート green → production migrate → deploy → post-deploy /health → 失敗時 wrangler rollback (§7)。path filter 非発火時は main の明示 dispatch で同じ run を再実行できる。**staging 経由と deploy.yml 分離は 2026-07-21 に取りやめ** (qa-038 / R-02) |

## 13. 構築優先順位によるインフラ有効化順 (2026-07-18 追記)

正本は [system-design-overview.md](system-design-overview.md) §3「構築優先順位」。共通リソースを先に作ることと、低優先機能を先に作ることを混同しない。単一 Worker/Turso/R2 は共有するが、route・cron・通知は必要な phase で段階的に有効化する。

| phase | 有効化するもの | 後段へ送るもの |
|---|---|---|
| **P0 認証基盤** | production、Worker/DB migration、tenant/workspace、OIDC callback、Auth secret、共通認可/監査、`/health`、CI の tenant 分離 test | metrics rollup、週次サマリー、dashboard monitor はまだ不要 |
| **P1 ヒアリング** | HearingSheet/AiJob/notification の migration、pull job、生成完了通知、キュー滞留監視 | R2 package 配布は P2 |
| **P2 Hub/パイプライン** | private R2 package bucket、Web/CLI upload、検査、content-addressed 保存、install/download Worker 導線、orphan 通知 | 承認 queue UI は P5 でも監査記録はこの時点から有効 |
| **P3 改善/Docs** | feedback/doc AiJob kind、Feedback→修正版 Build の冪等作成、Markdown/添付保存が必要な場合の R2 prefix | — |
| **P4 ユーザー/効果** | salary 鍵、metrics ingest/rollup cron、Turso 使用量監視、週次通知 | S09 dashboard 専用の可視化は P5 |
| **P5 dashboard/統制** | dashboard/承認/監査 UI 用 route と外形確認 | — |

各 phase の migration は `tenant_id` と必要な `workspace_id` を最初から必須にし、production 反映前に 2 tenant fixture の分離テストを通す。1 tenant/1 Project 固定の環境変数は作らない。
