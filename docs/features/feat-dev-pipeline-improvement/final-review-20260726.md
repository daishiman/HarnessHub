---
layer: feature-design
graph_node_id: "doc-dev-pipeline-final-review-20260726"
artifact_kind: "document"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["dev-graph","final-review","spec-impact"]
priority: null
start_date: null
target_date: null
iteration: null
title: "Dev Graph 基盤変更 最終レビュー 2026-07-26"
owners: ["daishiman"]
created_at: "2026-07-26T03:25:49Z"
updated_at: "2026-07-27T21:50:27Z"
status: "draft"
depends_on: []
related_nodes: ["feat-dev-pipeline-improvement","arch-harness-hub-dev-workflow"]
resource_scope: ["plugins/dev-graph","eval-log/dev-graph","issues","tasks","docs/features/feat-dev-pipeline-improvement/final-review-20260726.md"]
purpose: null
goal: null
scope_in: []
scope_out: []
acceptance: []
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "docs/features/feat-dev-pipeline-improvement/final-review-20260726.md"
template_id: "document"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":null,"origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 1.0
classification_reason: "ユーザー要求による Dev Graph 基盤変更の最終レビュー記録"
classification_candidates: []
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-07-26T03:25:49Z","missing_sections":[],"status":"complete"}
---


# 目的

2026-07-26 の Dev Graph 基盤変更について、実装・証跡・仕様影響・Beads の最終状態を 1 か所で追跡できるようにする。

## 対象読者

HarnessHub の開発基盤を保守する開発者、PR reviewer、Beads の後続課題を引き継ぐ担当者。

## 結論

C10 guard の timeout 起因 fail-open、`pathlib` 経由の authority 直書込み、散文内コマンドの誤検知を解消した。config と初期 graph store の正規 writer、C02 の本文保持、`local_only` completion policy の正規化も追加した。変更は製品 API・データ状態・security・UI contract を変えないため、製品正本である `system-spec/` と `specs/` は変更せず、プラグイン正本と下流 architecture wrapper に反映した。

## 本文

### 実装した内容

- C10 の遮断判定を subprocess 非依存にし、PreToolUse timeout が破壊操作を許可する窓を閉じた。
- shell redirect は quote 外の演算子と宛先だけを解析し、例示コマンドを含む notes の誤遮断を防いだ。
- `.dev-graph/config.json` を preview/receipt 付きで atomic 更新する `build-repo-config.py` を追加した。
- 初期 `.dev-graph/state/graph.json` を正準 envelope で非破壊作成する `build-graph-store.py` を追加し、node 更新を所有する `upsert-node.py` と責務を分けた。
- `Path.write_text()` / `write_bytes()` / `touch()` / `unlink()` / `rmdir()` と、書込み mode の `Path.open()` を authority 直書込みとして遮断した。
- `upsert-node.py` は graph node の有無ではなく artifact の実在を基準に本文を保持し、`--regenerate-body` だけが破棄を許可する。
- exact-13 登録時、`github_publication.mode=local_only` の PR 連動 completion policy を `manual` に正規化した。
- 500 行超の手書き実装とテストを、schema/preflight、command analysis、body/lifecycle、focused test の責務に分離した。命名例外台帳も `lint-script-naming-pending-paths.py` へ分離し、今回変更した手書き Python はすべて 500 行以下とした。

### 検証結果

- `python3 -m pytest plugins/dev-graph/tests -q`: **539 passed / 2 skipped / 0 failed**。
- current pointer が示す 19 feature package に `validate-system-plan.py` を再実行し、**19/19 package が Phase P01〜P13 をすべて PASS**。
- Dev Graph 9 skill (`init`, `node`, `sync`, `requirements`, `render`, `decompose`, `schedule`, `status`, `system-spec`) の fresh live-trial は **9/9 PASS**。
- C19 system-spec trial は、古い task 指示と fixture の前提ずれで初回 FAIL を記録した。requirements brief だけを入力に正規 4 skill で再試験した `20260726T050519Z-sysspec-final2` は、独立 completeness evaluator を含め PASS。
- live-trial、content review、feedback contract/protocol、prompt drift、skill description、artifact placement、script naming、document line limit、graph schema、open residue の各 lint は違反 0。
- `git diff --check` は whitespace error 0。変更した手書き Python に 500 行超はない。

### Beads

完了対象: `HarnessHub-6in4`, `HarnessHub-q5h9`, `HarnessHub-v1yh`, `HarnessHub-wdpq`, `HarnessHub-n7gw`, `HarnessHub-7dw`。

継続対象: `HarnessHub-dyxr`, `HarnessHub-9ndl`, `HarnessHub-lp36`, `HarnessHub-xswf`, `HarnessHub-35ai`, `HarnessHub-768b`, `HarnessHub-dqca`。`HarnessHub-768b` は C19 task 指示と fixture 契約の前提ずれ、`HarnessHub-dqca` は graph 管理 docs の C02 再登録で `layer` が失われる契約不整合を決定論的に防ぐ後続課題。各 Dev Graph issue node の `beads_linkage` を C02 writer で補正し、本文保持 receipt を確認した。

### 仕様・設計への影響

プラグイン内部契約は `plugins/dev-graph/references/claude-code-hooks-contract.md` と `plugins/dev-graph/references/execution-tracker-contract.md` に反映した。リポジトリ内の開発ツール設計判断は `architecture/harness-hub-dev-workflow.md`、feature の変更履歴は `features/feat-dev-pipeline-improvement.md` に反映した。

