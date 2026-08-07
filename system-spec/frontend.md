---
status: confirmed
category: frontend
aggregate: 確定
spec_cells: [frontend.web, frontend.mobile, frontend.tablet, frontend.desktop-windows, frontend.desktop-linux, frontend.desktop-macos]
serves_goals: [G1, G2, G3]
---

# フロントエンド (frontend)

- カテゴリ集約状態: **確定**
- 章確定マーカー: `status: confirmed`

## カテゴリ別収集状態

| プラットフォーム | 状態 | 根拠 |
|---|---|---|
| Web (web) | 確定 | 確定質疑: qa-170 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリなし。モバイルブラウザ表示は web 行のレスポンシブでカバー |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリなし。タブレットブラウザ表示は web 行のレスポンシブでカバー |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-007 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop クライアントは対象外 (作者環境は macOS + Windows) |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-007 |

## 確定内容 (質疑録)

### qa-170 (対応セル: web)

**質問**: C06 監査 finding-1 (HIGH): 既定着地 /sheets は qa-135 で事実として確定しているが、利用者の承認にも appr-033 の委任範囲にも紐付いていない。『利用者がサインイン後どの画面に着地すべきか』は製品の価値判断であり、受入基準の起点として承認済みにする必要がある。利用者へ問うたうえで確定せよ。

**回答**: 利用者へ直接問い、**既定着地を `/dashboard` とし、ダッシュボード画面を先に作る**という決定を得た (appr-034)。qa-135 の逐語は改変せず、本 entry を frontend/web の確定内容の正本とする。

[変更点は 1 点だけ] 既定着地の値を `/sheets` から `/dashboard` へ変更する。`DEFAULT_POST_SIGNIN_LANDING` を単一定数から解決する構造 (apps/hub/src/lib/routing/post-signin-landing.ts) はそのまま用い、値だけを変える。画面ごとに着地先を散らさない。

[qa-135 の他の契約は全面維持] 以下は一切変更しない。
 - サインイン開始時に保存した安全な相対戻り先を優先し、無い場合に既定着地へ落とす順序。
 - 絶対 URL・スキーム付き・protocol-relative (`//`) は既定着地へ落とす (open redirect 防止)。
 - 未認証の `/` は稼働確認表示を保ち、認証済みの `/` は既定着地へ redirect する。  `/` を認証済み利用者の終着点にしない。稼働確認の正本は `/health`。
 - ブラウザ業務画面は session principal の active tenant/workspace から server 側で   scope を解決し、明示ヘッダー経路と同じ authorize() に収束させる。
 - workspace 1 件は自動選択、2 件以上は選択画面を挟み、切替時は新 scope の応答前に  旧 scope 表示を消す。
 - scope 未解決の業務画面描画・認可規則の二重実装・未実装ナビゲーションの前倒し表示は  許可しない。

[新規に本 feature の scope へ入るもの] `/dashboard` 画面の実装。これまで docs/frontend-spec.md §10 の段階運用では S09 (ダッシュボード完成後に `/` を `/dashboard` へ切替) として後段に置かれていたが、利用者の決定により本 feature で実装する。

[『前倒し表示の禁止』との整合] qa-135 は『未実装ナビゲーションの前倒し表示は許可しない』と定めている。本決定はこれに反しない。禁じているのは**実体が無い画面へのリンクを出すこと**であり、本決定は `/dashboard` の実体を実装したうえで着地させる。サイドバー 9 項目の段階表示契約 (docs/frontend-spec.md §10) は変更せず、ダッシュボード以外の未実装項目を前倒しで見せることはしない。

[段階表の更新義務] docs/frontend-spec.md §10 の S09 は『ダッシュボード完成後に切替』と書かれており、本決定でその前提が変わる。仕様書と段階表が食い違ったまま残ると次の実装者がどちらを正としてよいか判断できないため、**§10 の段階表そのものを本 feature の変更対象に含める** (仕様間の不整合を残さない)。

[この決定の性質] 着地先の選択は利用者本人の決定であり (appr-034)、AI の代理回答 (appr-033) ではない。実装量が増える代償は提示済みで、利用者は了解している。

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
