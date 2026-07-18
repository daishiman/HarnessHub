---
status: draft
layer: system-wide-design
sources: [docs/mockups/harness-studio-v2.html, system-spec/00-requirements-definition.md]
---

# Harness Studio mockup 分析 (v2) — 画面・機能・アーキテクチャ必要要素

> **来歴 (provenance)**: 原本 = `/Users/dm/Downloads/Harness Studio (2).html` (2026-07-17 受領、sha256: `5de0227c91629152733a69cd05bbdef4f5eeb6912290246c9db59dc2b1f6d3da`)。リポジトリ保存先 = [harness-studio-v2.html](harness-studio-v2.html) (ブラウザで開けば自己展開して動作)。展開済みソース = [harness-studio-v2-extracted/](harness-studio-v2-extracted/)。
> **位置づけ**: この mockup を Harness Hub の **UI/UX の到達目標 (target design)** とする (ユーザー指示 2026-07-17: 「これを生成するためのアーキテクチャ、タスク、UI、UX のドキュメント…すべての内容を構築できるように」)。ダミーデータ (田中太郎・議事録要約ジェネレータ等) は機能の意味付けを示すサンプル値。

## 1. 画面インベントリ (mockup 実測: 17 画面 + 共通シェル)

| mock id | 画面 | role | 既存仕様との対応 |
|---|---|---|---|
| login | ログイン (メール+パスワード) | 全員 | **矛盾あり** — D3 (IdP/SSO 委譲・独自アカウント基盤なし) → IdP redirect (S07) へ置換して実装 |
| dashboard | ダッシュボード (KPI 6 카ード・推移・完了率・ランキング・部門別) | 全員 | **新規** (旧 U7 では Stage 4 対象外だった効果測定をスコープ入り) |
| form | ハーネス ヒアリング (4 ステップウィザード・削減試算) | 全員 | **新規** — フォーム型 intake。「Web 会話型 Creator は非目標」とは別物 (対話でなく構造化フォーム) |
| sheets / sheet-detail | ヒアリングシート一覧・詳細 (生成ドキュメント・ステータス管理) | 全員 / 変更は管理者 | **新規** |
| pipeline | 構築パイプライン (7 工程ボード: ヒアリング→要件定義→設計→構築→テスト→レビュー→公開) | 全員 / 操作は管理者 | **新規** (S03 公開状態の上位互換) |
| harnesses / harness-detail | プラグイン Hub 一覧・詳細 | 全員 | 既存 S01/S02 (I4 Workspace Catalog) と一致 |
| harness-install-modal | インストール導線 (marketplace add / install / web_app URL) | 全員 | 既存 I6 (URL 型 marketplace・GitHub 不要) と一致 |
| harness-upload-modal | 公開ウィザード (取込→設定→確認、Green 自動/Yellow 承認) | 全員 | 既存 I1/I2 (publish 1 操作・Green/Yellow) と一致。公開範囲 private/workspace/public は U7 より広い (**public は Stage 5 相当 → 当面 workspace まで**) |
| feedback | 改善要望・レビュー (ハーネス内 CLI 発+Web フォーム、AI 自動対応) | 全員 | 既存 I4 低品質報告の**大幅拡張** (新規) |
| docs / doc-view / doc-edit | ドキュメント (社内ナレッジ CMS・AI 下書き・common/テナント scope) | 閲覧全員 / 編集管理者 | **新規** |
| tracking | 利用・削減効果 (実行ログ集計・15 分/回 仮定試算) | 全員 | **新規** (旧 Stage 4) |
| users / user-detail | ユーザー管理・個別ダッシュボード (年収・時給換算・削減額) | 管理者 | **新規** (Stage 2 RBAC の具体化 + 効果測定結合) |
| account | アカウント設定 (プロフィール・通知・セキュリティ・表示) | 全員 | **新規** (2FA/パスワード変更は IdP 委譲と要整合) |
| legal | 規約・ポリシー | 全員 | **新規** (静的) |
| global-shell | サイドバー 9 項目・ワークスペース切替・role 切替・検索・通知・トースト | — | 共通レイアウト (shared-layers §1) |

## 2. エンティティ (mockup から導出。ER 詳細は feat-domain-model-db の P02 で確定)

