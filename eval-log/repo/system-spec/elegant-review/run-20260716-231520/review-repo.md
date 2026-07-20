# elegant-review レポート: system-spec/

- run: run-20260716-231520
- 対象: `system-spec/`（12ファイル、scope_mode: repo）
- レビュー観点（ユーザー依頼）: 目的達成に必要な情報の網羅性・詳細度（アーキテクチャ・セキュリティ含む）の検証と改善
- 最終判定: **4条件 すべて PASS**（独立検証者による承認、3反復で収束）

## 実行サマリ

| フェーズ | 担当 | 結果 |
|---|---|---|
| Phase 1 思考リセット・俯瞰 | elegant-reset-observer（context fork） | 俯瞰レポート + shared_state.md（200字）+ 懸念19件 |
| Phase 2 並列多角分析 | 論理構造 / メタ発想 / システム戦略の3エージェント並列 | 30思考法すべてで findings 生成（issues 54件、改善前平均スコア 0.337） |
| Phase 3 改善実行 | 改善ワーカー9体（依存順3バッチ）+ 修正反復2回 | 全章展開 + 章間矛盾解消 |
| 独立検証 | phase3-verifier（proposer ≠ approver） | 反復1: C1/C3 FAIL → 反復2: C3 PARTIAL → 反復3: 全PASS・承認 |

## 診断（Phase 2 の中核結論）

**根本原因は単一**: qa_log（spec-state.json）から章本文への「仕様書コンパイル」工程が予告のみで未実行のまま、確定ゲートがそれを要求しない構造だった（KJ法・アブダクションが同一結論に収束）。その症状として:

1. 技術6章が汎用設計知識カードの転記のみで空洞化（DBスキーマ・API・画面・脅威モデル・runbook が qa_log にのみ存在）
2. ui-ux / infrastructure が「resource-map 未定義」の自己申告のまま status: confirmed（章内自己矛盾）
3. qa-012/qa-013 のゴール・目標定義が正本 U3/U4 と同一 ID で別内容（承認の有効性を毀損する critical 矛盾）
4. 調査済み caveat（Worker 3MiB・Better Auth 帰趨・npm source）が決定記録・章へ未伝播
5. 悪意ある作者の脅威モデル不在（prompt injection skill が Green 自動公開を通過する経路が開いていた）

## 実施した改善

### 反復1（本体展開、9ワーカー）
- **database.md**: 10エンティティのテーブル定義（Drizzle 疑似スキーマ）・不変条件 INV-1〜4・テナント分離方式（D4）・D2 ヘッジ制約・R2 対応
- **auth.md**: 認可マトリクス（操作×4role、deny by default）・トークン/セッションライフサイクル（失効反映 最大15分等）・Better Auth リスク
- **backend.md**: endpoint 一覧18件・PublishRequest 状態機械遷移表・エラー契約11コード・ポーリング仕様・Web App 出口 API・公開停止2種別の伝播仕様・lifecycle 運用・既存資産移植とゴールデンテスト
- **security.md**: 信頼境界図（Mermaid）・脅威モデル T1-T7（prompt injection = T1、悪性 URL = T2）・検査 pipeline と Green/Yellow/Red 判定規則（fail-closed）・監査イベント一覧（正本）・分離テスト S1-S8・ASVS 対応表・情シス審査パッケージ
- **infrastructure.md**: 実行環境構成・Web App 出口の PASS/FAIL 基準・無料枠予算表（9資源×70%閾値×縮退順序）・Stage 0 technical gate（H3/H6/H7）・配布経路3候補比較・bundle 3MiB 予算・npm 二義性の明確化
- **ui-ux.md**: 用語対訳21語・初期4画面仕様・Catalog 情報構造・失敗系フロー文言・統制操作導線・検査バッジ・オンボーディング
- **frontend.md**: App Router 構成・レスポンシブ基準・エラー変換責務
- **maintenance-ops.md**: 監視項目一覧・障害種別 runbook 4種（D2 ヘッジ発動条件含む）・バックアップ RPO/RTO・テスト戦略・CI/CD stage・依存サービス exit 表
- **spec-state.json / 00-requirements-definition.md**: qa-016 訂正記録 + appr-003（qa-012/013 の仮ラベル問題を監査証跡を書き換えずに解消）・D1/D3 caveats 追補・D4 テナント分離 decision 新設・仮説レジスタ H0-H8（H2 は実在確認）・外部参照レジスタ
- **index.md**: 章確定の Definition of Done・コンポーネント×成果物トレース表・intent トレース表（I1-I9）・出典14参照の章別割当・仕様負債一覧・実装着手前再確認リスト

