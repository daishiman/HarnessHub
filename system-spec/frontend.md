---
status: confirmed
category: frontend
aggregate: 確定
spec_cells: [frontend.web, frontend.mobile, frontend.tablet, frontend.desktop-windows, frontend.desktop-linux, frontend.desktop-macos]
serves_goals: [G1, G2, G3, G5]
---

# フロントエンド (frontend)

- カテゴリ集約状態: **確定**
- 章確定マーカー: `status: confirmed`

## カテゴリ別収集状態

| プラットフォーム | 状態 | 根拠 |
|---|---|---|
| Web (web) | 確定 | 確定質疑: qa-233 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリなし。モバイルブラウザ表示は web 行のレスポンシブでカバー |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリなし。タブレットブラウザ表示は web 行のレスポンシブでカバー |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-007 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop クライアントは対象外 (作者環境は macOS + Windows) |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-007 |

## 確定内容 (質疑録)

### qa-233 (対応セル: web)

**質問**: qa-232 で確定したカード一覧・タブ・検索・カードブロック本文・編集/プレビュー 2 ペインを、frontend/web の実装契約としてどう確定するか。

**回答**: [出所] 利用者の2026-08-13の明示要望 (qa-232 と同一の逐語) を実装層へ落とした契約である。qa-227 の frontend/web 既存契約 (Next.js App Router + TypeScript + pnpm、@opennextjs/cloudflare 上の SSR、server-first、packages/ui 所有の共通部品、route-local 遅延読込境界) は、以下の差分以外を全面維持する。

【1 カードブロック記法】カードブロックは remark のコンテナ記法 `:::cards cols=2` の内側に `:::card` を並べる入れ子で表す。`cols` は 2 と 3 のみ受理し、未知の値・未閉じブロックは描画時に通常段落へ縮退させて例外を投げない。実装は packages/ui の Markdown 実装が所有する remark plugin とし、apps/hub 側で再実装しない (既存 callout plugin と同じ所在・同じ方式)。

【2 生成要素と段組】plugin は `hh-cards` (属性 data-cols) と `hh-card` のカスタム要素を生成し、React の components map で CSS grid へ描画する。段組は `lg` (1025px) 以上で指定 cols 列、`md` (641px) 以上 `lg` 未満で 2 列を上限、`md` 未満で 1 列とする。列数が減っても DOM 順序は記述順のまま保ち、読み上げ順と視覚順を一致させる。

【3 一覧部品の共通化】カードグリッド・表示切替・タブは packages/ui の共通部品として実装し、docs / sheets / catalog の 3 画面が同一部品を使う。既存 DataTable は削除せずテーブル表示側で継続利用する。ListState・FilterBar・AppliedFilterChips・CursorPager の既存契約は変更しない。

【4 状態の単一の真実】タブ・検索語・filter は URL query を単一の真実とし、同じ状態を client state に二重で持たない。既存 remembered-filters には表示形態 (カード / テーブル) のみを追加で記憶させる。

【5 編集/プレビュー】2 ペインと 1 面タブの切替は CSS で行い、`lg` 未満は既存 Tabs 部品で 2 面を切り替える。プレビューは編集中の client 側でも表示側と同じ MarkdownView を使い、sanitize schema を共有して表示差を作らない。Markdown の重量依存は既存の dynamic import 境界 (markdown-view / markdown-editor の薄い公開境界) を維持し、docs 以外の画面の初期 client chunk を増やさない。

【6 アイコン】アイコンは packages/ui のアイコンモジュールが持つ inline SVG のみを使う。UI 文言・callout ラベル・空状態文言に絵文字を混入させない。絵文字混入は lint で検出する。

【7 不変】公開 API・DB schema・認可判定・Cloudflare deploy unit は変更しない。server-first と既存の screen-pattern gate、情報設計シート・screen-inventory profile 更新の PR 要件も維持する。

### qa-007 (対応セル: desktop-windows, desktop-macos)

**質問**: フロントエンド構成 (クライアント構成・状態管理・レンダリング・ビルド) は?

