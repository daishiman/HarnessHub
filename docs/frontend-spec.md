---
status: confirmed
qa_ref: [qa-040, qa-035]
layer: implementation-spec
sources: [system-spec/frontend.md, system-spec/ui-ux.md, system-spec/00-requirements-definition.md, docs/backend-spec.md, docs/mockups/harness-studio-v2-analysis.md, docs/screen-inventory.md, docs/shared-layers.md, docs/user-journeys.md]
---

# Harness Hub frontend 実装仕様書 (画面・UI/UX・スマホサイズ詳細正本)

> **位置づけ**: system-spec 確定章 (frontend / ui-ux) と mockup 分析 (harness-studio-v2) を実装可能な粒度へ展開した詳細正本。[docs/backend-spec.md](backend-spec.md) (データ構造・API の正本) と対をなす。確定 QA (qa-007/018/021/022/031〜033) と decision (D1-D6) に反する記述はできない。矛盾を発見した場合は R4-reopen の根拠として扱う。
> **確定状態**: §9 の 8 論点は 2026-07-17 のユーザー確認 (qa-040/qa-035。旧 qa-034 は並行ヒアリングとの採番衝突により qa-040 へ再登録) で確定済み。本書に【要確認】は残っていない。
> **mockup の扱い**: harness-studio-v2.html は**見た目と情報設計の正本**であり実装方式の正本ではない (qa-022)。mockup には media query が存在しない (デスクトップ専用設計)。したがって**スマホサイズ (モバイル) の画面仕様は本書 §6 が新規に確定する正本**である。

## 1. ランタイム・技術構成 (qa-007 / qa-022 / qa-034)

- **実行基盤**: Next.js App Router + TypeScript + pnpm。Cloudflare Workers 上で SSR (`@opennextjs/cloudflare`, D1)。UI と API (Route Handlers) は同一 app (`apps/hub`)。
- **クライアント技術スタック (qa-034 確定)**:

| 領域 | 採用 | 根拠・制約 |
|---|---|---|
| スタイリング | Tailwind CSS v4 | design tokens を CSS variables で定義し utility から参照。テーマ/密度切替は `:root` 属性切替 |
| UI 部品 | shadcn/ui ベースの `packages/ui` | Radix primitives 由来の focus 管理・ARIA を部品側で獲得 (qa-018「部品側で a11y 一括担保」に適合)。コードはリポジトリへ取込む方式で lock-in なし |
| サーバ状態 | TanStack Query v5 (~13KB gz) | ポーリング統一 (qa-031: publish 2 秒 backoff・ボード/通知 30 秒) を `refetchInterval` で実装。キャッシュ無効化・楽観更新標準装備 |
| フォーム | react-hook-form + zodResolver | `packages/schemas` の zod をクライアント validation に再利用 (B1 単一ソース、二重定義禁止) |
| チャート | SVG 自作 (`packages/ui`) | 折れ線・バー・ドーナツ・スパークラインの 4 種のみ。依存ゼロ・SSR 可・token 直結 (qa-022 の 3MiB/軽量制約の帰結) |
| i18n | 自作 typed 辞書 (ja 正本・en 後追い) | 依存ゼロ。enum→表示ラベル写像 (backend-spec §2.1) と状態語彙統一 (qa-021) を同一 module に集約 |
| Markdown | react-markdown + remark-gfm + rehype-sanitize | sanitize 済み HTML のみ描画 (SEC7/qa-022)。allowlist 方式。`dangerouslySetInnerHTML` は sanitizer 出力以外全面禁止 |
| アイコン | lucide-react (tree-shakeable SVG) | mockup の Material Symbols は同義アイコンへ写像 (フォント読込を避け CWV 温存) |
| フォント | Noto Sans JP (next/font self-host, subset, display swap) | mockup 実測 (496 箇所) 準拠 |

- **ルーティング (App Router)**: 画面 ID は [docs/screen-inventory.md](screen-inventory.md) 準拠。

| route | 画面 | 備考 |
|---|---|---|
| `/signin` / `/device` | S07 サインイン / S08 Device 承認 | 未認証 layout。S07 はテナント解決 → IdP redirect (D3。mockup の password login は不採用) |
| `/dashboard` | S09 ダッシュボード | `/` は `/dashboard` へ redirect |
| `/harnesses` / `/harnesses/[projectId]` | S01 一覧 / S02 詳細 | mock 実測どおり公開ウィザードは **S01 の「プラグインを公開」モーダル**。install/download は S01/S02 から開く。S03 (公開状態) は S02 の「公開」タブにも統合 |
| `/sheets` / `/sheets/new` / `/sheets/[id]` | S11 一覧 / S10 ウィザード / S12 詳細 | |
| `/pipeline` | S13 構築パイプライン | |
| `/feedback` / `/feedback/[id]` | S14 改善要望 | 起票フォームは一覧内シート/モーダル |
| `/docs` / `/docs/[id]` / `/docs/[id]/edit` | S15 ドキュメント | |
| `/tracking` | S16 利用・削減効果 | |
| `/users` / `/users/[id]` | S17 ユーザー管理 | admin のみ (route guard + API 側 deny) |
| `/account` / `/legal` | S18 アカウント設定 / 規約 | |
| `/workspace-settings` | S04 Workspace 設定・Release 履歴 | admin 中心 (履歴は owner も) |
| `/approvals` / `/audit` | S05 承認キュー / S06 監査ログ | Stage 2。admin のみ |
| `/notifications` | 通知一覧 | モバイルはボトムタブ、デスクトップはベルのドロップダウン + 本 route |

