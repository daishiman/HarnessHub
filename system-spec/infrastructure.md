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
| Web (web) | 確定 | 確定質疑: qa-121 |
| モバイル (mobile) | 対象外 | 理由: native モバイル向け配信基盤なし (ブラウザ経由提供) |
| タブレット (tablet) | 対象外 | 理由: native タブレット向け配信基盤なし (ブラウザ経由提供) |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-043 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop 向け Publisher 配布は対象外 (作者環境は macOS + Windows) |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-043 |

## 確定内容 (質疑録)

### qa-121 (対応セル: web)

**質問**: 既存の Cloudflare 配備・SLO・認証契約を維持したまま、Worker Secret の実投入漏れをデプロイ前に止め、ヒアリング機能の本番受入を毎回再現可能にするには何を必須としますか?

**回答**: ユーザーの 2026-08-02 指示『今回変更しているすべてのタスクの最終レビュー、task 仕様書の品質ゲート再実行、仕様・設計影響の system-spec/・specs/・architecture/ への正規反映と受領書、docs/・features/・system-spec/・architecture/・tasks/ の更新、main 統合後の commit・push・draft PR、Beads 更新』を明示承認として、qa-019 / qa-034 / qa-038 / qa-106 / qa-113 / qa-116 の既存インフラ契約を全面維持し、HarnessHub-o2i.13 の本番配備契約を次のとおり追補する。

【1. Secret の三方向突合】Worker が読む帯域外設定（wrangler deploy が設定ファイルから押し込まない Workers Secret）は、機械可読台帳、apps/hub/wrangler.jsonc の secrets.required 宣言、本番 Worker の実投入名を三方向で突合する。値は台帳・ログ・成果物へ保存せず、名前・requirement・用途・欠落時影響・投入手順だけを管理する。requirement は required / optional / planned / legacy とし、required 集合だけを secrets.required と 1:1 にする。

【2. 実行順と停止境界】静的突合は PR の static-gates と pnpm verify から必ず到達させ、実投入突合は Cloudflare 認証を持つ deploy job で必須設定 preflight の直後、migration より前に実行する。認証不足、通信不能、解釈不能、required 未投入、未記載 secret のいずれも未検査を合格へ読み替えず fail-closed にする。この失敗では DB も Worker も前進せず、旧版が動き続ける。

【3. Post-deploy hearing smoke】既存の migration → deploy → health → OIDC start-flow → DB/R2 smoke の末尾へ hearing 実データ E2E / SEC8 smoke を追加し、その失敗を既存 rollback 判定へ含める。新しい secret は要求せず TURSO_DATABASE_URL / TURSO_AUTH_TOKEN / HUB_PUBLIC_URL だけを使う。Device Flow の code / token は本番 HTTP endpoint を通し、session が必要な approve だけを DB の CAS で代行して本番 Worker が署名した access token を得る。

【4. 本番データの後始末】使い捨て tenant fixture は生成全体を 1 transaction にし、途中失敗時に部分行を残さない。生成後は finally で tenant 従属行を子から 1 transaction で削除し、全対象表の残行数 0 を確認できなければ smoke を失敗させる。

【5. 既存境界】本追補は deploy pipeline、帯域外 secret の運用検査、本番受入の観測手段を具体化する。外部 API の要求・応答、DB schema、認証認可規則、UI、Cloudflare Worker の deploy unit、既存 SLO 値は変更しない。

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
