---
status: confirmed
category: ui-ux
aggregate: 確定
spec_cells: [ui-ux.web, ui-ux.mobile, ui-ux.tablet, ui-ux.desktop-windows, ui-ux.desktop-linux, ui-ux.desktop-macos]
serves_goals: [G1, G2, G3, G5]
---

# UI-UX (ui-ux)

- カテゴリ集約状態: **確定**
- 章確定マーカー: `status: confirmed`

## カテゴリ別収集状態

| プラットフォーム | 状態 | 根拠 |
|---|---|---|
| Web (web) | 確定 | 確定質疑: qa-226 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリは作らない。モバイルブラウザ閲覧は web 行のレスポンシブ対応でカバー |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリは作らない。タブレットブラウザ閲覧は web 行のレスポンシブ対応でカバー |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-007 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: 作者環境は macOS + Windows のみ。非エンジニアの業務 PC に Linux desktop が存在しないため対象外 |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-007 |

## 確定内容 (質疑録)

### qa-226 (対応セル: web)

**質問**: ui-ux/webの承認済み現行契約を、旧値と訂正文を併記せず一つの無矛盾な仕様として統合するとどうなるか。

**回答**: [出所] 利用者の2026-08-10逐語回答「推奨案3点を承認。」（appr-043）と、既存確定qa-218〜qa-222のうち矛盾しない契約を統合した現行正本である。

【1 共通UI基盤】
Webはmd=768pxを境界にdesktopのsidebar+header+content+footerとmobileのheader+主要slot+その他を使い分ける。ScreenHeader、Panel、ConfirmDialog、Modal、BottomSheet、light/dark、comfortable/compact、contrast、responsive overflowの既存契約を維持する。空状態・読込中・権限不足・取得失敗を別状態として表現し、seed dataは実測と区別できるラベルを必須とする。

【2 画面とnavigation】
正規routeはS09=/dashboard、S13=/pipeline、S16=/tracking。desktop sidebarはdashboard / sheets / pipeline / catalog / docs / feedback / tracking / users / settingsの業務順とする。mobile主要navigationは既存正本のdashboard / harness / sheets / notifications / その他を維持し、pipeline / tracking / users等は「その他」から到達可能にする。未実装routeは表示せず、実装と認可が揃った時点だけ露出する。

【3 閲覧権限】
S09/S16のtenant・harness・department・project集計はmember以上が閲覧できる。user次元の金額だけをusers.read_salaryを持つworkspace-admin/provider-adminへ限定する。pipelineはmemberも閲覧可、工程変更はworkspace-admin以上。role projectionはdeny-by-defaultとする。

【4 KPI】
完了率は、期間末snapshotの対象HearingSheet総数を分母、同snapshotでstatus=completedの件数を分子とする。利用率は、期間末snapshotの対象公開済みHarness総数を分母、その集合のうち期間内に1回以上利用されたHarness数を分子とする。分母ownerはそれぞれHearingSheetとCatalog/Releaseであり、Metrics eventだけから分母を作らない。分母0は0%でなく「—」を表示する。

【5 anomaly】
同一user・scopeの過去4完了週が全て揃い、その中央値が0でない場合だけ10倍超を評価する。履歴不足と中央値0は評価不能として区別し、異常なしへ潰さない。通知専用でingestを止めない。

【6 図表と操作】
chartはpackages/ui所有のserver-rendered inline SVGとし、色だけで系列を区別しない。各SVG直後に同じ数値・単位・期間・系列名を持つ同値HTML tableを初期DOMへ常時配置し、JavaScript・追加通信・tooltip・展開操作なしで読めるようにする。pipelineの7工程はdrag-and-dropを唯一の操作にせず、各cardの明示actionとConfirmDialogから遷移する。

### qa-007 (対応セル: desktop-windows, desktop-macos)

**質問**: フロントエンド構成 (クライアント構成・状態管理・レンダリング・ビルド) は?

