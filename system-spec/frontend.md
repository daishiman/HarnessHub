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
| Web (web) | 確定 | 確定質疑: qa-040 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリなし。モバイルブラウザ表示は web 行のレスポンシブでカバー |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリなし。タブレットブラウザ表示は web 行のレスポンシブでカバー |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-007 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop クライアントは対象外 (作者環境は macOS + Windows) |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-007 |

## 確定内容 (質疑録)

### qa-040 (対応セル: web)

**質問**: mockup (harness-studio-v2) を実装するための frontend 詳細仕様 (技術構成・画面×API・データ取得・フォーム) をどう確定するか? 未確定 8 論点: (1) モバイル対応範囲、(2) モバイルナビゲーション方式、(3) UI 基盤 (スタイリング+コンポーネント)、(4) サーバ状態管理、(5) チャート実装 (qa-022 の「SVG 自作か超軽量 lib」の二択)、(6) ボード/テーブルのモバイル表現、(7) フォーム実装、(8) i18n 方式 (※並行ヒアリング統合時の qa 採番衝突で旧 qa-034 の質疑録が失われたため qa-040 として再登録)

**回答**: qa-022 の確定方針 (Next.js 再実装・mockup は見た目と情報設計の正本・軽量チャート・サーバ計算値の表示専用) を実装可能粒度へ展開した詳細正本 docs/frontend-spec.md を確定する。ユーザーが AskUserQuestion (2026-07-17) で 8 論点を確定: (1) モバイル範囲 = 重点最適化+全画面動作保証 (閲覧・申請系はスマホ専用レイアウト、管理系は動作保証+デスクトップ推奨バナー)、(2) ナビ = ボトムタブ 4+その他シート (HIG タブバー原則)、(3) UI 基盤 = Tailwind CSS v4 + shadcn/ui ベースの packages/ui (Radix 由来 a11y を部品側担保 = qa-018 適合・コード取込方式で lock-in なし)、(4) サーバ状態 = TanStack Query v5 (ポーリング統一 qa-031 を refetchInterval で実装。publish 2 秒指数 backoff・ボード/通知 30 秒・refetchIntervalInBackground=false)、(5) チャート = SVG 自作 (折れ線/バー/ドーナツ/スパークライン 4 種のみ・SSR 可・代替テーブル切替で a11y 担保)、(6) ボード = 工程セグメント+縦リスト・テーブル = 主要フィールドのカード化、(7) フォーム = react-hook-form + zodResolver (packages/schemas の zod を step 単位 pick で再利用 = B1 単一ソース)、(8) i18n = 自作 typed 辞書 (ja 正本・en は同型制約で後追い・enum→表示ラベル写像 = backend-spec §2.1 と状態語彙統一 = qa-021 を同一 module に集約)。構成: App Router route 一覧 (S01-S18+通知+検索を 15 route へ写像・S03 は S02 の公開タブに統合)、コード構造規約 (API 呼出は packages/schemas + 型付き fetch wrapper に閉じる・金額のクライアント再計算禁止 = SEC5・グローバル状態 lib 不採用 = C1)、design tokens (mockup 実測 #1677ff 主色系を semantic token 化・コントラスト 4.5:1 を token 段階で保証・ダーク/密度/言語は user_settings 正本)、部品登録簿 (shadcn ベース+自作 12 分類を feat-hub-foundation が実装)、画面×API マップ (backend-spec §4 の endpoint へ全画面を接続)、mutation→invalidate マップと楽観更新 3 箇所限定、RFC 9457 エラー写像 (errors[]→RHF setError・401→signin・409→直列化案内)、ウィザード試算の SEC5 規則 (提出前は時間概算のみ・金額はサーバ snapshot のみ)、性能予算 (CWV good p75 + First Load JS ≤250KB gzip/route CI ゲート)、Playwright 2 viewport (1280×800/390×844)+axe CI。発見事項: S03/S05 が要する PublishRequest 一覧 API (GET /api/v1/publish, filter: project/channel/status) が backend-spec §4.6 に無く、additive evolution (§3.1) として追加要求を docs/frontend-spec.md §3.4 に記録 (feat-publish-pipeline P02 で確定)。

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

## 最新ドキュメント出典

- (このカテゴリに割り当てた取得済みドキュメントなし。全体出典は index.md 参照)
