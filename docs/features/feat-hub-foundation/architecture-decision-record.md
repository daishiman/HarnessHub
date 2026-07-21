---
status: confirmed
layer: feature-design
task: SYS-HUB-FOUNDATION-P02
parent_feature: feat-hub-foundation
feature_package_id: feature-package/feat-hub-foundation
feature_context_digest: sha256:938ecf38d145496bba7a439b829d3934718b8f43b4f4628d8ba821594d17062d
package_digest: sha256:8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502
depends_on: [SYS-HUB-FOUNDATION-P01]
architecture_refs: [arch-harness-hub-infrastructure, arch-harness-hub-frontend, arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security, arch-harness-hub-dev-workflow]
---

# feat-hub-foundation アーキテクチャ決定記録 (P02)

> **位置づけ**: P02 (アーキテクチャ・workstream 設計) の成果物。[requirements-baseline.md](requirements-baseline.md) が確定した要件を、**実装境界・deploy unit・owner** へ割り当てる。docs/shared-layers.md §4 が「要ユーザー確認 / 確定は P02/P03」としていた pnpm workspace 構成を、本文書が**確定**する。
>
> P03 (独立設計レビュー) はこの文書を評価対象とし、却下時は §8 の rollback 手順に従う。

## 1. 決定サマリ

| # | 決定 | 結論 |
|---|---|---|
| D-P02-1 | pnpm workspace 構成 | **案 (b) パッケージ分割構成を採用**（§2）。members = `apps/hub` + `packages/{ui,schemas,inspection,estimation,db}` |
| D-P02-2 | deploy unit | **単一 Worker** (`cloudflare-workers/hub`)。UI + API を同居させ分割しない（D1 決定の踏襲、§4） |
| D-P02-3 | 共通層の配置境界 | shared-layers §1〜§3 の各層を §3 の表で package へ一意に割当。所有者は全て feat-hub-foundation |
| D-P02-4 | パッケージマネージャ | pnpm のみ。root `package.json` の `packageManager` で pin し、CI で npm 混入を fail させる（§6） |
| D-P02-5 | 認可 middleware / auth adapter | 配置境界を `apps/hub/src/middleware/` `apps/hub/src/shared/auth/` に**予約**。共通境界は本 feature、テナント固有 policy は feat-auth-tenancy |

## 2. 【設計判断】pnpm workspace 構成の比較検討

### 2.1 比較表

| 観点 | (a) 単一 `apps/hub` のみ<br>(分割なし) | **(b) apps/hub + packages 分割<br>（採用）** | (c) 機能ドメイン単位まで細分化 |
|---|---|---|---|
| 共通層境界の強制力 | ✗ import 規約のみ。コードレベルで強制不可 | ✓ package 境界で物理的に強制。第 4 acceptance の duplicate detector が判定可能 | ✓ 強制できるが粒度過剰 |
| qa-020 / qa-006 リスク | ✗ 認可判定の散在を防げず認可漏れリスク増 | ✓ 認可 MW を単一層に閉じ込められる | △ 層が多く逆に追跡困難 |
| Publisher との検査ロジック共有 (qa-010) | ✗ Hub 内部に閉じ、plugin 側が再実装 | ✓ `packages/inspection` を両者が参照 | ✓ 可能 |
| zod 単一ソース (qa-009) | ✗ apps 内定義が散逸 | ✓ `packages/schemas` が単一ソース | ✓ 可能 |
| C1 (個人開発の認知負荷) | ✓ 最小 | ✓ 5 package に限定。許容範囲 | ✗ 過剰分割。qa-020 が明示的に否定 |
| Worker bundle 3MiB 予算 | △ tree-shaking 効きにくい | ✓ package 単位で依存を切れる | ✓ ただし管理コスト増 |
| 早すぎる抽象化の禁止 (shared-layers §5) | — | ✓ 各 package が**2 feature 以上の消費者を既に持つ**（§2.3） | ✗ 消費者 1 の層まで切ってしまう |

### 2.2 決定と理由

**案 (b) を採用する。**

