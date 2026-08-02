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
| Web (web) | 確定 | 確定質疑: qa-134 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリなし。モバイルブラウザ表示は web 行のレスポンシブでカバー |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリなし。タブレットブラウザ表示は web 行のレスポンシブでカバー |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-007 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop クライアントは対象外 (作者環境は macOS + Windows) |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-007 |

## 確定内容 (質疑録)

### qa-134 (対応セル: web)

**質問**: ログイン成功後の着地先・`/` の扱い・ブラウザ通常遷移でのテナントスコープ伝搬・active workspace の選択を、既存 frontend.web 契約へどう統合しますか?

**回答**: ユーザーの 2026-08-02 指示 (ログイン後に業務画面へ到達できない実装未結線の是正、および CLI 非依存で Web 完結させる要求) を明示承認として、qa-062 / qa-118 / qa-127 の既確定 (画面構成・install descriptor・publish polling・レスポンシブ・共通部品・認可出し分け・dual catalog 縮退表示・OAuth 管理面) を全面維持したうえで、ログイン後導線の差分を次のとおり追加確定する。

【1. サインイン成功後の着地先】現行の callbackUrl 固定値 "/" (apps/hub/src/app/[tenant_slug]/signin/tenant-oidc-signin-form.tsx) を廃し、(a) サインイン開始時に保存した遷移元 path、(b) それが無い場合は既定着地 `/sheets` の順で解決する。docs/frontend-spec.md §10 の段階運用 (S09 ダッシュボード完成までは `/` → `/sheets`、完成後に `/dashboard`) に従い、既定着地は単一の定数から解決して画面ごとに散らさない。戻り先は同一 origin の相対 path のみ許可し、絶対 URL・スキーム付き・protocol-relative (`//`) は既定着地へ落とす (open redirect 防止)。

【2. `/` の扱い】未認証時は現行の稼働確認表示 (/health 導線を含む) を維持する。認証済み session がある場合は既定着地へ redirect し、`/` を認証済みユーザーの終着点にしない。稼働確認そのものの参照先は /health を正本とし、`/` の表示内容を業務画面へ置き換えない。

【3. ブラウザ通常遷移でのテナントスコープ伝搬】業務画面 (/sheets・/sheets/new・/sheets/:id・/catalog・/catalog/:projectId・/catalog/releases) はブラウザ遷移で明示ヘッダーを付けられないため、server 側で session principal から tenant/workspace scope を解決する経路を正規とする。明示ヘッダー経路は API / 機械クライアント専用として存置し、両経路は同一の authorize() に収束させる (判定の二重実装を作らない)。scope 未解決のまま業務画面本体を描画しない (deny-by-default を維持)。

【4. active workspace の選択】session に active workspace を保持する。所属 workspace が 1 件のときは自動選択し選択画面を挟まない。2 件以上のときは Workspace 選択画面を挟み、選択後に本来の遷移先へ進む。切替は共通シェルから常時可能とし、切替時は新 scope の応答が返る前に旧 scope の内容を表示対象外にする (qa-118 【1】の scope 変更時契約を継承)。

【5. ナビゲーションの段階表示】未実装 phase の項目を非表示にする既存契約 (docs/frontend-spec.md §10) を変更しない。本件で新設するのは Workspace 選択/切替と既定着地であり、サイドバー 9 項目の前倒し表示ではない。

【6. 境界】authorize() の判定順・role 判定・catalog/sheets API 実装は既存 owner のままとし、frontend は解決済み scope の描画適用と回復導線の提示だけを担う。

### qa-127 (対応セル: web)

**質問**: provider-admin 向け Google OAuth 管理画面を frontend.web の現行画面契約へどう統合しますか?

**回答**: qa-118 までの画面構成、認可後データ境界、レスポンシブ、共通部品、認可出し分けを全面維持し、/settings/auth の管理面を追加確定する。【手順表示】Google Cloud Console 側の手作業、Hub への登録、接続状態を順に示し、正規 callback URL と必要 scope をコピー可能にする。Google 側設定を Hub が代行しない責任境界を明示する。【入力】client ID、password 型・autocomplete=new-password の client secret、任意の Workspace ドメインを受ける。ドメインはカンマ/改行区切りを小文字化・空白除去・重複排除し、成功後は ID・secret・ドメイン入力を破棄する。【状態】pending/tested/active/disabled と last4、最終テスト時刻、rotation の現行/pending を区別し、未テスト staging は有効化できないこと、昇格前は旧設定でログイン継続すること、昇格後の Google 側旧 secret 失効が手作業であることを表示する。【エラー】公開 enum を runtime schema で検証して固定文言へ写し、未知 error、例外、入力値、secret、Google 応答本文を描画しない。コピー失敗は未処理 Promise にしない。

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