Tenant(plan 付き) / User(**salary=年収 PII**, role, status, 利用集計) / HearingSheet(HS-xxxx, status 4 値, 試算式 35%) / FormData(12 項目) / Harness=Plugin(slug, semver, target: skill|web_app, status, dl) / PublishRequest(visibility: private/workspace/public, Green/Yellow 判定) / Build(7 stage, risk, eta) / Feedback(FR-xxx, type 3 種, source: harness|manual, aiResponse) / Doc(DOC-xx, cat 7 種, scope: common|tenant) / Settings(通知 4+2FA+テーマ/密度/言語) / MetricsEvent(実行ログ: harness×user×時刻)

派生計算の単一実装 (**試算エンジン**): 時給 = 年収 ÷ annualHours(既定 2000h)、削減時間 = 実行回数 × 15 分 (既定)、削減額 = 削減時間 × 時給、シート試算 = 月工数 × 人数 × 35%。係数 (annualHours・分/回・削減率) は設定可能パラメータ。

## 3. バックエンド必要要素 (アーキテクチャ全部盛り)

| # | 要素 | 内容 | 備考 |
|---|---|---|---|
| B1 | REST API 群 (zod 単一ソース) | auth/tenants/users/sheets/builds/plugins/releases/publish/feedback/docs/metrics/settings | qa-009/qa-020 の既存規約に追加リソースを載せる |
| B2 | 実行ログ収集 (ingest) | Claude Code 実行イベントの受信 endpoint。Device Flow token で認証、tenant/user/harness 紐付け、append-only | tracking/dashboard/users の供給元。改ざん対策 = 服务側タイムスタンプ + 冪等キー |
| B3 | 集計 (rollup) | 週次/月次/ハーネス別/部門別/ユーザー別の事前集計 (Workers cron)。生イベントは保持期間を決めて R2 へ退避 | Turso 無料枠 (読取 5 億行/月) 内に収める設計 |
| B4 | 公開 pipeline (既存) | 検査 (secret scan・skills-only)・Green/Yellow・immutable Release・stable pointer | feat-publish-pipeline と同一。visibility=public は当面非対象 |
| B5 | **AI 処理キュー (pull 型)** | シート生成・フィードバック自動対応・doc 下書きは「サーバが AI を呼ぶ」のではなく、**提供者/作者側 Claude Code セッションがキューを pull して処理し結果を書き戻す** | C2 費用ゼロ制約とサーバ側 API 課金の衝突を回避する要 (要 decision D5) |
| B6 | フィードバック受付 | CLI 発 (`harness feedback`) + Web フォームの 2 経路 → 同一キュー。status 遷移 (未対応→対応中→対応済み) | B5 の消費対象 |
| B7 | ドキュメント CMS | Markdown 保存・common/tenant scope 合成・AI 下書き (B5 経由) | Turso + 必要なら R2 |
| B8 | 通知 | アプリ内通知 + メール (生成完了・レビュー結果・週次サマリー)。設定は Settings 準拠 | メール送信手段は無料枠内で要 decision (候補: Resend free 等) |
| B9 | 承認 queue (既存 Stage 2) | Yellow 承認・監査 event | feat-workspace-governance と一致 |
| B10 | 管理系 | ユーザー CRUD・role 付与・休止・テナント設定 (annualHours 等係数) | 監査 event 必須 |

## 4. フロントエンド必要要素

- **Next.js App Router 実装** (mockup の独自 DSL は参考であり移植しない。qa-007)
- design system 追加部品: KPI カード / 折れ線・バー・ドーナツ **チャート (bundle 3MiB 制約下で軽量実装 — 重量チャートライブラリ不可、SVG 自作か超軽量 lib)** / ステップウィザード / かんばん風ステージボード / Markdown レンダラ+エディタ / トースト / タブ / スコープ・状態チップ / インライン編集テーブル
- テーマ (ライト/ダーク/自動)・表示密度・言語 (ja/en) — design tokens に組込み。WCAG 2.2 AA は部品側担保 (qa-018 既定)
- 検索 (ハーネス・ユーザー横断)、通知ベル、ワークスペース切替 (実装はセッションのテナント固定 + provider-admin のみ切替)

## 5. セキュリティ必要要素 (全部盛り)

