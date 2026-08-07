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
| Web (web) | 確定 | 確定質疑: qa-181 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリは作らない。モバイルブラウザ閲覧は web 行のレスポンシブ対応でカバー |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリは作らない。タブレットブラウザ閲覧は web 行のレスポンシブ対応でカバー |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-007 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: 作者環境は macOS + Windows のみ。非エンジニアの業務 PC に Linux desktop が存在しないため対象外 |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-007 |

## 確定内容 (質疑録)

### qa-181 (対応セル: web)

**質問**: C06 独立監査 4 回目が、qa-177 に対し LOW 1 件と MEDIUM 1 件を残した。(LOW) qa-171-b / e / f を appr-033 の委任内に残した判断は妥当だが、根拠が『選択肢が実質一つ』という定性的な自己申告のみで、実際にはより強い根拠が仕様内に既にある (b→qa-145、e→qa-154、f→qa-018)。先行 qa_ref を明記せよ。(MEDIUM) 提示した生の質問文が記録に無く、(推奨) ラベルの有無を独立監査が検証できない。

**回答**: 2 件とも是正する。qa-177 の逐語は改変せず、本 entry を ui-ux/web の正本とする。

[qa-181-a 委任内 3 項目の根拠を先行 qa_ref へ接地する] qa-177 の b / e / f は『選択肢が実質一つ』という定性判断のみを根拠としていた。監査の指摘どおり、実際にはより強い根拠が既に仕様内にある。以下のとおり接地し直す。**3 項目とも「AI が選択肢を絞った」のではなく「既に確定した規律を新画面へ機械的に適用した」ものである。**
 [qa-171-b 行き止まりを作らない導線] 根拠 = **qa-145** (認証済み領域の共通ナビゲーション。appr-033 の委任下で確定済み)。本項はその適用範囲を着地画面へ広げただけであり、新規判断ではない。
 [qa-171-e scope 未解決時の回復導線] 根拠 = **qa-154** (回復導線契約 = F 契約)。既に確立した契約の踏襲である。
 [qa-171-f 認証基盤不可用時の表現] 根拠 = **qa-018** (『アクセシビリティ、ユーザーが不快に思わないような設計が大事』という利用者本人の逐語指示)。**これは appr-033 の委任ですらなく、利用者本人の直接指示である。** b / e / f のうち f がもっとも強い権限根拠を持っていたことになる。
この接地により、次回以降の監査者が同じ確認作業をやり直す必要がなくなる。

[qa-181-b 生の質問文を逐語記録する] appr-036 として、実際に提示した選択肢ラベルを逐語で開示した。**先頭選択肢に「（推奨）」ラベルが付いていた事実を含む。** appr-035 の note はこれを再現しておらず、監査の懸念は正しかった。3 問とも先頭選択肢が選ばれており、かつ 3 問とも (a) の説明文を『今回の症状を直接解決する』という同一の修辞で締めていた点も併せて記録した。詳細と、その上でも appr-035 の 3 決定を維持する理由は appr-036 の note を参照。

[この 2 件に共通する形] LOW も MEDIUM も『判断そのものは正しいが、その正しさを他者が検証できる形で残していない』という同じ欠陥である。b / e / f は先行 qa_ref に接地できたはずなのに定性的な自己申告で済ませ、ヒアリングは生の提示内容を残さず AI の要約だけを残した。**どちらも「私が判断した」という記録であって「なぜそう判断できるか」の記録ではない。** 本 feature の中心的な教訓 —「人が『確認した』と述べたことは、機械が確認したことの代わりにならない」— が、コードの列挙だけでなくヒアリングの記録にも同じ形で当てはまることを示している。

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
