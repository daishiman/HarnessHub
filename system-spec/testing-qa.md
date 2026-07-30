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
| Web (web) | 確定 | 確定質疑: qa-076 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリを持たず、モバイル端末を開発者クライアント/テスト実行環境として使わない (dev-workflow の mobile 行と同根拠)。テスト実行は web 行 (CI) と desktop-windows/desktop-macos 行 (作者ローカル) でカバーする |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリを持たず、タブレット端末を開発者クライアント/テスト実行環境として使わない (dev-workflow の tablet 行と同根拠)。テスト実行は web 行と desktop-windows/desktop-macos 行でカバーする |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-095 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop を開発者クライアント環境として使わない (作者環境は macOS + Windows。dev-workflow の desktop-linux 行と同根拠)。GitHub Actions の ubuntu-latest runner 上のテスト実行は CI 実行基盤として web 行の品質ゲート要件でカバーする |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-095 |

## 確定内容 (質疑録)

### qa-076 (対応セル: web)

**質問**: タスク仕様書が担保すべきテストレベルの網羅方針は何ですか? 単体テストだけで十分ですか?

**回答**: 単体テストだけでは不十分。タスク仕様書は、想定できるテストレベルを網羅する: (1) 単体テスト (関数・コンポーネント単位)、(2) 結合テスト (モジュール間・API 連携)、(3) 境界値テスト (入力境界・異常系)、(4) 既存回帰テスト (変更が既存機能を壊していないこと)。各タスク仕様書はテスト戦略セクションを必須で持ち、対象変更に対しどのレベルのテストを追加・実行するかを明記する。この機能がエラーなく使えるかの検証を目的とし、テスト種別の選定はタスクの変更内容から導出する

### qa-095 (対応セル: desktop-windows, desktop-macos)

**質問**: 作者のローカル desktop 環境で skill 構造 lint を実行するとき、pytest などが生成した隠し cache を人が設計した skill tree と誤認せず、同じ品質基準を Windows と macOS で再現するには何を必須としますか?

**回答**: ユーザーの 2026-07-29 最終レビュー・仕様反映指示を明示承認として、qa-078 と qa-081 の既存契約を全面維持し、skill 構造 lint の生成物境界を追補する。

【1. テスト戦略】タスク仕様書は単体・結合・境界値・既存回帰の各テストを変更内容から選び、focused test と実際の実行順序を再現する広域回帰の両方を記録する。失敗時は原因分析、修正、同一コマンド再実行の改善ループを回す。

【2. 層別方針】frontend は behavior ベースの component / 操作フロー、backend は API 契約 / ロジック単体 / DB 結合、infrastructure と repository tooling は静的契約 / 実行順序 / fail-closed 境界を検証する。pixel・DOM 内部構造・一時生成物の物理配置など、本来の設計契約ではない実装詳細へ品質判定を密結合させない。

【3. skill tree の生成物境界】skill 構造 lint は人が管理する SKILL.md、許可 directory、命名、深さを検査する。一方、pytest・mypy 等の test tool が skill 配下へ作る dot で始まる directory とその配下、Python の __pycache__ / .pyc は生成物として構造判定から除外する。許可 directory 集合に dot directory は含めず、個別 cache 名の列挙ではなく同じ性質を持つ生成物へ一般化する。

【4. 複製と回帰】repository root の scripts/lint-skill-tree.py と配布 plugin 内の実装は同一バイト列を維持する。回帰テストは .pytest_cache だけでなく .mypy_cache と任意の dot cache を含め、通常の nested directory 違反は引き続き検出する。per-plugin pytest の直後に repository criteria test を実行しても結果が変わらないことを確認する。

【5. platform と製品境界】同じ Python 実装と同じ pytest コマンドを desktop-windows / desktop-macos で利用する。変更は repository 内の開発品質ゲートに限定し、Harness Hub 製品の外部 API、DB schema、認証認可、UI、Cloudflare deploy unit は変更しない。

## 実装フィードバック (2026-07-30 / HarnessHub-ory6)

qa-076 / qa-081 の「境界値・異常系を task spec と機械ゲートで再現可能にする」
確定要件を、repository 内 validator の ID 一意性へ具体化した。入力要素を
`set` / `dict`（集合・辞書）へ変換する validator は、変換前に同一 ID の
重複を検査し、重複した別要素が 1 件へ畳み込まれる偽陽性を許可しない。

- task graph は task node ID と component ID を別々に検査する。
- consult transcript は user solution の provenance（根拠となる発話）を
  照合する前に turn ID の重複を検査する。
- route build handoff は route/complete の両モードで route ID の重複を
  検査する。
- 各経路は正常な入力を exit 0 のまま維持し、重複 ID の負例 fixture では
  CLI を非 0 終了させる。検査件数 0 を合格根拠にせず、違反を実際に投入して
  gate の反転を確認する。

この追記は既存 QA の実装フィードバックであり、確定回答、製品 API、DB schema、
認証認可、UI、Cloudflare deploy unit は変更しない。内部 validation contract
（検証契約＝不正な入力をどこで拒否するか）の設計影響だけを反映する。

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