- **コード構造規約**:
  - `apps/hub/src/app` = route 層 (RSC でデータ初期取得) / `src/components` = 画面固有部品 / `packages/ui` = 共通部品 (shared-layers §1 の正本)。
  - API 呼出は `packages/schemas` の zod スキーマ + 薄い型付き fetch wrapper (`src/lib/api`) に閉じる (OpenAPI 生成型と同源。手書き型定義の禁止)。
  - **金額のクライアント再計算禁止** (SEC5/qa-022): 時給・削減額はサーバ計算値 (`estimate_json` / rollups) の表示専用。クライアントで salary・係数から金額を導出するコードを書かない。
  - サーバ状態は TanStack Query、UI ローカル状態は useState/useReducer。グローバル状態ライブラリ (Redux/Zustand 等) は導入しない (C1)。

## 2. デザインシステム (packages/ui)

### 2.1 design tokens (mockup 実測 → semantic 写像)

| semantic token | light 値 (mockup 実測) | 用途 |
|---|---|---|
| `--primary` / `--primary-hover` | `#1677ff` / `#4096ff` | 主操作・リンク・アクティブ状態 |
| `--accent-ai` | `#722ed1` | AI 関連 (生成中・AI 回答・下書き) |
| `--success` / `--success-text` | `#52c41a` / `#389e0d` | 完了・Green 判定 |
| `--warning` | `#fa8c16` | Yellow 判定・warn リスク |
| `--danger` / `--danger-text` | `#ff4d4f` / `#cf1322` | 破壊的操作・Red/エラー |
| `--info-cyan` / `--magenta` | `#13c2c2` / `#eb2f96` | チャート系列・タグ |
| `--bg` / `--surface` / `--border` | `#f5f7fa` / `#ffffff` / `#d9d9d9` (弱: `#f0f0f0`) | 背景・カード・罫線 |

- **コントラスト**: 文字用途は 4.5:1 以上を token 段階で保証 (qa-018)。`--primary` を小さい文字に使う場合は text 用濃色段 (`--primary-text`) を別 token で持つ。チャート系列色も同順で固定し、色のみに依存しない (形状/ラベル併記)。
- **ダークテーマ**: 全 semantic token を `[data-theme=dark]` で再定義。`auto` は `prefers-color-scheme` 追従。テーマ・表示密度 (comfortable/compact)・言語は `user_settings` (PATCH /me) が正本、変更はローカル即時反映 + 保存。
- **ブレークポイント**: Tailwind 既定を採用 — `sm 640 / md 768 / lg 1024 / xl 1280`。**< md (768px) = スマホサイズ仕様 (§6) を適用**。サイドバー常設は ≥ lg、md〜lg はサイドバー折りたたみ (アイコンのみ)。

### 2.2 部品一覧 (実装 owner: feat-hub-foundation)

| 部品 | ベース | 一括担保する a11y/品質 | 主な消費画面 |
|---|---|---|---|
| Button / Input / Select / Checkbox / Radio / Textarea | shadcn/ui | ラベル紐付け・focus-visible・44px タップ域 (§6.1) | 全画面 |
| Dialog (確認) / Sheet (ボトム/サイド) / Popover / DropdownMenu | shadcn/ui (Radix) | focus trap・Esc/外側閉じ・破壊的操作の確認+可逆性明示 (qa-018) | 全画面 |
| Tabs / Badge (状態チップ) / Toast / Skeleton / Tooltip | shadcn/ui | 状態語彙統一 (§2.4)・aria-live=polite・CLS 抑制 | 全画面 |
| DataTable (ソート・cursor ページング・カード化応答) | shadcn Table + 自作 | th scope・ソート aria-sort・モバイルでカードリスト化 (§6.3) | S01/S04/S06/S11/S14/S15/S17 |
| KPI カード / LineChart / BarChart / DonutChart / Sparkline | 自作 SVG | role="img" + aria-label + 「表で見る」代替テーブル切替・SSR 描画 | S09/S12/S16/S17 |
| StepWizard | 自作 | 進捗表示・戻る/次へ・キーボード操作・step 単位 validation | S10・公開ウィザード |
| StageBoard (かんばん) / StageSegment (モバイル) | 自作 | 工程チップ+件数バッジ・risk 表示・DnD 不採用 (操作はメニュー。タッチ/キーボード同等性) | S13 |
| MarkdownView / MarkdownEditor (textarea+プレビュー) | react-markdown + 自作 | XSS sanitize (SEC7)・プレビュータブ | S12/S14/S15 |
| InlineEditTable | 自作 | 編集はモバイルでシートへ昇格 (§6.3) | S17/S04 |
| NotificationBell / WorkspaceSwitcher / SearchCommand | 自作 | 未読バッジ・provider-admin のみテナント切替・検索 (GET /search) | 共通シェル |
| DegradedBanner (縮退) / EmptyState / ErrorState | 自作 | 「導入済みツールはそのまま使えます」(qa-019)・平易な日本語+次の一手 (qa-018) | 全画面 |

