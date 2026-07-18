---
status: draft
layer: system-wide-design
sources: [system-spec/00-requirements-definition.md]
---

# ユーザージャーニー全体フロー (段階 0 / 横串)

> 主役 3 人 (作者 / 利用者 / Workspace 管理者) の端から端までの流れ。各ステップが「どの画面・コマンドに触れ、裏でどの仕組みが動くか」を固定し、画面・API・データの洗い出しの正本にする。数値・方式の正本は qa 参照先。

## J1: 作者 — 業務課題を解決して同僚へ届ける (G1)

| # | 作者がすること | 触れる surface | 裏で動く仕組み | 根拠 |
|---|---|---|---|---|
| 1 | Claude Code / Codex で解決物 (Skill 等) を作る | 作者の AI セッション | — (Hub 関与なし) | U1 |
| 2 | 初回のみ: publish 時に表示された URL をブラウザで開いて承認 | S08 Device 承認 | OAuth Device Flow。token は OS 資格情報域へ | qa-008 |
| 3 | `/harness-hub:publish` (または自然言語) の 1 操作 | Publisher plugin | package 収集・manifest 補完・ローカル pre-check (検査共有 package) | I1, qa-010 |
| 4 | 待つ (進捗表示を見る) | S03 公開状態 | PublishRequest 状態機械 + Hub 側検査 (static validation / secret scan / policy) | I2, qa-018 |
| 5a | **Green**: 完了通知を確認 | S03 → S02 詳細 | 自動公開: immutable Release 採番 + stable pointer 更新 + 監査 event | I2, I3 |
| 5b | **Yellow / Red**: 平易な日本語の指摘 + 次の一手を読んで修正 → 3 へ | S03 (Needs Fix) | 差し戻し。Yellow は Stage 2 で管理者 review 経路 | I2, I8 |
| 6 | (WebApp の場合) Publisher の指示どおりスクリプト実行を承認 | Publisher plugin → wrangler | 作者 local session で wrangler CLI 実行 → Hub へ URL・release 登録 → Hub が公開範囲検査 + health 確認 | I5 |
| 7 | 更新も同じ 1 操作。失敗したら rollback | Publisher / S04 Release 履歴 | stable pointer 差替 (常に可逆) | I3, qa-018 |

## J2: 利用者 — 同僚の業務ツールを見つけて使う (G2, G3)

| # | 利用者がすること | 触れる surface | 裏で動く仕組み | 根拠 |
|---|---|---|---|---|
| 1 | Hub Web へアクセス → 会社の SSO でログイン | S07 サインイン → 顧客 IdP | Auth.js + テナント別 OIDC。Hub 独自アカウントなし | qa-005 |
| 2 | Workspace Catalog で業務ツールを探す | S01 一覧 | Tenant/Workspace スコープ強制 (見えるのは自 Workspace のみ) | I4, D4 |
| 3 | 詳細を見る | S02 詳細 | CatalogEntry + Release 情報 | I4 |
| 4a | **Claude 契約あり**: 「追加する」→ 提示された導入手順を実行 | S02 → 自分の Claude Code | URL 型 marketplace (native source) または Bootstrap Installer。GitHub アカウント不要 | I6 |
| 4b | **Claude 契約なし**: 「Web アプリを開く」 | S02 → 顧客側 WebApp | Hub は URL 案内のみ (runtime 非保持) | I5, G3 |
| 5 | 品質に問題があれば報告 | S02 低品質報告導線 | 報告を owner / 管理者へ接続 | I4 |
| 6 | 導入済みツールの更新に気づき更新する | 更新通知 (Stage 2) | update 通知 → 再導入 or 自動更新 | U7 Stage2 |

## J3: Workspace 管理者 — 統制点を一元化する (G4)