| # | 要素 | 内容 |
|---|---|---|
| SEC1 | 認証 | **mock のパスワードログインは採用しない** — D3 (Auth.js + テナント別 OIDC/SSO 委譲) を維持。2FA/パスワード管理は IdP 責務。Publisher/CLI は Device Flow (qa-008) |
| SEC2 | 認可 | 単一ミドルウェア (qa-020)。role は既存 4 種 (provider-admin/workspace-admin/owner/member) に mock の admin/一般を写像: 管理者=workspace-admin、一般=member。画面/API 両方で deny-by-default |
| SEC3 | テナント分離 | D4 row-level-scope。**全新規テーブル (sheets/builds/feedback/docs/metrics/users) に tenant_id/workspace_id 必須**・分離テスト CI 必須。docs の scope=common は読取専用の共有領域として例外定義 |
| SEC4 | **PII (年収)** | salary は要保護属性: 閲覧は workspace-admin のみ・API レスポンスから member へは非公開・監査 log 対象・export 時マスク。保存時暗号化は Turso 側機能と合わせ要設計 |
| SEC5 | 実行ログの信頼性 | ingest は短命 token 認証 + サーバ側時刻 + 冪等キー。クライアント申告値 (削減時間等) は受けず、回数のみ受けて係数計算はサーバ側 |
| SEC6 | 監査 | 既存 I8 に追加: シート status 変更・pipeline 工程操作・doc 編集・role 変更・係数変更・token 失効を append-only 監査 event 化 |
| SEC7 | 入力検査 | zod 全境界 + Markdown レンダリングの XSS 対策 (sanitize)・アップロード ZIP の検査 (既存 secret scan + サイズ/種別制限) |
| SEC8 | Web 基本 | CSP・Rate limiting (Workers)・CSRF (同一サイト cookie)・セッション失効 (qa-005 の JWT 失効許容時間) |
| SEC9 | 供給チェーン | marketplace JSON・Release の整合性 (R2 immutable + digest)。mock の `claude plugin install ./<slug>.zip` 手動経路は非推奨導線として明記 |

## 6. 確定仕様との差分 (要件層に反映すべき変更点)

1. **スコープ拡張 (U7 改訂)**: 効果測定/ダッシュボード (旧 Stage 4 対象外) と Web ヒアリング intake・フィードバックループ・ドキュメント CMS・ユーザー管理をスコープ入り — 根拠: ユーザー指示 (2026-07-17 mockup 反映指示)
2. **新規 decision 候補 D5**: AI 処理 (シート生成・FB 対応・doc 下書き) の実行主体 — pull 型 (Claude Code セッション消費・追加費用なし) vs server-side API (課金)。**推奨: pull 型** (C2 整合・mock の記述とも一致)
3. **新規 decision 候補 D6**: メール通知の送信手段 (無料枠)
4. **非採用 (矛盾解消)**: パスワードログイン/2FA 自前実装 (D3 維持)、visibility=public (Stage 5 のまま)、`plugin install ./zip` 手動配布 (代替経路としてのみ)
5. **feature 分解への影響**: 新規 feature 候補 6 件 — feat-metrics-tracking (B2/B3/tracking/dashboard) / feat-hearing-intake (form/sheets/B5 の一部) / feat-build-pipeline-board (pipeline) / feat-feedback-loop (feedback/B6) / feat-docs-cms (docs/B7) / feat-user-org-admin (users/account/B10)。既存 8 feature は維持 (dual-catalog-web は S01-S04 のまま)

## 7. 反映状況

- [x] mockup 本体・展開ソースのリポジトリ保存 (本ディレクトリ)
- [x] docs/screen-inventory.md へ画面追加 (S09-S18)
- [x] docs/user-journeys.md へ J4-J6 追加
- [x] docs/shared-layers.md へ共通部品/共通層追加
- [x] docs/system-design-overview.md の全体タスクマップ拡張
- [ ] 要件層 (spec-state) への反映: U7 改訂 + qa 追記 + D5/D6 決定 → `/spec-hearing-start` 経由 (次工程)
- [ ] `/spec-compile` → C05 再評価 → `/dev-graph spec` 再取込 → `/dev-graph decompose` (feature 6 件追加) → 各 feature の `/dev-graph plan`