### 2.3 SVG チャート契約

- props: `data` (サーバ rollup 値そのまま)・`series` (token 色参照)・`height` (既定 200px、モバイル固定)。アニメーションは CSS transition のみ。ResizeObserver で親幅追従。
- tooltip は Popover 共用。データ点はキーボード到達可能 (左右キー)。すべてのチャートに「表で見る」トグルを付け、同一データを DataTable で提示する (a11y 代替)。

### 2.4 状態語彙辞書 (enum → 表示ラベル・色。i18n 辞書と同一 module)

| ドメイン enum (backend-spec §5) | 表示 (ja) | token |
|---|---|---|
| sheet: `received / generating / review / completed` | 受付 / 生成中 / レビュー待ち / 完了 | info / accent-ai / warning / success |
| build stage 7 値 `hearing…publish` | ヒアリング / 要件定義 / 設計 / 構築 / テスト / レビュー / 公開 | 進行=primary・risk warn=warning |
| feedback: `open / in_progress / resolved` | 未対応 / 対応中 / 対応済み | danger / warning / success |
| publish: `Draft…Published/Failed` (9 値) | 下書き / 検査中 / 要修正 / 承認待ち / 承認済み / 公開処理中 / 公開済み / 失敗 ほか | 対応 token |
| release: `available / suspended / deprecated` | 公開中 / 停止中 / 非推奨 | success / danger / border |

- UI 表示ラベルはこの辞書が唯一の写像点 (backend-spec §2.1)。画面内へのハードコード禁止。

## 3. 画面仕様 (S01-S18 + 共通シェル)

### 3.0 共通シェル (feat-hub-foundation)

- **デスクトップ (≥ lg)**: 左サイドバー 220px 固定 9 項目 (ダッシュボード/ヒアリング/シート/パイプライン/ハーネス/フィードバック/ドキュメント/トラッキング/ユーザー管理[admin]) + ヘッダ (ワークスペース表示・検索・通知ベル・アバターメニュー[account/legal/サインアウト])。md〜lg はサイドバーをアイコンのみに折りたたみ。
- **モバイル (< md)**: §6.2 のボトムタブ+その他シート。ヘッダは画面タイトル+検索アイコン+アバター。
- 縮退バナー・トースト container・確認 Dialog はシェル層に常駐。role 表示 (qa-005) はアバターメニュー内。

### 3.1 画面×API マップ (データ取得の正本)

| ID | 画面 | 主データ取得 (backend-spec §4) | ポーリング (§4.2) | モバイル区分 (§6.4) |
|---|---|---|---|---|
| S01 | プラグイン Hub 一覧 + 公開ウィザード | `GET /harnesses` (filter: target/status/q)・owner: `POST /projects` → `POST /publish` → package upload/submit・`GET /harnesses/:projectId/install` | publish 中 2s→backoff / 一覧 60s stale | 重点 |
| S02 | ハーネス詳細・管理・導入 | `GET /harnesses/:projectId`・`GET /projects/:id/releases`・`GET /harnesses/:projectId/install` | 公開中だけ 2s→backoff | 重点 |
| S03 | 公開状態 (S02 内タブ) | `GET /publish/:id`・**一覧は §3.4 の追加 API** | 非終端時 2s→backoff | 重点 |
| S04 | Workspace 設定・Release 履歴 | `GET /tokens`・`GET /projects/:id/releases`・`GET/PATCH /tenant/coefficients` | なし | 簡易 |
| S05 | 承認キュー | **§3.4 の追加 API** (status=approval_pending) → `POST /publish/:id/approve` | 30s | 簡易 |
| S06 | 監査ログ | `GET /audit-events` (filter+cursor) | なし | 簡易 |
| S07/S08 | サインイン / Device 承認 | Auth.js / `POST /device/approve` | なし | 重点 |
| S09 | ダッシュボード | `GET /metrics/summary` (KPI 6+推移)・`GET /metrics/rollups` (ランキング/部門別) | なし (staleTime 5 分) | 重点 |
| S10 | ヒアリングウィザード | `POST /sheets` (12 項目) | なし | 重点 |
| S11 | シート一覧 | `GET /sheets` (filter: status/department/q) | 30s (生成中があるときのみ) | 重点 |
| S12 | シート詳細 | `GET /sheets/:id` (form+estimate+生成 doc+build 参照)・admin: `PATCH`・`POST :id/regenerate` | status=generating 時 30s | 重点 |
| S13 | パイプライン | `GET /builds`・admin: `PATCH /builds/:id`・`POST /builds/:id/stage` | 30s | 閲覧=重点 / 操作=簡易 |
| S14 | フィードバック | `GET/POST /feedback`・`GET /feedback/:id`・admin: `PATCH` | 一覧 30s | 重点 |
| S15 | ドキュメント | `GET /docs`・`GET /docs/:id`・admin: `POST/PATCH`・`POST :id/draft` | なし | 閲覧=重点 / 編集=簡易 |
| S16 | 利用・削減効果 | `GET /metrics/rollups` (dim=tenant/department/project。user 次元金額は admin のみ = SEC4) | なし (staleTime 5 分) | 重点 |
| S17 | ユーザー管理 | `GET/POST /users`・`GET/PATCH /users/:id` (個別ダッシュボードは rollup 込み) | なし | 簡易 |
| S18 | アカウント設定 | `GET/PATCH /me` (user_settings) | なし | 重点 |
| — | 通知 | `GET /notifications`・`POST /notifications/read` | 30s | 重点 |
| — | 検索 | `GET /search?q=` (ハーネス+ユーザー。ユーザーは name/department のみ) | なし | 重点 |

