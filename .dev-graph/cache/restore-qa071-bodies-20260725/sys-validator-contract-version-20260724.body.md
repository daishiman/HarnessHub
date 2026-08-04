# 概要

promote 済み feature-execution-package は canonical digest で内容が確定しているため後から強化された C12 契約を満たせず、現行 validator が遡及要求して exit 2 になる。validator に契約 version と台帳を持たせ、promote 時点で妥当だった契約で再検証できるようにする。

## 背景と問題

`feature-execution-package` の promote 済み generation は、決まったファイル集合に対する sha256 の canonical digest で同定される content-addressed（内容そのものが識別子になる方式）成果物である。生成物を 1 byte でも編集すると digest が変わり、`published_digest` を記録済みの promotion/registration receipt が偽になる。

2026-07-22 (`367ba5c`) に C12 契約が強化され、13 task spec へ「Inner goal-seek execution loop」節と「P13 spec/architecture writeback」marker が必須化された。この契約は promote 済み generation にも遡及適用されるが、当該 generation は上記の digest 不変性により修正できない。結果として、正当に promote された過去の package が恒久的に検証不能になる。

## 現在の挙動

```
python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . \
  --staging .dev-graph/plans/generations/feature-package-feat-doc-governance-portability/d33c318d...
```

- `task-spec-section-missing` × 13
- `inner-goal-seek-contract` × 13
- `p13-spec-architecture-writeback` × 1
- exit code 2

`feat-stage0-distribution-gate` (`30b40c7f...`) でも同型 27 violations を再現。

## 期待する挙動

promote 済み package は digest を一切変えずに `status=pass` / `violations=0` で再検証でき、かつ新規生成 package は最新契約 1.1.0 で fail-closed（判定に迷う入力は不合格側へ倒す方式）検証されたまま維持される。

## 再現手順またはユースケース

1. 上記コマンドを既 promote 済み generation に対して実行する。
2. 修正後は `status=pass` / `contract_version=1.0.0` / `contract_baseline_exemption=true` / `violations=0` を確認する。
3. 台帳未登録の新規 staging に対して実行し `contract_version=1.1.0` / `contract_baseline_exemption=false` を確認する。

## 影響と優先度

- 影響範囲: system: C12 決定論ゲート。promote 済み 18 generation の再検証・監査経路が全面的に不能。
- 深刻度: high
- 緊急度: 既 package の再検証が通らないと evaluator/promoter の回帰確認と監査追跡が成立せず、後続 feature の plan 昇格判断が根拠を失う。

## スコープ

- In: 契約 version 定義と台帳解決、実ファイル再計算 digest による免除、promote 経路の免除無効化、責務単位のファイル分割、契約正本への追記。
- Out: promote 済み package 本体の編集、manifest 申告 digest による判定、C14 の JSON Schema サブセット統合、dev-graph 3 skill の live-trial 再取得 (HarnessHub-1y6)。

## 関連グラフ

- 原因/親ノード: なし (validator 自体の欠陥)
- 関連仕様: なし (Hub 製品仕様ではなく plugin 内部契約。正本は `plugins/system-dev-planner/references/feature-execution-package-contract.md` §2.4)
- 関連アーキテクチャ: なし
- 解決タスク: beads `HarnessHub-8vx`

## 受入条件

- [x] 3 package の再現コマンドが `violations=0` / `status=pass` を返す
- [x] report が `contract_version` と `contract_baseline_exemption` を返す
- [x] 台帳未登録 digest・digest 計算不能対象・台帳欠落が全て最新契約へ倒れる
- [x] promote 経路の `validate` 呼び出しが全て `baseline={}` を渡す (AST テストで機械検証)
- [x] planner pytest 全件 PASS かつ 1 ファイル 500 行以下

## 検証証跡

- コマンド/テスト: `python3 -m pytest plugins/system-dev-planner/tests -q` (122 passed) / `plugins/system-dev-planner/tests/test_contract_versioning.py` (12 tests)
- 証跡 path: `docs/features/feat-validator-contract-version/spec-reflection-receipt.md`
