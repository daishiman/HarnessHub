---
status: confirmed
category: testing-qa
aggregate: 確定
spec_cells: [testing-qa.web, testing-qa.mobile, testing-qa.tablet, testing-qa.desktop-windows, testing-qa.desktop-linux, testing-qa.desktop-macos]
serves_goals: [G1, G2, G5]
---

# テスト戦略・品質保証 (testing-qa)

- カテゴリ集約状態: **確定**
- 章確定マーカー: `status: confirmed`

## カテゴリ別収集状態

| プラットフォーム | 状態 | 根拠 |
|---|---|---|
| Web (web) | 確定 | 確定質疑: qa-133 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリを持たず、モバイル端末を開発者クライアント/テスト実行環境として使わない (dev-workflow の mobile 行と同根拠)。テスト実行は web 行 (CI) と desktop-windows/desktop-macos 行 (作者ローカル) でカバーする |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリを持たず、タブレット端末を開発者クライアント/テスト実行環境として使わない (dev-workflow の tablet 行と同根拠)。テスト実行は web 行と desktop-windows/desktop-macos 行でカバーする |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-095 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop を開発者クライアント環境として使わない (作者環境は macOS + Windows。dev-workflow の desktop-linux 行と同根拠)。GitHub Actions の ubuntu-latest runner 上のテスト実行は CI 実行基盤として web 行の品質ゲート要件でカバーする |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-095 |

## 確定内容 (質疑録)

### qa-133 (対応セル: web)

**質問**: 未認証では deny-by-default の `/catalog` を、通常の session 秘密を GitHub Actions へ渡さずに Core Web Vitals で実測するため、最小権限の認証・セキュリティ・CI・検証契約を web 仕様へどう統合しますか?

**回答**: ユーザーの 2026-08-02 確認『ok』を明示承認として、qa-123〜qa-132 の production OIDC・session・access token・deny-by-default・SLO/CWV・Worker Secret 実投入・本番 smoke・秘密管理・品質ゲートを全面維持し、CWV 専用 credential を追加確定する。

【1. 専用 credential】GitHub Actions と Worker が共有する `CWV_PROBE_SECRET` だけで HS256 の短命 JWT を検証する。claim は `typ=cwv_probe`、`aud=harness-hub-cwv`、正規 origin、固定 tenant/workspace、iat/exp とし、有効期間は最大 5 分である。通常の `AUTH_SESSION_SECRET`、`AUTH_ACCESS_TOKEN_SECRET`、利用者 session、Publisher token を CI/成果物へ渡さず、CWV credential はユーザー主体・OIDC・Device Flow・外部 API の新たな認証方式ではない。

【2. 到達境界】bootstrap は HTTPS の `GET /catalog` だけで、署名・audience・origin・時間・tenant/workspace をすべて検証した後、URL の ticket を除去する 307 redirect と `__Host-harness-hub.cwv-probe` (Secure / HttpOnly / SameSite=Strict / Path=/ / 最大 5 分) を返す。以後は `GET`/`HEAD` の catalog 画面と catalog が使う読み取り API だけを許可する。書込み、install、publish、管理 API、別 tenant/workspace、別 origin、method 違い、欠損/期限切れ/改ざん ticket は deny-by-default で拒否する。scope は ticket の署名済み claim だけを既存認可層へ渡し、query/header の任意値で昇格しない。

【3. 秘密と露出】ticket は redirect 後 URL、HTTP リファラ、Lighthouse JSON、CWV report、Actions ログ、artifact のいずれにも残さない。bootstrap 応答は `Cache-Control: no-store` と `Referrer-Policy: no-referrer` を付け、workflow は ticket を mask し、artifact を upload 前に secret/ticket を除去・検査する。secret の値は source、wrangler 設定、文書、テスト fixture に保存しない。`CWV_PROBE_SECRET` の rotate は既存 ticket を即時無効化する。

【4. 構成と運用】Worker Secret は `CWV_PROBE_SECRET`、`CWV_PROBE_TENANT_ID`、`CWV_PROBE_WORKSPACE_ID`、GitHub Actions secret は対応する `HUB_CWV_PROBE_*` とする。自由入力の target URL は廃止し、`HUB_PUBLIC_URL` の同一 HTTPS origin の `/catalog` だけを対象にする。secret 投入・read-only 代表 tenant/workspace 選定・本番 deploy・最初の実 Lighthouse は外部状態を変える follow-up であり、投入前/失敗時は未計測として fail-closed で可視化し、good と数えない。