- グルーピング (S13 の stage 別・S11 の status 別) はクライアント側で行う (backend-spec §4.4)。
- 401 は全画面共通で `/signin` へ、403 は権限トースト (deny-by-default の UI 表現)。

### 3.2 複雑画面の詳細

- **S09 ダッシュボード**: KPI 6 カード (総実行回数・削減時間・削減額・完了シート・稼働ハーネス・参加ユーザー) → `metrics/summary`。折れ線 (週次推移)・ドーナツ (完了率)・ランキング (ハーネス別/ユーザー別)・バー (部門別削減) → `metrics/rollups`。金額はすべてサーバ集計値の表示 (member へは集計値のみ = §3.3 認可マトリクス準拠)。
- **S10 ヒアリングウィザード (FormData 12 項目 = backend-spec §4.3)**: Step1 基本 (`taskName, company, applicant, domain`) → Step2 現状 (`issue, tools, hours, people, salary`) → Step3 要望 (`features, output, priority`) → Step4 確認+試算。**試算表示規則 (SEC5 整合)**: ウィザード中は時間削減の概算のみ (「月 {hours}h × {people}人 × 35% (既定係数)」の参考表示。金額は出さない)。提出後はサーバ snapshot (`estimate_json`) だけを正として S12 に表示する。途中状態は sessionStorage 保持 (誤離脱ダイアログ付き)。提出成功 → mock と同じ完了パネルで HS コード・`生成中`・「シートを見る」「パイプラインを見る」「続けて作成」を表示する。生成完了までは受付番号+状態チップ+完了通知 (qa-021 パターン)。
- **S11 ヒアリングシート一覧**: デスクトップは `status / HS コード・title / domain・department / people・hours / applicant / updated_at` の 6 列、モバイルは同じ情報をカードへ畳む。status filter・department filter・全文検索・cursor ページングを持つ。member の API は自分の作成分だけ、workspace-admin はテナント全件を返すため、クライアントで権限外行を除外する実装は禁止する。
- **S12 ヒアリングシート詳細**: ヘッダに `display_code/status/title/applicant/department/created_at/AI 生成表示`、本文に「概要」「現在の課題」「推奨機能タグ」「想定削減効果」を表示し、元入力 snapshot・試算 snapshot・対応 Build/PublishRequest の参照を併記する。`received` の表示ラベルは mock の「下書き」でなく全画面共通の「受付」とする。admin の状態変更・再生成は右側メタ領域、member には非表示かつ API でも拒否。P2 有効後は AI 完了時に自動作成された対応 Build を「構築パイプラインへ」で表示し、P1 単独期間はこのボタンを表示しない。
- **S12 PDF 出力**: 「PDF でダウンロード」は別データ生成を行わず、認可済み詳細 DTO と同じ表示モデルを print stylesheet で A4 化して `window.print()` を呼ぶ (ブラウザの「PDF に保存」)。ボタン名は mock を維持する。salary 原値・非表示フィールド・操作ボタンを印刷 DOM に含めず、画面と PDF の内容差分を snapshot test する。
- **S01 公開ウィザード**: Step1 は CLI 取込を推奨し、Web 手動取込は ZIP 代替。Step2 は target (`skill/web_app`)、category、visibility (Stage 1 は workspace まで)、説明、Step3 は検査結果と公開確認。新規 Project 作成→PublishRequest 作成→package upload/submit を 1 UI フローに束ねるが、API の各 status は隠さない。Green は自動、Yellow は承認待ち、Needs Fix は S03 の findings へ移動する。単一テナント/単一 Project を定数にしない。
- **S13 パイプライン**: デスクトップ = 7 工程カラムの横並びボード (工程ヘッダに件数)。カード = title・HS/FR 参照・assignee・eta・risk チップ。admin 操作 = カードメニューから「前の工程へ/次の工程へ」(隣接遷移のみ = §5.3)+確認 Dialog。**DnD は採用しない** (タッチ/キーボード同等性と隣接制約の UI 強制のため。qa-035)。`publish` 工程への遷移は接続済み PublishRequest が `Published` でない場合エラー表示 (B4)。
- **S14 改善要望・レビュー**: 上部に status 件数、一覧に FR コード/harness/type (`改善要望/レビュー依頼/バグ報告`)/priority/requester/date/status、詳細に本文と sanitize 済み AI 応答を表示する。Web 起票と CLI 起票は source chip だけが異なり、同じ一覧へ入る。AI 完了後に作成された修正版 Build への導線を表示し、S13→publish→更新通知まで追跡できる。
- **S15 ドキュメント**: common + 自 tenant を 1 一覧へ合成し、category/scope/q で絞込。閲覧は sanitize 済み Markdown、admin 編集は textarea+preview、AI 下書きは受付番号/生成中/完了通知を共通パターンで表示する。member に編集 CTA を出さず、common 編集は provider-admin だけに出す。
- **S02 ハーネス詳細**: 概要/チャネル/全 Release と stable 版/利用統計/公開タブ (S03: PublishRequest 進捗・Needs Fix findings 表示・非終端時ポーリング)。install/download modal は backend の descriptor を表示し、`skill` は marketplace URL コピー+Stage 0 採用コマンド、`web_app` は URL open を行う。UI は R2 object key や永続的な生 URL を組み立てない。owner だけに promote/rollback/suspend を表示し、member の導入操作と混ぜない。
- **S17 ユーザー管理**: 一覧 (name/department/role/status/利用集計。**salary 列は admin API レスポンスにのみ存在**し、表示は既定マスク+明示 toggle+監査対象の注意書き)。個別 = プロフィール+削減効果 rollup。作成 = 事前登録フォーム (role/department/salary。初回ログインは IdP JIT = §4.2)。