**回答**: ユーザー直接指定: Next.js + TypeScript、パッケージマネージャは pnpm (npm 不使用、packageManager フィールドで pin)。Hub Web は Next.js App Router を Workers 上 (@opennextjs/cloudflare) で SSR し、初期 4 画面 (業務ツール一覧 / 詳細 / 公開状態・修正内容 / Workspace 設定・Release 履歴) をレスポンシブ実装。作者向けクライアントは専用 desktop GUI を作らず、Claude Code / Codex plugin (slash command + skill + スクリプト) を Publisher の操作面とする (§5.1: Web に会話型 Creator を作らない)。

## 上流指針 (doctrine anchor)

| concern | authority (正本) | 導く上流原則 | 出典 |
|---|---|---|---|
| presentation | Apple Human Interface Guidelines | 画面設計・操作フロー・情報階層・アクセシビリティの上流原則 | https://developer.apple.com/design/human-interface-guidelines |

- 本章の確定内容 (質疑録) は上記 authority を上流指針として適用する。具体技術の選定はこの指針に従属し、指針との乖離は再オープン (R4-reopen) の根拠になる。

## 適用された設計知識

### Usability & Accessibility — deep knowledge card

- 出典カード: `ref-system-design-knowledge/references/usability-accessibility.md`

#### 目的

画面と操作フローを、能力・利用文脈・支援技術の差にかかわらず、対象利用者が目的のタスクを最後まで完了できる形にする。

#### 解決する問題

- システム状態 (処理中・失敗・権限不足) が画面に出ず、利用者が自分の操作が効いたか判断できない。
- 失敗時に行き止まりが生じ、回復導線 (再試行・戻り先・問い合わせ) が無い。
- キーボードのみ・スクリーンリーダー・拡大表示の利用者が主要タスクの一部に到達できない。
- 認証・権限・エラーの表現が画面ごとに揺れ、同じ状態が別の意味に読める。
- アクセシビリティを最後の是正項目として扱い、情報構造の作り直しになる。

#### 適用条件

- 人が直接操作する画面があり、利用者の範囲を組織が選べない (公開サービス・社内全員向け等)。
- 認証・権限・非同期処理など、状態によって表示が変わる画面を含む。
- 適合水準と検証手段を要件として確定でき、受入時に検査できる。

#### 非適用条件

- 人が操作しない機械間インターフェイス (API・バッチ) には UI 原則をそのまま適用しない (契約設計側の知識を使う)。
- 利用者も端末も固定された短命の内部ツールでは、全達成基準の先行適用より主要タスクの完了性を優先することがある。
- 支援技術での実機確認ができない段階で「AA 適合」と確定しない (未確認として残す)。

#### トレードオフ・失敗モード

- 自動検査の合格を適合と読み替え、実際には到達できない導線を見逃す (自動検査が捕捉できるのは達成基準の一部)。
- 一貫性を絶対視して、当該画面に固有の重要な差異まで平板化する。
- 情報を出し切ることを可視性と誤解し、優先度の無い画面にして判断を遅らせる。
- コントラストや文字サイズをブランド表現より後回しにし、後から情報階層ごと作り直す。
- 「アクセシビリティ対応済み」を機能名として扱い、対象利用者・支援技術・確認方法を記録しない。

#### goalへの寄与

- 主要タスクの完了率・失敗からの回復率・問い合わせ発生率を、UI 判断の成否指標として要件へ接続する。
- 適合水準を受入基準に落とすことで、「配慮した」という自己申告ではなく検査可能な証跡で確定できる。
- 状態表示と回復導線の規約を先に確定すると、後続の画面追加が既存規律の機械適用で済み、判断の再発明を減らす。

---

#### 本章での適用

##### 確定内容 qa-226 (対応セル: web)

- 確定要件: [出所] 利用者の2026-08-10逐語回答「推奨案3点を承認。」（appr-043）と、既存確定qa-218〜qa-222のうち矛盾しない契約を統合した現行正本である。

