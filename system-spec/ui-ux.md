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
| Web (web) | 確定 | 確定質疑: qa-035 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリは作らない。モバイルブラウザ閲覧は web 行のレスポンシブ対応でカバー |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリは作らない。タブレットブラウザ閲覧は web 行のレスポンシブ対応でカバー |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-007 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: 作者環境は macOS + Windows のみ。非エンジニアの業務 PC に Linux desktop が存在しないため対象外 |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-007 |

## 確定内容 (質疑録)

### qa-035 (対応セル: web)

**質問**: mockup (harness-studio-v2) には media query が 1 件も無い (デスクトップ専用設計) 中で、スマホサイズ (モバイルブラウザ) の画面仕様をどう確定するか? (frontend/ui-ux の mobile セルは native アプリ対象外・web 行のレスポンシブでカバーの整理のまま、web 行のレスポンシブ実仕様が未定義)

**回答**: docs/frontend-spec.md §6 をスマホサイズ画面仕様の新規正本として確定する (native モバイル/タブレットアプリを作らない整理 = mobile/tablet セル対象外理由は不変。本仕様は web セルのレスポンシブ詳細)。(1) 適用条件: viewport < 768px (Tailwind md 未満。ブレークポイントは Tailwind 既定 sm640/md768/lg1024/xl1280、サイドバー常設は lg 以上)。(2) 原則: タップターゲット 44×44pt 以上 (HIG doctrine anchor)・100dvh + safe-area-inset 対応・入力フォント 16px 以上 (iOS ズーム防止)・許可箇所以外の水平オーバーフローは欠陥扱い。(3) ナビゲーション: ボトムタブ 5 slot 固定 (ダッシュボード/ハーネス/申請/通知[未読バッジ]/その他)。その他タブはボトムシートで残り項目を role 別出し分け (deny-by-default の画面表現)。サイドバーはモバイル非描画。(4) 変換パターン辞書 P1-P10 (サイドバー→ボトムタブ・KPI→2 列・テーブル→カードリスト・7 工程ボード→工程セグメント+縦カード・2 カラム→縦積み・モーダル→ボトムシート・チャート縦積み 200px・フィルタ→シート・インライン編集→編集シート・ウィザード→1 step 1 画面)。(5) 画面別区分: 重点最適化◎ = S01/S02/S03/S07/S08/S09/S10/S11/S12/S14/S16/S18/通知/検索/S13 閲覧/S15 閲覧、簡易対応△ (動作保証+dismissible なデスクトップ推奨バナー・機能は削らない) = S04/S05/S06/S17/S13 操作/S15 編集。(6) タッチ制約: スワイプ・ロングプレス・DnD を必須操作にしない (可視ボタン/メニューで代替 = キーボード同等性)・pull-to-refresh 不採用 (ポーリングで代替)・パイプラインの stage 操作はカードメニューの隣接遷移のみ。(7) 検証: Playwright を 1280×800 と 390×844 の 2 viewport で実行し axe を統合、モバイル断面を CI で常時検査する。

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
