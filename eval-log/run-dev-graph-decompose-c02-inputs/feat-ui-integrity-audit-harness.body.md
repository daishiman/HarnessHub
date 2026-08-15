# 実ブラウザによる全画面 UI 崩れ自動検査基盤 (28 route × 3 幅 × 2 テーマ)

## 0. なぜこの feature があるのか

利用者が見つけた崩れは、サイドバーの「使用状況・削減効果」が `削減効` と `果` に割れて折り返される 1 箇所だった。

しかし利用者の依頼は「これ以外には調査しきれていないので、**他に崩れがないかを全ての画面で確認した上で**、その全ての画面を改善してほしい」である。目視で 28 画面 × 3 幅 × 2 テーマ = 168 通りを毎回見るのは続かない。**崩れの発見を人の目から機械へ移す**のが本 feature の存在理由で、是正そのものは別 feature が担う。

## 1. 目的

UI 崩れは利用者が偶然見つけた 1 箇所しか把握できておらず、他に崩れがあるかを誰も把握していない。28 画面 × 3 幅 × 2 テーマ = 168 通りを目視で毎回確認する運用は続かないため、崩れの発見を実ブラウザでの自動検査へ移し、再発を検知し続けられる状態にする。

## 2. ゴール

対象 28 route を 360 / 768 / 1280 px の 3 幅 × light / dark の 2 テーマで実ブラウザ描画し、横方向の溢れ 0 件・タップ域 44px 未満 0 件・意図しない折返し 0 件を判定して、違反があれば非 0 終了で落ちる検査が CI 専用 job として実行できる状態。

## 3. 含むもの

- 検査対象 28 route の一覧の確定と、route 一覧が実装から乖離したときに検知する仕組み
- 実ブラウザ (headless) での 3 幅 (360/768/1280) × 2 テーマ (light/dark) の描画
- 横方向の溢れ検出 (scrollWidth が clientWidth を超える要素の検出)
- タップ域検出 (対話可能要素の実測サイズが 44px 未満のものの検出)
- 意図しない折返しの検出 (単語・語句の途中で行が割れている箇所の検出)
- 違反時に非 0 終了する判定と、違反箇所を route/幅/テーマ/要素で特定できる報告
- `pnpm test:browser` としての実行入口
- CI 専用 job としての配線 (通常の単体テスト経路を遅くしない)
- seed 済みデータ (feat-demo-coverage-dataset) を入力とした状態別の検査

## 4. 含まないもの

- 検出された崩れの是正 (feat-ui-layout-remediation の担当)
- 確認用データそのものの整備 (feat-demo-coverage-dataset の担当)
- スクリーンショット差分 (visual regression) による見た目の凍結
- アクセシビリティ全般の監査 (本 feature はタップ域に限る)
- パフォーマンス計測
- テーマパレットの追加 (feat-theme-palette-catalog の担当。本 feature は検査軸をテーマ数へ一般化するに留める)

## 5. 受入基準

- 検査が 28 route すべてを 3 幅 × 2 テーマで描画し、検査済み組合せ数が 168 に一致する
- 既知の崩れ (サイドバー「使用状況・削減効果」の語中折返し) を是正前の状態で検出できる
- 横方向に溢れる要素を含む route が 1 つでもあれば非 0 終了する
- 対話可能要素の実測サイズが 44px 未満のとき非 0 終了する
- 違反報告が route・幅・テーマ・要素セレクタを特定できる粒度を持つ
- `pnpm test:browser` で実行でき、CI 専用 job として通常のテスト経路から分離されている
- route 一覧が実装の route と乖離したとき検査が非 0 終了する (検査漏れを緑にしない)

## 6. 前提となる feature

- `feat-demo-coverage-dataset`

## 7. 参照するアーキテクチャ

- `arch-harness-hub-testing-qa`
- `arch-harness-hub-design-system`
- `arch-harness-hub-frontend`

## 8. 出所

確定仕様 `spec-harness-hub-requirements` および `system-spec/testing-qa.md` を macro 分解したもの。
正本は `system-spec/spec-state.json` (完成度 evaluator 総合 PASS / `system-spec/resume-receipt.json`)。
本 feature は仕様本文を複製せず、`architecture_refs` と source lineage で参照する。
P01..P13 の phase task は本 feature からは生成せず、`run-system-dev-plan` (ミクロ層) が所有する。
