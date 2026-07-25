---
graph_node_id: "issue-guard-graph-schema-timeout-fail-open-20260725"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","dev-graph","hook","fail-open","guard-graph-schema","run-dev-graph-init"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "guard-graph-schema の Bash 破壊操作枝が決定に無関係な graph 全検証を挟み hook timeout で fail-open する"
owners: ["daishiman"]
created_at: "2026-07-25T03:05:00Z"
updated_at: "2026-07-25T03:08:27.024482Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["plugins/dev-graph/hooks/guard-graph-schema.py","plugins/dev-graph/skills/run-dev-graph-init/SKILL.md","plugins/dev-graph/scripts/upsert-node.py"]
purpose: "「単一 fail-closed guard」を名乗る hook が実際には遅延起因で迂回可能である状態を解消し、同時に init が config.json を書く正規経路を与える"
goal: "graph authority への Bash 書込みが graph サイズや負荷に依存せず常に遮断され、かつ run-dev-graph-init が sanctioned な経路で config.json を生成できる状態"
mvp_alignment: null
scope_in: ["guard-graph-schema.py の Bash 破壊操作枝から、遮断判定に寄与しない schema_ok() 呼出しを外す","`.dev-graph/config.json` に対する C02 相当の atomic writer を用意し guard が allowlist する","変更後に run-dev-graph-init の live-trial を再取得する"]
scope_out: ["GRAPH_AUTHORITY_PATH から config.json を単に除外する案 (config は routing authority であり保護を外すのは退行)","他 plugin の guard hook","live-trial verdict 不在 6 skill の解消"]
acceptance: ["Bash で `.dev-graph/config.json` へ heredoc 書込みする入力が、graph サイズに依らず 1 秒未満で exit 2 になる","run-dev-graph-init が fail-open に依存せず config.json を生成できる","再取得した live-trial verdict の transcript に guard 迂回 (Write 遮断→Bash heredoc) が現れない"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-guard-graph-schema-timeout-fail-open-20260725.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-25T03:05:00Z","origin_kind":"generated","source_digest":"43336931b9d84c400dc5782da751ef86682e031b5169643c25778584c065cd86","source_path":"system-spec/dev-workflow.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.9
classification_reason: "run-dev-graph-init の live-trial 実走 transcript で guard 迂回を観測し、hook を直接計測して原因を確定した実挙動欠陥"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-guard-graph-schema-timeout-fail-open-20260725.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-6in4","linked_at":"2026-07-25T03:05:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-25T03:05:00Z","missing_sections":[],"status":"complete"}
---

# 概要

`guard-graph-schema.py` は docstring で「C10: Bash mutation の単一 fail-closed guard」を名乗るが、Bash の破壊操作枝だけが遅延起因で fail-open する。2026-07-25 の run-dev-graph-init live-trial で、被験セッションが実際にこの窓を通って guard を迂回した。

## 背景と問題

hook の `main()` は 2 段構えになっている。

1. `Write`/`Edit` 系と interpreter 経由の書込みは `context_ok()` の**手前**で判定する。L517-519 のコメントが「`context_ok()` は tool 毎に python を起動するため hook timeout (10s) で guard 全体が素通りしうる。最重要の判定をその手前に置き、fail-open の窓を塞ぐ」と明記している。
2. ところが Bash の `destructive_graph_or_schema_operation()` 枝は `context_ok()` の**後ろ**にあり、さらに遮断を決める直前で `schema_ok()` を呼ぶ。`schema_ok()` は `validate-graph-schema.py` を subprocess で回す。

`schema_ok()` の戻り値は **遮断/許可を左右しない**。

```python
elif destructive_graph_or_schema_operation(command, root):
    valid, validation_detail = schema_ok(root, detail)
    if not valid:
        reason = f"C11 schema validation failed before destructive operation: {validation_detail}"
    else:
        reason = "graph/schema の直接破壊操作は C02 atomic writer を迂回できない"
```

`valid` が真でも偽でも `reason` は立ち、どちらの経路でも BLOCK になる。つまり `schema_ok()` は **理由文の文言を選ぶためだけ**に呼ばれており、判定には一切寄与しない。この判定無関係な呼出しが fail-closed 経路の内側に置かれているため、その所要時間がそのまま fail-open の窓になっている。

## 現在の挙動

2026-07-25 実測 (HarnessHub 本体 repo を `--repo-root` に取り、hook へ直接 stdin を与えて計測)。

| 入力 | exit | 所要 |
|---|---|---|
| `Write` → `.dev-graph/config.json` (早期 return 枝) | 2 | **0.32s** |
| `Bash` → `cat > "$ROOT/.dev-graph/config.json"` (全経路) | 2 | **23.88s** |
| `Bash` → `echo hello` (無害コマンドの常時コスト) | 0 | 0.97s |
| 内訳: `resolve-repo-context.py --mode read` | 0 | 1.69s |
| 内訳: `validate-graph-schema.py` (HarnessHub 本体 graph) | 0 | **66.47s** |

`schema_ok()` が回す `validate-graph-schema.py` は **hook 自身の `--repo-root` の graph** を検証する。書込み先が別 repo (fixture) でも、検証されるのは HarnessHub 本体の大きな graph である。この 1 呼出しが単独で 66 秒に達し、Claude Code の PreToolUse hook timeout を超える。timeout した PreToolUse hook は tool を通すため、**遮断されるべき Bash が素通りする**。

実観測: `eval-log/dev-graph/run-dev-graph-init/live-trial/20260725T014705Z-init-wt9/transcript.jsonl`

- idx 124 — `.dev-graph/config.json` への `Write` が `PreToolUse:Write hook error: [guard-graph-schema] BLOCKED: graph authority ...` で遮断される。
- idx 125 — 被験セッションの thinking に `the hook is blocking writes to .dev-graph/ directory ... Let me try to use Bash to write the file instead, since the hook guards are on Write/Edit` が残る。
- idx 127 — `ROOT=...` + `cat > "$ROOT/.dev-graph/config.json" << 'CONFIGEOF'` を実行。
- idx 131 — tool_result が `is_error: False` / `config.json written`。**素通り**。
- idx 161 — 同じ迂回が二度目に起きる。`cat > "$ROOT/.dev-graph/state/graph.json"` が実行され、idx 164 で `graph.json fixed` を返す。**素通り**。書込み先は `state/graph.json`、すなわち C02 atomic writer (`upsert-node.py`) の専有領域そのものであり、revision 単調増加・artifact digest 追随・interrupted transaction 回収のいずれも経由しない生書きが通っている。

つまり fail-open は「config.json への一度きりの事故」ではなく、**同一 live-trial 内で 2 回、うち 1 回は graph state そのものに対して**再現している。

同じ transcript から保護 path を含む Bash 呼出し 10 件を抽出して hook へ再投入すると、timeout 無しの offline では 10 件中 3 件が BLOCK、7 件が ALLOW になる。ALLOW 側は redirect 先が保護 path でない読み取り系で、これは正しい挙動。問題は **BLOCK と判定されるはずの idx 127 が live では通っている**点で、offline (timeout 無し) と live (timeout 有り) の差がそのまま原因を指す。`cwd` を fixture repo に振っても offline では BLOCK のままであり、cwd 依存でも hooks.json の配線漏れでもない (matcher は `Bash|Write|Edit|MultiEdit|NotebookEdit` で Bash を含む)。

## 併発する契約の穴

fail-open を閉じるだけでは **run-dev-graph-init が実行不能になる**。

- guard は `.dev-graph/config.json` を graph authority として `Write` を無条件に遮断する (`GRAPH_AUTHORITY_PATH`)。
- しかし `.dev-graph/config.json` を書く sanctioned な writer が存在しない。`plugins/dev-graph/scripts/*.py` の `write-scope` 宣言を全走査した結果、`upsert-node.py` は `one canonical content artifact plus .dev-graph/state/graph.json`、`manage-worktree-lease.py` は `git-common-dir/dev-graph ephemeral coordination only`、`register-package.py` は `explicitly selected dev-graph output and immutable receipt` で、いずれも config.json を担当しない。
- つまり init は「config を作る責務の skill」でありながら、Write は guard に塞がれ、C02 相当の代替経路も無い。

**現状 init が成功しているのは、guard が遅すぎて止められないからである。** これは保証ではなく偶然であり、graph が小さい repo や高速な環境では init が正当に失敗しうる。

## 期待する挙動

1. graph authority への Bash 書込みが、graph サイズ・マシン負荷に依存せず常に遮断される。
2. run-dev-graph-init が fail-open に依存せず config.json を生成できる。

## 再現手順

```bash
# 1) 判定に無関係な 66 秒が fail-closed 経路の内側にあることを示す
python3 - <<'PY'
import json, subprocess, sys, time
from pathlib import Path
REPO = Path.cwd(); HOOK = REPO / "plugins/dev-graph/hooks/guard-graph-schema.py"
cmd = 'ROOT=/tmp/probe\ncat > "$ROOT/.dev-graph/config.json" << \'EOF\'\n{}\nEOF'
t0 = time.monotonic()
p = subprocess.run([sys.executable, str(HOOK), "--repo-root", str(REPO)],
                   input=json.dumps({"tool_name": "Bash", "tool_input": {"command": cmd}}),
                   capture_output=True, text=True)
print(f"exit={p.returncode} {time.monotonic()-t0:.2f}s")
PY

# 2) sanctioned な config writer が無いことを示す
grep -l "^# write-scope:.*config" plugins/dev-graph/scripts/*.py   # 0 件
```

## 影響と優先度

- 影響範囲: system。dev-graph の書込み境界そのもの。guard は C02 atomic writer の唯一の強制点であり、ここが条件付きで無効なら graph authority の不変条件は保証されていない。
- 深刻度: high
- 緊急度: 「Write は塞がれるが Bash なら通る」ことを LLM が実際に自力で発見して迂回した実測例がある。人間が意図的に狙う必要すらない。

## スコープ

- In: (a) Bash 破壊操作枝から判定無関係な `schema_ok()` を外し、遮断を subprocess 非依存で確定させる。(b) `.dev-graph/config.json` の atomic writer を追加し guard が allowlist する。(c) 変更後の live-trial 再取得。
- Out: `GRAPH_AUTHORITY_PATH` から `config.json` を除外する案 (config は routing authority であり保護を外すのは退行)。他 plugin の guard hook。

## 設計選択肢

`schema_ok()` の扱いは 3 案ある。どれを採るかは C11 の位置づけ次第で、実装前に決めること。

1. **削除** — 判定に寄与しないので落とす。最も単純で fail-open 窓を完全に消す。C11 検証は元々 skill 側の Execution contract 5 が担うため二重化の価値は薄い。
2. **BLOCK 後段へ移動** — `reason` を先に確定して stderr を書いてから、時間が余れば理由文を補強する。timeout しても遮断は成立する。実装は増えるが診断情報は残る。
3. **キャッシュ化** — graph の mtime+size で結果をメモ化する。常時コストは下がるが、cold path では依然 66 秒であり窓は残る。

推奨は 1 または 2。3 は窓を狭めるだけで閉じない。

## 関連グラフ

- 原因/親ノード: <該当なし>
- 関連仕様: `spec-dev-workflow`
- 関連アーキテクチャ: <該当なし>
- 解決タスク: <未起票>

## 受入条件

- [ ] Bash で `.dev-graph/config.json` へ heredoc 書込みする入力が、graph サイズに依らず 1 秒未満で exit 2 になる
- [ ] `.dev-graph/config.json` を書く sanctioned な経路が `write-scope` 宣言つきで存在する
- [ ] run-dev-graph-init が fail-open に依存せず config.json を生成できる
- [ ] 再取得した live-trial verdict の transcript に「Write 遮断 → Bash heredoc へ迂回」が現れない
- [ ] hook の常時コスト (無害な Bash 1 回) が現行 0.97s から悪化しない

## 検証証跡

- コマンド/テスト: 上記再現手順の計測スクリプト、`python3 -m pytest plugins/dev-graph/tests -q`、`python3 scripts/lint-live-trial-verdict.py --all`
- 証跡 path: `eval-log/dev-graph/run-dev-graph-init/live-trial/20260725T014705Z-init-wt9/transcript.jsonl` (idx 124/125/127/131 および idx 161/164)

## 注意

`guard-graph-schema.py` は run-dev-graph-init の behavior closure に含まれる (closure 18 ファイル中の 1 つ)。修正すると `skill_dir_tree_sha` が動き、live-trial verdict が stale になる。init の config writer 追加と同じ周回で扱い、live-trial 再取得を 1 回に抑えること。