### 3.3 状態表示の共通規則

- loading = Skeleton (CLS 抑制)、empty = EmptyState (次の一手導線付き)、error = ErrorState (平易な日本語+再試行)、障害 = DegradedBanner。
- 待ち時間のある操作 (publish 検査・AI 生成・regenerate) は必ず進捗表示 (qa-018)。AI 非同期は「受付番号+生成中チップ+完了通知」で統一 (qa-021)。
- 破壊的操作 (公開停止・rollback・token 失効・シート差戻し) = 確認 Dialog + 可逆性の明示。

### 3.4 backend への追加 API 要求 (本ヒアリングでの発見。additive evolution = §3.1 の範囲)

| 追加要求 | 理由 | 形状 |
|---|---|---|
| `GET /api/v1/publish` (filter: project/channel/status, cursor) | S03 が進行中 PublishRequest を発見する手段、S05 が承認キュー (`Approval Pending`) を一覧する手段が当初 backend-spec に無かった (`GET /publish/:id` 単体のみ) | 認可: owner=自 Project、admin=Workspace 全体。qa-009 の直列化・状態機械は不変 |

- **反映済み (2026-07-18)**: backend-spec §4.6 へ additive 追記済み (破壊なし)。細部 (レスポンス形状・既定 filter) は実装 feature (feat-publish-pipeline) の P02 で確定する。

### 3.5 C4 改訂 (業務データ保持 = qa-045〜049) による追加影響 (2026-07-18 追記)

要件 C4 の改訂 (非保持境界 → 業務ナレッジ/ドキュメントとハーネス実行入出力データの保持前提化。appr-007) により、本書確定後に以下の delta が生じた。**本書の既確定内容 (§1〜§8) と矛盾する変更はない** (additive)。

| delta | frontend への影響 | 設計時期 |
|---|---|---|
| 業務データ保管 API (upload / 取得 / 即時完全削除 = qa-048) | UI 導線は未設計。候補: S15 (docs) への添付・アップロード拡張、S12 (シート詳細) からの実行入出力データ閲覧。**削除 UI は既存の破壊的操作パターン (§3.3) に従うが、即時完全削除のため「不可逆」を明示する** (可逆性明示の例外として扱う) | エンドポイント詳細と同時に feature P02 |
| AiJob pull の workspace-admin 開放 (qa-048) | 影響なし (pull は CLI / AI worker 面で Web 画面を持たない)。キュー監視画面 (`GET /api/v1/ai-jobs`) は従来から未定義の gap のまま (mockup にも存在しない。必要になれば S04 配下に追加) | 必要時に screen-inventory へ追記から |
| tenant_data_objects の R2 使用量監視 (qa-045) | 影響なし (admin 向け通知はアプリ内通知の既存パターン) | — |

## 4. データ取得・状態管理 (TanStack Query v5)

- **queryKey 規約**: `[resource, params?]` / 詳細は `[resource, id]`。例: `['sheets', {status}]`・`['builds']`・`['publish', id]`・`['notifications']`。key 文字列は API リソース名と一致させる。
- **ポーリング規約 (qa-031 確定値の実装)**:

