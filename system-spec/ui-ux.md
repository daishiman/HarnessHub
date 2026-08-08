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
| Web (web) | 確定 | 確定質疑: qa-201 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリは作らない。モバイルブラウザ閲覧は web 行のレスポンシブ対応でカバー |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリは作らない。タブレットブラウザ閲覧は web 行のレスポンシブ対応でカバー |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-007 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: 作者環境は macOS + Windows のみ。非エンジニアの業務 PC に Linux desktop が存在しないため対象外 |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-007 |

## 確定内容 (質疑録)

### qa-201 (対応セル: web)

**質問**: 既存 ui-ux/web 正本 qa-181 と、それ以前の確定契約を維持したまま、実装済み breakpoint・表示密度・レスポンシブ品質の基準値をどう確定するか。

**回答**: [出所] 本 entry は、2026-08-08 の利用者による最終レビュー・正規仕様反映指示と、appr-037 の技術的事実委任の範囲で、実装と実ブラウザ計測から確定する。qa-181 とそれ以前の ui-ux/web 契約は全面維持する。

レスポンシブ分岐の数値正本は packages/ui の breakpointTokens とし、sm=480px、md=768px、lg=1120px とする。既存 qa-035 の『768px 未満をスマホサイズとして扱う』契約は維持する。一方、旧 Tailwind 既定 sm=640 / lg=1024 という例示値は、実装正本の 480 / 1120 へ置き換える。md=768 で SidebarLayout を 1 列から 2 列へ切り替え、lg=1120 は standard Container の最大幅とする。

検査幅は mobile=360x800、tablet=768x1024、desktop=1280x800 とする。全幅で document 全体の意図しない横スクロールを禁止する。comfortable の操作部品は 44px 以上、compact も 36px 未満にしない。compact は情報密度を高める明示選択であり comfortable の 44px 契約を弱める逃げ道にしない。light/dark と密度は token で一貫させ、文字 4.5:1、非文字境界 3:1 のコントラストを token test で保証する。

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
