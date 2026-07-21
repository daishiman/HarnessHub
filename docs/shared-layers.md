---
status: draft
layer: system-wide-design
sources: [system-spec/backend.md, system-spec/security.md, system-spec/database.md, system-spec/infrastructure.md, system-spec/ui-ux.md]
---

# 共通化設計 (段階 0 / 横串) — 二重実装を防ぐ層

> 複数 feature が使うものはここに登録し、実装 owner を **feat-hub-foundation** (基盤) に一元化する。各 feature の P02 設計は共通層を「使う」設計に徹し、共通層そのものを再発明しない。
> 過剰な層分割は C1 (個人開発の認知負荷) に反するため採らない (qa-020) — **共通化するのは「2 つ以上の feature が使う」ものだけ**。
> ここでいう owner は、共通 package の境界・公開 contract・横断品質ゲートを一元管理する責任を指す。認証 policy、DB schema、publish 判定、試算式などのドメイン固有ロジックは担当 feature が同じ共通境界へ提供し、`feat-hub-foundation` に業務ロジックを集約しない。

## 1. 共通 UI (design system)

| 共通部品 | 一括担保するもの | 消費する feature | 根拠 |
|---|---|---|---|
| design tokens (色・余白・タイポ) | コントラスト比 4.5:1 以上を token 段階で保証 | 全画面 | qa-018 |
| フォーム部品 (input / select / button) | キーボード操作・フォーカス管理・ラベル/代替テキスト | S01 公開、S04, S05, S07, S10 | qa-018 |
| テーブル / 一覧部品 | ソート・スクリーンリーダー対応・レイアウトシフト防止 | S01, S04, S06, S11, S14, S15, S17 | qa-018 |
| 進捗・状態表示部品 | PublishRequest / AiJob 等のポーリング表示・スケルトン (CLS 抑制) | S01, S03, S05, S10-S12 | qa-018 |
| 確認ダイアログ | 破壊的操作の確認 + 可逆性明示の統一パターン | S02, S04, S05 | qa-018 |
| 通知・エラー表示 | 平易な日本語 + 次の一手の統一フォーマット (§5.4) | 全画面 | qa-018 |

**戦略**: WCAG 2.2 AA は「全画面の検査項目」ではなく「共通部品の設計制約」として守る。axe 自動チェック (CI) は部品単体 + 画面結合の両方に掛ける。

**Studio mockup 反映の追加部品** (2026-07-17。根拠: mockups/harness-studio-v2-analysis.md §4):

| 共通部品 | 一括担保するもの | 消費する feature |
|---|---|---|
| KPI カード / チャート (折れ線・バー・ドーナツ) | **bundle 3MiB 予算内の軽量実装** (重量チャート lib 不可)・配色のコントラスト | metrics-tracking, hearing-intake, user-org-admin |
| ステップウィザード | 進捗表示・戻る/次へ・キーボード操作 | hearing-intake (S10), publisher-plugin (S01 公開ウィザード) |
| ステージボード (かんばん風) | 工程チップ・риスク表示 | build-pipeline-board |
| Markdown レンダラ + エディタ | **XSS sanitize (SEC7)**・プレビュー | docs-cms, feedback-loop, hearing-intake |
| 状態チップ / スコープチップ / トースト / タブ / インライン編集テーブル | 状態語彙の統一 (下書き/生成中/レビュー待ち/完了 等) | 全 Studio 画面 |
| テーマ・表示密度・言語 (ja/en) | design tokens に組込み (ライト/ダーク/自動) | 全画面 |

**部品の実装順** (構築優先順位の帰結。正本: [system-design-overview.md](system-design-overview.md) §3「構築優先順位」): 基本部品 (フォーム/テーブル/ダイアログ/トースト/状態チップ) とテーマは P0 の共通シェルと同時。ステップウィザードと Markdown レンダラ (閲覧) は P1 (S10 ウィザード・S12 の生成ドキュメント表示)。ステージボードと公開ウィザードは P2。Markdown エディタは P3 (S15 編集)。インライン編集テーブルは P4 (S17)。**KPI カード/チャートは P4 の S16 まで不要** — S12 の試算は数値表示で足り、チャート部品の完成を待たない。S09 (P5) でチャートを完成させる。

## 2. 共通バックエンド層

| 共通層 | 責務 | 隔離する変化 | 根拠 |
|---|---|---|---|
| zod schemas (単一ソース) | API 入出力の検証と型・OpenAPI 生成。Publisher と Hub で共有 | API 契約の散逸 | qa-009, qa-020 |
| 認可ミドルウェア (単一層) | 全 API で Tenant/Workspace スコープ強制 (deny-by-default)。認可判定をここ以外に書かない | 認可漏れ (D4 row-level の実装リスク) | qa-006, qa-020, D4 |
| auth adapter | Auth.js への依存を adapter 境界に閉じる | Better Auth 移行 (D3 caveat) | qa-020, D3 |
| repository 層 (Drizzle) | DB アクセスをここに閉じる | Turso→D1 退避 (D2 ヘッジ) をアプリ層へ波及させない | qa-020, D2 |
| 検査 pipeline (純関数・共有 package) | static validation / secret scan / policy 判定。Publisher (ローカル pre-check) と Hub (正式検査) で同一実装 | 検査の二重実装・判定の食い違い | qa-010, qa-020, C3 |
| 監査 event logger | 全変更操作の append-only 記録。Stage 2 の audit log / export の供給元 | 監査の書き漏れ | I8 |

