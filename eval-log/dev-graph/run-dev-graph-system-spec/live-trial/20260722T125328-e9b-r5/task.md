# タスク: dev-graph:run-dev-graph-system-spec 正経路の実走

**最終必須処理:** 全検証後、最終返答より前に必ず `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-224927-wt-8/eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260722T125328-e9b-r5/out/status.json` へ `{"status":"PASS|FAIL|ERROR","scenario":"system-spec-positive-lineage"}` をWriteし、`DONE: <status>` と1行だけ報告すること。out/にこれ以外を書かない。

対象repoに「ローカル専用TODO REST API。認証、TODO CRUD、SQLite永続化、外部networkなし」という完全な要求briefを置き、宣言済み依存 `system-spec-harness` の正規4 entrypointを実際に引用実行して仕様書とbackend architectureを生成してください。

Skill({skill: "dev-graph:run-dev-graph-system-spec", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-224927-wt-8/eval-log/dev-graph/live-trial-fixtures/20260722T125328-e9b-r5-fixture"})

coverage/source citation gateとC11をexit 0にし、C02経由で登録されたsystem-spec/architectureが `source_lineage.origin_kind/source_plugin/source_path/source_version/source_digest/imported_at` とconfirmed/evaluator evidenceを持つことを検証してください。dev-graph内に同等のelicit/compile実装を複製せず、依存pluginのqualified Skill呼出しがtranscriptに残ることを必須とします。scenario IDは `C19-OUT1-positive-system-spec-lineage` です。

## C02 単一writer不変条件

- 各nodeの `source_lineage.source_digest` は登録前に `sha256(source_path の実ファイル)` で計算し、node-specに入れる。
- digest不一致は node-spec を正して `upsert-node.py` で再登録する。`.dev-graph/state/graph.json` をpython・Edit/Write・sed等で直接書き換えない。
- 検証は非dry-runで行い、書いたファイルを消してwrite_countを操作しない。

## 依存entrypointと監査帰属

- `system-spec-harness` の4 entrypoint (`run-system-spec-elicit` / `run-system-spec-doc-fetch` / `run-system-spec-compile` / `assign-system-spec-completeness-evaluator`) をすべてqualified Skill呼出しで駆動する。
- 依存plugin所有の成果物をcaller側で手書きしない。`fetched-references.json` はassembler経由で生成する。
- 完成度評価はskill手順どおり独立auditorをTask forkし、`audit_delegations[]` はPostToolUse hookの正規fork台帳で裏取りできる内容にする。fixture内への台帳の手作成・複製や、台帳に接地しないcompleteness-reportによる代替を禁止する。

制約:
- 途中で人間に質問せず最後まで自走する。
- skillの手順に忠実に従い、人手の追加判断・省略をしない。
- 成功・失敗・中断のいずれでも、必ず冒頭の最終必須処理を行う。