| 対象 | 間隔 | 停止条件 |
|---|---|---|
| `['publish', id]` (非終端) | 2s → 指数 backoff (×2, max 30s) | 終端 status (`Published/Failed/Draft`) で停止 |
| `['builds']`・`['notifications']`・`['sheets']`(生成中あり)・`['feedback']` | 30s 固定 | 画面離脱で停止 |
| summary / rollups / harnesses | ポーリングなし | staleTime 5 分 / 60s |

- `refetchIntervalInBackground: false` (非表示タブで停止 = Workers 無料枠と端末電池の温存)。復帰時は refetchOnWindowFocus で追随。
- **mutation → invalidate マップ**: sheet 提出→`['sheets']`+`['notifications']` / stage 遷移→`['builds']` (楽観更新+失敗 rollback) / 既読→`['notifications']` (楽観) / approve・promote・rollback・suspend→`['publish', id]`+`['harnesses']` / 設定 PATCH→`['me']` (楽観)。楽観更新はこの表の 3 箇所のみ (他は invalidate 方式)。
- **RSC 境界**: 各 route の初回表示は RSC でサーバ取得 (SSR)、`HydrationBoundary` で Query キャッシュへ引継ぎ。以降の再検証・ポーリングはクライアント。
- **エラー写像 (RFC 9457 = §3.4)**: `errors[]` → RHF `setError` (フィールド単位) / 401 → `/signin` redirect / 403 → 権限トースト / 409 (publish 直列化) → 「先行の公開処理が完了するまでお待ちください」案内 / 422 (Idempotency 不一致) → 再読込案内 / 5xx・ネットワーク → DegradedBanner + 指数 backoff リトライ。
- 認証はセッション cookie のみ (SameSite=Lax)。クライアント store にトークンを持たない。

## 5. フォーム (react-hook-form + zodResolver)

- スキーマは `packages/schemas` の request zod を **step 単位に pick** して使用 (二重定義禁止)。submit 時は全体スキーマで最終 parse。
- ウィザード: 1 step = 1 RHF フォーム。「次へ」で step スキーマ validation → エラー時は最初の invalid フィールドへ focus 移動。「戻る」は値保持。draft は sessionStorage (`sheet-draft` key、提出成功で破棄)。
- 送信中は submit disable + スピナー (二重送信防止。HS 採番はサーバ責務)。
- 設定系 (S18/S04 係数) は単票フォーム + 楽観反映。係数変更 (admin) は監査対象である旨をフォーム内に明示 (B10/SEC6)。
- doc 編集 (S15) は MarkdownEditor (textarea+プレビュー)。AI 下書き (`POST /docs/:id/draft`) は非同期 UI パターンで受付表示。

## 6. スマホサイズ (モバイル) 画面仕様 (qa-035 — 本書が新規確定する正本)

### 6.1 原則

- 適用条件: viewport **< 768px (md 未満)**。native アプリは作らない (frontend 章の対象外理由を維持) — 本節は web のレスポンシブ仕様である。
- タップターゲット **44×44pt 以上** (HIG doctrine anchor)。主要操作は画面下半分 (親指到達域) に配置。
- `100dvh` 基準・`env(safe-area-inset-*)` 対応 (ノッチ/ホームバー)。入力フォント 16px 以上 (iOS 自動ズーム防止)。
- 横スクロールは §6.3 で明示した箇所のみ許可 (それ以外の水平オーバーフローは欠陥として扱う)。

### 6.2 ナビゲーション (ボトムタブ + その他シート = qa-034)

- **ボトムタブ 5 slot (固定)**: ダッシュボード (S09) / ハーネス (S01) / 申請 (S11。新規作成ボタン→S10) / 通知 (未読バッジ) / **その他**。
- **その他タブ** → ボトムシート: パイプライン・フィードバック・ドキュメント・トラッキング・[admin] ユーザー管理・[admin] Workspace 設定・承認キュー・監査ログ・アカウント設定・規約 + ワークスペース表示 (切替は provider-admin のみ)。role により項目を出し分け (deny-by-default の画面表現)。
- ヘッダ: 画面タイトル + 検索アイコン (全画面検索シート) + アバター。サイドバーはモバイルで描画しない。
- タブは currentPage を `aria-current` で明示。シートは focus trap + スワイプダウン/Esc で閉じる。

### 6.3 レスポンシブ変換パターン辞書 (デスクトップ → モバイル)

