---
status: confirmed
category: infrastructure
aggregate: 確定
spec_cells: [infrastructure.web, infrastructure.mobile, infrastructure.tablet, infrastructure.desktop-windows, infrastructure.desktop-linux, infrastructure.desktop-macos]
serves_goals: [G1, G2, G4, G5]
---

# インフラ (infrastructure)

- カテゴリ集約状態: **確定**
- 章確定マーカー: `status: confirmed`

## カテゴリ別収集状態

| プラットフォーム | 状態 | 根拠 |
|---|---|---|
| Web (web) | 確定 | 確定質疑: qa-133 |
| モバイル (mobile) | 対象外 | 理由: native モバイル向け配信基盤なし (ブラウザ経由提供) |
| タブレット (tablet) | 対象外 | 理由: native タブレット向け配信基盤なし (ブラウザ経由提供) |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-043 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop 向け Publisher 配布は対象外 (作者環境は macOS + Windows) |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-043 |

## 確定内容 (質疑録)

### qa-133 (対応セル: web)

**質問**: 未認証では deny-by-default の `/catalog` を、通常の session 秘密を GitHub Actions へ渡さずに Core Web Vitals で実測するため、最小権限の認証・セキュリティ・CI・検証契約を web 仕様へどう統合しますか?

**回答**: ユーザーの 2026-08-02 確認『ok』を明示承認として、qa-123〜qa-132 の production OIDC・session・access token・deny-by-default・SLO/CWV・Worker Secret 実投入・本番 smoke・秘密管理・品質ゲートを全面維持し、CWV 専用 credential を追加確定する。

【1. 専用 credential】GitHub Actions と Worker が共有する `CWV_PROBE_SECRET` だけで HS256 の短命 JWT を検証する。claim は `typ=cwv_probe`、`aud=harness-hub-cwv`、正規 origin、固定 tenant/workspace、iat/exp とし、有効期間は最大 5 分である。通常の `AUTH_SESSION_SECRET`、`AUTH_ACCESS_TOKEN_SECRET`、利用者 session、Publisher token を CI/成果物へ渡さず、CWV credential はユーザー主体・OIDC・Device Flow・外部 API の新たな認証方式ではない。

【2. 到達境界】bootstrap は HTTPS の `GET /catalog` だけで、署名・audience・origin・時間・tenant/workspace をすべて検証した後、URL の ticket を除去する 307 redirect と `__Host-harness-hub.cwv-probe` (Secure / HttpOnly / SameSite=Strict / Path=/ / 最大 5 分) を返す。以後は `GET`/`HEAD` の catalog 画面と catalog が使う読み取り API だけを許可する。書込み、install、publish、管理 API、別 tenant/workspace、別 origin、method 違い、欠損/期限切れ/改ざん ticket は deny-by-default で拒否する。scope は ticket の署名済み claim だけを既存認可層へ渡し、query/header の任意値で昇格しない。

【3. 秘密と露出】ticket は redirect 後 URL、HTTP リファラ、Lighthouse JSON、CWV report、Actions ログ、artifact のいずれにも残さない。bootstrap 応答は `Cache-Control: no-store` と `Referrer-Policy: no-referrer` を付け、workflow は ticket を mask し、artifact を upload 前に secret/ticket を除去・検査する。secret の値は source、wrangler 設定、文書、テスト fixture に保存しない。`CWV_PROBE_SECRET` の rotate は既存 ticket を即時無効化する。

【4. 構成と運用】Worker Secret は `CWV_PROBE_SECRET`、`CWV_PROBE_TENANT_ID`、`CWV_PROBE_WORKSPACE_ID`、GitHub Actions secret は対応する `HUB_CWV_PROBE_*` とする。自由入力の target URL は廃止し、`HUB_PUBLIC_URL` の同一 HTTPS origin の `/catalog` だけを対象にする。secret 投入・read-only 代表 tenant/workspace 選定・本番 deploy・最初の実 Lighthouse は外部状態を変える follow-up であり、投入前/失敗時は未計測として fail-closed で可視化し、good と数えない。

【5. 検証】JWT mint/verify、期限・audience・origin・scope・method・tenant/workspace の負例、cookie/bootstrap の URL 除去・属性、認可規則の read-only 境界、workflow target/secret/artifact sanitizer、wrangler secret 台帳、対象 Vitest、task/system-spec/dev-graph/doc gate を repository 内で検証する。実環境の secret 権限と Lighthouse 成功は静的検証で代替せず、Beads を外部実測完了まで open に保つ。

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
