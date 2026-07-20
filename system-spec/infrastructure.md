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
| Web (web) | 確定 | 確定質疑: qa-064 |
| モバイル (mobile) | 対象外 | 理由: native モバイル向け配信基盤なし (ブラウザ経由提供) |
| タブレット (tablet) | 対象外 | 理由: native タブレット向け配信基盤なし (ブラウザ経由提供) |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-043 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop 向け Publisher 配布は対象外 (作者環境は macOS + Windows) |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-043 |

## 確定内容 (質疑録)

### qa-064 (対応セル: web)

**質問**: docs/infrastructure-spec.md の 2026-07-18 追記 (R2 配布境界・§13 構築優先順位によるインフラ有効化順) をインフラ仕様へ反映するか。 (訂正再登録: qa-057 の回答に系譜継続句が欠けていたため、同一 delta を継続句付きで qa-064 として登録し直す)

**回答**: qa-034 の確定内容 (Cloudflare Workers + Turso + R2 のインフラ確定・意思決定 4 論点) を全面維持しつつ、次の delta を確定する。R2 配布境界: S01 の Web upload と Publisher CLI upload は同じ staging prefix・検査 pipeline・content hash 確定処理へ収束させ、ブラウザから R2 への公開 write URL は発行しない。install/download は Worker の POST /api/v1/harnesses/:projectId/install を必ず経由し R2 bucket/object key を UI/API へ返さない。Stage 0 で raw ZIP を採用した場合だけ安定版に固定した TTL 5 分以内・単回の短命 URL を発行。§13 有効化順 (P0-P5): 共通リソース先行と低優先機能先行を混同せず、単一 Worker/Turso/R2 は共有しつつ route・cron・通知を必要 phase で段階有効化 — P0: production/staging・Worker/DB migration・tenant/workspace・OIDC callback・Auth secret・共通認可/監査・/health・CI の tenant 分離 test (metrics rollup/週次サマリー/dashboard monitor は不要)。P1: HearingSheet/AiJob/notification migration・pull job・生成完了通知・キュー滞留監視。P2: private R2 package bucket・Web/CLI upload・検査・content-addressed 保存・install/download Worker 導線・orphan 通知 (承認 queue UI は P5 でも監査記録はこの時点から有効)。P3: feedback/doc AiJob kind・Feedback→修正版 Build 冪等作成・必要時の R2 prefix。P4: salary 鍵・metrics ingest/rollup cron・Turso 使用量監視・週次通知。P5: dashboard/承認/監査 UI 用 route と外形確認。各 phase の migration は tenant_id と必要な workspace_id を最初から必須にし、production 反映前に 2 tenant fixture の分離テストを通す。1 tenant/1 Project 固定の環境変数は作らない。

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