| # | デスクトップ表現 (mockup 実測) | モバイル表現 | 適用画面 |
|---|---|---|---|
| P1 | サイドバー 220px + コンテンツ | ボトムタブ + その他シート (§6.2) | 全画面 |
| P2 | KPI grid `repeat(3-4, 1fr)` | **2 列 grid** (数値優先・ラベル省略形) | S09/S16 |
| P3 | データテーブル (6-8 列) | **主要 2-3 フィールドのカードリスト** + タップで詳細へ。状態はチップ表示 | S01/S11/S14/S15/一覧全般 |
| P4 | 7 工程ボード (横並びカラム) | **工程セグメント (横スクロールチップ+件数バッジ) + 選択工程の縦カードリスト** | S13 |
| P5 | 2 カラム詳細 (`1fr 300px`) | 縦積み (メインコンテンツ → メタ情報) | S02/S12/S17 個別 |
| P6 | センターモーダル | **ボトムシート** (install/download・公開ウィザード・フィルタ・起票フォーム)。確認 Dialog のみセンター維持 | S01/S02/S14 ほか |
| P7 | チャート横並び | 縦積み 1 列・高さ 200px 固定 (スクロール量優先) | S09/S16 |
| P8 | フィルタバー (インライン) | フィルタボタン → ボトムシート (適用件数表示) | 一覧全般 |
| P9 | インライン編集テーブル | 行タップ → 編集シート | S17/S04 |
| P10 | ウィザード (横長 step 表示) | 1 step = 1 画面・上部に進捗バー・ヘッダ back で前 step | S10・公開ウィザード |

### 6.4 画面別モバイル挙動一覧 (区分: ◎重点最適化 / △簡易対応 = 動作保証 + デスクトップ推奨バナー)

| ID | 区分 | モバイル挙動の要点 |
|---|---|---|
| S01/S02 | ◎ | P3 カード一覧 (名前・target・状態チップ・DL 数)。S01 の公開ウィザードと install/download は P6 ボトムシート、詳細は P5 縦積み (コマンドはコピー導線中心) |
| S03 | ◎ | 公開タブ: 進捗ステッパーを縦型表示。Needs Fix findings はアコーディオン |
| S04 | △ | 設定フォームは縦積みで動作。IdP 設定・係数編集は横幅依存が強くバナー表示 |
| S05/S06 | △ | 承認カード/監査行は P3 カード化で閲覧可。承認操作は可能だが一括操作なし。監査 filter は P8 |
| S07/S08 | ◎ | 単票中央寄せ。Device user_code 入力は数字最適化 (`inputmode`)・大きな確認ボタン |
| S09 | ◎ | P2 (KPI 2 列)+P7 (チャート縦積み)。ランキングは上位 5 件+「すべて見る」 |
| S10 | ◎ | P10。試算参考表示は step4 (§3.2 の SEC5 規則) |
| S11/S12 | ◎ | P3 カード (HS コード・タイトル・状態チップ・申請者)。詳細は P5。admin の status 変更はアクションシート |
| S13 | 閲覧◎/操作△ | P4。stage 操作はカードメニュー (隣接遷移+確認)。DnD なし |
| S14 | ◎ | P3 + 起票は P6 ボトムシート (type 選択+本文)。AI 回答は MarkdownView |
| S15 | 閲覧◎/編集△ | 閲覧は読みやすさ優先 (max-width・行間)。編集はプレビュー切替タブで動作、バナー表示 |
| S16 | ◎ | P2+P7。期間切替はセグメント。user 次元金額は admin のみ (SEC4 — API 側制御に従う) |
| S17 | △ | 一覧は P3 だが列が多く横スクロール併用。salary 表示・role 変更は可能だがバナー表示 |
| S18 | ◎ | 設定グループを縦 Accordion。テーマ/密度/言語は即時反映 |
| 通知 | ◎ | 専用画面 (ボトムタブ)。P3 リスト+スワイプなし・タップで既読+遷移 |

- △ 画面の DesktopRecommendBanner は dismissible (localStorage 記憶)。機能は削らない (「動作保証」= 全操作が完遂可能であること)。

### 6.5 タッチ操作の制約 (a11y 同等性)

- スワイプ・ロングプレス・DnD を**必須操作にしない** (すべて可視ボタン/メニューで代替)。pull-to-refresh は実装しない (ポーリングで足りる)。
- ボトムシートはドラッグハンドル+閉じるボタン併設。トーストは操作を遮らない位置 (ボトムタブの上)。

## 7. i18n・表示辞書 (自作 typed 辞書 = qa-034)

- `src/i18n/ja.ts` を正本とし、`MessageKey = keyof typeof ja` で型固定。`en.ts` は `Record<MessageKey, string>` 制約で後追い追加 (欠落キーは型エラー)。
- namespace 構造 (`nav.*` / `sheets.status.*` / `errors.*` / `enum.*`) を保ち、将来 next-intl へ移行可能な形にする。
- enum→ラベル写像 (§2.4) は `enum.*` namespace に集約 (backend-spec §2.1 の「フロントエンドの辞書で写像」の実体)。
- 数値・金額・日付は `Intl.NumberFormat` / `Intl.DateTimeFormat` を直用 (epoch ms → 表示はここだけで変換。タイムゾーンは端末依存表示)。
- locale は `user_settings.language` が正本 (SSR は session の設定値を参照)。未ログイン画面 (S07) は ja 既定。

## 8. 非機能 (性能・a11y・テスト)

