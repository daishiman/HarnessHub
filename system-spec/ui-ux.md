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
| Web (web) | 確定 | 確定質疑: qa-206 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリは作らない。モバイルブラウザ閲覧は web 行のレスポンシブ対応でカバー |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリは作らない。タブレットブラウザ閲覧は web 行のレスポンシブ対応でカバー |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-007 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: 作者環境は macOS + Windows のみ。非エンジニアの業務 PC に Linux desktop が存在しないため対象外 |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-007 |

## 確定内容 (質疑録)

### qa-206 (対応セル: web)

**質問**: qa-201 とそれ以前の ui-ux/web 契約を維持したまま、desktop/mobile shell、その他 navigation、page surface、overlay の操作規則を実装と一致する形でどう確定するか。

**回答**: [出所] 本 entry は、2026-08-08 の利用者による今回変更分の最終レビュー・正規仕様反映指示と、appr-037 の技術的事実委任の範囲で、実装・a11y test・bundle 制約から確定する。qa-201 とそれ以前の ui-ux/web 契約は全面維持する。

md=768px 以上は sidebar + header + content + footer、md 未満は header + 主要 4 slot + 5 番目の『その他』で構成する。未実装 route は表示せず、現在存在する sheets / catalog / docs / feedback を主要 4 slot とする。『その他』の navigation overflow は背景を遮る modal dialog ではなく details/summary の disclosure とする。したがって focus trap と scroll lock は適用せず、標準 Tab 順、aria-current、44px 以上の tap target を維持する。client JS を全 route へ追加しない server-first contract を優先する。操作用 BottomSheet は別 contract とし、dialog semantics、focus trap、Esc、明示 close、backdrop close、focus restore、scroll lock を必須とする。swipe は唯一の操作にせず任意の追加機能とする。

各画面は ScreenHeader で title / description / breadcrumbs / primary action を表し、Panel で情報のまとまりを分ける。破壊的または取り消せない確認には ConfirmDialog を使い、reversible を必須入力にして可逆性を表示する。汎用 Modal は閲覧・編集などの器であり、実行確認には使わない。Modal / BottomSheet / ConfirmDialog は共通 focus trap、Esc、focus restore、scroll lock を共有し、overlay の z-index は sticky header より上に置く。

既存の light/dark、comfortable/compact、breakpoint、contrast、responsive overflow 契約は変更しない。

### qa-007 (対応セル: desktop-windows, desktop-macos)

**質問**: フロントエンド構成 (クライアント構成・状態管理・レンダリング・ビルド) は?

**回答**: ユーザー直接指定: Next.js + TypeScript、パッケージマネージャは pnpm (npm 不使用、packageManager フィールドで pin)。Hub Web は Next.js App Router を Workers 上 (@opennextjs/cloudflare) で SSR し、初期 4 画面 (業務ツール一覧 / 詳細 / 公開状態・修正内容 / Workspace 設定・Release 履歴) をレスポンシブ実装。作者向けクライアントは専用 desktop GUI を作らず、Claude Code / Codex plugin (slash command + skill + スクリプト) を Publisher の操作面とする (§5.1: Web に会話型 Creator を作らない)。

## 上流指針 (doctrine anchor)

| concern | authority (正本) | 導く上流原則 | 出典 |
|---|---|---|---|
| presentation | Apple Human Interface Guidelines | 画面設計・操作フロー・情報階層・アクセシビリティの上流原則 | https://developer.apple.com/design/human-interface-guidelines |

- 本章の確定内容 (質疑録) は上記 authority を上流指針として適用する。具体技術の選定はこの指針に従属し、指針との乖離は再オープン (R4-reopen) の根拠になる。

## 適用された設計知識

- `ref-system-design-knowledge/references/resource-map.yaml` (このカテゴリ専用の deep card は resource-map に未定義。本章の設計判断は「上流指針 (doctrine anchor)」節の authority と「確定内容 (質疑録)」を正本とする)

## 最新ドキュメント出典

- (このカテゴリに割り当てた取得済みドキュメントなし。全体出典は index.md 参照)
