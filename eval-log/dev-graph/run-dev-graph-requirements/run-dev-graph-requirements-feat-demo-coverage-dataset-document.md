# 実装要件定義書: feat-demo-coverage-dataset (全画面×全状態を網羅する確認用データセット)

- 生成: 2026-08-14 / snapshot: `sha256:a46a36a726823e3b55cd679e572d6095a5d55bc6304a990e90f96193015d670b` (graph_revision 1645)
- handoff target: task-graph / package: `feature-package/feat-demo-coverage-dataset` (generation `a43737a6471e…`)

## 要件の出所 (lineage)

- 確定仕様: `system-spec/testing-qa.md` qa-236 (source_digest bb7f4936…) — 「確認用データは 28 route 全部 × 状態 (空/1件/大量50+/長文/エラー) × 各 enum ステータス全値を網羅する」。
- 確定仕様: `system-spec/database.md` qa-275 (source_digest b416537c…) — 主キー UUIDv4 (TEXT)・時系列索引・ページ送り方式の二分割。seed が投入するレコードの ID 形式と索引前提を規定する。
- architecture: `architecture/harness-hub-testing-qa.md` (arch-harness-hub-testing-qa・readiness complete)
- architecture: `architecture/harness-hub-data.md` (arch-harness-hub-data・readiness complete)
- feature: `features/feat-demo-coverage-dataset.md` (confirmed/pass・plan evaluator C1..C4 PASS)

## 目的 (なぜ作るか)

画面を開いても中身が空か 1 件しか無いため、大量件数での折返し・長文での横溢れ・エラー時の描画という「崩れが最も出やすい状態」が一度も観測されていない。UI 崩れの自動検査 (`feat-ui-integrity-audit-harness`) を先に作っても、食わせるデータが薄ければ「崩れていない」という偽の合格が出る。データが先で検査が後である。網羅的な確認用データを正本として整備し、全画面・全状態を人も機械も同じ入力で再現できる状態にする。

## 完了状態 (goal)

ローカル DB へ投入するだけで、対象 28 route のそれぞれについて 空 / 1 件 / 大量 (50 件以上) / 長文 / エラー の 5 状態と、各ドメインの enum ステータス全値が画面上で再現でき、同じ seed を二度流しても結果が一致する状態。

## 実装要件 (要約)

1. **route × 状態の対応表**: 対象 28 route と、各 route が描画する 5 状態 (空 / 1 件 / 大量 50 件以上 / 長文 / エラー) の対応表を正本として確定し、未カバーの組が 0 件であることを機械検査する。
2. **enum 全値の収録**: 各ドメインモデルの enum ステータスを全値、最低 1 件ずつ fixture に含める。未使用値 0 件を機械検査する。
3. **長文パターン**: 日本語の折返しが実際に発生する長さの見出し・説明文・タグ名を明示的に収録する (サイドバー「使用状況・削減効果」型の折返し崩れを再現できる長さ)。
4. **大量パターン**: 一覧の仮想化・ページング境界を跨ぐ 50 件以上を収録する。qa-275 の offset 方式 (人が見る一覧) と cursor 方式 (metrics_events / 監査 / 実行ログ) の双方の境界を跨ぐこと。
5. **エラー状態の再現手段**: 取得失敗・権限不足・未同期を画面から再現する手段を用意する (データ投入だけでは到達しない状態を含む)。
6. **冪等性**: 同じ seed を連続 2 回実行して投入後の状態が一致する。ID は qa-275 に従い UUIDv4 を TEXT 列で保持するため、seed は決定論的な UUID 生成 (固定 namespace) を用いて再実行で同一値へ収束させる。
7. **ローカル専用ガードの維持**: `file:` / `127.0.0.1` / `localhost` 以外の DB URL を指定した seed 実行は非 0 終了で拒否する。既存ガードを緩めない。
8. **到達手順の文書化**: seed 済み状態から特定 route の特定状態へ到達する手順を文書化する。