**回答**: ユーザー直接指定: Next.js + TypeScript、パッケージマネージャは pnpm (npm 不使用、packageManager フィールドで pin)。Hub Web は Next.js App Router を Workers 上 (@opennextjs/cloudflare) で SSR し、初期 4 画面 (業務ツール一覧 / 詳細 / 公開状態・修正内容 / Workspace 設定・Release 履歴) をレスポンシブ実装。作者向けクライアントは専用 desktop GUI を作らず、Claude Code / Codex plugin (slash command + skill + スクリプト) を Publisher の操作面とする (§5.1: Web に会話型 Creator を作らない)。

## 上流指針 (doctrine anchor)

| concern | authority (正本) | 導く上流原則 | 出典 |
|---|---|---|---|
| presentation | Apple Human Interface Guidelines | 画面設計・操作フロー・情報階層・アクセシビリティの上流原則 | https://developer.apple.com/design/human-interface-guidelines |
| application-architecture | Robert C. Martin — Clean Architecture | レイヤ境界・依存方向 (内向き)・ユースケース中心設計 | Clean Architecture (2017), the Dependency Rule |

- 本章の確定内容 (質疑録) は上記 authority を上流指針として適用する。具体技術の選定はこの指針に従属し、指針との乖離は再オープン (R4-reopen) の根拠になる。

## 適用された設計知識

### Clean Architecture — deep knowledge card

- 出典カード: `ref-system-design-knowledge/references/clean-architecture.md`

#### 目的

変化しやすいUI、DB、framework、外部サービスから、長く保持したい業務ルールとuse caseを隔離し、技術交換やテストを目的達成の阻害要因にしない。

#### 解決する問題

- 業務ルールがcontroller/ORM/UI lifecycleへ埋まり、単体で検証できない。
- 外部技術変更が内側のuse caseまで波及し、置換費用を予測できない。
- 入出力形式やvendor型が境界を越え、責務と所有者が曖昧になる。

#### 適用条件

- business ruleが外部I/Oより長寿命で、UI/DB/providerの変更可能性がある。
- 複数delivery channelや外部integrationから同じuse caseを再利用する。
- 重要なpolicyを高速・決定論的にテストする価値が、境界導入費を上回る。

#### 非適用条件

- 寿命の短い検証用prototypeで、交換可能性より学習速度が明確に優先される。
- domain ruleがほぼ無い単純変換scriptで、port/adapterが実質的な抽象を生まない。
- 外部製品そのものがsystemの目的で、抽象化すると必要機能が失われる。ただしsecurity/audit boundaryは別途必要。

#### トレードオフ・失敗モード

- 境界、DTO、mapping、dependency injectionの量が増え、小規模systemでは認知負荷が先行する。
- 「4層を作ること」が目的化すると、変化軸のないinterfaceやpass-through use caseが増える。
- domain modelを万能化してdelivery固有の制約を隠すと、現実のlatency/transaction/error semanticsを見失う。
- portを外側が定義したりinner layerがORM型を返したりすると、名前だけcleanな依存逆転になる。

#### goalへの寄与

- `essential_purpose`に直結するpolicyを外部詳細から守り、goal達成ロジックの検証を速くする。
- 制約に「vendor lock-in低減」「複数platform」「高い変更頻度」がある場合、変更範囲と移行riskを局所化する。
- 適用判断は「何層あるか」でなく、守るgoal、予想される変更、boundary testで観測する。

---

#### 本章での適用

##### 確定内容 qa-233 (対応セル: web)

- 確定要件: [出所] 利用者の2026-08-13の明示要望 (qa-232 と同一の逐語) を実装層へ落とした契約である。qa-227 の frontend/web 既存契約 (Next.js App Router + TypeScript + pnpm、@opennextjs/cloudflare 上の SSR、server-first、packages/ui 所有の共通部品、route-local 遅延読込境界) は、以下の差分以外を全面維持する。

【1 カードブロック記法】カードブロックは remark のコンテナ記法 `:::cards cols=2` の内側に `:::card` を並べる入れ子で表す。`cols` は 2 と 3 のみ受理し、未知の値・未閉じブロックは描画時に通常段落へ縮退させて例外を投げない。実装は packages/ui の Markdown 実装が所有する remark plugin とし、apps/hub 側で再実装しない (既存 callout plugin と同じ所在・同じ方式)。

