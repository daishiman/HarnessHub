# 概要

`scripts/lint-workflow-step-guard.py` の `main()` に、検査器自身の fail-open が残っている。`--workflows-dir` が存在しなければ `[SKIP]` を出して `return 0`、glob が 0 件でも `summary: workflows=0 violations=0` で exit 0 になる。「検査した結果 0 件」と「1 件も検査していない 0 件」が同じ緑を出す。

## 背景と問題

本 lint は `HarnessHub-5u5k` で、step-level `if` が同一 step の `env:` を参照する形 (Actions の評価順により式が恒久 false になり、secret を投入しても step が永久 skip される) を遮断するために追加した。つまり **「検査が起動していないのに緑」を防ぐための検査器**である。

その検査器自身が、対象 0 件を成功として返す。防ごうとしている defect と同型であり、`5u5k` の受入条件が守られているかどうかを、この lint の緑では判定できない。

呼び出し経路が 3 つ (`governance-check.yml` / `make lint` / `scripts/run-ci-checks.sh`) あり、それぞれ CWD 前提が異なる点も効く。checkout 漏れ・path 変更・別ディレクトリからの起動のいずれでも、違反が実在したまま緑になる。

## 現在の挙動

`scripts/lint-workflow-step-guard.py:440-441`。

```python
if not workflows_dir.is_dir():
    print(f"[SKIP] workflows dir not found: {workflows_dir}")
    return 0
```

および、glob 結果が空でも `checked = 0` のまま `summary` を出して exit 0 へ抜ける。

## 期待する挙動

- workflows dir が不在なら非 0 で停止する (fail-closed)。
- 検査件数が 0 件なら非 0 で停止する。
- 意図的に検査対象を持たない環境 (単独 install など) は `--allow-empty` の明示 opt-in でのみ 0 を返す。
- 上記の分岐を `--self-test` の fixture と単体テストで固定する。

## 再現手順またはユースケース

```bash
# dir 不在でも成功してしまう
python3 scripts/lint-workflow-step-guard.py --workflows-dir /nonexistent; echo "exit=$?"

# 空 dir でも workflows=0 で成功してしまう
mkdir -p /tmp/empty-wf && python3 scripts/lint-workflow-step-guard.py --workflows-dir /tmp/empty-wf; echo "exit=$?"
```

## 影響と優先度

- 影響範囲: system。メタ層 CI の再発防止ゲート 1 件の実効性。
- 深刻度: medium。現状 3 経路とも repo-root から起動され `workflows=10` を実測できているため、実被害は出ていない。
- 緊急度: 低いが、path 変更や新しい呼び出し経路の追加で静かに無効化されるため、構造として残すべきでない。

## スコープ

- In: `main()` の空走査 fail-closed 化 / `--allow-empty` の追加 / self-test fixture と単体テストの追加。
- Out: lint の検出ルール自体の変更 (`classify_env_reference` の判定基準)。`--simulate` の出力仕様変更。

## 関連グラフ

- 原因/親ノード: `issue-governance-notion-steps-always-skipped-20260725` (本 lint の追加元)
- 関連仕様: `docs/infrastructure-spec.md` §7
- 関連アーキテクチャ: `arch-harness-hub-dev-workflow` (差分追記 2026-07-28「結線されていても起動条件が恒久 false なら走らない」)
- 解決タスク: 本 issue 内で完結 (task 分解なし)

## 受入条件

- [ ] 存在しない `--workflows-dir` を渡すと非 0 で落ちる
- [ ] 空ディレクトリを渡すと非 0 で落ちる
- [ ] `--allow-empty` を付けた場合に限り 0 を返す
- [ ] 上記 3 ケースが `tests/scripts-root/test_root__lint_workflow_step_guard.py` に追加されている

## 検証証跡

- コマンド/テスト: 未実施 (起票時点)
- 証跡 path: `scripts/lint-workflow-step-guard.py` / `tests/scripts-root/test_root__lint_workflow_step_guard.py`
