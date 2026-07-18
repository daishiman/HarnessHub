---
name: dev-graph
description: dev-graph を操作したいとき、init/node/status/sync/spec/plan/requirements/render/decompose/next/worktree を正規 capability へ dispatch したいときに使う。
kind: command
version: 0.1.0
owner: harness maintainers
source: plugin-plans/dev-graph/component-inventory.json#C09
argument-hint: "<init|node|status|sync|spec|requirements|render|decompose|next|worktree> [args] | plan --feature-id ID --feature-context RELATIVE_JSON"
allowed-tools: [Read, Bash, Skill]
disable-model-invocation: false
---

# /dev-graph dispatcher

最初の token を verb として厳密に解釈する。未知 verb、依存 plugin/script 不在、root context 不正は候補一覧を返して停止し、近似実行しない。

下表は verb ごとに「そこで何をするか（概要）」「成果物をどこに生成するか（出力先）」「どの capability へ振り分けるか（dispatch）」をまとめたもの。成果物の置き場所は大きく3系統ある。

- **content root**（`issues/ tasks/ specs/ architecture/ features/ docs/ system-spec/` の7つ。呼出し元 repo 直下に置く Markdown ドキュメント群。config.json の `content_roots` が正本）。
- **`.dev-graph/`**（グラフ状態・キャッシュ・描画結果などツール内部データ）。
- **`eval-log/`**（各実行の記録ログ）。

「副作用なし」＝ファイルを書き換えず結果を表示するだけ、の意味。

| verb | 概要（そこで何をするか） | 成果物の出力先 | dispatch |
|---|---|---|---|
| init | dev-graph を初期化する（作業グラフ＝タスク依存関係図の土台を用意。冪等＝何度実行しても同じ状態） | content root **6個**（`issues/ tasks/ specs/ architecture/ features/ docs/`）＋ `.dev-graph/`（config.json・state/・cache/・locks/・templates/）。※7個目の `system-spec/` は init では作らず `spec` が用意する | Skill `run-dev-graph-init` |
| node | グラフ上のノード（node＝1作業単位）を正規 path へ atomic（全部成功か全部失敗か）で追加・差分更新する | 種類別 content root（issue→`issues/`、task→`tasks/`、仕様→`specs/`、設計→`architecture/`、文書→`docs/`、feature→`features/`）＋ `.dev-graph/state/graph.json` | Skill `run-dev-graph-node` |
| status | ノードを条件検索し、依存・完了状態を確認する（副作用なし＝表示のみ） | 出力なし（画面表示）＋ `eval-log/` に実行ログ | Skill `run-dev-graph-status` |
| sync | dev-graph と Beads / GitHub Issues・PR を突き合わせて同期する（冪等収束） | `.dev-graph/state/graph.json` ＋ 外部（Beads DB・GitHub）＋ lifecycle 収束時は `tasks/` | Skill `run-dev-graph-sync` |
| spec | システム仕様（作るものの仕様書）を作成し、確定仕様・設計を dev-graph へ取り込む | `system-spec/`（harness 生成）＋ `specs/`・`architecture/`（ノード登録）＋ `.dev-graph/state/graph.json` | Skill `run-dev-graph-system-spec` (system-spec-harness 引用) |
| plan | 着手可能になった feature を実行タスクへ計画する（大きな未分解の構想は直接受けない） | `.dev-graph/staging/`→`.dev-graph/plans/`（feature package）。※実際に書くのは外部 skill 側で dev-graph 本体は書かない | external Skill `run-system-dev-plan`。`--feature-id` と repo-relative `--feature-context` 必須 |
| requirements | 確定仕様と feature package から実装要件を導出し、準備完了時だけ次工程へ handoff（引き継ぎ）する | 要件定義書＋ `--handoff-target` で指定した引き継ぎ先（capability-build / task-graph）。※`architecture/`・`features/`・`docs/` は入力であり出力ではない | Skill `run-dev-graph-requirements` |
| render | dev-graph を静的 HTML に可視化する（外部 CDN 不要の自己完結 SVG＋図） | `.dev-graph/render/index.html`（`--out` で指定）。グラフ自体は read-only | Skill `run-dev-graph-render` |
| decompose | 大きな構想を feature・architecture・機能間依存へマクロ分解する | `features/`（feature ノード）＋ `architecture/` ＋ `.dev-graph/state/graph.json`。ready feature は外部 planner 経由で `.dev-graph/staging/`→`plans/` と `tasks/<feature>/` へ | Skill `run-dev-graph-decompose` (macro feature only) |
| next | 依存・競合・lease を満たす、次に着手できる作業バッチを算出する（副作用なし＝提示のみ） | 出力なし（画面表示）＋ `eval-log/` に実行ログ | Skill `run-dev-graph-schedule` |
| worktree | worktree（作業用に複製したディレクトリ）の占有権を管理する | **git 共通ディレクトリ配下の `dev-graph/`**（`leases.json`・`events.json`）。claim 時は `.dev-graph/state/graph.json` にも実行コンテキストを記録。※`.dev-graph/locks/` は使わない | `scripts/manage-worktree-lease.py` |