- (a) を採らない理由: 共通層の境界をコードレベルで強制できず、認可判定の散在（qa-006 / D4 row-level の実装リスク）と検査ロジックの二重実装（qa-010）を招く。加えて **第 4 acceptance「shared-layers 登録済み共通層が単一 package/境界に実装され、消費 feature が同じ実装を参照する」の duplicate detector が判定不能**になる（requirements-baseline §4.2 A4-2 は「owner package 外の同名 export」を検出単位としており、package 境界の存在が前提）。
- (c) を採らない理由: qa-020 が「過剰な層分割は C1 に反するため採らない」と明示している。提供者 1 名 + AI 運用（C1）で維持できる package 数を超える。
- (b) が「早すぎる抽象化の禁止」に反しない根拠は §2.3 の消費者一覧。**すべての package が既に 2 feature 以上の消費者を持つ**ため、shared-layers §5 の閾値を満たしている。

### 2.3 各 package の消費者（早すぎる抽象化でないことの根拠）

| package | 消費 feature（2 つ以上を確認） | 根拠 |
|---|---|---|
| `packages/ui` | 全 Studio 画面 feature（docs-cms, hearing-intake, metrics-tracking, build-pipeline-board, user-org-admin ほか） | shared-layers §1 消費列 |
| `packages/schemas` | feat-domain-model-db, feat-auth-tenancy, feat-publisher-plugin | qa-009, shared-layers §2 |
| `packages/inspection` | feat-publish-pipeline, feat-publisher-plugin（Hub 正式検査 / ローカル pre-check） | qa-010, C3 |
| `packages/estimation` | feat-metrics-tracking, feat-hearing-intake（シート試算・削減額） | shared-layers §2 追加層, B3/SEC5 |
| `packages/db` | feat-domain-model-db（スキーマ実体）+ Hub 側 repository 利用 | shared-layers §2, D2 |

> `packages/estimation` は shared-layers §2「Studio mockup 反映の追加共通層」および published task spec の Normative implementation closure が実装対象として列挙しているため workspace member に含める（旧 §4 提案の 4 package 案からの差分）。

### 2.4 確定ディレクトリ構成

```
apps/hub/                    # Hub 本体 (Next.js on Workers)。UI + API + 認可 MW。単一 deploy unit
  src/app/                   #   App Router (SSR on Workers)
  src/app/health/            #   /health route handler
  src/middleware/            #   認可 middleware (単一層・deny-by-default)
  src/shared/                #   auth adapter / audit logger / AI queue / notification / PII guard
  tests/                     #   共通層 consumer contract test を含む
packages/ui/                 # 共通 UI (design system)。shared-layers §1 の正本
packages/schemas/            # zod schemas 単一ソース。shared-layers §2 の正本
packages/inspection/         # 検査 pipeline 共有 package (純関数)
packages/estimation/         # 試算エンジン (純関数)
packages/db/                 # Drizzle schema + repository 層 (スキーマ内容は feat-domain-model-db)
plugins/publisher/           # ディレクトリ予約のみ。実装は feat-publisher-plugin
```

## 3. 共通層 → 配置境界の割当（shared-layers §1〜§3 全件）

