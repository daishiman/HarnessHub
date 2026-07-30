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
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-081 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop を開発者クライアント環境として使わない (作者環境は macOS + Windows。dev-workflow の desktop-linux 行と同根拠)。GitHub Actions の ubuntu-latest runner 上のテスト実行は CI 実行基盤として web 行の品質ゲート要件でカバーする |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-078 |

## 確定内容 (質疑録)

### qa-076 (対応セル: web)

**質問**: タスク仕様書が担保すべきテストレベルの網羅方針は何ですか? 単体テストだけで十分ですか?

**回答**: 単体テストだけでは不十分。タスク仕様書は、想定できるテストレベルを網羅する: (1) 単体テスト (関数・コンポーネント単位)、(2) 結合テスト (モジュール間・API 連携)、(3) 境界値テスト (入力境界・異常系)、(4) 既存回帰テスト (変更が既存機能を壊していないこと)。各タスク仕様書はテスト戦略セクションを必須で持ち、対象変更に対しどのレベルのテストを追加・実行するかを明記する。この機能がエラーなく使えるかの検証を目的とし、テスト種別の選定はタスクの変更内容から導出する

### qa-081 (対応セル: desktop-windows)

**質問**: テスト戦略をタスク仕様書へ組み込み、何度実行しても同じ品質基準で再現する仕組みはどう実装しますか? (qa-079 の確定内容の章反映)

**回答**: qa-079 で確定したとおり、タスク仕様書の生成時にテスト戦略セクション (テストレベル選定・カバレッジ目標・層別方針・保守性制約) をテンプレート必須項目として組み込み、何度実行しても同じ品質基準のタスク仕様書が生成される冪等な仕組みとする。手作業の書き足しに依存せず、仕様生成パイプライン (system-dev-planner の task spec 必須 section 契約) 側で機械検証し、テスト戦略の欠落した仕様書を fail-closed で拒否する。カバレッジ基準は qa-077 で確定した 80% 以上の品質ゲートと失敗時の改善ループ (失敗分析→修正→再実行) を維持し、テストレベルの範囲は qa-076 で確定した 4 レベル網羅 (単体・結合・境界値・回帰) を前提とする。UI コンポーネント層の実装ツールは D8 (意思決定) で @testing-library/react + Vitest を正式採用した

### qa-078 (対応セル: desktop-macos)

**質問**: フロントエンド・バックエンド・インフラの各層で、どのようなテスト種別と保守性方針を適用しますか?

**回答**: 層別に適用する: フロントエンドは component 単体 + ユーザー操作フローの結合テストとし、ボタン配置などの見た目の微調整で壊れない behavior ベース (accessible role / ラベルでの要素選択) を必須とする。pixel 位置や DOM 構造への依存は禁止し、UI 微修正がテストエラーにならない管理しやすい設計に限定する。バックエンドは API 契約テスト + ビジネスロジック単体 + DB 結合テスト。インフラは IaC/設定の静的検証 + デプロイ後の smoke テスト。どこまで管理するかの線引きは各層のテスト設計方針として仕様に明文化し、過剰なテスト (実装詳細への密結合) を作らない

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
