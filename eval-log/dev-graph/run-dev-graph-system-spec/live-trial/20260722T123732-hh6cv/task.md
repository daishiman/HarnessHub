# タスク: dev-graph:run-dev-graph-system-spec 正経路の実走

対象 repo には「ローカル専用TODO REST API。認証、TODO CRUD、SQLite永続化、外部networkなし」の完全な要求 brief が `system-spec/requirements-brief.md` に**既に配置済み**です(新たに brief を創作しないこと)。宣言済み依存 `system-spec-harness` の正規4 entrypoint を実際に引用実行して仕様書と backend architecture を生成してください。以下を実行してください:

Skill({skill: "dev-graph:run-dev-graph-system-spec", args: "--repo-root /private/tmp/claude-501/-Users-dm-dev-dev------HarnessHub--worktrees-task-20260722-041945-wt-4/de1ca9e4-7ac6-43b6-ae03-3033bff4f758/scratchpad/ltfix/system-spec"})

coverage/source citation gate と C11 を exit0 にし、C02 経由で登録された system-spec/architecture が `source_lineage.origin_kind/source_plugin/source_path/source_version/source_digest/imported_at` と confirmed/evaluator evidence を持つことを検証してください。dev-graph 内に同等の elicit/compile 実装を複製せず、依存 plugin の qualified Skill 呼出しが transcript に残ることを必須とします。scenario ID は `C19-OUT1-positive-system-spec-lineage` です。

## 登録経路とdigestに関する厳守制約 (C02 単一writer不変条件)

- 各 node の `source_lineage.source_digest` は、登録前に `sha256(source_path の実ファイル)` で正しく計算して node-spec (upsert-node.py の `--input`) に入れること。
- 万一 source_digest が実 source_path と不一致になった場合、その是正は **node-spec.json (upsert-node.py の --input) を正しい digest に直して upsert-node.py で再登録する経路のみ** で行うこと。
- **`.dev-graph/state/graph.json` を python・エディタ (Edit/Write)・sed 等で直接編集して digest やその他フィールドを上書きする C02 迂回は禁止。** validate-source-digest.py / validate-evidence-refs.py の緑化は「入力(node-spec)を正して upsert-node.py で再登録」で達成すること。graph.json への書込みは upsert-node.py 経由のみ (直接書込み 0 件)。
- 検証は必ず非 dry-run の実行結果で行うこと。書いたファイルを rm で消して write_count=0 を宣言する等の証跡操作をしないこと。

## 依存 entrypoint の駆動に関する厳守制約 (責務の代替禁止)

- `system-spec-harness` の **4 entrypoint (run-system-spec-elicit / run-system-spec-doc-fetch / run-system-spec-compile / assign-system-spec-completeness-evaluator) をすべて qualified Skill 呼び出しで駆動**すること。いずれかを省略しない。
- **依存 plugin が所有する成果物を caller 側で手書きしない。** 特に `system-spec/fetched-references.json` は run-system-spec-doc-fetch の assembler 経由でのみ生成すること (echo / heredoc / Write による直書き禁止)。取得対象が本当に 0 件だと判断した場合は、その判断根拠を成果物ではなく報告文に残すこと。
- **完成度評価 (assign-system-spec-completeness-evaluator) は skill 本文の手順どおり独立 auditor を起動して判定を得ること。** completeness-report.json を自分で書き起こして独立監査の判定として提示しない。

1. `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260722-041945-wt-4/eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260722T235959-hh6cv/out/status.json` だけに `{"status":"PASS|FAIL|ERROR","scenario":"system-spec-positive-lineage"}` をWriteする。
2. `DONE: <status>` と1行だけ報告する。

途中で人間に質問せず最後まで自走し、skillの手順に忠実に従い、人手の追加判断・省略をしないこと。out/に中間成果物を書かないこと。
