---
status: confirmed
category: testing-qa
aggregate: 確定
spec_cells: [testing-qa.web, testing-qa.mobile, testing-qa.tablet, testing-qa.desktop-windows, testing-qa.desktop-linux, testing-qa.desktop-macos]
serves_goals: [G1, G4, G5]
---

# テスト戦略・品質保証 (testing-qa)

- カテゴリ集約状態: **確定**
- 章確定マーカー: `status: confirmed`

## カテゴリ別収集状態

| プラットフォーム | 状態 | 根拠 |
|---|---|---|
| Web (web) | 確定 | 確定質疑: qa-205 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリを持たず、モバイル端末を開発者クライアント/テスト実行環境として使わない (dev-workflow の mobile 行と同根拠)。テスト実行は web 行 (CI) と desktop-windows/desktop-macos 行 (作者ローカル) でカバーする |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリを持たず、タブレット端末を開発者クライアント/テスト実行環境として使わない (dev-workflow の tablet 行と同根拠)。テスト実行は web 行と desktop-windows/desktop-macos 行でカバーする |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-095 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop を開発者クライアント環境として使わない (作者環境は macOS + Windows。dev-workflow の desktop-linux 行と同根拠)。GitHub Actions の ubuntu-latest runner 上のテスト実行は CI 実行基盤として web 行の品質ゲート要件でカバーする |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-095 |

## 確定内容 (質疑録)

### qa-205 (対応セル: web)

**質問**: 既存 testing-qa/web 正本 qa-204 と、それ以前の確定契約を維持したまま、post-signin scope・Feedback Loop・Docs CMS の本番未計測領域を毎デプロイ検査する契約をどう確定するか。

**回答**: ユーザーの 2026-08-08 最終レビュー・仕様反映指示を明示承認として、既存の test pyramid、production rollout、credential 最小権限、rollback 契約を全面維持し、次の production coverage smoke 契約を追加確定する。

【1. 実行順序】Worker deploy、health、配信版 identity / freshness、OIDC・既存 data・hearing smoke の後に coverage smoke を毎デプロイ実行する。coverage smoke の失敗は既存 smoke と同じ rollback 判断へ入力し、deploy freshness または配信版再確認だけで停止した場合は未実行 smoke を失敗と誤認して rollback しない。

【2. scope 判定】S1-S8 として unauthenticated、missing_tenant_scope、ambiguous_scope、tenant mismatch の存在秘匿 404、workspace 非所属、Bearer credential 不許可、scope 不足、provider-admin 越境の edge 実挙動を検査する。サインインページ O5 は外部 returnTo が callbackUrl・href・action・content の遷移位置へ入らず、安全な既定 /sheets へ落ちることを SSR 応答で検査する。

【3. Feedback / Docs】Feedback は create、service read、AI pull、complete writeback、status 遷移を同じ使い捨て tenant で往復し、Docs は document 作成、doc_draft enqueue、pull、complete writeback、別 tenant 非可視、Bearer read 拒否を往復する。session-only action は新しい Google OIDC secret を追加せず route と同じ server code と production DB adapter で実行し、HTTP 側では Bearer credential の拒否を実測する。token 経路は本番 Device Flow の access token を使う。

【4. 隔離と後始末】2 個の使い捨て tenant を作り、成功・失敗にかかわらず feedbacks、documents、builds を含む関連行を削除して残数 0 を確認する。secret 値、token、本文をログへ出さない。

【5. 未確定境界】provider-admin 越境は edge 404・監査行 0 と route 層契約が不一致なため、本 smoke は現行挙動を診断として固定し、設計統一を別 Beads 課題 HarnessHub-stmx で追跡する。smoke:publish-production は新規 PUBLISH_ACCESS_TOKEN と権限台帳更新が必要なため本変更では CI 結線せず、追跡課題を完了するまで手動 runner のままとする。実 production deploy の実走証拠が無い限り、関連 P13 task を完了扱いにしない。

【6. 製品境界】外部 API、DB schema、認証認可の製品判断、UI、Cloudflare deploy unit は変更しない。変更は既存契約を本番で観測する品質ゲート、使い捨て試験データの cleanup、CI rollback 判断への証拠追加に限定する。

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
| vitest | 4.1.10 | VoidZero / Vitest team (vitest.dev) | https://vitest.dev/blog/vitest-4-1.html | 2026-08-07T03:26:46Z | 2026-08-07T03:26:46Z |
| playwright | 1.62.1 | Microsoft (playwright.dev) | https://playwright.dev/docs/release-notes | 2026-08-07T03:26:57Z | 2026-08-07T03:26:57Z |
| testing-library | @testing-library/react 16.3.2 | Testing Library (OSS) (testing-library.com) | https://testing-library.com/docs/react-testing-library/intro/ | 2026-08-07T03:27:06Z | 2026-08-07T03:27:06Z |
