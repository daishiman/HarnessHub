---
graph_node_id: "issue-guard-graph-schema-interpreter-write-coverage-20260726"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","dev-graph","guard","fail-open","hook","follow-up","qa-6in4"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "guard-graph-schema の interpreter 枝が pathlib/shutil 系書込みを取りこぼし、読取モード r を誤遮断する"
owners: ["daishiman"]
created_at: "2026-07-25T22:22:01Z"
updated_at: "2026-07-29T04:14:11Z"
status: "closed"
depends_on: ["issue-guard-fix-closure-verdict-refresh-20260726"]
related_nodes: ["issue-guard-graph-schema-timeout-fail-open-20260725"]
resource_scope: ["plugins/dev-graph/hooks/guard-graph-schema.py","plugins/dev-graph/tests/test_guard_graph_schema_fail_open_window.py","plugins/dev-graph/references/claude-code-hooks-contract.md","architecture/harness-hub-dev-workflow.md","features/feat-dev-pipeline-improvement.md","docs/features/feat-dev-pipeline-improvement/final-review-20260726.md"]
purpose: "6in4 は shell redirect と tee の fail-open を閉じたが interpreter 枝は被覆外だった。pathlib.write_text 形が live-trial で実際に素通りしており、C02 atomic writer の迂回が成立している。取りこぼしと過剰遮断を同時に閉じる"
goal: "graph authority への interpreter 経由の書込みが列挙された書込み API すべてで BLOCK され、読取のみのコマンドが BLOCK されないことを単体テストで固定する"
mvp_alignment: null
scope_in: ["INTERPRETER_WRITE の書込み API 集合の拡張 (write_text / write_bytes / shutil.copy* / shutil.move / os.replace / os.rename / json.dump)","モード文字集合 [waxr] から r を外し r+ のみ別枝で残す","各形について BLOCK / ALLOW を固定する単体テスト","docstring の保証範囲の記述 (静的解析の限界の明記)"]
scope_out: ["hook の Bash 枝 timeout 対策 (6in4 で完了済み)","behavior_closure_files() から plugin hooks/ を外す変更 (全 skill の観測挙動を変えるため退行)","本課題単独での live-trial 再取得 (closure digest が動くため修正と 1 バッチで実施する)"]
acceptance: ["静的 probe の 7 形すべてで期待どおりの BLOCK / ALLOW になる (pathlib write_text / write_bytes / shutil.copy が BLOCK に転じる)","open(<graph authority>, 'r') と 'rb' が ALLOW になる","open(<graph authority>, 'r+') と 'w' / 'a' / 'x' が BLOCK のまま維持される","pytest plugins/dev-graph/tests が 0 failed (修正後の closure に対する live-trial 再取得を含む)"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-guard-graph-schema-interpreter-write-coverage-20260726.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"edd14af39a3983f5725340b6e1901992c7ecae531c1b4096b5083b4f649c79ec","evaluator":"user-request-2026-07-29","evidence_ref":"HarnessHub-lp36"}
source_lineage: {"imported_at":"2026-07-25T22:22:01Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "hook 本体を import した静的 probe で 7 形の判定を実測し、live-trial transcript で pathlib write_text 形の素通りを実観測した"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-guard-graph-schema-interpreter-write-coverage-20260726.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-lp36","linked_at":"2026-07-26T03:25:49Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-07-29T04:14:11Z","evidence_refs":["plugins/dev-graph/tests/test_guard_graph_schema_fail_open_window.py","eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260729T042000Z-lp36-system-spec-hook-final-r4/verdict.json","docs/features/feat-dev-pipeline-improvement/final-review-20260726.md"],"policy":"manual","reconciled_at":"2026-07-29T04:14:11Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-07-25T22:22:01Z","missing_sections":[],"status":"complete"}
---

## 概要

`guard-graph-schema.py` の interpreter 枝 (`interpreter_writes_graph_authority`) は graph authority (`.dev-graph/state/` と `.dev-graph/config.json` と `graph-node.schema.json`) への interpreter 経由の書込みを遮断する責務を負うが、検出が `INTERPRETER_WRITE` 正規表現の字面一致に依存しており次の 2 方向で外している。

1. **false negative (取りこぼし)**: `pathlib.Path(...).write_text` / `write_bytes` / `shutil.copy` 系の書込み API を一切検出せず、graph authority への直書きが素通りする。C02 atomic writer (`upsert-node.py`) の迂回が成立する。
2. **false positive (過剰遮断)**: モード文字集合が `[waxr]` で読取モード `r` を含むため、`open(<graph authority>, 'r')` のような**読むだけ**のコマンドまで BLOCK になる。

HarnessHub-6in4 は shell redirect / `tee` 経由の fail-open を閉じたが、interpreter 枝の被覆はその対象外だった。本課題はその残りを閉じる。

## 実測

### 静的 probe (hook 本体を import して純関数を直接呼んだ結果)

`interpreter_writes_graph_authority` / `destructive_graph_or_schema_operation` / `indirect_mutation_over_guarded_area` / `static_denial` を fixture repo の graph authority path に対して評価した。ファイルは一切書いていない。

| ケース | interp | destr | static_denial |
| --- | --- | --- | --- |
| `open(<state/graph.json>, 'w')` 直書き | True | False | BLOCK |
| `pathlib.Path(sys.argv[1]).write_text(...)` → state/graph.json | False | False | **ALLOW (素通り)** |
| `pathlib.Path('<literal>').write_text(...)` → state/graph.json | False | False | **ALLOW (素通り)** |
| `pathlib.Path('<literal>').write_bytes(b'')` → config.json | False | False | **ALLOW (素通り)** |
| `shutil.copy(src, <state/graph.json>)` | False | False | **ALLOW (素通り)** |
| `cat > config.json` (6in4 が閉じた形) | - | True | BLOCK |
| `echo x \| tee config.json` (間接 mutation) | - | True | BLOCK |