## スコープ外 (変更禁止)

- 本番・staging データベースへの投入 (ローカル専用ガードを緩めない)
- 実ブラウザ検査そのもの (`feat-ui-integrity-audit-harness` の担当)
- UI 崩れの是正 (`feat-ui-layout-remediation` の担当)
- 顧客実データの取込み・匿名化
- パフォーマンス負荷試験用の大規模データ (本 feature は表示網羅が目的で負荷が目的ではない)

## 実行単位

P01..P13 exact-13 package (`.dev-graph/plans/generations/feature-package-feat-demo-coverage-dataset/a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577`) の task projections:

- `tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p01.md`
- `tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p02.md`
- `tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p03.md`
- `tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p04.md`
- `tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p05.md`
- `tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p06.md`
- `tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p07.md`
- `tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p08.md`
- `tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p09.md`
- `tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p10.md`
- `tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p11.md`
- `tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p12.md`
- `tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p13.md`

各 projection は実行入口だけを保持し、正本の task spec は上記 generation の `task-specs/` (content-addressed・immutable) にある。

## 受入 (feature acceptance)

- seed 投入後、28 route それぞれについて 5 状態 (空/1件/大量/長文/エラー) へ到達する手順が存在し実行できる
- 各ドメインモデルの enum ステータスが全値、最低 1 件ずつ seed に含まれる (未使用値 0 件を機械検査する)
- 大量パターンが 50 件以上で、一覧のページング境界を跨ぐ
- 長文パターンが日本語の折返しを実際に発生させる長さを持つ
- 同じ seed を連続 2 回実行し、投入後の状態が一致する
- ローカル以外の DB URL を指定した seed 実行が非 0 終了で拒否される
- route × 状態の対応表に未カバーの組が 0 件であることを機械検査する

## 後続 feature への供給

本 feature の出力は次の 4 feature の前提入力になる (依存の向きは `features/` の `depends_on` が正本)。

- `feat-ui-integrity-audit-harness`: 28 route × 3 幅 × 2 テーマの実ブラウザ検査に食わせる状態を供給する
- `feat-ui-layout-remediation`: 是正前後の比較対象となる崩れやすい状態を供給する
- `feat-theme-palette-catalog`: パレット × light/dark の参考スクリーンショット撮影対象の画面状態を供給する
- `feat-feedback-image-attachment` / `feat-docs-live-authoring`: 添付・ドキュメント一覧の空/大量/長文状態を供給する

## 品質ゲート

四 gate を同一 snapshot (`sha256:a46a36a7…` / graph_revision 1645) で PASS 済み。

| gate | command | 結果 |
|---|---|---|
| C11 graph schema | `validate-graph-schema.py --graph .dev-graph/state/graph.json --repo-root <root>` | exit 0 / findings 0 |
| C02 saved state | closure 16 node の graph 値と artifact frontmatter の照合 | checked 16 / mismatch 0 |
| source digest | `validate-source-digest.py --registered <closure 16 件>` | exit 0 / checked 16 / registered_mismatch [] |
| system plan | `validate-system-plan.py --repo-root <root> --feature-package feature-package/feat-demo-coverage-dataset` | exit 0 / status pass / P01..P13 / violations [] |

`validate-source-digest.py --registered` には feature・P01..P13・architecture 2 件からなる lineage closure 16 node を全件指定した。実行前は `arch-harness-hub-testing-qa` と `arch-harness-hub-data` が registered_mismatch (verb 2 の確定章更新 qa-217→qa-236 / qa-231→qa-275 に wrapper が追従していなかった) で exit 2 であり、両 wrapper を C02 経由で再取込 (digest 更新 + 変更点の要点索引を追記) してから exit 0 へ収束させている。

実装フェーズは各 task spec の Automated commands・Required evidence・inner goal-seek (`system-task-goal-seek/v1`) に従う。本 skill は実装コードを生成しない (生成 code file 0 件)。