- **CWV good (qa-018)**: p75 で LCP ≤ 2.5s / INP ≤ 200ms / CLS ≤ 0.1。**First Load JS ≤ 250KB (gzip) / route** を `next build` 出力で CI 計測 (Worker bundle 3MiB ゲートとは別軸)。チャート・Markdown・ウィザードは dynamic import で route 分割。
- 画像は静的アセット + 明示 width/height (CLS 防止。Workers 制約により next/image の画像最適化サービスは使わない)。フォントは self-host subset + `display: swap`。
- **a11y**: WCAG 2.2 AA を部品側担保 (qa-018) + axe 自動検査を部品単体・画面結合の両方で CI 必須。キーボードで全操作完遂可能 (DnD 不採用の根拠)。ポーリング更新・トーストは `aria-live=polite`。
- **テスト**: Vitest = 部品・辞書 (キー欠落)・状態写像・チャート描画。Playwright = 主要ジャーニー (J1-J6) × **2 viewport (1280×800 / 390×844)** + axe 統合。分離テスト等サーバ側は backend-spec 準拠。
- **セキュリティ (フロント境界)**: sanitize 済み Markdown のみ描画 (SEC7)・外部リンク `rel="noopener noreferrer"`・CSP は security 章準拠・PII (salary) は admin API レスポンス以外に出現させない (SEC4。ログ・エラー通知にも含めない)。

## 9. 確定記録 (2026-07-17 ユーザー確認 = qa-040 / qa-035)

| # | 論点 | 決定 | 備考 |
|---|---|---|---|
| 1 | モバイル対応範囲 | **重点最適化 + 全画面動作保証** (AI 推奨に同意) | §6.4 の◎/△区分。native アプリなしは不変 |
| 2 | モバイルナビゲーション | **ボトムタブ 4+その他シート** (AI 推奨に同意) | §6.2。HIG タブバー原則準拠 |
| 3 | UI 基盤 | **Tailwind CSS v4 + shadcn/ui ベース packages/ui** (AI 推奨に同意) | Radix 由来 a11y を部品側担保 (qa-018 適合)。コード取込方式で lock-in なし |
| 4 | サーバ状態管理 | **TanStack Query v5** (AI 推奨に同意) | ポーリング統一 (qa-031) を refetchInterval で実装 (§4) |
| 5 | チャート実装 | **SVG 自作 (packages/ui)** (AI 推奨に同意) | qa-022「SVG 自作か超軽量 lib」の確定。4 種のみ・SSR 可・代替テーブル (§2.3) |
| 6 | ボード/テーブルのモバイル表現 | **工程セグメント+縦リスト、テーブルはカード化** (AI 推奨に同意) | §6.3 P3/P4。DnD 不採用 |
| 7 | フォーム実装 | **react-hook-form + zodResolver** (AI 推奨に同意) | packages/schemas 再利用 (B1)。step 分割 validation (§5) |
| 8 | i18n | **自作 typed 辞書 (ja 先行)** (AI 推奨に同意) | 依存ゼロ・enum 写像と同一 module (§7)。next-intl 移行可能な構造 |

## 10. 構築優先順位による実装順 (2026-07-18 追記。additive — 正本: [system-design-overview.md](system-design-overview.md) §3「構築優先順位」)

ユーザー確定の構築優先順位 (P0 認証基盤 → P1 ヒアリング → P2 プラグイン Hub + パイプライン → P3 改善ループ・ドキュメント → P4 ユーザー・効果測定 → P5 ダッシュボード・統制) を画面実装へ展開する。**本書の既確定内容 (§1〜§9) を変更するものではなく、着手順だけを定める**。本節の P0〜P5 は構築 phase 番号であり、§6.3 のレスポンシブ変換パターン P1〜P10 とは無関係。

- **画面の実装順**: P0 = 共通シェル (§3.0) + S07/S08 → P1 = S10/S11/S12 → P2 = S01 (公開ウィザード・一覧・install/download) → S02/S03 (管理・公開状態) → S13 (ヒアリング/公開との接続) → P3 = S14/S15 → P4 = S16/S17/S18 → P5 = S09 + S05/S06。
- **`/` redirect の段階運用**: §1 の「`/` は `/dashboard` へ redirect」は S09 完成後 (P5) の最終形。**S09 完成までは `/` → `/sheets`** (最優先のヒアリング動線へ誘導。P2 以降も、ダッシュボード完成までこのまま)。
- **ナビゲーションの段階表示**: サイドバー 9 項目 (§3.0)・ボトムタブ (§6.2) は未実装 phase の項目を**表示しない** (グレーアウトでなく非表示 — 「押せるのに動かない」を作らない qa-018 整合)。ボトムタブのダッシュボード slot は S09 完成まで「シート (S11)」を先頭 slot にする暫定とし、確定は feat-metrics-tracking の P02 で行う。
- **部品の実装順**: [shared-layers.md](shared-layers.md) §1「部品の実装順」参照 (StepWizard = P1、StageBoard = P2、MarkdownEditor = P3、InlineEditTable = P4、チャート/KPI カード = P4 の S16 から・S09 で完成)。
- **role 分離の扱い**: 認可 (deny-by-default・role 4 種・admin 出し分け) は P0 から全画面に効く。後回しにするのは S17/S05/S06 という**管理画面そのもの**であり、認可制御ではない。