| shared-layers 登録層 | 配置境界 | owner | 実装可否（本 feature） |
|---|---|---|---|
| design tokens / フォーム / テーブル / 進捗 / ダイアログ / 通知表示 (§1) | `packages/ui` | feat-hub-foundation | 実装する |
| KPI カード・チャート / ウィザード / ステージボード / Markdown / 状態チップ / テーマ (§1 追加) | `packages/ui` | feat-hub-foundation | 実装する（bundle 3MiB 予算内の軽量実装に限る） |
| zod schemas 単一ソース (§2) | `packages/schemas` | feat-hub-foundation | 公開 contract を実装。業務スキーマ内容は consumer |
| 認可ミドルウェア (§2) | `apps/hub/src/middleware/` | feat-hub-foundation | 境界と deny-by-default 既定を実装。テナント固有 policy は feat-auth-tenancy |
| auth adapter (§2) | `apps/hub/src/shared/auth/` | feat-hub-foundation | adapter 境界を実装。OIDC provider 設定は feat-auth-tenancy |
| repository 層 (Drizzle) (§2) | `packages/db` | feat-hub-foundation（境界） | **境界のみ**。スキーマ実体は feat-domain-model-db |
| 検査 pipeline (§2) | `packages/inspection` | feat-hub-foundation | 公開 contract を実装。判定ルール実体は feat-publish-pipeline |
| 監査 event logger (§2) | `apps/hub/src/shared/audit/` | feat-hub-foundation | 実装する |
| 試算エンジン (§2 追加) | `packages/estimation` | feat-hub-foundation | 公開 contract を実装。係数はテナント設定 |
| 実行ログ ingest + rollup (§2 追加) | `apps/hub/src/shared/telemetry/` | feat-hub-foundation | 境界を実装 |
| AI 処理キュー (pull 型) (§2 追加) | `apps/hub/src/shared/aijob/` | feat-hub-foundation | 公開 contract を実装 |
| 通知ディスパッチ (§2 追加) | `apps/hub/src/shared/notification/` | feat-hub-foundation | 公開 contract を実装 |
| PII ガード (§2 追加) | `apps/hub/src/shared/pii/` | feat-hub-foundation | 実装する |
| CI 品質ゲート (§3) | `.github/workflows/ci.yml` | feat-hub-foundation | 実装する |
| デプロイ (wrangler) (§3) | `.github/workflows/ci.yml` + `wrangler.jsonc` | feat-hub-foundation | 実装する |
| 監視 (§3) | `apps/hub/src/app/health/` + 外部監視設定 | feat-hub-foundation | /health を実装。外形監視は外部サービス設定 |
| バックアップ (§3) | **`.github/workflows/backup.yml`**（実装物）+ 手順は P12 | feat-hub-foundation | **実装する**（R-08 是正。infrastructure-spec §7 が cron workflow を確定済みであり、文書だけでは requirements-baseline §9.5 に抵触する） |

## 4. deploy unit とデプロイ経路

> **改訂 2 (P03 差し戻し是正)**: 環境戦略を qa-038 準拠へ変更し、scheduled handler と binding 正本参照を追加した。詳細は §11 (R-01 / R-09 / R-10)。

- **deploy unit**: `cloudflare-workers/hub` の**単一 Worker**。UI (Next.js App Router SSR) + API + **scheduled handler (cron)** を同居させる。
- **分割しない理由**: D1 決定（`@opennextjs/cloudflare` 一体型）と C1（個人運用で複数 Worker の運用負荷を負わない）。docs/system-design-overview.md §1 と同一。
- **scheduled handler (R-09)**: `docs/infrastructure-spec.md` §5 が確定した cron 2 系統（日次 `0 15 * * *` / 週次 `0 0 * * 1`）を同一 Worker の scheduled handler として実装する。`@opennextjs/cloudflare` は fetch handler を出力するため、**custom entry で fetch handler を包み `scheduled` を併せて export する**構成を採る。各ジョブは冪等とし、失敗はジョブ単位で記録して後続を止めない。日次完了時に **cron heartbeat** へ ping する（qa-027 の cron 失敗検知）。
- **環境（qa-038 を正とする / R-01）**: **常設 staging は持たない**。`production` のみを常設し、検証は **PR ごとの使い捨て preview（PR close で破棄）** で行う。
  - 採用理由: qa-038 は qa-034 より後に確定しており、「Worker / Turso DB / R2 バケット / secret を 2 組常時維持すると無料枠消費と運用導線が二重化し C1・C2 と衝突する」と明示的に理由を述べている。ユーザー確認により qa-038 を正と確定（2026-07-21）。
  - 波及: `docs/infrastructure-spec.md` §6（環境構成）・§7（deploy.yml の staging 経由）・§2（`harness-hub-staging` 命名）・§4（`harness-hub-staging` DB）は qa-034 前提のため、**system-spec 側の追随更新が必要**（本 feature の write scope 外のため §11 に申し送り）。
  - migration は qa-038【5】に従い **deploy 前に CI が production Turso へ自動適用**する（staging 経由を採らない）。破壊的 DDL は expand/contract 3 段階を強制する。
