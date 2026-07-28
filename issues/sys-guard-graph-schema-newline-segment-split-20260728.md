---
graph_node_id: "issue-guard-graph-schema-newline-segment-split-20260728"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","dev-graph","hook","over-blocking","guard-graph-schema"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "guard-graph-schema の Bash git 分岐が改行区切りの複数コマンドを1コマンドとして誤結合し無関係パスを誤って BLOCK する"
owners: ["daishiman"]
created_at: "2026-07-28T11:40:00Z"
updated_at: "2026-07-28T11:40:00Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["plugins/dev-graph/hooks/guard_graph_commands.py"]
purpose: "改行区切りの複数コマンドを単一 Bash tool 呼出しにまとめても、無関係な後続コマンドのパスが誤って保護対象と判定されない状態にする"
goal: "改行のみで連結された独立コマンド群が、それぞれ独立した mutating-operand 判定を受ける状態"
mvp_alignment: null
scope_in: ["_mutating_operands() のセグメント分割正規表現へ改行 (\\n) を追加する", "回帰テストとして改行区切り + 保護外パス + 保護対象パスの組合せを追加する"]
scope_out: ["_pipelines() 側の改行分割仕様の変更 (既に改行を含めて分割しており対称化のみ必要)", "GRAPH_OR_SCHEMA_TARGET 正規表現自体の見直し"]
acceptance: ["改行区切りの `git restore <保護外パス>` の直後に続く無関係な `git add <保護対象パス>` を含む複数行コマンドが誤って BLOCK されない", "同一保護対象パスを対象にした単一行の `git restore` は引き続き正しく BLOCK される (回帰なし)", "既存の guard 系ユニットテストが全て pass する"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-guard-graph-schema-newline-segment-split-20260728.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-28T11:40:00Z","origin_kind":"generated","source_digest":null,"source_path":null,"source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.85
classification_reason: "PR #499 最終レビュー中に実際の複数行 Bash コマンドで誤 BLOCK を実測し、hook を直接計測して原因を確定した実挙動欠陥"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-guard-graph-schema-newline-segment-split-20260728.md","confidence":0.85}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-l1ru","linked_at":"2026-07-28T11:38:35Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: null
implementation_readiness: {"checked_at":"2026-07-28T11:40:00Z","missing_sections":[],"status":"complete"}
---

# 概要

`guard_graph_commands.py` の `_mutating_operands()` はコマンド文字列を
`(?:&&|\|\||[;|])` だけで分割し、改行 (`\n`) では分割しない。一方、同じファイル内の
`_pipelines()` は `&&|\|\||[;\n]` で分割しており改行を含む。この非対称性により、
改行のみで連結された複数の独立コマンド (Claude Code の Bash tool が日常的に発行する
複数行コマンド形式) が `_mutating_operands()` の中では **1 つの shlex トークン列**
として結合され、1 行目の `git restore`/`git checkout --` が後続行の無関係なパスまで
自分の operand として誤って吸収してしまう。

## 背景と問題

`_mutating_operands()` は各セグメントを `shlex.split(segment, posix=True)` で
トークン化し、`git` トークンの直後が `restore` または `checkout --` であれば
`operands[1:]` (以降の全トークン) を mutating targets とみなす。

```python
for segment in re.split(r"(?:&&|\|\||[;|])", command):
    tokens = shlex.split(segment, comments=False, posix=True)
    ...
    elif operation == "git" and raw:
        if raw[0] == "restore" or (raw[0] == "checkout" and "--" in raw):
            targets.extend(operands[1:])
```

分割正規表現に改行が含まれないため、次のような**改行のみで連結**された複数行コマンドは
1 つの `segment` として渡される。`shlex.split` は改行を通常の空白と同様に扱うため、
3 行が 1 つのトークン列に結合される。

```
git restore <保護対象外パス>
git add <保護対象パス>
git status --short
```

この場合、最初の `git` トークンの直後が `restore` であるため、`operation == "git"` の
分岐が成立し、**2 行目・3 行目のトークンも含めて** `operands[1:]` に入る。2 行目の
パスが `GRAPH_OR_SCHEMA_TARGET` (`issues|tasks|specs|architecture|features|docs` の
literal prefix) にマッチすれば、1 行目の `git restore` の対象が保護対象外であっても
コマンド全体が `destructive_graph_or_schema_operation()` で `True` と判定され、
`guard-graph-schema.py` が誤って `BLOCKED` を返す。

## 現在の挙動 (2026-07-28 実測)

PR #499 の最終レビュー中、`eval-log/harness-coverage.json` (保護対象外) を
`git restore` で戻し、`final-review-20260726.md` (保護対象パスを含む) を
`git add` する複数行コマンドを実行したところ、以下で `BLOCKED` になった。

```
[guard-graph-schema] BLOCKED: graph/schema の直接破壊操作は C02 atomic writer
を迂回できない (.dev-graph/config.json は scripts/build-repo-config.py、
初期 graph は scripts/build-graph-store.py 経由で書く)
```

同じ 3 行を `&&` で連結した場合は誤 BLOCK が発生せず、各行を単独の Bash tool 呼出し
として実行した場合も誤 BLOCK が発生しない。つまり **`&&` 連結・単独実行では正しく
判定でき、改行のみでの連結でのみ誤判定する**、という分割ロジックの非対称性が原因である。

hook を直接 stdin 経由で呼び出すオフライン再現でも同一の誤 BLOCK と、
`_mutating_operands()` が返す targets に 2 行目・3 行目のトークンが混入することを
確認済み (subprocess 起動なし、書込みなしの read-only 検証)。

## 影響と優先度

- 影響範囲: dev-graph の C10 guard を経由する全 Bash 呼出し。特に `git restore`/
  `git checkout --` を含む複数行コマンドの直後に、保護対象ディレクトリ名の
  literal prefix (`issues/`・`tasks/`・`specs/`・`architecture/`・`features/`・
  `docs/`) を含む無関係な別コマンドが続くケース。
- 深刻度: medium。**false positive (過検知) であり false negative (保護漏れ) ではない**
  ため security regression ではない。回避策 (`&&` 連結、または単独行実行) が存在し、
  正当な作業が完全にブロックされ続けることはない。
- 緊急度: 低〜中。誤 BLOCK は agent の作業を止め原因調査の時間を消費させるため、
  対応コストは実際に本 issue の調査 (guard 内部コードの読解 → オフライン再現 →
  原因特定) で観測済み。

## スコープ

- In: `_mutating_operands()` のセグメント分割正規表現へ改行を追加し `_pipelines()`
  と対称化する。改行区切り + 保護対象外パス + 保護対象パスの組合せの回帰テストを追加する。
- Out: `_pipelines()` 側の分割仕様変更 (既に改行対応済みで変更不要)。
  `GRAPH_OR_SCHEMA_TARGET` 正規表現自体の対象範囲見直し (別課題)。

## 再現手順

```bash
python3 - <<'PY'
import json, subprocess
cmd = "git restore eval-log/harness-coverage.json\ngit add docs/foo.md\ngit status --short"
payload = json.dumps({"tool_name": "Bash", "tool_input": {"command": cmd}})
proc = subprocess.run(
    ["python3", "plugins/dev-graph/hooks/guard-graph-schema.py", "--repo-root", "."],
    input=payload, capture_output=True, text=True,
)
print(proc.returncode, proc.stderr)
PY
# exit=2 BLOCKED になる (誤検知)。
# 同一内容を "&&" で連結すると exit=0 になる (正しい)。
```

## 関連グラフ

- 原因/親ノード: <該当なし>
- 関連仕様: <該当なし>
- 関連アーキテクチャ: <該当なし>
- 解決タスク: <未起票>

## 受入条件

- [ ] 改行区切りの `git restore <保護対象外パス>` の直後に続く無関係な
      `git add <保護対象パス>` を含む複数行コマンドが誤って BLOCK されない
- [ ] 同一保護対象パスを対象にした単一行の `git restore <保護対象パス>` は
      引き続き正しく BLOCK される (回帰なし)
- [ ] `python3 -m pytest plugins/dev-graph/tests -q` が全 pass する

## 検証証跡

- PR #499 (`agent/task-20260726-095531-wt-8` ブランチ) の最終レビュー作業中に実測。
  再現コマンドと結果は上記「再現手順」節を参照 (read-only なオフライン検証のみ、
  書込みは発生していない)。
