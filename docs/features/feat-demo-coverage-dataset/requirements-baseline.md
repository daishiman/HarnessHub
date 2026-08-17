---
title: 確認用データセット要件ベースライン
feature_id: feat-demo-coverage-dataset
graph_node_id: SYS-DEMO-COVERAGE-DATASET-P01
status: confirmed
layer: feature-requirements
updated_at: "2026-08-15"
source_of_truth:
  goal_spec: .dev-graph/plans/generations/feature-package-feat-demo-coverage-dataset/a43737a6/goal-spec.json
  task_spec: .dev-graph/plans/generations/feature-package-feat-demo-coverage-dataset/a43737a6/task-specs/phase-01-requirements.md
  screen_inventory: docs/screen-inventory.md
---

# 確認用データセット要件ベースライン

本書は feature `feat-demo-coverage-dataset` の要件ベースラインである。以降の P02〜P13 は本書を唯一の要件正本として参照し、本書に無い要件を独自に追加しない。要件の変更は本書の改訂を経由する。

## 1. 目的 (purpose)

HarnessHub の全画面を、実データ無しで一通り確認できる状態にする。現状は seed 投入後の画面が「空の一覧」に偏り、大量件数・長文・エラー・各ステータス値といった実運用で現れる状態を手元で再現できない。そのため UI 崩れや表示不備が実利用まで発見されず、後続の UI 検査 feature (`feat-ui-integrity-audit-harness` / `feat-ui-layout-remediation`) も検査対象の状態を作れない。

## 2. ゴール (goal)

30 route それぞれについて、空・1 件・大量 (50 件以上)・長文・エラーの 5 状態へ到達する手順が存在し、各ドメインモデルの enum ステータスが全値 seed に含まれ、同一 seed の連続 2 回実行が同一状態へ収束する。

## 3. スコープ

### 3.1 対象 (scope_in) — 8 件

1. 対象 30 route と各 route の状態 (空 / 1 件 / 大量 50 件以上 / 長文 / エラー) 対応表の確定。
2. 各ドメインモデルの enum ステータス全値を最低 1 件ずつ含む fixture の定義。
3. 長文パターン (日本語の折返しが起きる見出し・説明文・タグ名) の明示的な収録。
4. 大量パターン (一覧の仮想化・ページング境界を跨ぐ 50 件以上) の収録。
5. エラー状態 (取得失敗・権限不足・未同期) を画面から再現する手段。
6. seed の冪等性の担保。
7. ローカル以外の DB URL を拒否する既存ガードの維持。
8. seed 済み状態から特定 route の特定状態へ到達する手順の文書化。

### 3.2 対象外 (scope_out) — 5 件

1. 本番・staging DB への投入。
2. 実ブラウザ検査そのもの (`feat-ui-integrity-audit-harness` 担当)。
3. UI 崩れの是正 (`feat-ui-layout-remediation` 担当)。
4. 顧客実データの取込み・匿名化。
5. パフォーマンス負荷試験用の大規模データ。

## 4. 受入条件 (acceptance) — 7 件

| # | 受入条件 | 検証方法 |
|---|---|---|
| A1 | seed 投入後、30 route それぞれについて 5 状態へ到達する手順が存在し実行できる | §6 の対応表の全「適用」セルに到達手順が紐づき、手順どおりに到達できることを確認する |
| A2 | 各ドメインモデルの enum ステータスが全値、最低 1 件ずつ seed に含まれる (未使用値 0 件を機械検査) | §7 の 135 値それぞれについて seed 後の DB に 1 件以上存在することを検査スクリプトで判定する |
| A3 | 大量パターンが 50 件以上でページング境界を跨ぐ | 対象一覧の件数が 50 件以上かつ 1 ページ表示件数を超えることを検査する |
| A4 | 長文パターンが日本語の折返しを実際に発生させる長さを持つ | §8 の長文規約に定めた最小文字数を満たすレコードが各対象カラムに存在することを検査する |
| A5 | 同じ seed を連続 2 回実行し投入後の状態が一致する | 2 回実行後の全テーブル内容のダイジェストが一致することを検査する |
| A6 | ローカル以外の DB URL を指定した seed 実行が非 0 終了で拒否される | `file:` / `http://127.0.0.1` / `http://localhost` 以外の URL を渡した実行が終了コード 2 で停止することを検査する |
| A7 | route × 状態の対応表に未カバーの組が 0 件である | §6 の全 150 セルが「適用 (到達手順あり)」または「非適用 (理由あり)」のいずれかで埋まっていることを機械検査する |