> 補足: dev-graph 自身のスキル系 verb（init/node/status/sync/spec/requirements/render/decompose/next）は、実行のたびに `eval-log/run-dev-graph-<verb>-*.json(l)` へ進捗・評価ログを残す（status・next のような表示のみ系も含む）。`plan`（外部 skill）と `worktree`（純スクリプト）は dev-graph の eval-log 契約の対象外。

`worktree` は `claim|heartbeat|park|release|list` だけを許可し、必ず `--repo-root "$CLAUDE_PROJECT_DIR"` を渡す。位置引数をscriptへそのまま渡さず、次の正準flagへ一度だけ変換する。

各操作の役割は次のとおり。いずれもリース（lease＝worktree の一時的な占有権。複数セッションが同じ作業を奪い合わないための作業ロック）を扱い、記録は **git 共通ディレクトリ配下の `dev-graph/`**（`leases.json`・`events.json`。例: `.git/dev-graph/leases.json`）に残る。init が作る `.dev-graph/locks/` はこのリース管理では使われない点に注意。lease は既定 30 分で失効し（config の `lease_ttl_seconds=1800`）、`heartbeat` は既定 60 秒間隔で延長する。

| 操作 | そこで何をするか | 出力・効果 |
|---|---|---|
| `list` | 現在のリース割り当て状況を一覧表示する | 画面表示（副作用なし） |
| `claim` | 指定ノードの作業権を自分の session に割り当てて確保する | `<git共通dir>/dev-graph/leases.json` にリース作成＋graph node へ実行コンテキスト記録＋`devgraph/<id>` ブランチ作成 |
| `heartbeat` | 保持中のリースが生きていることを定期通知し、失効（timeout による自動解放）を防ぐ | リースの有効期限を延長 |
| `park` | リースを一時退避（park＝中断して脇に置く）する | リースを保留状態へ |
| `release` | 作業権を解放し、他 session が claim できる状態へ戻す | リース削除 |

下表は、ユーザーが打つ形（public form）を script が受け取る正準的な引数（script form）へどう変換するかの対応。

| public form | script form |
|---|---|
| `worktree list` | `manage-worktree-lease.py --op list` |
| `worktree claim <id> --branch <name> --session-id <session>` | `manage-worktree-lease.py --op claim --graph-node-id <id> --branch <name> --session-id <session>` |
| `worktree heartbeat <id> --session-id <session>` | `manage-worktree-lease.py --op heartbeat --graph-node-id <id> --session-id <session>` |
| `worktree park <id> --session-id <session>` | `manage-worktree-lease.py --op park --graph-node-id <id> --session-id <session>` |
| `worktree release <id> --session-id <session>` | `manage-worktree-lease.py --op release --graph-node-id <id> --session-id <session>` |

claim は graph node id、branch、session identity が必須。`plan` は大きな未分解構想を直接受けず、C14 が生成した ready feature を `--feature-id` と caller-repository 相対 JSON `--feature-context` で要求する。両者の id/digest が一致しなければ停止する。

引数は選択した Skill/script にそのまま引き継ぐが shell 文字列として再評価しない。dispatch 前に `resolve-repo-context.py --mode read` を実行する。