### false positive の静的 probe

| ケース | interp | static_denial |
| --- | --- | --- |
| `open(<state/graph.json>, 'r')` | True | **BLOCK (誤遮断)** |
| `open(<state/graph.json>, 'rb')` | True | **BLOCK (誤遮断)** |
| `open(<state/graph.json>, 'r+')` | True | BLOCK (r+ は書込み可なので妥当) |
| `json.load(open(<state/graph.json>))` | False | ALLOW |

現行パターン:

```
open\s*\(\s*(?P<q>['"])(?P<path>[^'"]+)(?P=q)\s*,\s*['"][waxr]\+?[bt]?['"]
|['"](?P<path2>[^'"]*\.dev-graph[^'"]*)['"]\s*,\s*['"][wax]
```

第 1 枝のモード集合 `[waxr]` に `r` が入っている。第 2 枝は `[wax]` で正しい。同じ「読む」操作が、モード引数を明示したかどうかで BLOCK / ALLOW に分岐しており、判定が操作の意味ではなく字面に依存している。

### live transcript での実観測

- **false negative**: `eval-log/dev-graph/run-dev-graph-init/live-trial/20260725T205644Z-init2-wt6` の transcript で、`Write` による graph authority 直書きが正しく BLOCK された直後に、`python3 -c` + `pathlib.write_text` 形が **is_error: False で素通り**している。つまり被験は遮断を受けて別形へ回り、その別形が通った。実害のある取りこぼしである。
- **false positive**: live transcript 中の実観測は**無い**。静的 probe でのみ確認した。当初 `run-dev-graph-render` の再走 transcript idx 92 を実観測例として記録したが、再検証したところこれは guard 遮断ではなく被験自身のスクリプトの `KeyError: 'id'` (exit 1) であり、判定を取り違えていた。本課題では静的 probe のみを根拠とする。

## 影響

- 6in4 が閉じたのは shell redirect / `tee` の枝のみで、「Write を遮断されたら別経路で書く」という迂回動機そのものは閉じていない。interpreter 枝は迂回先として現に機能している。
- guard の docstring は「単一 fail-closed guard」を名乗るが、実体は検出済みの字面に対してのみ fail-closed である。
- false positive 側は、graph を読むだけの調査コマンドが遮断されるため、正当な read-only 検証を阻害する。

## 修正方針

字面の列挙を増やすだけでは同じ穴が別の API 名で再発する。次の順で検討する。

1. **書込み API の列挙を集合として明示し、テストで固定する**: `write_text` / `write_bytes` / `shutil.copy*` / `shutil.move` / `os.replace` / `os.rename` / `json.dump` / `open(..., 'w'/'a'/'x'/'r+')` を対象とし、各形について「graph authority path が同一コマンド内に現れたら BLOCK」を単体テストで固定する。
2. **モード集合から読取専用 `r` を外す**: `r` / `rb` は ALLOW、`r+` は書込み可なので BLOCK とする。
3. 字面判定の限界を docstring と正本契約に明記し、「interpreter 経由の任意の書込みを完全に遮断することは静的解析では不可能」であることを保証範囲として宣言する。

## 実行順序の制約 (重要)

`guard-graph-schema.py` は dev-graph 9 skill の behavior closure に含まれるため、本課題の修正で `skill_dir_tree_sha` が動き live-trial verdict 9 件が再び stale になる。したがって **修正と 9 skill の live-trial 再取得を 1 バッチで実施する**。HarnessHub-q5h9 (今回の再取得) の完了を待ってから着手し、再取得済みの証跡を無駄にしないこと。

## 2026-07-29 最終レビュー

- `guard-graph-schema.py` に書込み mode 判定を分離し、`w/a/x/r+` を BLOCK、`r/rb` を ALLOW に固定した。
- `Path.write_text/write_bytes`、`shutil.copy*/move`、`os.replace/rename`、`json.dump` の graph authority 直書きを静的共起判定で BLOCK した。
- focused test は BLOCK 17 形 / ALLOW 5 形を追加した。変更ファイルは 234 行 / 307 行で 500 行以下。
- 既存技術契約 `plugins/dev-graph/references/claude-code-hooks-contract.md` の「graph authority 直書込み禁止」への適合を確認し、列挙 API の保証境界は実装 docstring / focused test、設計判断は `architecture/harness-hub-dev-workflow.md`、履歴は feature / final review に記録した。
- `system-spec/`・`specs/` は製品正本、`tasks/feat-dev-pipeline-improvement/` は凍結済み exact-13 投影である。製品 API・state・security・UI の変更がない本修正を逆輸入すると二重正本になるため、非変更を仕様反映判断として記録した。
- local `main` と `origin/main` は `4638b97` で一致し、本 branch は merge commit `d14c021` で local `main` を取り込んだ。
- focused pytest 48 passed / 2 skipped、Dev Graph 全体 pytest 697 passed / 2 skipped、fresh live-trial 9/9 PASS、exact-13 P01-P13 / violation 0、graph schema violation 0、repository CI PASS 123 / WARN 4 / FAIL 0 を確認した。
- C19 r4 は system-spec-harness 正規 4 entry point と C02 writer だけを使い、仕様 9件・architecture 1件の lineage/digest/evidence と goal-seek 2行を独立 evaluator / canonical verdict の双方で PASS とした。
- 受入条件をすべて満たしたため Beads `HarnessHub-lp36` は最終証跡を追記して close した。
