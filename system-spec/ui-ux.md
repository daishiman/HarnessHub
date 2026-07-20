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
| Web (web) | 確定 | 確定質疑: qa-065 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリは作らない。モバイルブラウザ閲覧は web 行のレスポンシブ対応でカバー |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリは作らない。タブレットブラウザ閲覧は web 行のレスポンシブ対応でカバー |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-007 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: 作者環境は macOS + Windows のみ。非エンジニアの業務 PC に Linux desktop が存在しないため対象外 |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-007 |

## 確定内容 (質疑録)

### qa-065 (対応セル: web)

**質問**: docs/user-journeys.md の全ジャーニー J0〜J6 を、既存 UI-UX 確定 qa-063 を維持しながら system-spec から識別子単位で逆引き可能にするため、どのように確定するか。

**回答**: qa-063 の確定内容 (S01〜S18、P0〜P5、J1/J4 の詳細、レスポンシブ表示、mock 非採用事項) を全面維持し、docs/user-journeys.md の全ジャーニーを次の端から端の契約として明示的に確定する。J0 = 提供者の Stage 0 technical gate (URL 型 marketplace / Bootstrap Installer / 作者 local wrangler 経路を実機検証し、成立経路を J1/J2 に採用)。J1 = 作者が Claude Code/Codex で作成し、Device Flow 認証後に Publisher CLI または S01 Web 公開ウィザードから同一検査 pipeline へ投入し、S03 の Green/Yellow/Red、S02 の Release/stable/rollback まで自己完結する。J2 = 利用者が SSO でログインし、S01 で同一 Workspace の複数 Project/target を検索、S02 で stable release の install/download descriptor または健全性確認済み WebApp URL を使い、品質報告・更新通知へ進む。J3 = Workspace 管理者が S04 で IdP/role/token を管理し、S05 承認・S06 監査・公開停止/owner 再割当を行う。IdP 接続と role/deny-by-default は P0、承認/監査 UI は P5 でも認可・監査記録自体は前 phase から有効にする。J4 = S10 4 step 入力→受付番号→D5 pull 型生成→S11 一覧→S12 詳細/PDF→S13 7 工程→J1 publish のヒアリング起点。J5 = CLI または S14 Web から改善要望/レビュー依頼/バグ報告→D5 pull 型 AI 解析→Feedback status/aiResponse→人の確認→S13/J1 再公開→update 通知の改善ループ。J6 = 短命 token・冪等 key・回数のみの metrics ingest→サーバ側係数換算→週次 rollup→P4 の S16/S17、P5 の S09 へ反映する効果測定。起動順は P0=J0+共通 SSO/J3 IdP、P1=J4 前半、P2=J1/J2/J4 後半、P3=J5、P4=J6 S16/S17、P5=J6 S09+J3 S05/S06。J0〜J6 の詳細表・surface・裏側の仕組み・根拠の正本は docs/user-journeys.md、画面 ID の正本は docs/screen-inventory.md とし、system-spec はこの回答で全ジャーニーへの逆引きを保持する。

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