| # | 管理者がすること | 触れる surface | 裏で動く仕組み | 根拠 |
|---|---|---|---|---|
| 1 | 初回: IdP (OIDC) 設定と Cloudflare 接続を登録 | S04 Workspace 設定 | テナント別 OIDC 設定の動的解決 (D3) | qa-005, U6 |
| 2 | メンバーの role を割当てる | S04 (Stage 2 で granular RBAC) | provider-admin / workspace-admin / owner / member | qa-005, I8 |
| 3 | Yellow の公開申請を審査・承認/却下 | S05 承認キュー (Stage 2) | approval queue + 監査 event | I8 |
| 4 | 誰が何を公開・変更したかを追う | S06 監査ログ (Stage 2) | formal audit log + export (情シス監査 mirror) | I8, U6 |
| 5 | 問題ツールの公開停止・owner 再割当 | S02 / S04 | stable pointer 停止 + 監査 event | U6, I3 |
| 6 | 退職者・端末紛失時の token 失効 | S04 | Device Flow token の失効 (本人 / 管理者) | qa-008 |

## J0: Stage 0 technical gate (提供者のみ・画面なし)

Stage 1 に入る前提検証。**この 3 つが成立しなければ上記ジャーニーの設計を見直す** (H3 / H6 / H7、feat-stage0-distribution-gate)。

1. URL 型 marketplace (native source) で Git レス配布が成立するか
2. Bootstrap Installer 経路が成立するか
3. wrangler CLI による作者 local session からの公開が成立するか

→ 成立した経路が J1-#6 と J2-#4a の実現方式として確定する (qa-003)。

## J4: 作者 — ヒアリングから業務ツールが生まれるまで (Studio 拡張。根拠: mockups/harness-studio-v2-analysis.md)

1. S10 ヒアリングウィザードに業務課題を入力 (基本情報→業務詳細→要件→確認、削減効果を自動試算) → 受付番号発番・「生成中」
2. AI 処理キュー (pull 型 — D5 候補) を Claude Code セッションが消費し、ヒアリングシート (誰が・どんなハーネスを・なぜ作るか) を生成 → S11/S12 に反映
3. S13 構築パイプラインで 7 工程 (ヒアリング→要件定義→設計→構築→テスト→レビュー→公開) を進行管理 (工程操作は admin)
4. 完成物は J1 の publish フロー (1 操作・Green/Yellow) で S01 プラグイン Hub へ

## J5: 利用者・作者 — 改善ループ (フィードバック→AI 対応→再公開)

1. 利用者が `claude harness feedback <slug>` (推奨) または S14 の Web フォームで改善要望/レビュー依頼/バグ報告
2. キューを Claude Code が pull して解析・修正案/パッチ生成 → S14 に aiResponse とステータス (未対応→対応中→対応済み) が反映
3. 修正版が新バージョンとして S13 パイプライン → J1 publish → 利用者へ update 通知

## J6: 管理者 — 効果を測る (実行ログ→ダッシュボード)

1. 導入済みハーネスの実行が Claude Code から自動トラッキング (ingest: 短命 token・回数のみ・係数計算はサーバ側)
2. S16 利用・削減効果 (ハーネス別・週次) と S09 ダッシュボード (KPI・部門別)、S17 ユーザー個別に集計反映
3. 試算式 (時給 = 年収 ÷ 2000h、15 分/回、35% 削減) は係数パラメータとしてテナント設定で調整可能

## ジャーニー → feature 対応 (縦串への接続)

- J1 = feat-publisher-plugin + feat-publish-pipeline (+ 基盤: auth-tenancy, domain-model-db)
- J2 = feat-dual-catalog-web (+ auth-tenancy)
- J3 = feat-workspace-governance (+ dual-catalog-web の S04)
- J0 = feat-stage0-distribution-gate (依存なし・最初に実行)
- J4 = feat-hearing-intake + feat-build-pipeline-board (+ AI 処理キュー = D5)
- J5 = feat-feedback-loop (+ publish-pipeline)
- J6 = feat-metrics-tracking (+ user-org-admin の年収データ)
