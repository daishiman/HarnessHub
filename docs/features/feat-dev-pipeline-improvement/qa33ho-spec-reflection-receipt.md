---
status: confirmed
layer: feature-evidence
beads_ids:
  - HarnessHub-33ho
  - HarnessHub-ory6
dev_graph_node_id: issue-qa-log-id-uniqueness-gate-20260726
feature_node_id: feat-dev-pipeline-improvement
spec_impact: none
reviewed_at: 2026-07-28
---

# qa_log ID 一意性検査 (HarnessHub-33ho) の仕様反映受領書

## 1. 受領対象

`HarnessHub-33ho` では、`validate-coverage-matrix.py` が `qa_log` /
`approval_log` / `categories` / `requirements_foundation.goals` の ID を
集合内包 (`{e.get("id") for e in entries}`) で集めており、重複 ID が
黙って 1 件へ畳み込まれ「参照先が実在するか」しか検査できず「参照先が
一意か」を検査できていなかった問題を fail-closed 化した。500 行上限
超過に伴うファイル分割 (4 例目) も同時に行った。

- Beads ID: `HarnessHub-33ho` (対応本体・CLOSED), `HarnessHub-ory6` (follow-up・OPEN)
- dev-graph node ID: `issue-qa-log-id-uniqueness-gate-20260726`
- follow-up dev-graph node ID: `issue-id-uniqueness-gate-generalization-20260728`
- 対象 feature node: `feat-dev-pipeline-improvement`
- 対象ファイル: `plugins/system-spec-harness/scripts/validate-coverage-matrix.py`,
  `plugins/system-spec-harness/scripts/coverage_foundation.py` (新規分割先)

## 2. 仕様・設計影響の判定

判定は **none（今回の差分による新しい仕様・設計影響なし）**。

`validate-coverage-matrix.py` は goal-spec C7 (収集マトリクス網羅性の
決定論ゲート) の実装であり、既存の入力形状・出力契約 (exit code /
stdout OK summary / stderr VIOLATION 一覧) を変えていない。追加した
のは「今まで検査していなかった不変条件 (ID の一意性) を fail-closed
で検査する」ことであり、正常系 (重複が無い既存の
`system-spec/spec-state.json`) の判定結果は変わらない
(`--matrix` / `--require-complete` とも exit 0 を維持)。新しい利用者
要件・API・データ構造・セキュリティ境界を追加しないため、製品仕様の
正本である `system-spec/` と `specs/` は変更しない。

500 行分割 (`coverage_foundation.py` への切り出し) はロジックを一切
変えず、既存関数をそのまま移動しただけの内部実装分割であり、これも
仕様・設計への影響を持たない。

## 3. 確認した正本と設計

| 層 | 確認結果 |
|---|---|
| `system-spec/` | `spec-state.json` の `qa_log`/`approval_log`/`categories`/goals に既存の重複なし。新要件なし |
| `specs/` | Harness Hub 製品の外部契約に変更なし |
| `architecture/` | component・責務境界・データフロー・配備構成に変更なし |
| `features/` | `feat-dev-pipeline-improvement` の scope に変更なし (Dev Graph 基盤変更の一部として最終レビューへ追記) |
| `tasks/` | 対応する task spec の変更なし (validator 内部実装の修正のため) |
| `docs/` | `final-review-20260726.md` に差分追記、本受領書を新規追加 |

## 4. 正規フローによる反映

1. `plugins/system-spec-harness/scripts/validate-coverage-matrix.py` に
   `_collect_unique_ids()` を追加し、`categories` / `qa_log` /
   `approval_log` の重複検出と両ログ間の ID 衝突検出を `validate()` から、
   `requirements_foundation.goals` の重複検出を `validate_foundation()`
   から、それぞれ fail-closed で呼び出すようにした。
2. 正例 (重複なし → 従来どおり exit 0) と負例 (各 ID 集合の重複 →
   非 0 終了) の回帰テストを `test_validate_foundation.py` / を
   `test_validate_scripts.py` に追加した (計 15 件)。
3. ID 一意性検査の追加で 585 行に達した
   `validate-coverage-matrix.py` を、C9 (`--require-foundation`
   opt-in) 関連の `validate_decisions()` / `validate_foundation()` と
   専用ヘルパー・定数ごと同ディレクトリの import 専用 support module
   `coverage_foundation.py` へ分離し、メインファイルを 286 行、分離先を
   314 行にした。
4. `docs/features/feat-dev-pipeline-improvement/final-review-20260726.md`
   に差分追記として経緯・原因・対応・検証結果を記録した。
5. `HarnessHub-33ho` の scope_in にあった「同種の集合化による取りこぼしが
   他の ID 集合にも無いかの点検」は未消化のまま close されていたため、
   repo 全体を grep して該当候補を洗い出し、follow-up issue
   `HarnessHub-ory6` / `issue-id-uniqueness-gate-generalization-20260728`
   として切り出した (upsert-node.py で graph.json へ正規登録済み)。

## 5. 品質と文書分割

`python3 -m pytest plugins/system-spec-harness/tests -q` で
**218 passed**、`python3 scripts/validate-plugin-packages.py` で
`system-spec-harness OK (clean)` (PKG-006/007 含めすべて PASS) を
確認した。テストは `importlib.util.spec_from_file_location` でハイフン
名モジュールを直接ロードする既存方式のままで変更不要だった (分割先の
関数が `import` 経由で元モジュールの属性として引き続き参照できるため)。

`coverage_foundation.py` は `plugins/dev-graph/hooks/guard-graph-schema.py`
→ `guard_graph_commands.py` と同じ分割パターン (shebang なし・
実行ビットなし・`if __name__` ガードなし・`sys.path.insert()` してから
通常の `import`) を踏襲し、`validate-plugin-package.py` の
`_is_import_only_support_module()` が構造判定で起動対象から除外する
条件を満たす。今回変更した手書き Python はすべて 500 行以下である。

## 6. 残課題

- `HarnessHub-ory6` (`issue-id-uniqueness-gate-generalization-20260728`):
  `validate-task-graph.py` / `validate-consult-session.py` /
  `validate-route-build-reports.py` の 3 ファイルについて、同種の
  集合化による ID 重複無検出が実害を持ちうるかの要否判定と、
  該当する場合の fail-closed 実装・回帰テスト追加。
- `issues/sys-qa-log-id-uniqueness-gate-20260726.md` の frontmatter
  (`completion_evidence.status: "open"`, `confirmation_status: "draft"`)
  が、bd 上の `HarnessHub-33ho` CLOSED 状態と乖離している。scope_in の
  一部が follow-up issue へ切り出されて着地したため、frontmatter 側の
  更新 (status/confirmation_status の確定、または close 判断の追記) は
  別途対応が必要。本受領書の作成時点ではリスクと工数を鑑みて未着手。
