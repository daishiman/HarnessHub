---
layer: feature-spec-reflection
status: recorded
feature: feat-dev-pipeline-improvement
beads_id: HarnessHub-5iuq
dev_graph_node_id: issue-flaky-guard-latency-20260728
updated: 2026-08-01
---

# 遮断レイテンシ test の代理指標是正 — 仕様反映受領書

## 目的と背景

`plugins/dev-graph/tests/test_guard_graph_schema_fail_open_window.py::test_denial_latency_does_not_depend_on_the_repository_graph`
が、20 以上の worktree が同時稼働する運用条件下で `assert 3.559s < 1.0s` により
偽陽性で失敗していた（同ファイル単独実行では 26 passed / 2 skipped で緑）。

固定したい契約は「遮断は graph サイズに依存せず確定する」だが、assert が見ていたのは
絶対所要時間であり、契約そのものではなく代理指標（proxy metric）にすぎない。代理指標には
マシン負荷という契約外の変数が混入するため、契約が破れていなくても赤になっていた。赤が
情報を失い「またこれか」と読み飛ばす習慣を生む点が有害であり、fail-open の窓を塞ぐための
test が運用上 fail-open の温床になっていた。詳細は
[issues/sys-flaky-guard-graph-schema-latency-20260728.md](../../../issues/sys-flaky-guard-graph-schema-latency-20260728.md)。

## 結論

仕様・設計への影響はある。影響は開発品質ゲート（テストの検証方法）に限定され、
製品 API・DB・認証認可・UI・Cloudflare deploy unit には影響しない。
`guard-graph-schema.py` 本体の遮断ロジックは変更していない。

## 中学生向けの説明

火災報知器のテストで「10 秒以内に鳴るはず」と時間を測っていたら、たまたま近くで
工事の音が大きくて 11 秒かかってしまい、テストが「壊れている」と誤判定した — でも
報知器自体はちゃんと鳴っていた、という状況に近い。今回の変更は、時間を測るのをやめて
「本当に鳴ったかどうか」を直接確認する方法に変えた。これで工事の音（周りの雑音）に
惑わされず、報知器が本当に壊れたときだけ赤になるようにした。

## 技術的な説明

- 遮断対象コマンドが `context_ok()`（repository context 解決。判定経路で唯一
  subprocess を起動する後段）へ到達しないことを `monkeypatch` で直接検証する構造契約に
  置き換えた。本体 repo（大きい graph）と空 repo の双方で成立することを固定し、
  「graph サイズに依存しない」を絶対時間の代理ではなく到達可否そのもので表現する。
- 陽性対照（`echo safe` は遮断対象外のため `context_ok()` へ進み、trap が発火する）を
  添え、判定ロジック自体が空振りしていないことを確認する。
- 実プロセスでの exit-2 smoke test（`test_bash_redirect_into_graph_authority_is_denied_in_real_process`）は維持し、遮断そのものの実測は失わない。
- `DENIAL_BUDGET_SECONDS = 1.0` と経過時間計測（`time.monotonic()`）を削除した。
  閾値の引き上げは採らない — 代理指標の精度を下げるだけで契約を測るようにはならず、
  graph サイズ依存への退行を見逃す幅が広がるため。

## 正規フローの反映

- 設計: [architecture/harness-hub-dev-workflow.md](../../../architecture/harness-hub-dev-workflow.md)
  差分追記 (2026-08-01)
- feature: [features/feat-dev-pipeline-improvement.md](../../../features/feat-dev-pipeline-improvement.md)
  2026-08-01 追記
- system-spec / specs: 非変更（製品契約への影響がないため反映対象外。判断根拠は本受領書）
- task: 該当なし（既存の P01〜P13 task spec はいずれも本 test を対象としておらず、
  新規 task 化を要する規模の変更でもないため非追加）

## 変更ファイル

- `plugins/dev-graph/tests/test_guard_graph_schema_fail_open_window.py`
- `architecture/harness-hub-dev-workflow.md`
- `features/feat-dev-pipeline-improvement.md`
- 本受領書

## 検証結果

- focused pytest: `plugins/dev-graph/tests/test_guard_graph_schema_fail_open_window.py`
  を独立 3 回連続実行、各回 48 passed / 2 skipped
- `plugins/dev-graph/tests` 全体を `pytest-xdist -n auto` で実行: 721 passed / 2 skipped
  (298.78s)
- `make lint`: PASS
- `make plugin-package-check`: PASS（advisory 21 件のみ、blocking 0 件）
- `git diff --check`: PASS（空白エラーなし）
- 変更ファイル行数: `test_guard_graph_schema_fail_open_window.py` は既存ファイルへの
  部分改修であり単体で 500 行を超えない

## 残課題

本変更の実装・仕様反映に blocking な残課題はない。issue 本文が候補に挙げていた
「比（巨大 graph と極小 graph の所要時間比）」案は採らず、構造検査（`context_ok()` 到達可否）
を単独の是正として採用した — 比較法もマシン負荷でばらつく余地が残るのに対し、到達可否は
負荷非依存で契約を直接表現できるため。bd `HarnessHub-5iuq` は close 済み。
