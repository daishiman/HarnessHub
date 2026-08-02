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
| Web (web) | 確定 | 確定質疑: qa-136 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリは作らない。モバイルブラウザ閲覧は web 行のレスポンシブ対応でカバー |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリは作らない。タブレットブラウザ閲覧は web 行のレスポンシブ対応でカバー |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-007 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: 作者環境は macOS + Windows のみ。非エンジニアの業務 PC に Linux desktop が存在しないため対象外 |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-007 |

## 確定内容 (質疑録)

### qa-136 (対応セル: web)

**質問**: CLI (Claude Code / Codex / Publisher) を使わない利用者が Hub Web だけで公開・状態確認・導入案内まで到達できる導線を、既存 ui-ux.web 契約へどう統合しますか?

**回答**: ユーザーの 2026-08-02 指示 (「基本ユーザーは CLI を使わないので Web で対応できるようにしておく」) を明示承認として、qa-065 の既確定 (画面構成・レスポンシブ変換・共通部品・a11y) を全面維持したうえで、CLI 非依存導線を次のとおり追加確定する。

【1. Web 単独完結の受入条件】主対象利用者は CLI を使わない前提とし、Hub Web 単体で「公開 → 状態確認 → 導入案内」まで到達できることを ui-ux.web の受入条件に加える。docs/user-journeys.md J1 step 3b の「Web 代替: S01 公開ウィザード」を、Stage 1 の任意代替ではなく必須経路へ格上げする。

【2. S01 公開ウィザードの Web 経路】S01 に ZIP アップロード経路を置き、CLI 取込経路と同一の Hub 側検査 (static validation / secret scan / policy) へ収束させる。検査結果 (Green 自動公開 / Yellow・Red は Needs Fix 差し戻し) の表示・文言・再投入導線は CLI 経路と同一 UI を使い、経路ごとに別の状態表現を作らない。

【3. Device 承認 (S08) の位置づけ】OAuth Device Flow は CLI / Publisher 利用者専用の経路として維持し、Web 単独利用者の主導線からは分離する。/device へ確認コードを持たずに到達した利用者に対しては、(a) この画面は CLI / Publisher から開始した場合だけ使うこと、(b) Web だけで公開したい場合は S01 公開ウィザードへ進むこと、の 2 点を画面上で明示し、行き止まりにしない。

【4. Workspace 選択/切替の常設】共通シェルに現在の Workspace 表示と切替を常設する。所属が 1 件のときは切替 UI を出さず現在値の表示のみとし、選択操作を強いない。

【5. スコープ不足の扱い】403 missing_tenant_scope をエンドユーザーへ露出させない。scope 未解決は失敗ではなく「Workspace を選べば回復する状態」として扱い、Workspace 選択への回復導線を提示する。qa-118 【1】の 401/403 は ErrorState のみ (旧データを描画しない) という契約は維持し、本項はその ErrorState の文言と回復導線を定めるものであって、旧 scope データの継続表示を許すものではない。

【6. 境界】PublishRequest 状態機械・検査実装・role 判定は既存 owner のままとし、ui-ux は経路差を吸収した単一の表現と回復導線の提示だけを担う。

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
