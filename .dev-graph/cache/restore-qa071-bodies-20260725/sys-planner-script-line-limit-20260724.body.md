# 概要

system-dev-planner の `promote-system-plan.py` (677 行) と `build-system-handoff.py` (580 行) が 500 行上限を超過しており、責務単位へ分割する。

## 背景と問題

`issue-validator-contract-version-20260724` (beads HarnessHub-8vx) の対応で `validate-system-plan.py` を 601 行から 401 行へ分割した際、同 plugin 内の他 2 本が上限超過のまま残っていることを確認した。いずれも当該変更以前からの超過であり、当該変更が触ったのは `promote-system-plan.py` の 2 行 (`validate()` 呼び出しへの `baseline={}` 追加) のみ。

## 現在の挙動

```
$ wc -l plugins/system-dev-planner/scripts/promote-system-plan.py
     677
$ wc -l plugins/system-dev-planner/scripts/build-system-handoff.py
     580
```

## 期待する挙動

対象 2 本と分離先の全ファイルが 500 行以下になり、命名規則・PKG 検査・planner pytest・既 promote package の digest 不変性がいずれも維持されている。

## 再現手順またはユースケース

1. `wc -l plugins/system-dev-planner/scripts/*.py` で 500 行超を列挙する。
2. 分割後に同コマンドで全件 500 行以下を確認する。

## 影響と優先度

- 影響範囲: system: 保守性。実行時の挙動には影響しない。
- 深刻度: low
- 緊急度: 低。ただし HarnessHub-1y6 が `promote-system-plan.py` / `validate-system-plan.py` を触る予定であり、分割を後にすると衝突面が広がる。

## スコープ

- In: 対象 2 本の責務単位分割、分離先 module の命名規則準拠と実行ビット付与。
- Out: C12 `validate-json-schema-subset.py` と C14 の JSON Schema サブセット統合 (依存の非対称性を壊す)、500 行上限そのものの緩和、既 promote package の digest を変える改変。

## 関連グラフ

- 原因/親ノード: `issue-validator-contract-version-20260724`
- 関連仕様: なし (plugin 内部の保守性)
- 関連アーキテクチャ: なし
- 解決タスク: 本 issue に紐づく beads issue

## 受入条件

- [ ] 対象 2 本と分離先の全ファイルが 500 行以下
- [ ] `lint-script-naming.py` で新規 VIOLATION 0 件
- [ ] `make plugin-package-check` で blocking failure 0 件
- [ ] planner pytest 全件 PASS
- [ ] 既 promote package の canonical digest が不変

## 検証証跡

- コマンド/テスト: `wc -l` / `python3 scripts/lint-script-naming.py --repo-root .` / `make plugin-package-check` / `python3 -m pytest plugins/system-dev-planner/tests -q`
- 証跡 path: 未取得 (着手時に記録)

## 先行対応で踏んだ制約

1. 新規 script 名は `scripts/lint-script-naming.py` の `<verb>-<target>.py` 規則に従う。verb allowlist は `build/diff/extract/format/guard/lint/render/validate` のみで underscore 禁止 (28 章 §4.3)。先行対応では初回命名 `contract_versions.py` / `json_schema_subset.py` が VIOLATION 2 件になり改名した。
2. `Write` で作った script は 644 になるため `chmod +x` が必要。shebang があって実行ビットが無いと PKG-007 で blocking FAIL になる。
3. 分割は plugin の behavior closure を変えるため dev-graph 3 skill の live-trial verdict が stale 化する (HarnessHub-1y6 と同型)。再取得とセットで計画する。