### 反復2（独立検証の指摘8件+関連1件の修正）
publish 認可の owner 統一・suspend/resume 発火契機の workspace-admin 統一・監査 event 3種追補・認可マトリクスへ7操作追補（deny by default との衝突解消）・状態名表記注記・「member 以上」定義・外部参照5件追補・§6.1 誤参照修正

### 反復3（low 2件の修正）
backend.md 監査 event 列の event_type 表記統一（14箇所）+ security 正本へ publish.requested 追補

### 追加パス（qa-017、ユーザー追加要望 2026-07-17）
「汎用性が高く改善しやすいコード」のためのコード構造・アーキテクチャ規約を5章+index に展開。ベストプラクティスは制約適合で選定（採用: functional core & imperative shell、pnpm workspace モノレポ / 部分採用: hexagonal ports&adapters（port は D2/D3/R2 の3境界のみ）、DDD 戦術（ユビキタス言語 + INV 配置のみ）/ 不採用: Clean Architecture 完全4層（C1 認知負荷）、CQRS/ES）。依存方向は apps→packages 一方向で dependency-cruiser lint 検査。

## 検証結果（機械 + 独立検証）

| 検査 | 結果 |
|---|---|
| validate-paradigm-coverage.py（30思考法カバレッジ） | exit 0 |
| validate-paradigm-coverage.py --phase-order（Phase 1→2→3 成果物順序） | exit 0 |
| validate-coverage-matrix.py --require-complete --require-foundation | exit 0 |
| validate-source-citation.py（全ワーカー編集後に毎回） | exit 0 |
| 独立検証者の最終判定 | C1/C2/C3/C4 すべて PASS・承認 |

## ガバナンス遵守

- 確定章の変更はすべて正規経路（apply-spec-transition.py の R4-reopen → 編集 → re-confirm）。reopen/confirm はオーケストレーターが直列実行し、spec-state.json への並列書き込み競合を回避
- 監査証跡（qa_log answer・approval_log）は書き換えず、訂正は append（qa-016 / appr-003）
- proposer ≠ approver: 改善ワーカーと独立検証者を分離
- 改善前スナップショット: pre-phase3.patch + pre-phase3-system-spec-backup/（system-spec/ は untracked のため git diff では捕捉不可、ディレクトリコピーで保全）
- git commit / push は未実行（conservative プロファイル、ユーザー承認待ち）

## 残課題（非ブロッキング）

1. 「(補完仕様: … から導出)」マーカー付き数値（token 寿命15分/24h/30日・RPO/RTO 24h・ポーリング下限2秒・報告対応14日・無料枠試算等）はAI導出の設計判断。ユーザーレビューで上書き可能
2. 配布経路の最終確定は Stage 0 technical gate（H7）の実測待ち（index.md 仕様負債一覧に記録済み）
3. backend.md「Project lifecycle 運用」表の監査列は説明的文言（event_type への一意対応は自明、検証者判定で違反非該当）
4. 実装時注意（検証者指摘、違反ではない）: process.env 禁止の対象範囲は security 章（packages/* 全体）が backend 章規約表より広いが、secret 規約の正本は security 章と両章が明示しているため広い方が正として一意に解決できる

## 追加パス（qa-017）の独立検証結果

独立検証者による追加分検証: **全4条件 PASS・residual_issues ゼロ・承認**。package 名・依存方向は5章間で完全一致、既存固有仕様（D2 接続層隔離・zod 再定義禁止・二層防御・INV-2）との接続は全て正本参照付きで整合、index.md トレース行の参照先は全件実在、8候補の選定表は不採用2件（CA 完全4層・CQRS/ES）を含め全てに制約接地の根拠あり。

## 教訓（横展開候補、Phase 2 で抽出）

- 状態マーカー（confirmed）は検証可能な DoD への参照を伴わない限り宣言に退化する → DoD を index.md に明文化済み
- 収集マトリクスの軸がプロダクト構造と不適合な場合、対象外セル率（本件 62.5%）が警告シグナルになる
- 共有無料枠×マルチテナントでは「コスト命題」と「隔離命題」は独立 → 無料枠予算表を必須成果物とするパターン
- 非専門家向けプロダクトでは用語対訳表と失敗系フロー文言を一級成果物とする
