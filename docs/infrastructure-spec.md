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

## 1. リソーストポロジ (C2: 固定費 0 円構成)

```text
[利用者ブラウザ] ──HTTPS──▶ Cloudflare Workers (単一 Worker, D1)
[Publisher CLI]  ──HTTPS──▶   ├─ Next.js (@opennextjs/cloudflare): Hub Web + /api/v1
                              ├─ R2 binding: packages (immutable) / backups
                              ├─ @libsql/client (HTTP) ──▶ Turso Free (control-plane DB, D2)
                              ├─ Resend API (メール補助, D6)
                              └─ cron triggers (§5)
[GitHub Actions] ── CI/CD (§7) + 日次 DB export (§10) ──▶ wrangler deploy / R2
[外形監視 (§9)]  ──▶ GET /health (3〜5 分間隔) + cron heartbeat
```

| リソース | サービス / プラン | 用途 | 根拠 |
|---|---|---|---|
| Hub 実行環境 | Cloudflare Workers Free (単一 Worker) | Next.js SSR + REST API + cron | D1 / qa-003 |
| パッケージ実体 | Cloudflare R2 Free (10GB) | immutable PackageRegistry + DB バックアップ | qa-004 / C4 |
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
| `ASSETS` | assets | `.open-next/assets` | 静的アセット (edge 配信) |
| `CF_VERSION_METADATA` | version_metadata | Cloudflare 採番の version id | `/health` の `version` に載せ「いま配信されている版」を応答から特定可能にする (§9)。build 時注入と違い **rollback 後も実配信版と一致する**ため、障害時のロールバック判断の一次情報になる (2026-07-21 追加) |
| `APP_BASE_URL` | var | 環境別 URL (§8) | 絶対 URL 生成・OIDC callback |
| `ENVIRONMENT` | var | `production` / `preview` | 環境分岐 (ログ・通知の抑制)。常設 staging は持たない (§6) |

- **secret 台帳 (`wrangler secret put`。コード・DB へ平文を持ち込まない = qa-020)**:

| secret 名 | 用途 | ローテーション |
|---|---|---|
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | libSQL 接続 | token 失効時・年 1 回 |
| `AUTH_SECRET` | Auth.js JWT cookie 署名 | 年 1 回 (全セッション失効を伴う) |
| `RESEND_API_KEY` | メール送信 (SEC9) | 年 1 回 |
| `SALARY_ENC_KEY` | users.salary の AES-GCM 鍵 (qa-032) | 計画ローテーション時は再暗号化 migration を伴う (runbook 化) |
| `IDP_SECRET_<tenant_slug>` | テナント別 OIDC client secret (`idp_connections.client_secret_ref` が参照) | テナント IdP 側の更新に追随 |
| `CRON_HEARTBEAT_URL` | scheduled handler が日次ジョブ完走時に ping する外形監視の heartbeat URL (§5/§9)。URL 自体が事実上の秘匿情報のため wrangler.jsonc の var ではなく secret で投入する | 監視側で再発行したとき |

- **サイズ予算**: Worker bundle ≤ 3 MiB (gzip, Free 上限) を CI ゲートで計測 (§7)。恒常超過は Workers Paid ($5/月) 移行と C2 再交渉をユーザーへ差し戻す (D1 caveat)。
- **CPU 予算**: Workers Free は CPU 10ms/呼出。API はポーリング統一 (qa-031) で接続保持なし。cron の集計は chunk 処理 (§5) で 1 呼出の CPU を抑える。恒常超過時は D1 caveat と同じ経路で Paid 移行を再交渉。
- **レート制限 (SEC8)**: Cloudflare の Rate Limiting Rule (Free 枠) を認証系 (`/api/v1/device/*`) に割当て、その他はアプリ層 (認可ミドルウェア前段) の IP + principal 制限で補完。数値は feature P02。

## 3. R2 バケット設計

| バケット | key 設計 | 書込経路 (それ以外は禁止) | 公開 |
|---|---|---|---|
| `harness-hub-packages` | `packages/<sha256>.zip` (content-addressed, **immutable**) | publish pipeline (`PUT /publish/:id/package` 検査通過後) のみ | 非公開。配信は Worker 経由 (認可 + 監査) |
| `harness-hub-backups` | `db-export/<YYYY>/<YYYY-MM-DD>.sql.gz` | GitHub Actions 日次 export (§10) のみ | 非公開 |

- packages は上書き・削除を行わない (content hash 一致 = 同一実体。suspend は DB 側 status で表現)。
- S01 の Web upload と Publisher CLI upload は同じ staging prefix・検査 pipeline・content hash 確定処理へ収束させる。ブラウザから R2 への公開 write URL は発行しない。
- install/download は Worker の `POST /api/v1/harnesses/:projectId/install` を必ず経由する。R2 bucket/object key を UI/API へ返さない。Stage 0 で raw ZIP を採用した場合だけ、安定版に固定した TTL 5 分以内・単回の短命 URL を発行する。
- backups の保持: **直近 90 日 + 各月 1 日断面を 12 ヶ月** (R2 lifecycle rule で自動削除)。salary は暗号文のまま格納される (qa-032: バックアップ断面にも平文を残さない)。
- 無料枠: 10GB / Class A 100万 ops/月 / Class B 1,000万 ops/月。使用量は月次レビュー (§11)。

