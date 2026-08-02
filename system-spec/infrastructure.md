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
| Web (web) | 確定 | 確定質疑: qa-123 |
| モバイル (mobile) | 対象外 | 理由: native モバイル向け配信基盤なし (ブラウザ経由提供) |
| タブレット (tablet) | 対象外 | 理由: native タブレット向け配信基盤なし (ブラウザ経由提供) |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-043 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop 向け Publisher 配布は対象外 (作者環境は macOS + Windows) |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-043 |

## 確定内容 (質疑録)

### qa-123 (対応セル: web)

**質問**: qa-019 / qa-116 の SLO 99.5% と公開実測契約を維持しながら、feat-hub-foundation と関連 Beads をどの完了境界で閉じ、未完了の観測リスクをどう残しますか?

**回答**: ユーザーの 2026-08-02 最終レビュー・仕様反映・Beads 更新指示、および同日 Beads に記録済みの『HarnessHub-37h.14 / HarnessHub-37h.15 は追加対応不要』という明示判断を承認根拠として、qa-019 / qa-116 の SLO 99.5%・公開実測・エラーバジェット契約を全面維持し、delivery closure と operational verdict を次のとおり分離する。

【1. 運用品質契約の維持】Better Stack 公開 status page の実測、完了 UTC 日だけを数える 30 日観測窓、Workers Analytics 5xx 率との複合判定、70% 警告／100% 変更凍結を変更しない。観測 6 日 / 30 日で collecting、外形単独判定 null、Workers 5xx 率未取得という 2026-08-01 時点の証跡を保持し、99.5% 達成を主張しない。

【2. feature の完了境界】feat-hub-foundation は exact-13 の P01〜P13、CI test→deploy、本番 /health、bundle 予算、共通層、release / runbook 証跡の完了を delivery closure とする。SLO 30 日観測と旧 token revoke 確認は独立した運用 follow-up であり、ユーザーが HarnessHub-37h.14 / HarnessHub-37h.15 を追加対応不要として completion_evidence.status=not_applicable で閉じたため、feat-hub-foundation と後続 feature を block しない。HarnessHub-37h.13 は P13 デプロイ責務の完了として閉じる。

【3. waiver の意味】not_applicable は PASS や目標達成ではなく、今回の delivery closure に対する追跡免除である。将来、観測判定や token revoke 確認を再開する場合は既存 issue を reopen するか新 issue を起票し、qa-116 の CLI / runbook / 生データ契約で再検証する。

【4. domain model の独立完了】feat-domain-model-db / HarnessHub-u6q は、SQLite 方言互換 schema、Release immutable 強制、content-addressed R2 registry、export / restore 証跡という固有受入の完了を根拠に閉じる。Hub 基盤の waived follow-up を domain model の未完了へ読み替えない。

【5. 非影響範囲】外部 API、DB schema、認証認可、UI、Cloudflare Worker deploy unit、SLO 目標値、計測式、秘密管理境界は変更しない。本反映は lifecycle と acceptance governance の変更に限定する。

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