- **binding / secret の内容正本 (R-10)**: `apps/hub/wrangler.jsonc` の**内容正本は `docs/infrastructure-spec.md` §2**（binding 台帳 5 件・secret 台帳 5 件・`nodejs_compat`・Worker 命名・CPU 10ms 予算）。本 ADR は owner を宣言するのみで内容を二重定義しない。R2 は native binding（`PACKAGES_BUCKET` / `BACKUPS_BUCKET`）、静的アセットは `ASSETS` binding で edge 配信する（qa-003・R-05 の CWV 手段）。
- **デプロイ経路**: GitHub Actions の**単一 workflow `ci.yml`** 内で 静的ゲート → test → bundle → deploy を連鎖させる（R-02。ユーザー確認により `deploy.yml` 分離を採らない）。main merge で production へ全自動、post-deploy `/health` 確認、失敗時 `wrangler rollback`（qa-034 / infrastructure-spec §7）。
- **bundle 予算**: gzip 後 3 MiB。`packages/*` 側で重量依存を持たないことを設計制約とする（特に `packages/ui` のチャート実装）。**CPU 予算 10ms/呼出**（Free）も設計制約とし、cron の集計は chunk 処理で収める。

## 5. workstream 別の設計確定

| workstream | 確定内容 |
|---|---|
| Frontend | `apps/hub/src/app/` に App Router。共通部品は `packages/ui` からのみ import し、`apps/hub` 内で design system を再実装しない |
| Backend | `/health` route handler を `apps/hub/src/app/health/route.ts` に配置。業務ドメイン backend は対象外 |
| API | `packages/schemas` を zod 単一ソースとし、API 入出力検証・型・OpenAPI 生成の責務をここに集約。契約内容自体は後続 feature |
| Data | `packages/db` の置き場のみ確定。スキーマ内容は定義しない（feat-domain-model-db） |
| Infrastructure | §2 の (b) 構成を採用。§4 の単一 Worker |
| Security | 認可 MW を `apps/hub/src/middleware/` の**単一層**に閉じ、ここ以外に認可判定を書かない。deny-by-default。auth adapter で Auth.js 依存を隔離（D3 caveat） |
| Quality | §6 の CI 品質ゲート |
| Operations | §7 の監視構成 |

## 6. CI 品質ゲートの設計（shared-layers §3 + qa-038【2】required status checks）

> **改訂 2 (P03 差し戻し是正 / R-03)**: qa-038【2】が確定した required status checks 8 項目のうち 5 項目（lint・format / typecheck / secret scan / 破壊的 DDL 検査 / OpenAPI・zod drift 検査）が欠落していたため追加した。shared-layers §3 の 5 ゲートのみを写経していたことが原因。

| # | ゲート | 設計 | fail 条件 | 対応 |
|---|---|---|---|---|
| G1 | pnpm 強制 | **corepack で pin**（正本機構）+ `packageManager` 検証 + `package-lock.json` / `npm-shrinkwrap.json` / `yarn.lock` / `bun.lockb` の混入検出 | 検出時に非ゼロ終了 | A1, qa-039 |
| G2 | lint / format | リポジトリ規約に沿った静的整形検査 | 違反で fail | qa-038【2】 |
| G3 | typecheck | `pnpm -r typecheck`（TypeScript strict） | 型エラーで fail | qa-038【2】 |
| G4 | unit / integration test | `pnpm -r test`（Tenant 分離・検査 pipeline 挙動同値・contract を含む） | 失敗で fail | A1, A4, qa-006, qa-010 |
| G5 | bundle 予算 | OpenNext build 出力の gzip 後サイズを算出 | 3 MiB 超過で非ゼロ終了 | A2 |
| G6 | secret scan | `packages/inspection` の secret scan を **CI からも呼ぶ**（qa-038【2】。publish pipeline と同一実装） | 検出で fail | A4, SEC |
| G7 | 破壊的 DDL 検査 | drizzle migration の expand/contract 3 段階違反を検出 | 違反で fail | qa-038【5】 |
| G8 | OpenAPI / zod drift 検査 | `packages/schemas` から生成した OpenAPI と実装の乖離を検出 | 乖離で fail | qa-009, qa-038【2】 |
| G9 | axe a11y | `packages/ui` 部品単体 + `apps/hub` 画面結合の 2 段 | 違反 1 件以上で fail | qa-018 |
| G10 | duplicate implementation detector | 登録共通層の owner package 外の同名 export / 境界迂回 import を検出 | 1 件以上で fail | A4 |
| G11 | Core Web Vitals 計測 | **main 反映後の定期計測**（Lighthouse）で LCP ≤ 2.5s / INP ≤ 200ms / CLS ≤ 0.1 を確認 | good を外れたら是正起票 | qa-018, R-05 |