## 5. 対象 route 一覧 (30 件)

`apps/hub/src/app` 配下の `page.tsx` を実測した結果は 30 件であり、`docs/screen-inventory.md` の現行画面行 30 件と 1 対 1 で対応する。両者に過不足は無い。

| # | 画面コード | route | 主タスク | 想定利用者 |
|---|---|---|---|---|
| 1 | S07-L.ROOT | `/` | 入口の選択 | 未認証訪問者 |
| 2 | S07.SIGNIN | `/[tenant_slug]/signin` | サインインへの遷移 | 全ロール |
| 3 | S08.DEVICE | `/device` | デバイス認可コード入力 | 全ロール |
| 4 | S18.LEGAL | `/legal` | 規約・法務情報の閲覧 | 全ロール |
| 5 | S00.LANDING | `/dashboard` | 自分の最近の作業の把握 | 全ロール |
| 6 | S01.LIST | `/catalog` | カタログ一覧の走査 | 全ロール |
| 7 | S02.DETAIL | `/catalog/[projectId]` | 個別ハーネスの精査 | 全ロール |
| 8 | S01.PUBLISH | `/catalog/publish` | 公開申請の入力 | 提供者管理者 |
| 9 | S04.RELEASES | `/catalog/releases` | リリース間の比較 | 提供者管理者 |
| 10 | S13.BOARD | `/builds` | ビルド進行の監視 | 提供者管理者 |
| 11 | S15.LIST | `/docs` | ドキュメント一覧の走査 | 全ロール |
| 12 | S15.NEW | `/docs/new` | ドキュメントの新規作成 | 管理者 |
| 13 | S15.DETAIL | `/docs/[id]` | ドキュメントの閲読 | 全ロール |
| 14 | S15.EDIT | `/docs/[id]/edit` | ドキュメントの編集 | 管理者 |
| 15 | S14.LIST | `/feedback` | 改善要望一覧の走査 | 全ロール |
| 16 | S14.NEW | `/feedback/new` | 改善要望の起票 | 全ロール |
| 17 | S14.DETAIL | `/feedback/[id]` | 改善要望の閲読 | 全ロール |
| 18 | S09.METRICS | `/metrics` | 利用状況の分析 | 管理者 |
| 19 | S16.USAGE | `/metrics/usage` | 使用状況・削減効果の比較 | 管理者 |
| 20 | S11.LIST | `/sheets` | ヒアリングシート一覧の走査 | 全ロール |
| 21 | S10.NEW | `/sheets/new` | ヒアリングシートの入力 | 全ロール |
| 22 | S12.DETAIL | `/sheets/[id]` | ヒアリングシートの閲読 | 全ロール |
| 23 | S17.LIST | `/users` | 利用者一覧の走査 | 管理者 |
| 24 | S17.DETAIL | `/users/[id]` | 利用者の管理 | 管理者 |
| 25 | S18.ACCOUNT | `/settings/account` | 自アカウントの管理 | 全ロール |
| 26 | S18.NOTION | `/settings/notion` | Notion 連携の管理 | 管理者 |
| 27 | S04.AUTH | `/settings/auth` | 認証連携の管理 | 管理者 |
| 28 | S10.COEFFICIENTS | `/settings/coefficients` | 削減効果係数の管理 | 管理者 |
| 29 | S18.SYSTEM | `/settings/system` | 配色の採用状況の把握 | 提供者管理者 |
| 30 | S16.USAGE | `/tracking` | 週次の実行回数と削減効果の把握 | 全ロール |

## 6. 対応表と enum 一覧

詳細は [requirements-coverage-tables.md](docs/features/feat-demo-coverage-dataset/requirements-coverage-tables.md) を正本とする。本書は目的・スコープ・受入と 30 route 一覧までを持つ。