【2 生成要素と段組】plugin は `hh-cards` (属性 data-cols) と `hh-card` のカスタム要素を生成し、React の components map で CSS grid へ描画する。段組は `lg` (1025px) 以上で指定 cols 列、`md` (641px) 以上 `lg` 未満で 2 列を上限、`md` 未満で 1 列とする。列数が減っても DOM 順序は記述順のまま保ち、読み上げ順と視覚順を一致させる。

【3 一覧部品の共通化】カードグリッド・表示切替・タブは packages/ui の共通部品として実装し、docs / sheets / catalog の 3 画面が同一部品を使う。既存 DataTable は削除せずテーブル表示側で継続利用する。ListState・FilterBar・AppliedFilterChips・CursorPager の既存契約は変更しない。

【4 状態の単一の真実】タブ・検索語・filter は URL query を単一の真実とし、同じ状態を client state に二重で持たない。既存 remembered-filters には表示形態 (カード / テーブル) のみを追加で記憶させる。

【5 編集/プレビュー】2 ペインと 1 面タブの切替は CSS で行い、`lg` 未満は既存 Tabs 部品で 2 面を切り替える。プレビューは編集中の client 側でも表示側と同じ MarkdownView を使い、sanitize schema を共有して表示差を作らない。Markdown の重量依存は既存の dynamic import 境界 (markdown-view / markdown-editor の薄い公開境界) を維持し、docs 以外の画面の初期 client chunk を増やさない。

【6 アイコン】アイコンは packages/ui のアイコンモジュールが持つ inline SVG のみを使う。UI 文言・callout ラベル・空状態文言に絵文字を混入させない。絵文字混入は lint で検出する。