- **G11 を PR 単位に置かない理由 (R-05)**: PR ごとの Lighthouse 実行は GitHub Actions 無料枠 2,000 分/月（infrastructure-spec §11）を圧迫し C2 に反する。CWV は bundle 予算（代理指標）とは別に**実測経路を持つ**必要があるため、main 反映後の定期計測として確保する。R2/edge 配信（`ASSETS` binding）と不要 JS 削減が達成手段（qa-018(2) の 3 手段に対応）。
- **G6 の consumer 構成 (R-07)**: `packages/inspection` の第 2 consumer は **CI 自身**とする。Publisher（feat-publisher-plugin）は未実装で workspace member でもないため、A4-1「実在する consumer のみを対象にする」規則により Publisher を待つと判定不能になる。qa-038【2】が「CI からも呼ぶ」と確定しているため、CI が実在 consumer として成立する。
- ゲートの実行順は「静的ゲート（G1・G10）→ install → G2・G3 → build → G4・G6・G7・G8・G9 → G5 → deploy」とし、**deploy は全ゲート通過後にのみ、同一 workflow run 内で実行**する（R-02。A1 の "test→deploy 完走" の定義）。
- **local 再現 (R-18)**: required status checks と同一コマンドを root の `pnpm verify` で実行できるようにする（qa-039【2】）。

## 7. 監視・SLO 構成（qa-019 / qa-027）

> **改訂 2 (P03 差し戻し是正)**: SLO 算定式を正本（infrastructure-spec §9）へ一致させ（R-11）、エラーバジェットの警告段と凍結段を分離し（R-12）、cron heartbeat とバックアップを追加した（R-08 / R-09）。

| 構成要素 | 配置 | 備考 |
|---|---|---|
| `/health` | `apps/hub/src/app/health/route.ts` | 認証なし・rate limit 対象外。**Turso `SELECT 1` + R2 head** を検査し **`{status, version, checkedAt, dependencies[]}`** を返す（`dependencies[]` = `{name, status, latencyMs, detail?}`、`name` は `db` / `r2` / `runtime-config`）。**Turso 失敗のみ down (503)、R2 失敗は degraded (200)**。正本は infrastructure-spec §9（応答形と critical 区分はいずれも 2026-07-21 に調停済み。§11.6 参照） |
| Workers logs / analytics | Cloudflare observability logs + analytics | p95 レイテンシ・エラー率。追加費用なし（C2） |
| 外部死活監視 | Better Stack Free | production `/health` を **3 分間隔** + cron heartbeat。**外部アカウント設定が必要** |
| cron heartbeat | 日次バッチ完了時に heartbeat URL へ ping | 「cron が動かなかった」ことを検知（qa-027） |
| SLO 算定 | **外形監視の downtime + Workers analytics の 5xx 率**の合成 | 99.5%/月。外形監視単独を正としない（応答は返るが機能不全の障害を落とさないため） |
| エラーバジェット | **消費 70% で警告通知 → 消費 100% で新機能の変更を凍結** | 警告段と凍結段を分離（正本の凍結条件は 100%） |
| SLO ダッシュボード | Cloudflare dashboard + 外形監視 status page | 追加サービスを増やさない（C2） |
| バックアップ | `.github/workflows/backup.yml`（日次 cron `0 17 * * *`） | Turso dump → gzip → R2 `harness-hub-backups`。成功を heartbeat 通知。**復元できないバックアップを成功と数えない**（四半期 restore drill、RPO ≤ 24h / RTO ≤ 4h） |

