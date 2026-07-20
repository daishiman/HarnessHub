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
| バックアップ (§3) | 運用手順（P12） | feat-hub-foundation | 手順のみ |

## 4. deploy unit とデプロイ経路

- **deploy unit**: `cloudflare-workers/hub` の**単一 Worker**。UI (Next.js App Router SSR) と API を同居させる。
- **分割しない理由**: D1 決定（`@opennextjs/cloudflare` 一体型）と C1（個人運用で複数 Worker の運用負荷を負わない）。docs/system-design-overview.md §1 と同一。
- **環境**: production + staging の 2 環境（qa-034）。既存保有ドメインを流用。
- **デプロイ経路**: GitHub Actions → `wrangler deploy`。main merge で production へ全自動（qa-034）。
- **bundle 予算**: gzip 後 3 MiB。`packages/*` 側で重量依存を持たないことを設計制約とする（特に `packages/ui` のチャート実装）。

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

## 6. CI 品質ゲートの設計（shared-layers §3）

| ゲート | 設計 | fail 条件 | 対応 acceptance |
|---|---|---|---|
| pnpm 混入検査 | `package-lock.json` / `npm-shrinkwrap.json` の存在検出 + `packageManager` pin 検証 | 検出時に非ゼロ終了 | A1 |
| bundle 予算 | `wrangler deploy --dry-run` 相当の出力から gzip 後サイズを算出 | 3 MiB 超過で非ゼロ終了 | A2 |
| axe a11y | `packages/ui` 部品単体 + `apps/hub` 画面結合の 2 段 | 違反 1 件以上で fail | qa-018 |
| Tenant 分離テスト | 認可 MW のスコープ強制テスト枠 | 越境アクセスが通ったら fail | qa-006 |
| 検査 pipeline 挙動同値 | Hub と Publisher が同一 `packages/inspection` を参照することの contract test | 判定不一致で fail | A4 |
| duplicate implementation detector | 登録共通層の owner package 外の同名 export / 境界迂回 import を検出 | 1 件以上で fail | A4 |

- ゲートの実行順は「静的検査（pnpm/duplicate）→ build → test（axe/tenant/contract）→ bundle 予算 → deploy」とし、**deploy は全ゲート通過後にのみ実行**する（A1 の "test→deploy 完走" の定義）。

## 7. 監視・SLO 構成（qa-019）

| 構成要素 | 配置 | 備考 |
|---|---|---|
| `/health` | `apps/hub/src/app/health/route.ts` | 200 応答。依存先の疎通状態を含める |
| Workers logs / analytics | Cloudflare 標準機能 | 追加費用なし（C2） |
| 外部死活監視 | Better Stack Free（qa-034） | 3 分間隔。**外部アカウント設定が必要** |
| SLO ダッシュボード | 外形監視サービスの可用性レポートを正とする | 99.5%/月 |
| エラーバジェットアラート | 0.5% 消費でアラート → 新規公開機能の変更凍結 | qa-019 |

## 8. Rollback

- P03 独立設計レビューで本構成が却下された場合、本文書に却下理由を追記し、P02 を再実行して案 (a) または (c) を再評価する。
- `pnpm-workspace.yaml` / `package.json` は P02 の write scope であり、却下時はこの 2 ファイルも同時に差し戻す。

## 9. スコープ外（本文書で確定しないもの）

- `packages/db` のスキーマ内容（feat-domain-model-db）
- 認可 middleware のテナント固有 policy 実装本体（feat-auth-tenancy）
- `plugins/publisher/` の実装内容（feat-publisher-plugin）
- 業務ドメイン API 契約の内容（後続 feature）

## 10. 転記元と検証

- 上位入力: `docs/features/feat-hub-foundation/requirements-baseline.md`（P01）, `docs/shared-layers.md` §1〜§5, `docs/system-design-overview.md`
- published task spec: `.dev-graph/plans/generations/feature-package-feat-hub-foundation/8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502/task-specs/phase-02-architecture.md`
- 検証コマンド: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging <promoted package>`
- P02 acceptance: (a)(b)(c) の比較表（§2.1）と (b) 採用理由（§2.2）、`apps/hub` と `packages/{ui,schemas,inspection,estimation,db}` の各責務境界（§2.4・§3）が記載されていること
