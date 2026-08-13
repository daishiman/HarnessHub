---
status: accepted
layer: frontend-detail
sources: [docs/frontend-spec.md, system-spec/frontend.md, system-spec/ui-ux.md]
parent: docs/frontend-spec.md
reviewed_at: 2026-08-11
---

# スマホサイズ (モバイル) 画面仕様

> 本節は [docs/frontend-spec.md](frontend-spec.md) §6 の正本本文である。親文書は概要とリンクのみを保持し、300 行上限を守る。情報設計の profile 変換は [screen-inventory](screen-inventory.md) と [画面情報設計ガイド](frontend-information-design-guide.md) を併読する。

## 6. スマホサイズ (モバイル) 画面仕様 (qa-035 — 本書が新規確定する正本)

### 6.1 原則

- 適用条件: viewport **< 641px (md 未満)**。Harness Studio デザインシステム §4 の 3 区分のうち最も狭い帯に対応する。native アプリは作らない (frontend 章の対象外理由を維持) — 本節は web のレスポンシブ仕様である。
- タップターゲット **44×44pt 以上** (HIG doctrine anchor)。主要操作は画面下半分 (親指到達域) に配置。
- `100dvh` 基準・`env(safe-area-inset-*)` 対応 (ノッチ/ホームバー)。入力フォント 16px 以上 (iOS 自動ズーム防止)。
- 横スクロールは §6.3 で明示した箇所のみ許可 (それ以外の水平オーバーフローは欠陥として扱う)。

### 6.2 ナビゲーション (ボトムタブ + その他 disclosure = qa-207)

- **ボトムタブ 5 slot (固定)**: ダッシュボード (S09) / ハーネス (S01) / 申請 (S11。新規作成ボタン→S10) / 通知 (未読バッジ) / **その他**。
- **その他タブ** → `details/summary` disclosure: 実在 route の追加導線だけを表示する。session role は `member` / `workspace-admin` / `provider-admin` の 3 種で出し分け、role 未確定時も管理導線を隠す (deny-by-default)。背景を遮る modal ではないため focus trap / scroll lock は適用しない。
- ヘッダ: 画面タイトル + 検索アイコン (全画面検索シート) + アバター。サイドバーはモバイルで描画しない。
- タブは currentPage を `aria-current` で明示。操作用 BottomSheet は disclosure と別部品で、focus trap + Esc + 閉じるボタン + focus 復帰 + scroll lock を持つ。スワイプは任意で、唯一の閉じ方にしない。

### 6.3 レスポンシブ変換パターン辞書 (デスクトップ → モバイル)

| # | デスクトップ表現 (mockup 実測) | モバイル表現 | 適用画面 |
|---|---|---|---|
| P1 | サイドバー 212px (md〜lg は 68px アイコン) + コンテンツ | ボトムタブ + その他シート (§6.2)。本文塊の下端に `calc(76px + safe-area)` の余白を取り、最終行が固定タブの裏へ潜らないようにする。アプリ外枠 (角丸・影) は付けず全幅 | 全画面 |
| P2 | KPI grid `repeat(3-4, 1fr)` | **2 列 grid** (数値優先・ラベル省略形) | S09/S16 |
| P3 | データテーブル (6-8 列) | **主要フィールドを先頭にしたカードリスト** + タップで詳細へ。critical fields/actions は card 内 metadata / disclosure / selection mode 等で維持し削除しない。状態はチップ + label | S01/S11/S14/S15/一覧全般 |
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
| S05/S06 | △ | 承認カード/監査行は P3 カード化で閲覧可。S05 は selection mode と一括 action sheet で一括承認能力を維持する。S06 の監査 filter は P8、export と完全日時への到達も維持する |
| S07/S08 | ◎ | 単票中央寄せ。Device user_code 入力は数字最適化 (`inputmode`)・大きな確認ボタン |
| S09 | ◎ | P2 (KPI 2 列)+P7 (チャート縦積み)。ランキングは上位 5 件+「すべて見る」 |
| S10 | ◎ | P10。試算参考表示は step4 (§3.2 の SEC5 規則) |
| S11/S12 | ◎ | P3 カード先頭は HS コード・タイトル・状態チップ・申請者。domain/department/people/hours/絶対 updated_at は metadata/disclosure で同じカードから到達でき、filter・検索・paging を維持する。詳細は P5。admin の status 変更はアクションシート |
| S13 | 閲覧◎/操作△ | P4。stage 操作はカードメニュー (隣接遷移+確認)。DnD なし |
| S14 | ◎ | P3 + 起票は P6 ボトムシート (type 選択+本文)。AI 回答は MarkdownView |
| S15 | 閲覧◎/編集△ | 閲覧は読みやすさ優先 (max-width・行間)。編集はプレビュー切替タブで動作、バナー表示 |
| S16 | ◎ | P2+P7。期間切替はセグメント。user 次元金額は admin のみ (SEC4 — API 側制御に従う) |
| S17 | △ | 一覧は P3 card-collection + detail、列比較が必要な task-mode は局所横スクロール table または比較 mode を併用。filter/sort/selection mode/一括操作、salary 表示・role 変更を維持しつつバナー表示 |
| S18 | ◎ | 設定グループを縦 Accordion。テーマ/密度/言語は即時反映 |
| 通知 | ◎ | 専用画面 (ボトムタブ)。P3 リスト+スワイプなし・タップで既読+遷移 |

- △ 画面の DesktopRecommendBanner は dismissible (localStorage 記憶)。機能は削らない (「動作保証」= 全操作が完遂可能であること)。

### 6.5 タッチ操作の制約 (a11y 同等性)

- スワイプ・ロングプレス・DnD を**必須操作にしない** (すべて可視ボタン/メニューで代替)。pull-to-refresh は実装しない (ポーリングで足りる)。
- ボトムシートはドラッグハンドル+閉じるボタン併設。トーストは操作を遮らない位置 (ボトムタブの上)。

