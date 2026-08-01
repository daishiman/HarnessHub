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
| Web (web) | 確定 | 確定質疑: qa-110 |
| モバイル (mobile) | 対象外 | 理由: native モバイル向け配信基盤なし (ブラウザ経由提供) |
| タブレット (tablet) | 対象外 | 理由: native タブレット向け配信基盤なし (ブラウザ経由提供) |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-043 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop 向け Publisher 配布は対象外 (作者環境は macOS + Windows) |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-043 |

## 確定内容 (質疑録)

### qa-110 (対応セル: web)

**質問**: qa-019 / qa-106 の SLO 契約を維持しながら、Better Stack の公開実測から観測進捗とエラーバジェットを再現可能かつ誤判定なく確定するには何を必須としますか?

**回答**: ユーザーの 2026-08-01 最終レビュー・仕様反映指示を明示承認として、qa-019 / qa-106 の既存インフラ契約を全面維持し、HarnessHub-37h.15 の SLO 観測契約を次のとおり追補する。

【1. 実測の正本】Better Stack へ投入した設定や external_id の存在だけで監視稼働を宣言しない。認証不要の公開 status page /index.json から、status page resource の external_id を主鍵に status / availability / status_history を取得し、apps/hub/monitoring/slo-dashboard.json の verdict と突合する。公開実測を取得できない場合は判定不能として fail-closed にする。

【2. 観測窓】UTC 日単位で完了した日だけを対象とし、進行中の当日と not_monitored（無データ）の日を分母から除外する。observed_days が minimum_observation_days_for_final_verdict=30 に満たない間は collecting とし、外形単独の目標達成判定 external_only_target_met は null に保つ。未観測時間を無停止時間へ読み替えない。

【3. 判定境界】30 日到達後も外形監視だけで 99.5% 達成を主張せず、verdict を observation_complete_pending_application_error_rate、blocker を workers-analytics-5xx-rate-not-collected とする。最終判定には Better Stack downtime と Workers analytics 5xx 率の両方が必要で、70% 警告／100% 変更凍結の既存エラーバジェット方針を維持する。

【4. 再実行と証跡】verify-slo-observation.mjs は一致=exit 0、不一致=exit 1、取得／入力不能=exit 2 とする。--write は dashboard の verdict を実測へ収束させ、--json 併用時は更新後に再突合した consistent=true の証跡だけを保存する。出力先欠落など不完全な CLI 引数を成功扱いにしない。

【5. 秘密と範囲】検証器は公開 URL だけを読み、Better Stack API token と heartbeat URL を読み込まず証跡にも保存しない。本変更は SLO の観測・証跡・運用判定を具体化するもので、外部 API、DB schema、認証認可、UI、Cloudflare deploy unit、既存 99.5% 目標値は変更しない。

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

## P13 CI 再実行の実装反映 (2026-08-01 / `HarnessHub-o2i.13`)

- qa-034 / qa-038 / qa-106 の「production deploy は GitHub Actions が正本」を維持する。
- 通常は main merge の push で自動配備する。path filter 対象外の docs-only merge で run が発火しない場合だけ、
  main の `workflow_dispatch` から同じ `static-gates → test → deploy → post-deploy smoke` を再実行できる。
- dispatch は手動 Wrangler 操作でも承認 gate でもない。main 以外では deploy せず、全ゲート・secret 境界・
  migration・rollback 契約を短絡しない。
- 製品 API、DB schema、認証認可、UI、Worker deploy unit は変更しない。詳細と実測は
  `docs/infrastructure-spec.md` §7 と P13 仕様反映受領書を正とする。