【7 不変】公開 API・DB schema・認可判定・Cloudflare deploy unit は変更しない。server-first と既存の screen-pattern gate、情報設計シート・screen-inventory profile 更新の PR 要件も維持する。
- 設計解釈の記録経路: `dialogue`
- 原則: 依存の方向と所有境界の固定 (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/clean-architecture.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: カードブロックの記法解釈と描画を packages/ui の Markdown 実装へ一箇所で所有させ、apps/hub 側の再実装を禁じた。一覧のカード・タブ・切替も共通部品化し、docs / sheets / catalog の 3 画面で規則が分岐するのを防いだ。
  - トレードオフ:
    - packages/ui の公開面が広がり、破壊的変更時の影響範囲が 3 画面へ同時に及ぶ
    - 画面固有の微調整を共通部品の option として吸収する必要があり、option 過多になりやすい
- 原則: 堅牢性 (不正入力での縮退と読み上げ順の保持) (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/usability-accessibility.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 未知の cols や未閉じブロックを例外にせず通常段落へ縮退させ、利用者の手書き Markdown が文書全体の描画を壊さないようにした。段組が減っても DOM 順を記述順に保ち、視覚順と読み上げ順の乖離を作らない。
  - トレードオフ:
    - 記法ミスが目立たず、意図した段組にならないまま気付きにくい
    - 縮退経路のぶんレンダリングの分岐とテストケースが増える
##### 確定内容 qa-007 (対応セル: desktop-windows, desktop-macos)

- 確定要件: ユーザー直接指定: Next.js + TypeScript、パッケージマネージャは pnpm (npm 不使用、packageManager フィールドで pin)。Hub Web は Next.js App Router を Workers 上 (@opennextjs/cloudflare) で SSR し、初期 4 画面 (業務ツール一覧 / 詳細 / 公開状態・修正内容 / Workspace 設定・Release 履歴) をレスポンシブ実装。作者向けクライアントは専用 desktop GUI を作らず、Claude Code / Codex plugin (slash command + skill + スクリプト) を Publisher の操作面とする (§5.1: Web に会話型 Creator を作らない)。
- 設計解釈の記録経路: `legacy_backfill` (`set-qa-design-applications`)
- 原則: 一貫性と標準準拠 (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/usability-accessibility.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 利用者向け画面は responsive な Next.js Web に統一し、作者向け操作面は既存の Claude Code / Codex plugin 規約へ揃えることで、専用 desktop GUI という別操作体系を増やさない判断に適用した。
  - トレードオフ:
    - 作者は terminal と plugin 操作を学ぶ必要がある
    - OS native GUI 固有の操作性は提供しない
- 資するゴール: G1, G2, G3, G5

## 最新ドキュメント出典

- (このカテゴリに割り当てた取得済みドキュメントなし。全体出典は index.md 参照)

## Post-compile writeback: UI MVP wave 2026-08-12

- 表示名 / 一覧一貫性 / 相対日時 / list `q` は presentation・既存 list の加算契約。認可 claim と deny 規則は不変のため **R4-reopen 不要**。
- PR #700 の route-local 遅延読込と sticky 計測の配置限定は client 境界の最適化であり、API・認可・DB・route 意味を変えない。新規 qa 番号なし、R4-reopen 不要。
- 判断と証跡の正本: [ui-mvp-wave-20260812-spec-reflection-receipt.md](../docs/features/feat-hub-foundation/ui-mvp-wave-20260812-spec-reflection-receipt.md)。

## 2026-08-12 MVP 実装追記 (feat-hearing-intake / HarnessHub-370h)

- S10 ヒアリングウィザードは、確定済みの4大工程 (基本情報/業務詳細/要件/確認) を維持したまま、
  入力負荷低減のため画面分割する (FormData 30 項目)。
- S12 は生成結果の閲覧に加え、添付 (画像/動画/CSV/Excel・25MB) と Claude Code 引き渡しトークン発行 UI を持つ。
- 画面詳細の正本は `docs/frontend-spec.md` と feature information-design シート。
- 本追記は製品 UI 契約の additive な具体化であり、desktop client 構成 (qa-007) や shell 契約 (qa-227) は不変。

## 2026-08-13 MVP 実装追記 (表示設定の再読み込み復元 / HarnessHub-sj20)

- ログイン済み共通シェル (`HubShell`) は起動時に `GET /api/v1/me/display-settings` で
  保存済み theme / density / language を `UiProvider` へ復元する。
- root layout は未ログイン画面も包むため、本人設定 API は公開面では読まない。
- 既存契約 (`user_settings` が正本、公開 API / DB / 認可は不変) の実装ギャップ解消であり、
  新規 qa 番号なし。R4-reopen 不要。

## 2026-08-12 MVP 実装追記 (hearing-sheet-overhaul / issue-hearing-sheet-overhaul-20260812)

- S10 を **7 画面** に統合 (整理・まとめ + 確認 → 整理・確認)。
- 用途プロファイル系 enum と priority を既存値破壊なしで加算する。
- 作成時添付ステージング (25MB・画像/動画/CSV/Excel) と S12 form_snapshot 全項目表示を追加する。
- S17 個別ダッシュボードに email / 最終ログインを読み取り表示する。
- 正本: `docs/frontend-spec.md`、`docs/features/feat-hearing-intake/mvp-sheet-overhaul-*`。

## 2026-08-12 MVP 実装追記 (feat-docs-cms blog essentials / HarnessHub-zkcl)

- `documents.publish_at` を nullable epoch ms として純増する。`scheduled` enum は追加しない。
- 表示状態: `published` / `draft+future publish_at`=予約中 / それ以外の draft=非公開。
- 予約公開 cron は default/max 100・`publish_at ASC,id ASC`・行 CAS。監査 action=`docs.scheduled_publish`。
- 分類 (category/tags)・thumbnail/excerpt の auto/manual 契約と clear 規則の正本は
  `docs/features/feat-docs-cms/architecture-decision-record.md` §1/§8 と `docs/backend-spec.md`。
- 本追記は docs CMS 既存枠 (tenant 分離・admin 編集・sanitize) の具体化であり、auth role 階層は不変。

## 2026-08-13 MVP 実装追記 (disclosure / dismissible / Docs empty)

- 共通シェルの navigation disclosure は server-first の `details` + 開閉専用 client island。
  切替リンクは素の `<a>` による document 遷移を維持し、client router を使わない。
- Modal / BottomSheet の `dismissible` で未保存破棄を防ぐ。公開 API / DB / 認可は不変。
- S15 一覧 empty は権限別 CTA と絞込解除を分離。正本は UI 基盤追補と S15 情報設計シート。

## 2026-08-13 MVP 実装追記 (配色仕様書 v2)

- token 正本: グラファイト `primary`、動作中専用アンバー `accent`、IBM Plex Sans + 日本語システムフォント + JetBrains Mono、`md=641` / `lg=1025`、sidebar 212/68、`radius.card=10`。
- root layout が `--font-*` を配り、`tokens.css` が値を持つ。公開 API / DB / 認可は不変。
- 正本: [UI 基盤追補](../specs/harness-hub-ui-foundation-addendum.md)、[受領書](../docs/features/feat-hub-foundation/visual-system-v2-20260813-spec-reflection-receipt.md)。

## 2026-08-13 MVP 実装追記 (着地 `/dashboard` / HarnessHub-1cno)

- 既定着地は `DEFAULT_POST_SIGNIN_LANDING = /dashboard`。S00.LANDING が本人の最近作業と既存業務導線を出す。
- S09 分析 KPI は `/metrics` のまま。着地の「要対応」は運用キューであり推移・ランキングではない。
- 新規 qa 番号なし。R4-reopen 不要。正本は qa-170 / qa-171 と [受領書](../docs/features/feat-hub-foundation/elegant-home-review-20260813-spec-reflection-receipt.md)。


## Post-compile writeback: 画面情報設計 (2026-08-11 / `HarnessHub-f6ix`)

- qa-227 と既存 frontend 契約 (App Router / packages/ui consumer / server-first / SEC5 表示専用) は全面維持する。本追補は画面実装の *情報構造の決め方* を固定する。
- mockup は実装方式の正本でも、画面横断の情報設計規範の正本でもない。規範は [画面情報設計追補](../specs/harness-hub-information-design-addendum.md)、詳細画面契約は [docs/frontend-spec.md](../docs/frontend-spec.md) §3.6、profile 割当は [screen-inventory](../docs/screen-inventory.md) のみを SSOT とする。
- 画面設計の工程順序は「利用文脈 → 取捨 → 要素別意味判定 → グループ化 → 顕著度 → 表示加工 → パターン選定 → 配置 → 機能追加 → 意味装飾」。表・カード・フォームの確定を最初に置かない。
- 情報顕著度 `lead / context / metadata` とレスポンシブ変換 pattern `P1〜P10` は別語彙である。`title` 属性だけへ絶対日時・完全識別子を隠さず、キーボード/タッチで到達できる開示を使う。
- system-spec-harness 側では `screen-information-priority` を blocking required-info とし、`frontend-arch` より先に確定する (UI なしは理由付き N/A)。item 別回答の writer 接地検査は follow-up `HarnessHub-9wdm`。
- 公開 API / DB schema / 認可判定 / Cloudflare deploy unit は変更しない。
- 原則: Information Design (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/information-design.md`)
  - 採否: `applied`
  - 章固有の根拠: frontend architecture 確定の前に画面情報の優先と意味契約を固定し、部品選定とデータ直写が設計を主導するのを防ぐ。
  - トレードオフ:
    - 生成時の収集順序が長くなり、UI あり案件では情報設計 9 項目が必須になる
    - 既存画面は一括改修せず、改修対象だけを追補へ寄せる

##### 確定内容 qa-007 (対応セル: desktop-windows, desktop-macos)

- 確定要件: ユーザー直接指定: Next.js + TypeScript、パッケージマネージャは pnpm (npm 不使用、packageManager フィールドで pin)。Hub Web は Next.js App Router を Workers 上 (@opennextjs/cloudflare) で SSR し、初期 4 画面 (業務ツール一覧 / 詳細 / 公開状態・修正内容 / Workspace 設定・Release 履歴) をレスポンシブ実装。作者向けクライアントは専用 desktop GUI を作らず、Claude Code / Codex plugin (slash command + skill + スクリプト) を Publisher の操作面とする (§5.1: Web に会話型 Creator を作らない)。
- 設計解釈の記録経路: `legacy_backfill` (`set-qa-design-applications`)
- 原則: 一貫性と標準準拠 (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/usability-accessibility.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 利用者向け画面は responsive な Next.js Web に統一し、作者向け操作面は既存の Claude Code / Codex plugin 規約へ揃えることで、専用 desktop GUI という別操作体系を増やさない判断に適用した。
  - トレードオフ:
    - 作者は terminal と plugin 操作を学ぶ必要がある
    - OS native GUI 固有の操作性は提供しない