**Studio mockup 反映の追加共通層** (2026-07-17。詳細: mockups/harness-studio-v2-analysis.md §3/§5):

| 共通層 | 責務 | 根拠 |
|---|---|---|
| 試算エンジン (純関数) | 時給/削減時間/削減額/シート試算の単一実装。係数 (annualHours・分/回・削減率) はテナント設定 | B3, SEC5 (クライアント申告値を信じない) |
| 実行ログ ingest + rollup | 短命 token 認証・冪等キー・サーバ時刻。週次/部門別/ユーザー別の事前集計 (Workers cron) | B2/B3 |
| AI 処理キュー (pull 型) | シート生成・FB 対応・doc 下書きの job queue。Claude Code セッションが pull して処理・書戻し (サーバ側 AI 課金なし = **D5 確定**) | B5/B6 |
| 通知ディスパッチ | アプリ内 + メール (生成完了/レビュー結果/週次)。送信手段は D6 候補 | B8 |
| PII ガード | salary 等の要保護属性: admin 限定表示・API 非公開・監査・export マスク | SEC4 |

## 3. 共通インフラ (CI/CD・運用)

| 共通機構 | 内容 | 根拠 |
|---|---|---|
| CI 品質ゲート | pnpm 混入検査 / axe (a11y 違反ゼロ) / bundle 予算 (Worker 3MiB) / Tenant 分離テスト / 検査 pipeline 挙動同値テスト | qa-018, qa-020, D1 |
| デプロイ | wrangler CLI (GitHub Actions)。Hub と WebApp 出口で同一ツール系統 | qa-003, D1 |
| 監視 | /health + Workers logs/analytics + 外部死活監視 + SLO ダッシュボード + エラーバジェットアラート | qa-011, qa-019 |
| バックアップ | Turso 日次 export → R2。四半期 restore drill (復元できないバックアップは成功と数えない) | qa-019 |

**CI が 2 系統ある境界** (2026-07-21 追記): 本リポジトリは Hub 本体 (プロダクト) と Claude Code スキルハーネス (`plugins/`) の 2 つを同居させており、CI も 2 系統に分かれる。この表と qa-038【2】の required status checks 8 種が対象とするのは **プロダクト層 (`.github/workflows/ci.yml`)** のみである。

| 層 | workflow | 宣言の正本 | 対象 |
|---|---|---|---|
| プロダクト | `ci.yml` | `system-spec/dev-workflow.md` (qa-038/qa-039) | `apps/hub` / `packages/*` |
| メタ (スキルハーネス) | `governance-check.yml` | `plugins/harness-creator/plugin-composition.yaml` の `contract` | `plugins/*` / `scripts/*` / スキル証跡 |

メタ層のゲート (配置規約 lint・skill description lint・live-trial 証跡の検査など) を qa-038 の 8 種へ数え入れないこと。**逆に「8 種に無いから未配線だ」と判断しないこと** — 別の正本が別の workflow で機械強制している。両者はゲートの数を互いに増減させない独立系統であり、片方の変更はもう片方の仕様反映を要さない。

## 4. リポジトリ構成の提案 (pnpm workspace) — 要ユーザー確認

共通層をパッケージ境界で強制するためのモノレポ構成案。**確定は feat-hub-foundation の P02/P03 で行う**。

```
apps/hub/            # Hub 本体 (Next.js on Workers)。UI + API + 認可 MW
packages/ui/         # 共通 UI (design system)。§1 の正本
packages/schemas/    # zod schemas 単一ソース。§2 の正本
packages/inspection/ # 検査 pipeline 共有 package (純関数)
packages/db/         # Drizzle schema + repository 層
plugins/publisher/   # Publisher plugin (Claude Code / Codex 配布物)
```

- 判断理由: 「Publisher と Hub の検査ロジック共有 (qa-010)」「zod 単一ソース (qa-009)」がパッケージ分離を要求する。それ以外の分割はしない (C1)。

## 5. 変更管理 (共通層を安全に変える仕組み)

- 本書 §1-§3 の表が共通層の登録簿。**共通層の変更 = 消費 feature 全部への影響**として扱い、消費列の feature の再テストを変更の完了条件にする
- 確定後は architecture ノード (dev-graph) に反映し、source_digest により下流 feature が影響を機械検出できるようにする
- 共通層に第 3 の利用者が現れたときに初めて共通化する (2 回目までは重複を許す) — 早すぎる抽象化の禁止
