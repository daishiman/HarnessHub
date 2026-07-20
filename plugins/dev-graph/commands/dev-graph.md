---
name: dev-graph
description: dev-graph の運用ループを node/next/worktree/status/sync/render の6 verbで実行するときに使う。
kind: command
version: 0.2.0
owner: harness maintainers
source: plugins/dev-graph/commands/dev-graph.md
argument-hint: "<node|next|worktree|status|sync|render> [args]"
allowed-tools: [Read, Bash, Skill]
disable-model-invocation: false
---

# /dev-graph

最初の token を verb として厳密に解釈し、次の6機能だけへ dispatch する。未知 verb、旧 verb、依存 Skill/script 不在、repository context 不正は候補一覧を表示して停止する。近似実行や shell 文字列の再評価は行わない。

| verb | 機能 | 正本・出力 | dispatch |
|---|---|---|---|
| `node` | グラフ上のノード（1作業単位）を正規 path へ atomic（全部成功か全部失敗か）で追加・差分更新する | 種類別 content root（issue→`issues/`、task→`tasks/`、仕様→`specs/`、設計→`architecture/`、文書→`docs/`、feature→`features/`）＋`.dev-graph/state/graph.json` | Skill `run-dev-graph-node` |
| `next` | 依存・競合・lease を満たす、次に着手できる作業バッチを算出する | 画面表示＋`eval-log/run-dev-graph-schedule-execution.json`。graph/tracker/leaseはread-only | Skill `run-dev-graph-schedule` |
| `worktree` | worktree（作業用ディレクトリ）の占有権を管理する | git共通ディレクトリ配下の`dev-graph/leases.json`・`events.json`。claim時だけgraphへ実行contextを投影する。`.dev-graph/locks/`は使わない | `scripts/manage-worktree-lease.py` |
| `status` | ノードを条件検索し、依存・完了状態を確認する | 画面表示＋`eval-log/run-dev-graph-status-execution.json`。graph/content/trackerはread-only | Skill `run-dev-graph-status` |
| `sync` | dev-graphとBeads/GitHub Issues・PRを3-wayで突き合わせ、同じ入力の再実行で差分0へ収束させる | graph＋sync snapshot＋外部tracker。lifecycle収束時だけ`tasks/`をC02 writer経由で更新 | Skill `run-dev-graph-sync` |
| `render` | dev-graphを外部CDN不要の自己完結HTMLへ可視化する | 既定`.dev-graph/render/index.html`（`--out`で変更）。graphはread-only | Skill `run-dev-graph-render` |

運用ループは`node → next → worktree → status → sync`を状況に応じて繰り返し、`render`は任意の時点で実行する。

## 共通 preflight

1. 呼出し元repository rootを`--repo-root`、`CLAUDE_PROJECT_DIR`、現在地の順で1回だけ確定する。
2. `next/status/render/worktree list`は`resolve-repo-context.py --mode read`、`node/sync/worktree claim|heartbeat|park|release`は`--mode write`で実行する。
3. configの`local_state.graph`を正規graph pathとして使い、以後cwdから再解決しない。
4. write操作は`--dry-run`が指定されたらgraph/content/external writeを0件にする。

## verb契約

### node

`run-dev-graph-node`を呼び、preview後に`upsert-node.py`へ検証済みJSONを渡す。入力は完全な`node`または既存nodeへの`patch`と、frontmatterを含まない`body`を持つ。`graph_node_id`は不変で、`artifact_kind`からcontent rootを決める。2ファイル更新はWAL（先行書込みログ）で保護し、割込み後は次のnode起動時にrollbackする。pending中はread-only verbもfail-closedで停止する。

### next

`run-dev-graph-schedule`を呼ぶ。git共通ディレクトリの`dev-graph/leases.json`を必須snapshotとして渡し、graph/tracker/leaseの実行前後digestを確認する。Beads bindingでは`bd-bridge.py ready`のedge parity確認済み候補だけを採用し、GitHub/noneはlocal graphから計算する。`--scope`と`--max-parallel`をそのまま渡す。

### worktree

許可操作は`claim|heartbeat|park|release|reclaim|list`だけ。必ず`--repo-root <root>`を付け、public formを次の正準flagへ変換する。

| public form | script form |
|---|---|
| `worktree list` | `--op list` |
| `worktree claim <id> --branch <name> --session-id <session>` | `--op claim --graph-node-id <id> --branch <name> --session-id <session>` |
| `worktree heartbeat <id> --session-id <session>` | `--op heartbeat --graph-node-id <id> --session-id <session>` |
| `worktree park <id> --session-id <session>` | `--op park --graph-node-id <id> --session-id <session>` |
| `worktree release <id> --session-id <session>` | `--op release --graph-node-id <id> --session-id <session>` |
| `worktree reclaim <id>` | `--op reclaim --graph-node-id <id>` |

`claim`は`graph_node_id`、`session_id`、正準branch `devgraph/<graph_node_id>`を要求する。`reclaim`は期限切れleaseだけを明示的に`released`へ遷移させる。lease正本は`git rev-parse --git-common-dir`で得た共通dirの`dev-graph/`に限定する。listの実体呼出しは`manage-worktree-lease.py --op list --repo-root <root>`である。

### status

`run-dev-graph-status`を呼ぶ。filterは`id/kind/project/domain/status/tag/keyword`のAND条件とし、結果0件も成功とする。結果には依存・completion・tracker linkage・execution contextを含める。書込み先はrepository内の`eval-log/`配下だけを許可する。

### sync

`run-dev-graph-sync`を呼び、実行本体は`sync-graph.py`とする。bindingごとの単一authorityを守り、last-synced snapshotとの3-way差分を作る。close/deleteは物理削除せずclosed/tombstonedへ収束し、Projectsの部分失敗はalias単位`pending_retry`として残す。`--dry-run`→承認済み`--apply`→同じ入力の`--dry-run`を行い、`imports=[]`、`exports=[]`、`pending_retry=[]`、`changes=0`を完了条件にする。PR完了は`reconcile-github-lifecycle.py`でdefault branchへのmergeと`required_pull_requests=all|any`を検証した場合だけ採用する。

### render

`run-dev-graph-render`を呼ぶ。`render-graph-html.py`へ検証済みgraph、任意の`--scope`・registration receipt、repository内output pathを渡す。出力HTMLはSVG/CSS/JSをinline化し、外部`script/link`参照を0件にする。

## 旧 verb

`init`、`spec`、`requirements`、`decompose`、`plan`、`system-spec`はこのdispatcherの運用面から除外した。必要な上流設計・計画は専用plugin/Skillを直接呼び、確定成果だけを`/dev-graph node`で登録する。