【1 共通UI基盤】
Webはmd=768pxを境界にdesktopのsidebar+header+content+footerとmobileのheader+主要slot+その他を使い分ける。ScreenHeader、Panel、ConfirmDialog、Modal、BottomSheet、light/dark、comfortable/compact、contrast、responsive overflowの既存契約を維持する。空状態・読込中・権限不足・取得失敗を別状態として表現し、seed dataは実測と区別できるラベルを必須とする。

【2 画面とnavigation】
正規routeはS09=/dashboard、S13=/pipeline、S16=/tracking。desktop sidebarはdashboard / sheets / pipeline / catalog / docs / feedback / tracking / users / settingsの業務順とする。mobile主要navigationは既存正本のdashboard / harness / sheets / notifications / その他を維持し、pipeline / tracking / users等は「その他」から到達可能にする。未実装routeは表示せず、実装と認可が揃った時点だけ露出する。

【3 閲覧権限】
S09/S16のtenant・harness・department・project集計はmember以上が閲覧できる。user次元の金額だけをusers.read_salaryを持つworkspace-admin/provider-adminへ限定する。pipelineはmemberも閲覧可、工程変更はworkspace-admin以上。role projectionはdeny-by-defaultとする。

【4 KPI】
完了率は、期間末snapshotの対象HearingSheet総数を分母、同snapshotでstatus=completedの件数を分子とする。利用率は、期間末snapshotの対象公開済みHarness総数を分母、その集合のうち期間内に1回以上利用されたHarness数を分子とする。分母ownerはそれぞれHearingSheetとCatalog/Releaseであり、Metrics eventだけから分母を作らない。分母0は0%でなく「—」を表示する。

【5 anomaly】
同一user・scopeの過去4完了週が全て揃い、その中央値が0でない場合だけ10倍超を評価する。履歴不足と中央値0は評価不能として区別し、異常なしへ潰さない。通知専用でingestを止めない。

