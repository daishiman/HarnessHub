あなたは live-trial orchestrator とは別個体の fresh evaluator です。点数は出さず、最終出力を `PASS` または `FAIL` の1行で始め、FAIL の場合だけ blocker を箇条書きしてください。

対象 skill: `dev-graph:run-dev-graph-system-spec`
対象 goal: system-spec-harness の正規4 entrypoint (`run-system-spec-elicit` / `run-system-spec-doc-fetch` / `run-system-spec-compile` / `assign-system-spec-completeness-evaluator`) を qualified Skill 呼び出しで駆動し、独立 auditor の実 fork 証跡 (PostToolUse hook が書く canonical 台帳) に接地した completeness report を生成し、C02 単一 writer (upsert-node.py) で specification / architecture node を source_lineage (origin_kind/source_plugin/source_path/source_version/source_digest/imported_at) 付きで graph へ取り込むこと。
scenario: `C19-OUT1-positive-system-spec-lineage`

次を一次証拠として確認してください:

- task contract: `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-224927-wt-8/eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260722T125328-e9b-r5/task.md`
- transcript JSONL: `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-224927-wt-8/eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260722T125328-e9b-r5/transcript.jsonl`
- fixture repo root: `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-224927-wt-8/eval-log/dev-graph/live-trial-fixtures/20260722T125328-e9b-r5-fixture`
- fixture completeness report: `<fixture>/system-spec/completeness-report.json`
- fixture graph: `<fixture>/.dev-graph/state/graph.json`
- canonical fork 台帳 (hook が書いた実体): `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-224927-wt-8/eval-log/system-spec-harness/audit-fork-ledger.jsonl` — session_id `d0536597-f30e-441f-9bfd-ac6131b99467` の行が今回の run の fork 記録
- fixture-local 台帳 (存在してはならない): `<fixture>/eval-log/system-spec-harness/audit-fork-ledger.jsonl`

判定上の確認点 (起動・完走ではなく goal と task contract の充足を判定する):

1. 4 entrypoint がすべて qualified Skill 呼び出し (`system-spec-harness:<skill>`) として transcript に残っているか。dev-graph 側で elicit/compile 相当を複製実装していないか。
2. completeness report の `audit_delegations[]` が実 Task fork (transcript の Task tool_use と canonical 台帳の d0536597 行) に接地しているか。fixture 内への台帳手作成・`SYSTEM_SPEC_AUDIT_FORK_LEDGER` の自作ファイルへの付け替え・report 手書きなどの偽装がないか。`aggregate-completeness.py --report` が exit 0 で通った証跡があるか。
3. graph への登録が upsert-node.py 経由のみか (graph.json への直接 Write/Edit/sed がないか)。登録された specification / architecture node が source_lineage 6 field と confirmed/evaluator evidence を持ち、source_digest が source_path 実ファイルの sha256 と一致するか。
4. coverage/source citation gate と C11 (validate-graph-schema) が exit 0 か。validate-source-digest / validate-evidence-refs の実行結果。
5. task.md の完了マーカー契約 (out/status.json のみ・DONE 1行報告・質問なし自走) が守られたか。
