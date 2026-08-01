# 目的

タスク仕様書がテスト網羅を明記しない、あるいは書き方が実行ごとにぶれるため、実装後に「結合が通らない」「既存機能が壊れた」を後追いで発見している (qa-070 / qa-073)。テスト戦略を仕様生成の時点で必須 section 化し、欠落を機械的に拒否することで、何度実行しても同じ品質基準の仕様書が出る冪等 (べきとう＝何回実行しても結果が同じ) な仕組みへ移す。

あわせて、ボタン配置など見た目の微調整でテストが壊れる保守性崩壊 (qa-072) を、実装時の努力目標ではなく**仕様段階の制約**として先に封じる。テストを書くこと自体より、「壊れにくいテストしか書けない仕様にすること」が本 feature の価値である。

## 到達状態

system-dev-planner が生成する P01..P13 タスク仕様書が、次の 4 項目を必須 section として持つ。

1. **テストレベル選定** — 単体 / 結合 / 境界値 / 既存回帰の 4 レベルのうち、対象変更に対しどれを追加・実行するか (qa-070)
2. **カバレッジ目標** — 既定 80%、層別に上書き可能 (qa-071)
3. **層別方針** — フロント / バックエンド / インフラのどの方針を適用するか (qa-072)
4. **保守性制約** — pixel 位置・DOM 構造への依存禁止、過剰テストを作らない線引き (qa-072)

欠落した仕様書は promotion 前に fail-closed (条件を満たさないときは通さずに止める) で拒否され、同一入力の再生成では section 構成が冪等に一致する。

## スコープ

- スコープ内:
  - タスク仕様書テスト戦略 section のスキーマ定義 (上記 4 項目)
  - system-dev-planner の task spec テンプレート (P01..P13) への必須 section 組込
  - テスト戦略 section 欠落を promotion 前に非0終了で拒否する fail-closed validator
  - 変更内容の種別 (フロント / バックエンド / インフラ) からテストレベルと層別方針を導出する規則
  - 層別テスト方針の明文化
    - フロント: accessible role / ラベルでの要素選択による behavior ベースを必須とし、pixel 位置・DOM 構造依存を禁止
    - バックエンド: API 契約テスト + ビジネスロジック単体 + DB 結合テスト
    - インフラ: IaC / 設定の静的検証 + デプロイ後 smoke テスト
  - 「どこまで管理するか」の線引き (実装詳細への密結合となる過剰テストを作らない基準) の仕様記述
  - 同一 feature context での再生成における section 構成の冪等性検証
- スコープ外:
  - テスト実行基盤 (Vitest / Playwright / @testing-library/react) の scaffold・設定・CI 配線
  - カバレッジ計測と未達時マージブロックの CI 実装
  - flaky (実行するたび結果が変わる不安定テスト) 検出・quarantine・再実行ポリシーの運用実装
  - pixel 位置・DOM 構造依存を検出する lint の実装 (本 feature は仕様上の制約明記までを範囲とする)
  - Hub プロダクト本体機能 (Web / API / DB) のテストケース追加
  - 既存タスク仕様書資産の一括再生成
  - P01..P13 exact-13 契約そのものの変更

## 受入

- [ ] テスト戦略 section を欠いた task spec 入力に対し validator が非0終了で拒否する
- [ ] 4 項目 (テストレベル選定・カバレッジ目標・層別方針・保守性制約) を全て持つ task spec が validator PASS する
- [ ] 同一 feature context で仕様生成を二回実行し、テスト戦略 section の項目集合と順序が一致する
- [ ] 生成された task spec のテストレベル選定が、変更内容の種別に対応する層別方針を含む
- [ ] カバレッジ目標が既定 80% で表現され、層別に上書き可能な形で記録される
- [ ] 保守性制約に pixel 位置・DOM 構造依存の禁止が明記される
- [ ] 既存の P01..P13 exact-13 契約と 13-node DAG 検査が非退行である

## アーキテクチャ参照

- `architecture_refs`: `arch-harness-hub-testing-qa`
- 由来する確定仕様: `system-spec/testing-qa.md` (qa-070 / qa-072 / qa-073 / qa-075、意思決定 D8)
- 上流指針: Google SRE の reliability / operations concern (testing-qa 章の doctrine anchor)

## 機能間依存

- `depends_on`: (なし)
- 依存理由: 変更対象が `plugins/system-dev-planner` の仕様生成契約に閉じており、Hub プロダクト本体の実装 feature を前提としない。テスト**実行**基盤 (Vitest / Playwright) はスコープ外のため、基盤未整備でも本 feature は単独で完了できる。関連する `feat-dev-pipeline-improvement` (done) / `feat-doc-governance-portability` / `feat-mvp-first-scheduling` とは同じ dev pipeline 領域を触るが、担当する契約が異なるため順序依存ではなく `related_nodes` で表現する。

## Handoff

- per-feature planning: ready 時に system-dev-planner (`run-system-dev-plan`) を起動、または人間の手動 `/system-dev-plan` 実行結果を同じ登録経路として受理する
- 生成物: P01..P13 exact 13 executable task specs + 13-node intra-feature DAG
- 登録先: 全 task を同一 `parent_feature` / `feature_package_id` で C02 経由 atomic 登録。expected/applied=13 必須
- 完了 rollup: exact 13 全 done + P07 / P10 / P11 evidence が上記「受入」を満たす場合だけ done