【6 図表と操作】
chartはpackages/ui所有のserver-rendered inline SVGとし、色だけで系列を区別しない。各SVG直後に同じ数値・単位・期間・系列名を持つ同値HTML tableを初期DOMへ常時配置し、JavaScript・追加通信・tooltip・展開操作なしで読めるようにする。pipelineの7工程はdrag-and-dropを唯一の操作にせず、各cardの明示actionとConfirmDialogから遷移する。
- 設計解釈の記録経路: `dialogue`
- 原則: 知覚可能・操作可能・理解可能・堅牢 (POUR) (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/usability-accessibility.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 同値表を初期DOMへ常在させ、分母0と評価不能理由を明示して、色・JavaScript・推測に依存せず同じ判断へ到達可能にした。
  - トレードオフ:
    - 縦方向の情報量が増える
    - SVGと表の同値性をcontract testで維持する必要がある

##### 追補 (2026-08-11 / 画面情報設計 / `HarnessHub-f6ix`)

- qa-226 と UI 基盤契約 (shell / surface / 状態 / responsive) は全面維持する。本追補は *どの部品を使うか* の後段に、*何を載せ・何を省き・何を強調するか* の情報設計層を積む。
- mockup (`harness-studio-v2`) は確定済み画面の初期 visual/reference であり、画面横断の情報設計規範の正本ではない。規範正本は [画面情報設計追補](../specs/harness-hub-information-design-addendum.md)、実装手順は [画面情報設計ガイド](../docs/frontend-information-design-guide.md)、`role × task-mode × breakpoint` profile 割当の SSOT は [screen-inventory](../docs/screen-inventory.md)。
- 情報顕著度は `lead / context / metadata`。構築 phase の P0〜P5 および frontend-spec のレスポンシブ pattern P1〜P10 と語彙を混ぜない。
- ラベルの一律全外しを禁止し、form control・初見/破壊操作・状態・金額・日時・PII・略語は可視ラベルを既定とする。狭幅への pattern 変換でも比較・filter・選択・一括操作・完全値への到達を落とさない。
- 公開 API / DB schema / 認可判定 / Cloudflare deploy unit は変更しない。
- 原則: Information Design (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/information-design.md`)
  - 採否: `applied`
  - 章固有の根拠: 利用文脈先行の 10 工程と要素別意味契約を製品規範へ固定し、保存項目の直写や装飾の後付けを防ぐ。
  - トレードオフ:
    - 新画面・情報設計変更 PR に情報設計シートと profile 更新が必須になる
    - profile/pattern の将来 machine gate は未実装で、現行は manual gate + 既存 UI 基盤 gate を使う

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

- DateTimeText（相対併記）、ListState / FilterBar、screen-pattern gate は UI 契約の追補。新規 qa 番号なし。R4-reopen 不要。
- route-local 遅延読込は既存画面の初期JSだけを減らし、loading文言と操作契約を維持する。screen-pattern gate は動的 import 先も検査するため、新規 qa 番号なし。R4-reopen 不要。
- 正本: [ui-mvp-wave-20260812-spec-reflection-receipt.md](../docs/features/feat-hub-foundation/ui-mvp-wave-20260812-spec-reflection-receipt.md)。

## 2026-08-12 MVP 実装追記 (hearing-sheet-overhaul)

- S10 は 7 画面ウィザード + 作成時添付ステージング。S12 は申請時入力の全項目表示。
- S17 個別詳細は email / 最終ログインを読み取り表示。
- 情報設計の正本: `docs/features/feat-hearing-intake/information-design/` と `docs/features/feat-user-org-admin/information-design/S17-detail.md`。

## Post-compile writeback: disclosure / dismissible / Docs empty (2026-08-13)

- navigation disclosure（Workspace 切替・アカウント・モバイル「その他」）は `details/summary` を土台に、外側クリック・Escape・別メニュー排他だけを小さな client island が担う。modal 契約・focus trap は適用しない。新規 qa 番号なし。R4-reopen 不要。
- Modal / BottomSheet は既定 light dismiss。未保存面は `dismissible=false` で背景・Escape・閉じる操作を遮断する。公開 API / 認可 / DB は不変。
- S15 一覧 0 件は「真の 0 件」と「絞込 0 件」を分け、作成権限に応じた CTA または絞込解除を出す。
- 正本: [UI 基盤追補](../specs/harness-hub-ui-foundation-addendum.md) FR-UIF-012/013、[受領書](../docs/features/feat-hub-foundation/ui-disclosure-empty-state-20260813-spec-reflection-receipt.md)。

## Post-compile writeback: 配色仕様書 v2 (2026-08-13)

- 見た目の正本をグラファイト × アンバー、IBM Plex Sans + 日本語システムフォント + JetBrains Mono へ更新する。AI専用色は持たず、アンバー `accent` は動作中専用とする。
- `breakpointTokens` は `md=641` / `lg=1025`。shell の sidebar / ボトムタブ契約は維持し、「〜640 / 641〜1024 / 1025〜」を重複なく表す。
- 公開 API / DB / 認可は不変。新規 qa 番号なし。確定質疑 qa-226 の「md=768」逐語は本 writeback と [UI 基盤追補](../specs/harness-hub-ui-foundation-addendum.md) FR-UIF-003/014 が実装正本として上書きする。
- 正本: [受領書](../docs/features/feat-hub-foundation/visual-system-v2-20260813-spec-reflection-receipt.md)。

## Post-compile writeback: 着地ダッシュボード (2026-08-13 / HarnessHub-1cno)

- サインイン後の唯一の着地面は `/dashboard`。読む順は要対応 → 業務開始導線 → 本人の最近。分析 KPI は出さない。
- visible=false の機能は件数 0・recent 空を型で強制し、0 件として見せない。
- 新規 qa 番号なし。R4-reopen 不要。正本: [情報設計](../docs/features/feat-hub-foundation/information-design/dashboard.md)、[受領書](../docs/features/feat-hub-foundation/elegant-home-review-20260813-spec-reflection-receipt.md)。
