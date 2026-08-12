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
| Web (web) | 確定 | 確定質疑: qa-227 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリなし。モバイルブラウザ表示は web 行のレスポンシブでカバー |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリなし。タブレットブラウザ表示は web 行のレスポンシブでカバー |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-007 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop クライアントは対象外 (作者環境は macOS + Windows) |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-007 |

## 確定内容 (質疑録)

### qa-227 (対応セル: web)

**質問**: frontend/webの承認済み現行契約を、旧値と訂正文を併記せず一つの無矛盾な仕様として統合するとどうなるか。

**回答**: [出所] 利用者の2026-08-10逐語回答「推奨案3点を承認。」（appr-043）と、既存確定qa-219〜qa-223のうち矛盾しない契約を統合した現行正本である。

【1 shellとroute】
/dashboard、/pipeline、/trackingを既存(dashboard) route groupのHubShell配下へ置き、routeごとにshellを再定義しない。/pipeline/[buildId]をBuild個票とする。現行/metricsと/metrics/usageは移行時の互換redirectに限り、新規link・navigation・canonical URLは正規routeだけを生成する。main landmarkは単一、SessionRole投影はdeny-by-default、x-hh-pathnameは内部利用に限定する。

【2 所有境界】
StatTile、LineChart、BarChart、DonutChart、StageBoard、StageColumn、StageCard、StepWizardの視覚・操作contractはpackages/uiが所有する。apps/hubはroute、tenant/workspace scope、session identity、認可済みserver data取得を結線する。packages/uiはHub domain型をimportせず、表示用response modelだけを受ける。principalへproject_idを追加せず、backendのtrusted resolver結果だけを使用する。

【3 server-first取得】
S09/S16は確定済みrollupとowner snapshotをserver componentで取得し、生eventの画面内集計を禁止する。期間filterはURL search paramsを正本とし、client stateや表示側再計算を正本にしない。

【4 KPI DTO】
完了率と利用率は別DTOとし、numerator、denominator、period、snapshotAt、nullable rate、reasonを持つ。完了率は期間末HearingSheet snapshot、利用率は期間末公開済みHarness snapshotと期間内rollupの共通部分を使う。ranking件数を利用率の分母にするactiveHarnessRatio型の実装は禁止する。denominator=0はrate=null、reason=denominator_emptyとし、UIで「—」へ写像する。

【5 anomaly DTO】
過去4完了週が揃い中央値が0でない場合だけ評価値を返す。insufficient_historyとzero_medianを別reasonとし、正常値0へ変換しない。

【6 chart contract】
各inline SVG componentは同一response modelからSVGと直後の同値HTML tableを描画する。表は初期HTMLに常在し、JavaScriptや利用者操作なしで読める。server側とclient側で同じ数値を二重計算しない。

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

---

#### 本章での適用

##### 確定内容 qa-227 (対応セル: web)

- 確定要件: [出所] 利用者の2026-08-10逐語回答「推奨案3点を承認。」（appr-043）と、既存確定qa-219〜qa-223のうち矛盾しない契約を統合した現行正本である。

【1 shellとroute】
/dashboard、/pipeline、/trackingを既存(dashboard) route groupのHubShell配下へ置き、routeごとにshellを再定義しない。/pipeline/[buildId]をBuild個票とする。現行/metricsと/metrics/usageは移行時の互換redirectに限り、新規link・navigation・canonical URLは正規routeだけを生成する。main landmarkは単一、SessionRole投影はdeny-by-default、x-hh-pathnameは内部利用に限定する。

【2 所有境界】
StatTile、LineChart、BarChart、DonutChart、StageBoard、StageColumn、StageCard、StepWizardの視覚・操作contractはpackages/uiが所有する。apps/hubはroute、tenant/workspace scope、session identity、認可済みserver data取得を結線する。packages/uiはHub domain型をimportせず、表示用response modelだけを受ける。principalへproject_idを追加せず、backendのtrusted resolver結果だけを使用する。

【3 server-first取得】
S09/S16は確定済みrollupとowner snapshotをserver componentで取得し、生eventの画面内集計を禁止する。期間filterはURL search paramsを正本とし、client stateや表示側再計算を正本にしない。

【4 KPI DTO】
完了率と利用率は別DTOとし、numerator、denominator、period、snapshotAt、nullable rate、reasonを持つ。完了率は期間末HearingSheet snapshot、利用率は期間末公開済みHarness snapshotと期間内rollupの共通部分を使う。ranking件数を利用率の分母にするactiveHarnessRatio型の実装は禁止する。denominator=0はrate=null、reason=denominator_emptyとし、UIで「—」へ写像する。

【5 anomaly DTO】
過去4完了週が揃い中央値が0でない場合だけ評価値を返す。insufficient_historyとzero_medianを別reasonとし、正常値0へ変換しない。