【5. 検証】JWT mint/verify、期限・audience・origin・scope・method・tenant/workspace の負例、cookie/bootstrap の URL 除去・属性、認可規則の read-only 境界、workflow target/secret/artifact sanitizer、wrangler secret 台帳、対象 Vitest、task/system-spec/dev-graph/doc gate を repository 内で検証する。実環境の secret 権限と Lighthouse 成功は静的検証で代替せず、Beads を外部実測完了まで open に保つ。

### qa-095 (対応セル: desktop-windows, desktop-macos)

**質問**: 作者のローカル desktop 環境で skill 構造 lint を実行するとき、pytest などが生成した隠し cache を人が設計した skill tree と誤認せず、同じ品質基準を Windows と macOS で再現するには何を必須としますか?

**回答**: ユーザーの 2026-07-29 最終レビュー・仕様反映指示を明示承認として、qa-078 と qa-081 の既存契約を全面維持し、skill 構造 lint の生成物境界を追補する。

【1. テスト戦略】タスク仕様書は単体・結合・境界値・既存回帰の各テストを変更内容から選び、focused test と実際の実行順序を再現する広域回帰の両方を記録する。失敗時は原因分析、修正、同一コマンド再実行の改善ループを回す。

【2. 層別方針】frontend は behavior ベースの component / 操作フロー、backend は API 契約 / ロジック単体 / DB 結合、infrastructure と repository tooling は静的契約 / 実行順序 / fail-closed 境界を検証する。pixel・DOM 内部構造・一時生成物の物理配置など、本来の設計契約ではない実装詳細へ品質判定を密結合させない。

【3. skill tree の生成物境界】skill 構造 lint は人が管理する SKILL.md、許可 directory、命名、深さを検査する。一方、pytest・mypy 等の test tool が skill 配下へ作る dot で始まる directory とその配下、Python の __pycache__ / .pyc は生成物として構造判定から除外する。許可 directory 集合に dot directory は含めず、個別 cache 名の列挙ではなく同じ性質を持つ生成物へ一般化する。

【4. 複製と回帰】repository root の scripts/lint-skill-tree.py と配布 plugin 内の実装は同一バイト列を維持する。回帰テストは .pytest_cache だけでなく .mypy_cache と任意の dot cache を含め、通常の nested directory 違反は引き続き検出する。per-plugin pytest の直後に repository criteria test を実行しても結果が変わらないことを確認する。

【5. platform と製品境界】同じ Python 実装と同じ pytest コマンドを desktop-windows / desktop-macos で利用する。変更は repository 内の開発品質ゲートに限定し、Harness Hub 製品の外部 API、DB schema、認証認可、UI、Cloudflare deploy unit は変更しない。

## 上流指針 (doctrine anchor)

- 本カテゴリは共通シード (categories) 外のプロジェクト固有カテゴリで、approved な pending 例外 (owner: daishiman) として上流指針を確定している。

| concern | authority (正本) | 導く上流原則 | 出典 |
|---|---|---|---|
| reliability | Google SRE | SLO/エラーバジェット・冗長性・スケーリング・監視の上流指針 | https://sre.google/books/ |
| operations | Google SRE | 運用手順・障害対応・トイル削減・ポストモーテムの上流指針 | https://sre.google/workbook/ |

- 本章の確定内容 (質疑録) は上記 authority を上流指針として適用する。具体技術の選定はこの指針に従属し、指針との乖離は再オープン (R4-reopen) の根拠になる。

## 適用された設計知識

- `ref-system-design-knowledge/references/resource-map.yaml` (このカテゴリ専用の deep card は resource-map に未定義。本章の設計判断は「上流指針 (doctrine anchor)」節の authority と「確定内容 (質疑録)」を正本とする)

## 最新ドキュメント出典

| 対象 | バージョン | 公式発行元 | 出典URL | 取得 | 最新確認 |
|---|---|---|---|---|---|
| vitest | 4.1.10 | VoidZero / Vitest team (vitest.dev) | https://vitest.dev/blog/vitest-4-1.html | 2026-07-24T11:48:06Z | 2026-07-24T11:48:06Z |
| playwright | 1.61.1 | Microsoft (playwright.dev) | https://playwright.dev/docs/release-notes | 2026-07-24T11:48:06Z | 2026-07-24T11:48:06Z |
| testing-library | @testing-library/react 16.3.2 | Testing Library (OSS) (testing-library.com) | https://testing-library.com/docs/react-testing-library/intro/ | 2026-07-24T11:48:06Z | 2026-07-24T11:48:06Z |
