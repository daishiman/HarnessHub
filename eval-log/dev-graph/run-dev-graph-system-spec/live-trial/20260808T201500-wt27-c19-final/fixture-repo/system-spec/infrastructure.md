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
| Web (web) | 確定 | 確定質疑: qa-025 |
| モバイル (mobile) | 対象外 | 理由: requirements-brief.md §2 platform 方針: 本システムはクライアント実装を含まず、モバイル向け成果物を作らないため |
| タブレット (tablet) | 対象外 | 理由: requirements-brief.md §2 platform 方針: 本システムはクライアント実装を含まず、タブレット向け成果物を作らないため |
| デスクトップ (Windows) (desktop-windows) | 対象外 | 理由: requirements-brief.md §2 platform 方針: 本システムはクライアント実装を含まず、デスクトップアプリ成果物を作らないため |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: requirements-brief.md §2 platform 方針: 本システムはクライアント実装を含まず、デスクトップアプリ成果物を作らないため |
| デスクトップ (macOS) (desktop-macos) | 対象外 | 理由: requirements-brief.md §2 platform 方針: 本システムはクライアント実装を含まず、デスクトップアプリ成果物を作らないため |

## 確定内容 (質疑録)

### qa-025 (対応セル: web)

**質問**: インフラ × Web (web) について、実行構成・起動方法・バックアップ方法をどうしますか。その構成にした設計上の理由と、他の構成を採らなかった理由も併せて教えてください。

**回答**: 常駐ミドルウェアなし。1 コマンド起動、データはファイル 1 個。バックアップはそのファイルのコピー。

【適用した上流指針・設計原則と、その原則がこの要件になった理由】
- Google SRE (operations concern) の toil 削減原則 → 確定内容の『常駐ミドルウェアなし・1 コマンド起動』 → 起動のたびに人手で複数プロセスを整える作業を無くし、G4 を運用手順ではなく構成で満たすため。
- Google SRE (reliability concern) の「復旧手順は単純で反復可能に」原則 → 確定内容の『データはファイル 1 個・バックアップはそのコピー』 → 復旧が『ファイルを戻す』の 1 手順に収束し、手順の分岐に起因する復旧失敗を無くして G3 を守るため。
- 同原則の帰結として外部依存を持たない構成を採用 → 確定内容の『追加の常駐ミドルウェアを増やさない』 → 障害面を端末内に閉じ、外部サービス障害が可用性と G1 の両方へ波及しないようにするため。クラウド配備を採らなかったのは U7 out と U8 の費用 0 制約による。

(上流指針: Google SRE (reliability, operations) / deep card: 該当なし。上の各 - は 1 論点で、spec-state-contract の「qa_log の論点分離」に従い qa-025-p1..p3 として分離索引 entry も追記している。)

## 上流指針 (doctrine anchor)

| concern | authority (正本) | 導く上流原則 | 出典 |
|---|---|---|---|
| reliability | Google SRE | SLO/エラーバジェット・冗長性・スケーリング・監視の上流指針 | https://sre.google/books/ |
| operations | Google SRE | 運用手順・障害対応・トイル削減・ポストモーテムの上流指針 | https://sre.google/workbook/ |

- 本章の確定内容 (質疑録) は上記 authority を上流指針として適用する。具体技術の選定はこの指針に従属し、指針との乖離は再オープン (R4-reopen) の根拠になる。

## 適用された設計知識

- `ref-system-design-knowledge/references/resource-map.yaml` (このカテゴリ専用の deep card は resource-map に未定義。本章の設計判断は「上流指針 (doctrine anchor)」節の authority と「確定内容 (質疑録)」を正本とする)

## 最新ドキュメント出典

- (このカテゴリに割り当てた取得済みドキュメントなし。全体出典は index.md 参照)