## 4. Turso 構成 (D2)

- DB: `harness-hub-prod` (常設はこの 1 つのみ。qa-038 確定 / §6)。preview・restore drill 用の DB は都度作成し使い捨てる。リージョンは東京近接 (AWS ap-northeast-1 系) を選択。
- 接続: `@libsql/client` (HTTP) のみ。native binding はないため、接続情報は §2 の secret 台帳で管理。
- migration: `drizzle-kit generate` で SQL を生成しリポジトリ管理 → CI の deploy job (§7) が **deploy 前に production へ直接適用** (qa-038【5】。常設 staging を経由しない)。破壊的 DDL は expand/contract 3 段階を強制 (§7 G7)。**SQLite 方言互換を維持し、D1 退避経路を温存する** (D2 ヘッジ。Drizzle は libSQL/D1 両対応)。
- 無料枠 (公式確認 2026-07-17): ストレージ 5GB・読取 5 億行/月・書込 1,000 万行/月・100 DB。
- 使用量監視 (qa-031 の帰結): 日次 cron (§5) が Turso Platform API から usage を取得し、**閾値 70% で admin 通知 (アプリ内)・90% で保持期間導入の R4-reopen 起票を促す**。metrics_events 無期限保持の代償措置。

## 5. cron トリガ設計 (Workers cron + GitHub Actions cron)

backend-spec §7 の 6 ジョブを、cron trigger 数上限と CLI 依存 (turso dump) を考慮して 3 系統に集約する。時刻は UTC (JST = UTC+9)。

| cron 式 (UTC) | 実行主体 | ジョブ (順次実行・ジョブ単位 try/catch) |
|---|---|---|
| `0 15 * * *` (JST 0:00) | Workers scheduled handler | ① metrics rollup (日次) → ② Turso 使用量監視 → ③ orphan_candidate 通知 → ④ token/認可コード掃除 |
| `0 0 * * 1` (JST 月 9:00) | Workers scheduled handler | 週次 rollup 確定 + 週次サマリメール (opt-in、100 通/日制限のバッチ分割 = D6/qa-027) |
| `0 17 * * *` (JST 2:00) | GitHub Actions (`backup.yml`) | DB export → gzip → R2 `harness-hub-backups` へ upload (§10) |

- scheduled handler は `event.cron` で dispatch する単一実装。各ジョブは冪等 (再実行安全) とし、失敗はジョブ単位で記録して後続を止めない。
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
| `ci.yml` | PR / push (main・feature branch) | **静的ゲート → install → test → bundle → deploy を単一 workflow 内で連鎖**（下記）。deploy job は main への push のみで実行され、全ゲート通過が前提 |
| `backup.yml` | cron `0 17 * * *` | Turso CLI で dump → gzip → R2 へ S3 API で upload → 成功を heartbeat 通知 |

**`ci.yml` の品質ゲート（qa-038【2】の required status checks に対応）**

| # | ゲート | 内容 |
|---|---|---|
| G1 | pnpm 強制 | corepack で pin + `packageManager` 検証 + `package-lock.json` / `npm-shrinkwrap.json` / `yarn.lock` / `bun.lockb` の混入検出 |
| G2 | lint / format | 静的整形検査 |
| G3 | typecheck | TypeScript strict |
| G4 | unit / integration test | tenant 分離 (SEC3)・検査 pipeline 挙動同値 (qa-010)・共通層 contract を含む |
| G5 | bundle 予算 | OpenNext build 出力の gzip サイズ ≤ 3 MiB |
| G6 | secret scan | 検査ロジック共有 package を CI からも呼ぶ (qa-038【2】) |
| G7 | 破壊的 DDL 検査 | drizzle migration の expand/contract 3 段階違反を検出 |
| G8 | OpenAPI / zod drift 検査 | 生成物と実装の乖離を検出 (qa-009) |
| G9 | axe a11y | 部品単体 + 画面結合の 2 段 (qa-018) |
| G10 | 共通層 duplicate detector | owner package 外の同名 export / 境界迂回 import を検出 |
| G11 | Core Web Vitals | main 反映後の定期計測 (PR 単位では Actions 無料枠を圧迫するため) |

- **`deploy.yml` への分離は行わない (2026-07-21 改訂)**。理由: feat-hub-foundation の acceptance「CI が test→deploy を完走する」は**単一 workflow run 内での連鎖**を判定条件としており、2 workflow に分けると別 run になって構造的に判定不能になる。ユーザー確認により `ci.yml` への統合を確定した。
- deploy job の内容: production へ drizzle migrate → `wrangler deploy` → post-deploy `GET /health` 確認 → 失敗時 `wrangler rollback` (直前 version へ)。**常設 staging を経由しない** (§6 / qa-038【5】)。
- デプロイは main merge で全自動 (qa-034 確定)。手動 gate は置かず、post-deploy health + rollback を防波堤とする。
- GitHub Secrets 台帳: `CLOUDFLARE_API_TOKEN` (Workers deploy + R2 write 権限を分離した 2 token 推奨)・`CLOUDFLARE_ACCOUNT_ID`・`TURSO_AUTH_TOKEN` (環境別)・R2 アクセスキー (backup 専用・backups バケット限定)。
- GitHub Actions 無料枠 (private repo 2,000 分/月) は §11 の予算表で管理。

