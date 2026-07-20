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
| Web (web) | 確定 | 確定質疑: qa-062 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリなし。モバイルブラウザ表示は web 行のレスポンシブでカバー |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリなし。タブレットブラウザ表示は web 行のレスポンシブでカバー |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-007 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop クライアントは対象外 (作者環境は macOS + Windows) |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-007 |

## 確定内容 (質疑録)

### qa-062 (対応セル: web)

**質問**: docs/frontend-spec.md の 2026-07-18 追記 (S01 公開ウィザード配置・S11/S12/S14/S15/S02 詳細契約・§10 実装順・redirect/ナビ段階運用) を frontend 仕様へ反映するか。 (訂正再登録: qa-055 の回答に系譜継続句が欠けていたため、同一 delta を継続句付きで qa-062 として登録し直す)

**回答**: qa-040 の確定内容 (技術選定 8 論点。qa-035 スマホサイズ仕様の維持を含む) を全面維持しつつ、次の delta を確定する。mock 実測どおり公開ウィザードは S01「プラグインを公開」モーダル (S02 は既存 Project の詳細・管理・導入で新規取込の入口ではない)。S01/S02 のデータ取得へ install descriptor (GET /harnesses/:projectId/install) と publish 中 2s→backoff polling を追加。S11 一覧: status/HS コード・title/domain・department/people・hours/applicant/updated_at の 6 列 (モバイルはカード畳み)、status/department filter + 全文検索 + cursor ページング、権限外行のクライアント側除外実装は禁止 (API が範囲を返す)。S12 詳細: ヘッダ + 生成 4 section (概要/課題/機能タグ/削減効果) + 元入力/試算 snapshot + Build/PublishRequest 参照。received の表示は全画面共通「受付」。admin 操作は右側メタ領域で member には非表示かつ API でも拒否。P2 有効後のみ自動作成 Build への導線を表示。S12 PDF: 別データ生成せず認可済み詳細 DTO と同じ表示モデルを print stylesheet で A4 化し window.print() (salary 原値・非表示フィールド・操作ボタンを印刷 DOM に含めず、画面と PDF の内容差分を snapshot test)。S01 公開ウィザード: Step1 CLI 取込推奨/Web 手動 ZIP 代替 → Step2 target(skill/web_app)/category/visibility (Stage 1 は workspace まで)/説明 → Step3 検査結果と公開確認。新規 Project 作成→PublishRequest→upload/submit を 1 UI フローに束ねるが API status は隠さない。Green 自動/Yellow 承認待ち/Needs Fix は S03 findings へ。単一テナント/単一 Project を定数にしない。S14: status 件数 + FR コード/harness/type (改善要望/レビュー依頼/バグ報告)/priority/requester/date/status、sanitize 済み AI 応答、修正版 Build 導線で S13→publish→更新通知まで追跡。S15: common+自 tenant 合成一覧、sanitize 済み Markdown 閲覧、admin 編集 textarea+preview、member に編集 CTA を出さず common 編集は provider-admin のみ。S02: 全 Release と stable 版、install/download modal は backend descriptor 表示のみで R2 key/永続生 URL を組み立てず、promote/rollback/suspend は owner だけに表示。P6 ボトムシート対象へ公開ウィザード追加。§10 実装順: P0 共通シェル + S07/S08 → P1 S10/S11/S12 → P2 S01→S02/S03→S13 → P3 S14/S15 → P4 S16/S17/S18 → P5 S09 + S05/S06。/ redirect は S09 完成 (P5) まで /sheets へ。サイドバー/ボトムタブは未実装 phase 項目を非表示 (グレーアウト不可 = qa-018 整合)、ボトムタブ先頭 slot は S09 完成までシート (S11) 暫定。部品実装順は shared-layers §1 (StepWizard=P1、StageBoard=P2、MarkdownEditor=P3、InlineEditTable=P4、チャート/KPI=P4 の S16 から S09 で完成)。認可 (deny-by-default・role 4 種・admin 出し分け) は P0 から全画面。

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
