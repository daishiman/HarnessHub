# dev-graph

dev-graph は、repository内のMarkdownと`.dev-graph/state/graph.json`を正本にして、作業ノード・依存関係・tracker投影・複数worktree実行を管理するlocal-first pluginです。

## Public command

`/dev-graph`のpublic verbは次の6つです。

```text
/dev-graph node ...
/dev-graph next ...
/dev-graph worktree <claim|heartbeat|park|release|reclaim|list> ...
/dev-graph status ...
/dev-graph sync ...
/dev-graph render ...
```

運用ループは`node → next → worktree → status → sync`です。`render`は任意の時点で実行できます。

| verb | 役割 | 主な出力 |
|---|---|---|
| `node` | 1ノードのMarkdownとgraphをall-or-noneで追加・差分更新 | `issues/`、`tasks/`、`specs/`、`architecture/`、`docs/`、`features/`＋graph |
| `next` | 依存・resource競合・active leaseを満たす次のbatchを計算 | 画面＋`eval-log/` |
| `worktree` | worktree leaseをclaim/更新/解放 | `<git-common-dir>/dev-graph/{leases,events}.json` |
| `status` | node・依存・完了状態をread-only検索 | 画面＋`eval-log/` |
| `sync` | Beads/GitHub/PRと冪等収束 | graph＋外部tracker＋完了時の`tasks/` |
| `render` | 外部依存なしの静的SVG/HTMLを生成 | `.dev-graph/render/index.html` |

## Direct script smoke checks

repository rootで次を実行できます。

```bash
python3 plugins/dev-graph/scripts/resolve-repo-context.py --repo-root "$PWD" --mode read
python3 plugins/dev-graph/scripts/validate-graph-schema.py --repo-root "$PWD" --graph .dev-graph/state/graph.json
python3 plugins/dev-graph/scripts/schedule-graph.py --repo-root "$PWD" --graph .dev-graph/state/graph.json --leases "$(git rev-parse --git-common-dir)/dev-graph/leases.json" --eval-log eval-log/run-dev-graph-schedule-execution.json
python3 plugins/dev-graph/scripts/status-graph.py --repo-root "$PWD" --status active
python3 plugins/dev-graph/scripts/manage-worktree-lease.py --repo-root "$PWD" --op list
python3 plugins/dev-graph/scripts/sync-graph.py --repo-root "$PWD" --dry-run
python3 plugins/dev-graph/scripts/render-graph-html.py --repo-root "$PWD" --graph .dev-graph/state/graph.json --out .dev-graph/render/index.html
```

`node`は、完全なnodeまたは既存nodeへのpatchをJSONで渡します。`body`はfrontmatterを含めません。

```json
{
  "graph_node_id": "task-example",
  "patch": {"graph_node_id": "task-example", "status": "active"},
  "body": "# 目的\n\n差分更新後の本文"
}
```

```bash
python3 plugins/dev-graph/scripts/upsert-node.py \
  --repo-root "$PWD" \
  --input .dev-graph/staging/node-input.json \
  --dry-run
```

## Safety boundaries

- `node`だけが通常のgraph/content writerです。package登録とlifecycle更新もC02 writer契約を経由します。
- `node`はWAL（先行書込みログ）を使い、割込み後は次の`node`実行でrollbackしてから再実行します。pending中はread-only consumerがfail-closedで停止します。
- `next`と`status`はgraph/content/tracker/leaseを変更しません。許可する書込みは`eval-log/`だけです。
- worktree leaseは`.dev-graph/locks/`へ保存しません。git共通ディレクトリ配下の`dev-graph/`を使います。
- `sync --dry-run`はlocal/Beads/GitHub/Projects writeを0件にします。
- `sync-graph.py --apply`後は同じ入力で`--dry-run`を再実行し、`changes=0`と`pending_retry=[]`を確認します。fixture adapterは`--remote-state <repo内JSON>`で決定論的に試験できます。
- `render`はgraphを変更せず、repository内のHTML出力だけを書き換えます。
- 旧`init/spec/requirements/decompose/plan/system-spec`はpublic dispatcherから除外されています。上流成果物は専用plugin/Skillで確定し、`node`でdev-graphへ登録します。

## Validation

```bash
python3 -m pytest plugins/dev-graph/tests -q
claude plugin validate plugins/dev-graph
```