- **既知リスク (R-26)**: `/health` が Turso と R2 の疎通を検査するため、SLO 99.5% の計測対象に第三者 free tier の可用性が全量乗る。縮退マトリクス（infrastructure-spec §10）で影響範囲を限定し、ポストモーテムで再評価する。

## 8. Rollback

- P03 独立設計レビューで本構成が却下された場合、本文書に却下理由を追記し、P02 を再実行して案 (a) または (c) を再評価する。
- `pnpm-workspace.yaml` / `package.json` は P02 の write scope であり、却下時はこの 2 ファイルも同時に差し戻す。

## 9. スコープ外（本文書で確定しないもの）

- `packages/db` のスキーマ内容（feat-domain-model-db）
- 認可 middleware のテナント固有 policy 実装本体（feat-auth-tenancy）
- `plugins/publisher/` の実装内容（feat-publisher-plugin）
- 業務ドメイン API 契約の内容（後続 feature）

## 10. 転記元と検証

- 上位入力: `docs/features/feat-hub-foundation/requirements-baseline.md`（P01）, `docs/shared-layers.md` §1〜§5, `docs/system-design-overview.md`, **`docs/infrastructure-spec.md`（改訂 2 で追加。初版が未接地だった確定仕様正本）**
- published task spec: `.dev-graph/plans/generations/feature-package-feat-hub-foundation/8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502/task-specs/phase-02-architecture.md`
- 検証コマンド: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging <promoted package>`
- P02 acceptance: (a)(b)(c) の比較表（§2.1）と (b) 採用理由（§2.2）、`apps/hub` と `packages/{ui,schemas,inspection,estimation,db}` の各責務境界（§2.4・§3）が記載されていること

## 11. P03 差し戻し是正記録（改訂 2 / 2026-07-21）

P03 独立設計レビュー（`design-review-notes.md`、判定: 差し戻し、指摘 27 件 / 是正要 25 件）への対応。
初版の根本原因は **`docs/infrastructure-spec.md`（確定仕様正本）への未接地**であり、`docs/shared-layers.md` §3 のみを写経していたことによる。

### 11.1 ユーザー判断を仰いだもの（2026-07-21 確定）

| ID | 論点 | 確定 |
|---|---|---|
| R-01 | qa-034（常設 staging）と qa-038（常設 staging なし）の矛盾 | **qa-038 を正とする**。§4 に反映。system-spec 側（infrastructure-spec §2/§4/§6/§7/§12）の追随更新は本 feature の write scope 外のため §11.4 へ申し送り |
| R-02 | A1「単一 workflow run」と infrastructure-spec §7 の 2 workflow 分離の矛盾 | **`ci.yml` に deploy job を統合**（A1 判定条件は維持、P01 改訂なし）。§4・§6 に反映 |

### 11.2 本 ADR 内で是正したもの

| ID | 是正内容 | 反映先 |
|---|---|---|
| R-03 | required status checks 8 項目の欠落 5 件（lint/format・typecheck・secret scan・破壊的 DDL 検査・OpenAPI drift 検査）を追加し、ゲートを G1〜G11 へ再構成 | §6 |
| R-04 | `packages/estimation` の責務分界を明文化: **本 package は「計算の骨格」（単位換算・丸め・入力検証・純関数）のみを持ち、業務的な算出定義（係数・削減率の意味づけ）は consumer feature が引数で供給する**。試算式そのものの owner は consumer（feat-metrics-tracking）であり、基盤へ業務ロジックを集約しない | §11.3・§3 |
| R-05 | CWV の計測経路を G11（main 反映後の Lighthouse 定期計測）として新設。達成手段として `ASSETS` binding による R2/edge 配信と不要 JS 削減を明記 | §6 |
| R-06 | package 化と `apps/hub/src/shared/` 配置の**振り分け基準**を確定（§11.3-1）。後者は detector の検出単位 2 が構造的に効かないため、**代替として「公開 contract を `index.ts` に集約し、それ以外からの import を禁止する静的検査」を G10 に含める** | §11.3 |
| R-07 | `packages/inspection` の第 2 consumer を **CI 自身**とする（qa-038【2】「CI からも呼ぶ」に接地）。Publisher 未実装でも A4 判定が成立する | §6 |
| R-08 | バックアップを文書から**実装物**へ戻し、`.github/workflows/backup.yml` の owner を本 feature と宣言 | §3・§7 |
| R-09 | scheduled handler（cron 2 系統）を deploy unit 定義に追加。custom entry で fetch handler を包む設計を明記 | §4 |
| R-10 | `wrangler.jsonc` の内容正本が infrastructure-spec §2 であることを明記し二重正本を回避。R2 native binding と `ASSETS` を明示 | §4 |
| R-11 | SLO 算定式を「外形監視 downtime + Workers analytics 5xx 率」へ訂正 | §7 |
| R-12 | エラーバジェットを「70% 警告 / 100% 凍結」の 2 段へ分離 | §7 |
| R-13 | shared-layers §5 の閾値を「2 feature 以上」と誤記していた点を訂正（**正しくは「第 3 の利用者」**）。構成変更は不要 | §11.3 |
| R-14 | `packages/db` の A4 発効条件を確定（§11.3-7） | §11.3 |
| R-15 | package 命名・`exports`・import path 規約を確定（§11.3-2）。これが A4-2 検出単位 2 の判定基準になる | §11.3 |
| R-16 | migration の分担を確定（§11.3-5） | §11.3・§6 |
| R-17 | rate limiting の分担を確定（§11.3-6） | §11.3 |
| R-19 | 認可 deny-by-default の**強制メカニズム**を設計（§11.3-3）。規約だけに頼らない | §11.3・§6 |
| R-20 | pnpm 強制機構を **corepack を正**とし、`only-allow` は補助と位置づける | §6・root package.json |
| R-22 | pnpm 混入検査の対象に `yarn.lock` / `bun.lockb` を追加 | §6 |
| R-24 | `plugins/publisher/` の予約が既存の開発用 plugin 群（22 個）と名前空間衝突するため、**ディレクトリ予約を本 ADR から取り下げ feat-publisher-plugin の P02 に委ねる** | §11.3 |
| R-25 | 正本タスク仕様の member 集合と ADR の 5 package（estimation 追加）の差分について、Normative implementation closure を優先した調停理由を脚注から本節へ格上げ | §11.3 |
| R-27 | `wrangler-deploy` の「WebApp 出口でも同一ツール系統」は**本 feature の scope 外**と明記 | §11.3 |
| R-21 / R-23 / R-26 | R-21（pnpm 10 の `onlyBuiltDependencies`）は P05 実装時に対処。R-23（`engines.npm` は engine-strict なしでは無効）は意図表明として保持。R-26（第三者 free tier の可用性が SLO に乗るリスク）は §7 にリスクとして記録 | §7・P05 |

### 11.3 改訂 2 で新たに確定した設計事項

1. **配置の振り分け基準**（R-06）: **Worker 外部（Publisher / CI / 別 app）から参照されうるもの → package 化。Worker 内部からのみ使うもの → `apps/hub/src/shared/`**。この基準により inspection（CI から呼ぶ）・schemas・ui・estimation は package、audit / aijob / notification / pii / telemetry / auth は Worker 内部で確定する。
2. **package 公開 contract 規約**（R-15）: 名前空間は `@harness-hub/<name>`、`exports` は `"."` の**単一入口のみ**（subpath exports を作らない）、consumer は **package 名でのみ** import する。
3. **認可の fail-open 対策**（R-19）: Next.js middleware の `matcher` 漏れは fail-open になるため、**全 route handler を `withAuthz()` wrapper factory 経由で定義することを規約とし、未 wrap の route handler を検出する静的検査**を G10 に含める。
4. **estimation の責務分界**（R-04）: 計算の骨格は基盤、業務的な算出定義は consumer。
5. **migration の分担**（R-16）: SQL 生成とスキーマ実体は feat-domain-model-db、**CI での自動適用（deploy 前）と破壊的 DDL 検査ゲート（G7）は本 feature**。
6. **rate limiting の分担**（R-17）: エッジ側（Cloudflare Rate Limiting Rule）は infrastructure-spec §2 の確定どおり。アプリ層（認可 MW 前段）の境界は本 feature が持ち、**具体的な数値は feat-auth-tenancy が確定**（本 feature は既定値のみ）。
7. **db の A4 発効条件**（R-14）: P05 時点では境界と型のみのため、**A4 の判定対象は「境界型が consumer から参照可能であること」に限定**し、実装 consumer 2 系統の要求は feat-domain-model-db 完了後に発効する（登録簿に `boundary_only: true` として明記済み）。
8. **scope 外の明示**（R-24 / R-27）: Publisher のディレクトリ予約と WebApp 出口のツール系統は他 feature の責務。

### 11.4 本 feature の write scope 外へ申し送るもの（要 follow-up 起票）

| # | 内容 | 差し戻し先 |
|---|---|---|
| F-1 | `docs/infrastructure-spec.md` §2/§4/§6/§7/§12 が qa-034 前提（常設 staging・deploy.yml 分離）のまま。qa-038 採用と ci.yml 統合に追随させる必要がある | system-spec（C01 writer 経由） |
| F-2 | `docs/shared-layers.md` §3 の CI 品質ゲート登録簿が 5 項目。qa-038【2】の 8 項目 + G9〜G11 へ更新が必要 | shared-layers 保守 |
| F-3 | P03 の未検証事項 L-2（bundle 3MiB の実現可能性）・L-3（Better Stack Free のデータ保持期間）・L-4（`@opennextjs/cloudflare` の scheduled / middleware サポート範囲）は P05/P06 の実測で確定する | P05/P06 |

### 11.6 P10 差し戻しに伴う追加調停（2026-07-21 / 改訂 3）

P10 最終独立レビュー（`design-review-notes.md` に続く 2 度目の独立レビュー）が、実装まで含めた検証で 11 件の指摘を出した。設計判断を伴う調停は以下の 3 件。

| ID | 論点 | 調停 |
|---|---|---|
| F-01 | `/health` の依存プローブが存在しない `DB` binding に依存し、**本番で確実に 503** になる構造だった | binding 依存を撤去し、**Turso の secret 設定確認 + HTTP API への `SELECT 1` 実往復**へ変更。テストのスタブも実在するものだけに限定し「素の環境なら 503」を固定テスト化した |
| F-11 | `/health` 応答契約が二重定義（ADR/infrastructure-spec の `{status, db, r2, version}` vs 実装/schemas/test-design の `{status, version, checkedAt, dependencies[]}`） | **`dependencies[]` 形を正本**とする。依存を追加するたびにトップレベルのキーが増える形は、外形監視の判定条件を破壊的に変えてしまうため。ADR §7 と infrastructure-spec §9 を配列形へ改訂した |
| — | R2 障害時に 503 を返すか（infrastructure-spec §9 の字面 vs §10 の縮退マトリクス） | **§10 を正**とし、**Turso 失敗のみ down (503)・R2 失敗は degraded (200)**。R2 停止時も catalog 閲覧は継続できるため、応答できている時間まで 503 にするとエラーバジェットを過剰消費する（F-01 と同種の誤計測） |

証跡側の是正（P10 再レビュー指摘 G-01）: `evidence/shared-layer-ownership.json` が全 12 層を「consumer 2 系統」と読める内容になっていたため、**`app_wiring` / `consumers_effective` / `a4_1_status` を出力**し、宣言 consumer と実測 consumer を区別できる形にした。未結線 5 層は証跡上も `unmet-fixture-only` として明示される。

### 11.5 P03 が「維持すべき」と判定した設計（改訂 2 でも変更しない）

案 (b) の採用と (a)(c) の棄却理由 / 単一 Worker の deploy unit / detector を決定的判定に限定した設計 / axe の 2 段構え / bundle 予算を package 設計の入力制約へ変換した点 / ドメイン固有ロジックの境界宣言書式。