【6 chart contract】
各inline SVG componentは同一response modelからSVGと直後の同値HTML tableを描画する。表は初期HTMLに常在し、JavaScriptや利用者操作なしで読める。server側とclient側で同じ数値を二重計算しない。
- 設計解釈の記録経路: `dialogue`
- 原則: Dependency Rule (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/clean-architecture.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: snapshotとrollupの結合をserver-side ownerに置き、packages/uiへ同一表示modelだけを渡してKPI policyをclient実装から内側へ保った。
  - トレードオフ:
    - server response modelが増える
    - 互換redirectを一時保守する必要がある

##### 追補 (2026-08-11 / 画面情報設計 / `HarnessHub-f6ix`)

- qa-227 と既存 frontend 契約 (App Router / packages/ui consumer / server-first / SEC5 表示専用) は全面維持する。本追補は画面実装の *情報構造の決め方* を固定する。
- mockup は実装方式の正本でも、画面横断の情報設計規範の正本でもない。規範は [画面情報設計追補](../specs/harness-hub-information-design-addendum.md)、詳細画面契約は [docs/frontend-spec.md](../docs/frontend-spec.md) §3.6、profile 割当は [screen-inventory](../docs/screen-inventory.md) のみを SSOT とする。
- 画面設計の工程順序は「利用文脈 → 取捨 → 要素別意味判定 → グループ化 → 顕著度 → 表示加工 → パターン選定 → 配置 → 機能追加 → 意味装飾」。表・カード・フォームの確定を最初に置かない。
- 情報顕著度 `lead / context / metadata` とレスポンシブ変換 pattern `P1〜P10` は別語彙である。`title` 属性だけへ絶対日時・完全識別子を隠さず、キーボード/タッチで到達できる開示を使う。
- system-spec-harness 側では `screen-information-priority` を blocking required-info とし、`frontend-arch` より先に確定する (UI なしは理由付き N/A)。item 別回答の writer 接地検査は follow-up `HarnessHub-9wdm`。
- 公開 API / DB schema / 認可判定 / Cloudflare deploy unit は変更しない。
- 原則: Information Design (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/information-design.md`)
  - 採否: `applied`
  - 章固有の根拠: frontend architecture 確定の前に画面情報の優先と意味契約を固定し、部品選定とデータ直写が設計を主導するのを防ぐ。
  - トレードオフ:
    - 生成時の収集順序が長くなり、UI あり案件では情報設計 9 項目が必須になる
    - 既存画面は一括改修せず、改修対象だけを追補へ寄せる

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

- 表示名 / 一覧一貫性 / 相対日時 / list `q` は presentation・既存 list の加算契約。認可 claim と deny 規則は不変のため **R4-reopen 不要**。
- PR #700 の route-local 遅延読込と sticky 計測の配置限定は client 境界の最適化であり、API・認可・DB・route 意味を変えない。新規 qa 番号なし、R4-reopen 不要。
- 判断と証跡の正本: [ui-mvp-wave-20260812-spec-reflection-receipt.md](../docs/features/feat-hub-foundation/ui-mvp-wave-20260812-spec-reflection-receipt.md)。

## 2026-08-12 MVP 実装追記 (feat-hearing-intake / HarnessHub-370h)

- S10 ヒアリングウィザードは、確定済みの4大工程 (基本情報/業務詳細/要件/確認) を維持したまま、
  入力負荷低減のため画面分割する (FormData 30 項目)。
- S12 は生成結果の閲覧に加え、スクリーンショット添付と Claude Code 引き渡しトークン発行 UI を持つ。
- 画面詳細の正本は `docs/frontend-spec.md` と feature information-design シート。
- 本追記は製品 UI 契約の additive な具体化であり、desktop client 構成 (qa-007) や shell 契約 (qa-227) は不変。

## 2026-08-12 MVP 実装追記 (hearing-sheet-overhaul / issue-hearing-sheet-overhaul-20260812)

- S10 を **7 画面** に統合 (整理・まとめ + 確認 → 整理・確認)。
- 用途プロファイル系 enum と priority を既存値破壊なしで加算する。
- 作成時添付ステージング (25MB・画像/動画/CSV/Excel) と S12 form_snapshot 全項目表示を追加する。
- S17 個別ダッシュボードに email / 最終ログインを読み取り表示する。
- 正本: `docs/frontend-spec.md`、`docs/features/feat-hearing-intake/mvp-sheet-overhaul-*`。

## 2026-08-12 MVP 実装追記 (feat-docs-cms blog essentials / HarnessHub-zkcl)

- `documents.publish_at` を nullable epoch ms として純増する。`scheduled` enum は追加しない。
- 表示状態: `published` / `draft+future publish_at`=予約中 / それ以外の draft=非公開。
- 予約公開 cron は default/max 100・`publish_at ASC,id ASC`・行 CAS。監査 action=`docs.scheduled_publish`。
- 分類 (category/tags)・thumbnail/excerpt の auto/manual 契約と clear 規則の正本は
  `docs/features/feat-docs-cms/architecture-decision-record.md` §1/§8 と `docs/backend-spec.md`。
- 本追記は docs CMS 既存枠 (tenant 分離・admin 編集・sanitize) の具体化であり、auth role 階層は不変。

## 2026-08-13 MVP 実装追記 (disclosure / dismissible / Docs empty)

- 共通シェルの navigation disclosure は server-first の `details` + 開閉専用 client island。
  切替リンクは素の `<a>` による document 遷移を維持し、client router を使わない。
- Modal / BottomSheet の `dismissible` で未保存破棄を防ぐ。公開 API / DB / 認可は不変。
- S15 一覧 empty は権限別 CTA と絞込解除を分離。正本は UI 基盤追補と S15 情報設計シート。
