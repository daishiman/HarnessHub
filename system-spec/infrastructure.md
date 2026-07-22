---
status: confirmed
category: infrastructure
aggregate: 確定
spec_cells: [infrastructure.web, infrastructure.mobile, infrastructure.tablet, infrastructure.desktop-windows, infrastructure.desktop-linux, infrastructure.desktop-macos]
serves_goals: [G1, G4, G5, G2]
---

# インフラ (infrastructure)

- カテゴリ集約状態: **確定**
- 章確定マーカー: `status: confirmed`

## カテゴリ別収集状態

| プラットフォーム | 状態 | 根拠 |
|---|---|---|
| Web (web) | 確定 | 確定質疑: qa-068 |
| モバイル (mobile) | 対象外 | 理由: native モバイル向け配信基盤なし (ブラウザ経由提供) |
| タブレット (tablet) | 対象外 | 理由: native タブレット向け配信基盤なし (ブラウザ経由提供) |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-043 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop 向け Publisher 配布は対象外 (作者環境は macOS + Windows) |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-043 |

## 確定内容 (質疑録)

### qa-068 (対応セル: web)

**質問**: 確定決定 D7 (環境構成: 常設 staging を持たず preview は PR ごとに使い捨て) と qa-064 §13 有効化順 P0 の『production/staging』記述の矛盾をどう解消するか。

**回答**: qa-064 の確定内容 (R2 配布境界・install/download 導線・§13 有効化順 P0-P5 の段階有効化・migration の tenant 分離テスト) を全面維持しつつ、D7 (ephemeral-preview-only) に整合する次の delta のみを確定する。【環境構成の正本】常設環境は production 1 組のみとし、常設 staging 環境は持たない (D7)。qa-064 §13 P0 の『production/staging・Worker/DB migration・…』は『production・Worker/DB migration・…』へ読み替え、PR 単位の動作確認は PR ごとに使い捨てる preview (PR close で破棄・常設リソースを増やさない) で担保する (qa-038【3】と同一方針)。【migration 検証】常設 staging での事前検証の代替として、expand/contract 3 段階の強制と CI の破壊的 DDL 検査 (qa-038) を正本ゲートとし、restore drill は都度一時 DB を作成して実施する (D7 の risks 緩和策)。【secret/リソース管理】常設 secret・binding・R2 prefix は production 1 組のみを台帳管理し、preview 用の一時リソースは PR close 時に破棄されることを検査で担保する。qa-064 のこの delta 以外の確定内容 (P0 のその他項目: tenant/workspace・OIDC callback・Auth secret・共通認可/監査・/health・CI の tenant 分離 test、P1-P5、R2 配布境界) は一切変更しない。

### qa-043 (対応セル: desktop-windows, desktop-macos)

**質問**: 作者デスクトップ環境 (macOS / Windows) の infrastructure (配布・実行基盤・ツールチェーン) は何を正本とするか? (C07 監査指摘への対応: infrastructure.desktop-windows/desktop-macos の qa_ref=qa-003 は Hub web hosting 中心の回答で desktop 固有の裏付けが薄い。既確定内容の集約による専用質疑化であり新規決定は含まない)

**回答**: 既確定の qa-003 / qa-010 / qa-034 / qa-039 / qa-041 の desktop 該当部分を infrastructure.desktop の専用正本として集約確定する。(1) 配布経路 (qa-003): Publisher / Skill の作者環境への配布は URL 型 marketplace (native source) または Bootstrap Installer の 2 経路を Stage 0 technical gate (H7) で検証し、成立した経路を採用する (一般利用者に GitHub アカウントを要求しない = I6)。(2) 実行形態 (qa-010): 専用 desktop GUI は作らず、Publisher core は TypeScript (Node + pnpm) で実装し Claude Code / Codex plugin (slash command /harness-hub:publish + skill + スクリプト) として配布する。target=web_app の出口は作者 local session での wrangler CLI スクリプト実行 (I5。Hub は URL 登録・公開範囲検査・health 確認のみ)。(3) ツールチェーン (qa-039): 作者/提供者環境は macOS 主・Windows 従で、Claude Code + pnpm (corepack 経由・他パッケージマネージャ禁止) + git + wrangler CLI。両 OS で同一の pnpm script が動作すること (パス区切り・改行コード・シェル依存をコマンドへ埋め込まない)。ローカルは preview 用 Turso または local SQLite を binding し production DB を指さない。production への deploy/migration の正本経路は CI (緊急時のみローカル + 事後記録)。(4) 資格情報基盤 (qa-041): Device Flow token は OS 資格情報域 (macOS Keychain / Windows Credential Manager) のみに保存。(5) 環境・binding の詳細正本は docs/infrastructure-spec.md (qa-034)、desktop 側の運用規律は dev-workflow (qa-039) と security (qa-041) の各確定に従属し、本 qa は infrastructure.desktop 行への接地点を提供する。

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
