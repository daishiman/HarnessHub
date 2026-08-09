---
status: confirmed
category: infrastructure
aggregate: 確定
spec_cells: [infrastructure.web, infrastructure.mobile, infrastructure.tablet, infrastructure.desktop-windows, infrastructure.desktop-linux, infrastructure.desktop-macos]
serves_goals: [G1, G4]
---

# インフラ (infrastructure)

- カテゴリ集約状態: **確定**
- 章確定マーカー: `status: confirmed`

## カテゴリ別収集状態

| プラットフォーム | 状態 | 根拠 |
|---|---|---|
| Web (web) | 確定 | 確定質疑: qa-infrastructure-web |
| モバイル (mobile) | 対象外 | 理由: 本システムはクライアント実装を含まず、モバイル向け成果物を作らないため |
| タブレット (tablet) | 対象外 | 理由: 本システムはクライアント実装を含まず、タブレット向け成果物を作らないため |
| デスクトップ (Windows) (desktop-windows) | 対象外 | 理由: 本システムはクライアント実装を含まず、デスクトップアプリ成果物を作らないため |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: 本システムはクライアント実装を含まず、デスクトップアプリ成果物を作らないため |
| デスクトップ (macOS) (desktop-macos) | 対象外 | 理由: 本システムはクライアント実装を含まず、デスクトップアプリ成果物を作らないため |

## 確定内容 (質疑録)

### qa-infrastructure-web (対応セル: web)

**質問**: カテゴリ infrastructure × platform web の要件は何か (system-spec/requirements-brief.md §3 の確定回答を一次入力とする)

**回答**: 常駐ミドルウェアなし。1 コマンド起動、データはファイル 1 個。バックアップはそのファイルのコピー。

## 上流指針 (doctrine anchor)

| concern | authority (正本) | 導く上流原則 | 出典 |
|---|---|---|---|
| reliability | Google SRE | SLO/エラーバジェット・冗長性・スケーリング・監視の上流指針 | https://sre.google/books/ |
| operations | Google SRE | 運用手順・障害対応・トイル削減・ポストモーテムの上流指針 | https://sre.google/workbook/ |

- 本章の確定内容 (質疑録) は上記 authority を上流指針として適用する。具体技術の選定はこの指針に従属し、指針との乖離は再オープン (R4-reopen) の根拠になる。

## 適用された設計知識

- `ref-system-design-knowledge/references/resource-map.yaml` (このカテゴリ専用の deep card は resource-map に未定義。本章の設計判断は「上流指針 (doctrine anchor)」節の authority と「確定内容 (質疑録)」を正本とする)

---

### 常駐ミドルウェアを持たない構成の運用境界

- project candidate: `no-daemon-single-process-ops` (`deepened`)
- 解決対象: 常駐なし・単一ファイルという確定内容に対し、冗長性やスケーリング前提の指針をそのまま当てると章が実態から乖離する

#### 目的

確定内容 (常駐ミドルウェアなし・1 コマンド起動・データはファイル 1 個・バックアップはそのコピー) を、運用指針のどこまでが適用範囲かを明示して裏づける

#### 解決する問題

- 単一プロセス構成に冗長化/自動スケールの語彙を持ち込むと、実在しない運用対象を仕様へ書いてしまう

#### 適用条件

- 単一端末・単一利用者で可用性目標を持たない本システムの構成

#### 非適用条件

- SLO/エラーバジェット・冗長構成・水平スケーリングを要する運用。本システムは利用者 1 名・停止許容のためこれらを非適用と判断し、監視は次章 (maintenance-ops) の最小構成に限る

#### トレードオフ

- 可用性保証を持たない代わりに、運用対象数が最小になり G4 を満たす

#### 失敗モード

- バックアップ取得漏れ。手順を 1 ファイルコピーに固定し README 化することで実行負荷を下げる

#### goalへの寄与

G1 (外部依存 0) / G4 (1 コマンド起動・1 ファイルバックアップ)

---

#### 本章での適用

- 上記原則は確定内容 qa-infrastructure-web (対応セル: web) の判断へ適用する
- 資するゴール: G1, G4

## 最新ドキュメント出典

- (このカテゴリに割り当てた取得済みドキュメントなし。全体出典は index.md 参照)
