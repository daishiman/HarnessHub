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
| Web (web) | 確定 | 確定質疑: qa-034 |
| モバイル (mobile) | 対象外 | 理由: native モバイル向け配信基盤なし (ブラウザ経由提供) |
| タブレット (tablet) | 対象外 | 理由: native タブレット向け配信基盤なし (ブラウザ経由提供) |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-043 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop 向け Publisher 配布は対象外 (作者環境は macOS + Windows) |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-043 |

## 確定内容 (質疑録)

### qa-034 (対応セル: web)

**質問**: mockup 実装のための infrastructure 詳細仕様 (リソース構成・binding・cron・CI/CD・環境・監視・バックアップ) をどう確定するか? 未確定 4 論点: (1) 環境構成 = production+staging vs production のみ、(2) 独自ドメイン = 既存保有ドメイン流用 vs 新規取得 (~US$10/年) vs workers.dev+メール後ろ倒し、(3) 外形監視 = Better Stack Free vs UptimeRobot Free (2024-12 以降 free は非商用限定) vs GitHub Actions 自前 ping、(4) 本番デプロイ = main merge 全自動 vs 手動承認 gate。AI 推奨 = (1) production+staging (2) 既存流用 (3) Better Stack Free (4) 全自動。(AskUserQuestion 2026-07-17)

**回答**: qa-026 の確定内容を実装可能粒度へ展開した詳細正本 docs/infrastructure-spec.md を確定する (リソーストポロジ・wrangler binding/secret 台帳・R2 バケット/lifecycle・Turso 構成と使用量監視・cron 3 系統・環境構成・CI/CD 3 workflow・ドメイン/DNS/メール・監視/SLO 運用・バックアップ/DR/縮退マトリクス・無料枠予算表)。ユーザーが AskUserQuestion (2026-07-17) で 4 論点を確定: (1) production + staging の 2 環境 (推奨同意: Turso Free 100 DB 内で費用 0 円のまま migration 検証と restore drill の受け皿を持つ)、(2) 既存保有ドメインを流用 (推奨同意: hub.<domain> + mail.<domain> のサブドメイン運用で追加費用 0 円・C2 完全維持。Resend SPF/DKIM は qa-026 どおり初期構築)、(3) 外形監視は Better Stack Free (推奨同意: 10 monitors・3 分間隔・heartbeat・status page・商用利用可。UptimeRobot Free は 2024-12 以降非商用限定のため棄却 = Vercel Hobby と同型の規約リスク回避。heartbeat は qa-027 の cron 失敗監視に接続)、(4) 本番デプロイは main merge 全自動 (推奨同意: CI green → staging migrate+deploy → smoke → production → post-deploy /health → 失敗時 wrangler rollback)。既確定仕様 (D1-D6・qa-003/011/019/026/027/031-033) との矛盾なし。qa-026 の確定内容は全面維持し、本 qa は詳細化のみを追加する。

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