`system-spec/` と `specs/` は製品仕様の正本であり、今回の変更には製品 interface、API、state、security、UI contract の差分がない。qa-066 の「下流投影を上流へ逆輸入して二重正本にしない」原則に従い、非変更を正しい仕様反映判断とした。

### main 同期

- `origin/main` を取得し、ローカル `main` と `origin/main` が最新 `f7a2edc` で一致することを確認した。
- 作業中の main 更新を含めてローカル `main` を本 branch へ再 merge し、最新 merge commit `1d42c70` を作成した。
- `git merge-base --is-ancestor main HEAD` で、本 branch が同期済み main を含むことを確認した。

### 差分追記 (2026-07-28): PR #82 の CI 失敗 (hooks entry point 契約) を是正

`tests/scripts-root/test_root__validate_plugin_completeness.py` の `test_dev_graph_native_manifest_and_sidecar_are_separated` が CI で FAIL した。原因は、本変更で `guard-graph-schema.py` を 500 行以下へ分離した結果 `plugins/dev-graph/hooks/guard_graph_commands.py` (import 専用 support module) が生まれ、同テストが `package-contract.json` の `entry_points.hooks` を「`hooks/` にあるファイルの一覧」と厳密一致で突合していたことにある。**500 行分割規約と entry point 宣言規約が同時には満たせない**構造であり、実装の不備ではない。

検討した 3 案と選択理由:

| 案 | 内容 | 判断 |
|---|---|---|
| A | support module を `hooks/` の外へ移す | **不採用**。live-trial receipt の behavior closure digest (`skill_dir_tree_sha`) が own-plugin の `hooks/` ツリー全体を含むため、無関係な 9 件の receipt が一斉に stale になり再実行コストが発生する |
| B | support module を `entry_points.hooks` へ宣言する | **不採用**。`entry_points` は Claude Code が起動する入口の台帳であり、起動されないファイルを載せると台帳の意味が失われる |
| C | 契約テストの不変条件を修正する | **採用**。契約テストは repo-root `tests/` にあり behavior closure の外側なので、既存 receipt を 1 件も失効させない |

是正内容:

- 突合相手を「ディスク上のファイル一覧」から **`hooks/hooks.json` が実際に登録している command の起動先** へ変更した。未宣言の登録 (本テストの主目的) は従来どおり FAIL、宣言のみで未登録・実体なしも FAIL とする。
- `hooks/` に残る未宣言ファイルは `_is_import_only_support_module()` が **単体起動の入口を持たない**ことまで検査したときだけ許容する (`.py` である / import 可能な名前である / shebang なし / `if __name__ == "__main__"` なし)。命名規則だけを許容条件にすると、underscore 名を付けた実 hook の宣言漏れを素通りさせるため採らない。
- 新しい判別ロジック (`_registered_hook_stems` / `_support_module_candidates` / `_is_import_only_support_module`) に単体テスト 8 件を追加した。
- 986 行に達した同テストファイルを責務で 3 分割した: `test_root__validate_plugin_completeness.py` (収集/検証層・367 行)、`test_root__validate_plugin_completeness_s2.py` (登録予防層と CLI・386 行)、`test_root__plugin_hooks_entry_point_contract.py` (実 repo の hooks entry point 契約・197 行)。共有 fixture は `tests/scripts-root/_plugin_completeness_fixtures.py` へ集約し複製を作らない。

検証: `python3 -m pytest tests plugins/dev-graph/tests -q` が **8029 passed / 7 skipped / 0 failed**。lint は test discovery coverage、script naming、doc line limit、artifact placement、content review、skill description、prompt contract drift、live-trial verdict がいずれも違反 0。graph schema は `valid: true` / `implementation_readiness: complete`。

## 決定事項

- Dev Graph plugin 内部契約を製品 `system-spec/` へ追加しない。
- C10 の遮断経路に subprocess や graph 全件検査を戻さない。
- metadata-only C02 upsert は既存本文を保持し、再生成は明示 opt-in に限定する。
- `local_only` と PR 連動完了 policy の組合せを生成しない。
- 機械生成の `.dev-graph/state/graph.json` は単一台帳、live-trial の `transcript.jsonl` / `pane.txt` は digest に束縛された不可分証跡のため分割しない。手書きの Python / Markdown はすべて 500 行以下へ分割する。
- entry point の宣言は「ディスク上のファイル一覧」ではなく「実際の登録内容」と突合する。代理指標は、規約どうしが衝突したとき正しい実装を偽陽性で落とす。
- `os` / `shutil` / `json.dump` 等の広域 interpreter API は誤遮断設計を伴うため、本変更へ無理に含めず `HarnessHub-lp36` で継続する。

## 運用・更新方法

- 更新契機: 本 PR の検証結果、仕様反映受領書、PR URL、残課題が変わったとき
- 更新責任者: Dev Graph 基盤変更の実装担当者
- 鮮度確認: PR 作成前と main 同期後

## 関連資料

- `feat-dev-pipeline-improvement`
- `arch-harness-hub-dev-workflow`
- `plugins/dev-graph/references/claude-code-hooks-contract.md`
- `plugins/dev-graph/references/execution-tracker-contract.md`

## 変更履歴

| Date | Change | Author |
|---|---|---|
| 2026-07-26 | 最終レビュー、仕様影響判断、Beads 対応を初版記録 | Codex |
| 2026-07-26 | final live-trial 9/9、pytest 539件、task gate 19/19、C19 後続課題を追記 | Codex |
| 2026-07-28 | PR #82 の CI 失敗 (hooks entry point 契約) の是正、テスト 3 分割、全体 pytest 8029件を追記 | Claude |