## 8. ドメイン・DNS・TLS・メール (qa-034 確定: 既存保有ドメイン流用)

- Hub URL: 既存保有ドメインのサブドメイン `hub.<domain>` を Cloudflare DNS で Worker routes へ割当 (追加費用 0 円・C2 完全維持)。TLS は Universal SSL (自動)。
- **Resend 送信ドメイン** (qa-026 で初期構築に含めると確定): 送信サブドメイン (例: `mail.<domain>`) に SPF (`TXT`)・DKIM (`TXT` ×3)・Return-Path (`CNAME`) を Cloudflare DNS へ登録。DMARC (`p=none` から開始) も併設。
- OIDC callback URL はドメイン確定後に各テナント IdP へ登録するため、**ドメインは Stage 1 開始前に確定が必要** (後変更は全テナント設定変更を伴う)。
- workers.dev サブドメインは preview 専用とし、production では無効化 (重複コンテンツ・混同防止)。

## 9. 監視・SLO 運用 (qa-019 / qa-027)

- **/health endpoint**: `GET /health` (認証なし・rate limit 対象外)。Turso `SELECT 1` + R2 head を検査する。
  - **応答契約 (2026-07-21 調停)**: `{ status, version, checkedAt, dependencies[] }`。`dependencies[]` の各要素は `{ name, status, latencyMs, detail? }` で、`name` に `db` / `r2` / `runtime-config` が入る。本節は当初 `{ status, db, r2, version }` と書いていたが、`packages/schemas` の契約スキーマ・実装・test-design が `dependencies[]` 形を採っており二重正本になっていた (P10 指摘 F-11)。**依存を追加するたびにトップレベルのキーが増える形は契約が破壊的に変わる**ため、配列形を正本とする。
  - **critical の区分 (2026-07-21 確定)**: **Turso 失敗のみ down (HTTP 503)**、**R2 失敗は degraded (HTTP 200 + body で通知)** とする。本節は当初「失敗時 503」と一括していたが、§10 の縮退マトリクスが「R2 停止 → catalog 閲覧は継続。publish/install のみ停止」と定めており、応答できている時間まで 503 にすると SLO のエラーバジェットを過剰消費する (誤計測) ため区分する。§10 を正とした調停。
  - **未プロビジョニング時**: secret 未投入は `down` (503) とする。200 を返すと外形監視が可用性ありと誤計測し SLO 計測そのものが壊れるため。初回構築の順序制約は runbook §1 を参照。
- **外形監視 (Better Stack Free, qa-034)**: production `/health` を 3 分間隔で監視 + cron heartbeat (§5) + status page (常設 staging monitor は不要 = §6)。無料枠 10 monitors・heartbeat 10 本・商用利用可 (公式確認 2026-07-17)。SLO 99.5%/月の一次計測源。
- **SLO 運用**: 可用性 99.5%/月 (許容停止 約 3.6 時間/月)。エラーバジェット消費は外形監視の downtime + Workers analytics の 5xx 率で算定し、**バジェット消費 100% で新機能の変更を凍結し信頼性回復を優先** (qa-019)。
- **Workers 側**: observability logs 有効化 + Workers analytics (p95 レイテンシ・エラー率)。SLO ダッシュボードは Cloudflare dashboard + 外形監視の status page で代替 (追加サービスなし)。
- **アプリ内運用通知 (インフラ追加なし、qa-027)**: AI キュー滞留・Resend 送信失敗・ingest 異常値・Turso 使用量閾値は notifications (アプリ内) で provider-admin へ通知。
- **ポストモーテム**: ユーザー影響のある障害は blame-free 振り返りを issue 化し、再発防止を自動化候補へ接続 (qa-019)。

## 10. バックアップ・DR (qa-019)

- **RPO ≤ 24h**: 日次 export (backup.yml)。export は Turso dump (SQL) を gzip し R2 へ。salary は暗号文のまま (qa-032)。
- **RTO ≤ 4h (目標)**: runbook — (1) 新 Turso DB 作成 → (2) dump restore → (3) secret の URL/token 差替 → (4) `/health` 確認。SLO 99.5% の月間許容停止内に収める。
- **restore drill**: 四半期ごとに**一時 DB** へ実 restore し、行数・整合検査まで実施 (常設 staging は持たない = §6)。**復元できないバックアップを成功と数えない** (qa-019)。
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
| 4 | 本番デプロイ | **main merge で全自動** (AI 推奨に同意) | 単一 `ci.yml` 内で 全ゲート green → production migrate → deploy → post-deploy /health → 失敗時 wrangler rollback (§7)。**staging 経由と deploy.yml 分離は 2026-07-21 に取りやめ** (qa-038 / R-02) |

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
