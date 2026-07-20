# HarnessHub

Claude Code 用 plugin 群の配布ハブであり、Harness Hub 本体（Self-Service Publish Control Plane）の開発リポジトリです。plugin の正本は `plugins/`、設計資料は `doc/`、配布境界は `CONVENTIONS.md` にあります。

この README は、新機能を次の順で進めるための実行手順書です。

1. `/dev-graph` で要件・設計・タスク仕様書を作る
2. Beads（`bd`）と strandkanban（旧 beads-kanban）でタスクを見える化する
3. Claude Code と相談して、次に実行するタスクを決める
4. タスクを claim（担当として引き受けること）し、実装・検証・PR作成まで進める

`/dev-graph ...` は Claude Code のプロンプトへ入力するスラッシュコマンドです。`bd ...`、`git ...`、`gh ...` はターミナルで実行するコマンドです。

---

# Part 1: `/dev-graph` の11手順

## dispatcher の基本ルール

`/dev-graph` は最初の token を verb（動作を表す語）として厳密に解釈します。未知の verb、依存 plugin／script の不在、repository root の誤りを検出した場合は、候補一覧を返して停止します。似たコマンドを推測して実行することはありません。

成果物の保存先は、次の3系統です。

- **content root**: repository 直下の `issues/`、`tasks/`、`specs/`、`architecture/`、`features/`、`docs/`、`system-spec/`
- **`.dev-graph/`**: グラフ状態、cache、lock、plan、描画結果などの内部データ
- **`eval-log/`**: 各 command の実行記録・評価ログ

「副作用なし」は、グラフや文書を書き換えず、結果を表示するだけという意味です。ただし `next` と `status` も評価記録として `eval-log/` は更新します。

## 11 verb の役割・出力先・dispatch 先

| # | verb | そこで何をするか | 主な出力先 | dispatch |
|---|---|---|---|---|
| 1 | `init` | dev-graph を初期化し、作業グラフ（タスク依存関係図）の土台を用意する。冪等（べきとう＝何度実行しても同じ状態） | content root 6個（`issues/ tasks/ specs/ architecture/ features/ docs/`）＋ `.dev-graph/`。`system-spec/` は `spec` が用意する | Skill `run-dev-graph-init` |
| 2 | `spec` | システム仕様（作るものの仕様書）を作成し、確定仕様・設計を dev-graph へ取り込む | `system-spec/` ＋ `specs/` ＋ `architecture/` ＋ `.dev-graph/state/graph.json` | Skill `run-dev-graph-system-spec`（system-spec-harness を引用） |
| 3 | `decompose` | 大きな構想を feature、architecture、機能間依存へマクロ分解する | `features/` ＋ `architecture/` ＋ `.dev-graph/state/graph.json` | Skill `run-dev-graph-decompose` |
| 4 | `plan` | 着手可能になった1 feature を実行可能なタスク仕様書へ分解する | `.dev-graph/staging/` → `.dev-graph/plans/`。昇格後は `tasks/<feature>/` | external Skill `run-system-dev-plan` |
| 5 | `requirements` | 確定仕様と feature package から実装要件を導出し、準備完了時だけ次工程へ handoff（引き継ぎ）する | 要件定義書 ＋ `--handoff-target` で指定した capability-build／task-graph | Skill `run-dev-graph-requirements` |
| 6 | `node` | 上位 command が自動登録しない node（1作業単位）を正規 path へ atomic（全部成功か全部失敗か）で追加・差分更新する | 種類別 content root ＋ `.dev-graph/state/graph.json` | Skill `run-dev-graph-node` |
| 7 | `next` | 依存、resource 競合、lease を満たす、次に着手できる作業 batch を算出する | 画面表示 ＋ `eval-log/`。グラフへの副作用なし | Skill `run-dev-graph-schedule` |
| 8 | `worktree` | worktree（作業用に複製したディレクトリ）の占有権を管理する | git 共通ディレクトリ配下の `dev-graph/leases.json` と `events.json`。claim 時は graph に実行 context も記録 | `scripts/manage-worktree-lease.py` |
| 9 | `status` | node を条件検索し、依存・確定・完了状態を確認する | 画面表示 ＋ `eval-log/`。グラフへの副作用なし | Skill `run-dev-graph-status` |
| 10 | `sync` | dev-graph と Beads／GitHub Issues／PR を突き合わせ、再実行で差分0へ収束させる | `.dev-graph/state/graph.json` ＋ Beads DB／GitHub。lifecycle 収束時は `tasks/` も更新 | Skill `run-dev-graph-sync` |
| 11 | `render` | dev-graph を、外部 CDN 不要の静的 HTML と SVG へ可視化する | `.dev-graph/render/index.html`（`--out` で変更可能） | Skill `run-dev-graph-render` |

dev-graph 自身の Skill を使う `init / spec / decompose / requirements / node / next / status / sync / render` は、実行ごとに `eval-log/run-dev-graph-<verb>-*.json(l)` へログを残します。外部 Skill の `plan` と純 script の `worktree` は、この eval-log 契約の対象外です。

## なぜこの順番なのか

| # | verb | 前工程との依存関係 |
|---|---|---|
| 1 | `init` | content root と `.dev-graph/` が無ければ、後続の登録先が存在しない |
| 2 | `spec` | 初期化済みの保存先へ確定仕様と設計を登録し、「何を作るか」を固める |
| 3 | `decompose` | 確定仕様を入力に、大きな構想を feature と architecture へ分解する |
| 4 | `plan` | `decompose` が生成した ready feature を実行タスクへ計画する。未分解の大構想は直接受けない |
| 5 | `requirements` | `plan` が生成した feature package と確定仕様から実装要件を導出する |
| 6 | `node` | 1〜5が自動登録しない成果物を、単一 writer（書き込み窓口）から追加・更新する |
| 7 | `next` | 組み上がったグラフから、依存・競合・lease を考慮した着手候補を出す |
| 8 | `worktree` | `next` が示した作業を claim し、実作業の占有権を確保する |
| 9 | `status` | 着手中 node の依存・確定・完了状態を監視する |
| 10 | `sync` | 実作業の結果を Beads／GitHub と同期し、状態を収束させる |
| 11 | `render` | 任意の時点で、現在の依存グラフを静的 HTML にする |

`init → spec → decompose → plan → requirements` は、前工程の出力を次工程が使う一方向パイプラインです。`node → next → worktree → status → sync` は開発中に繰り返す運用ループで、`render` は随時実行できます。

## Claude Code に入力する基本形

以下は Claude Code のプロンプトへ1行ずつ入力します。`<...>` は実際の値へ置き換えてください。

```text
/dev-graph init
/dev-graph spec
/dev-graph decompose "<実現したい新機能と既存機能との関係>"
/dev-graph plan --feature-id <feature-id> --feature-context features/<feature-id>.context.json
/dev-graph requirements --feature-id <feature-id> --handoff-target <capability-build-or-task-graph>
```

`plan` の `--feature-context` は repository 相対 path が必須です。JSON には次の9 field が必要で、`graph_node_id` は `--feature-id` と一致しなければなりません。

```json
{
  "graph_node_id": "feat-example",
  "artifact_kind": "feature",
  "purpose": "この機能が必要な理由",
  "goal": "達成する状態",
  "scope_in": ["含む範囲"],
  "scope_out": ["含まない範囲"],
  "acceptance": ["受け入れ条件"],
  "architecture_refs": ["architecture/example.md"],
  "updated_at": "2026-07-20T00:00:00Z"
}
```

通常の node を手動更新する場合は、完全な node または既存 node への `patch` を JSON で用意し、先に dry-run（試行のみ）します。上位 command が登録済みなら、同じ内容を重ねて登録する必要はありません。

```text
/dev-graph node upsert --input .dev-graph/staging/<node-input>.json --dry-run
/dev-graph node upsert --input .dev-graph/staging/<node-input>.json
/dev-graph next
/dev-graph status --id <graph-node-id>
/dev-graph sync
/dev-graph render
```

## `worktree` の5操作

`worktree` が受け付ける操作は `list / claim / heartbeat / park / release` だけです。lease（リース＝複数セッションが同じ作業を奪い合わないための一時的な占有権）は、既定30分で失効します。

```text
/dev-graph worktree list
/dev-graph worktree claim <graph-node-id> --branch devgraph/<graph-node-id> --session-id <session-id>
/dev-graph worktree heartbeat <graph-node-id> --session-id <session-id>
/dev-graph worktree park <graph-node-id> --session-id <session-id>
/dev-graph worktree release <graph-node-id> --session-id <session-id>
```

dispatcher は public form（ユーザーが入力する形）を次の正準 flag へ一度だけ変換し、必ず `--repo-root "$CLAUDE_PROJECT_DIR"` を script に渡します。位置引数を shell 文字列として再評価しません。

| public form | script form |
|---|---|
| `worktree list` | `manage-worktree-lease.py --repo-root "$CLAUDE_PROJECT_DIR" --op list` |
| `worktree claim <id> --branch <name> --session-id <session>` | `manage-worktree-lease.py --repo-root "$CLAUDE_PROJECT_DIR" --op claim --graph-node-id <id> --branch <name> --session-id <session>` |
| `worktree heartbeat <id> --session-id <session>` | `manage-worktree-lease.py --repo-root "$CLAUDE_PROJECT_DIR" --op heartbeat --graph-node-id <id> --session-id <session>` |
| `worktree park <id> --session-id <session>` | `manage-worktree-lease.py --repo-root "$CLAUDE_PROJECT_DIR" --op park --graph-node-id <id> --session-id <session>` |
| `worktree release <id> --session-id <session>` | `manage-worktree-lease.py --repo-root "$CLAUDE_PROJECT_DIR" --op release --graph-node-id <id> --session-id <session>` |

`.dev-graph/locks/` は plan などの内部 lock 用です。worktree lease の保存先ではありません。

---

# Part 2: 新機能を要件定義からPRまで進める

## 0. repository を開き、Claude Code を起動する

ターミナルで実行します。

```bash
cd /path/to/HarnessHub
bd prime
claude
```

`bd prime` は Beads の運用ルールを表示します。Claude Code の session 中に context が圧縮された場合や、別 session から再開する場合も、最初に再実行します。

## 1. 要件定義とシステム仕様を確定する

Claude Code へ入力します。

```text
/dev-graph init
/dev-graph spec
```

`spec` は system-spec-harness の正規フローを呼び出し、ヒアリング、必要な公式情報の取得、compile、独立完成度評価を進めます。質問が表示されたら、新機能の目的、利用者、範囲外、受け入れ条件、セキュリティ、データ、UI、運用条件を回答してください。

完了条件は、確定章と完成度 evaluator が PASS し、`system-spec/`、`specs/`、`architecture/`、graph の source lineage（どの仕様から作られたかの記録）が一致していることです。

## 2. 構想を feature へ分解する

Claude Code へ、機能だけでなく既存 feature との関係も書いて入力します。

```text
/dev-graph decompose "通知設定機能を追加する。認証済みユーザーが通知種別を選べるようにし、既存の配信基盤を再利用する"
```

生成された `features/<feature-id>.md` の `scope_in`、`scope_out`、`acceptance`、`architecture_refs` をレビューします。要件そのものが不足していた場合は、feature 文書で補わず `/dev-graph spec` へ戻ります。

```text
/dev-graph status --kind feature
/dev-graph render --scope <feature-id>
```

## 3. feature をタスク仕様書へ分解する

`features/<feature-id>.context.json` を用意し、Claude Code へ入力します。

```text
/dev-graph plan --feature-id <feature-id> --feature-context features/<feature-id>.context.json
```

`plan` は1つの confirmed feature を P01〜P13 の exact-13 task package へ分解します。13件すべてが検証に通った場合だけ一括登録され、1件でも不正なら部分登録せず停止します。

続けて、実装可能性を確認し、要件定義書を後段へ引き渡します。

```text
/dev-graph requirements --feature-id <feature-id> --handoff-target task-graph
```

readiness（実装準備状態）、source digest（入力内容の指紋）、P01〜P13 の整合に不備がある場合は handoff されません。表示された `missing_sections` を上流の仕様・feature・plan で直してから再実行します。

## 4. dev-graph のタスクを Beads へ同期する

Claude Code へ入力します。

```text
/dev-graph status --kind task
/dev-graph sync
/dev-graph render
```

`sync` は task node と Beads issue の対応を冪等に収束させます。同じ入力で再実行しても二重起票しません。

## 5. Beads と strandkanban でタスクを見える化する

### CLI で着手可能なタスクを確認する

ターミナルで実行します。

```bash
bd ready
bd blocked
bd list --status=in_progress
bd stats
bd show <beads-id>
bd graph <beads-id>
```

- `bd ready`: 依存ブロックの無い、今すぐ着手可能な issue
- `bd blocked`: ブロック中の issue と依存先
- `bd show`: 仕様、受け入れ条件、依存、外部参照を含む1件の詳細
- `bd graph`: 親子・依存関係の表示

### strandkanban（旧 beads-kanban）を起動する

初回だけ install します。現行版は clone 後に依存を入れて起動します。

```bash
git clone https://github.com/doublej/strandkanban ~/tools/strandkanban
cd ~/tools/strandkanban
bun install
```

`bun` が無い場合は `npm install` を使えます。起動時は、Beads DB を持つ HarnessHub の repository root を渡します。

```bash
~/tools/strandkanban/bin/strand /path/to/HarnessHub
```

表示された URL をブラウザで開きます。CLI や Claude Code が issue を更新すると看板も live 更新されます。

看板は「見て相談し、手動で整理する場所」です。完了の最終判定は看板の列ではなく、PR が merge 済みであるという GitHub の事実と、それを反映した Beads／dev-graph の状態です。

## 6. Claude Code と「次にどれをやるか」を相談する

新しい Claude Code session を開始して相談する場合は、ターミナルで次のように実行できます。

```bash
claude --name task-selection "次に着手するタスクを相談したい。bd ready、bd blocked、/dev-graph next、/dev-graph status を読み取り専用で確認し、依存関係、priority、resource競合、lease、タスク仕様書の準備状態を比較して、推奨する1件と理由を示してください。まだclaimやファイル変更はしないでください。"
```

すでに Claude Code を開いている場合は、引用符内の文章だけをプロンプトへ入力します。

```bash
次に着手するタスクを相談したい。bd ready、bd blocked、/dev-graph next、/dev-graph status を読み取り専用で確認し、依存関係、priority、resource競合、lease、タスク仕様書の準備状態を比較して、推奨する1件と理由を示してください。まだclaimやファイル変更はしないでください。

```
選定では次の順に確認します。

1. `bd ready` に出ていること
2. priority の高いものを優先すること（数値は0が最優先、4が backlog）
3. 多くの下流タスクを解放する上流タスクを優先すること
4. `/dev-graph next` で resource 競合や active lease が無いこと
5. `bd show <beads-id>` の受け入れ条件と task 仕様書が実行可能な粒度であること

Beads ID（例: `HarnessHub-abc`）と dev-graph node ID（例: `SYS-NOTIFICATION-P05`）は別の識別子です。着手前に両方を控えてください。

```bash
bd show <beads-id>
```

```text
/dev-graph status --id <graph-node-id>
/dev-graph next
```

## 7. 選んだタスクを claim する

まずターミナルで Beads issue を claim します。

```bash
bd update <beads-id> --claim
bd show <beads-id>
```

次に Claude Code で worktree lease を確保します。branch 名は `devgraph/<graph-node-id>` に固定します。`session-id` は同じ作業中に変えない一意な文字列を使います。

```text
/dev-graph worktree claim <graph-node-id> --branch devgraph/<graph-node-id> --session-id <session-id>
```

長時間作業では heartbeat を送ります。

```text
/dev-graph worktree heartbeat <graph-node-id> --session-id <session-id>
```

claim が衝突した場合は、他 session の lease を勝手に解放しません。`/dev-graph worktree list` で所有者を確認し、担当者と調整します。

## 8. Claude Code にタスクを実行させる

新しい session で実装を開始する場合の入力例です。

```bash
claude --name <beads-id> "Beads タスク <beads-id>（dev-graph node <graph-node-id>）を実行してください。最初に bd show と task 仕様書を読み、受け入れ条件、依存、変更範囲、必要な品質ゲートを確認してください。既存の未コミット変更を保持し、対象外ファイルを変更せず、実装と必要なテストまで進めてください。commit、push、PR作成はまだ行わず、変更内容と検証結果を報告してください。"
```

すでに対象 worktree で Claude Code を開いている場合は、引用符内の文章だけを入力します。

```bash
Beads タスク <beads-id>（dev-graph node <graph-node-id>）を実行してください。最初に bd show と task 仕様書を読み、受け入れ条件、依存、変更範囲、必要な品質ゲートを確認してください。既存の未コミット変更を保持し、対象外ファイルを変更せず、実装と必要なテストまで進めてください。commit、push、PR作成はまだ行わず、変更内容と検証結果を報告してください。
```

実装中に追加作業が見つかった場合は、現在の task へ無理に混ぜず Beads に follow-up issue を作り、必要なら依存を設定します。

```bash
bd create --title="<追加タスクの要約>" --description="<なぜ必要か・何をするか>" --type=task --priority=2
bd dep add <追加beads-id> <先に完了すべきbeads-id>
```

## 9. 品質ゲートを実行する

最優先は、task 仕様書に書かれた検証 command です。最低限、差分の構文不備と成果物の配置を確認します。

```bash
git status --short
git diff --check
python3 scripts/lint-artifact-placement.py
```

変更した plugin の test と package validation も実行します。たとえば dev-graph を変更した場合は次のとおりです。

```bash
python3 -m pytest plugins/dev-graph/tests -q
claude plugin validate plugins/dev-graph
```

repository 全体への影響がある変更は、必要に応じて full gate を実行します。

```bash
make test
```

失敗した検証を「既存不具合」と決めつけて無視せず、今回差分との因果を確認します。解消できない場合は PR 本文と Beads notes に、失敗 command、error、影響、再現方法を残します。

## 10. commit、push、PR作成を Claude Code に依頼する

変更と検証結果を確認した後、Claude Code へ次を入力します。この依頼は commit、push、PR作成を明示的に許可するものです。

```text
タスク <beads-id> の変更を最終レビューしてください。git status と diff を確認し、task 仕様書の品質ゲートを再実行してください。問題がなければ対象ファイルだけを commit し、branch devgraph/<graph-node-id> を origin へ push して、repository の正しい base branch 向けに draft PR を作成してください。PR 本文には目的、変更内容、検証結果、Beads ID、dev-graph node ID、残課題を記載してください。無関係な既存差分は commit しないでください。
```

手動で実行する場合は、対象 file を明示して stage します。

```bash
git status --short
git diff --check
git add <対象file-1> <対象file-2>
git commit -m "<変更内容を表すmessage>"
git push -u origin devgraph/<graph-node-id>
gh pr create --draft --base <base-branch> --head devgraph/<graph-node-id> --title "<PR title>" --body-file <PR本文file>
```

PR を作成しただけでは task 完了ではありません。review 対応中は Beads を `in_progress` のままにします。

## 11. PR merge 後に状態を収束させる

PR が default branch へ merge された後、Claude Code へ入力します。

```text
/dev-graph sync
/dev-graph status --id <graph-node-id>
/dev-graph worktree release <graph-node-id> --session-id <session-id>
/dev-graph render
```

ターミナルで Beads の状態を確認します。

```bash
bd show <beads-id>
```

merge fact（PR が merge 済みという事実）から自動 close されなかった場合だけ、PR番号を理由に明示して閉じます。

```bash
bd close <beads-id> --reason="PR #<number> merged"
bd close <beads-id> --suggest-next
```

チーム間で Beads DB をリモート同期する必要があり、その権限が明示されている場合だけ実行します。

```bash
bd dolt pull
bd dolt push
```

`.beads/issues.jsonl` は受動的な export であり、通信の正本ではありません。通常運用で直接編集したり、`bd import` を使って同期したりしないでください。

---

# Part 3: Beads と strandkanban の役割

## Beads が正本として持つもの

Beads は、実行タスク、担当、priority、依存、blocker、進捗を保持する課題トラッカーです。issue はローカルの Dolt DB（`.beads/dolt/`）に保存され、マシン間同期は git remote の `refs/dolt/data` を使います。

```bash
bd prime
bd ready
bd list --status=open
bd list --status=in_progress
bd blocked
bd show <id>
bd update <id> --claim
bd close <id> --reason="<完了理由>"
bd stats
bd doctor
```

AI エージェントは対話 editor を開く `bd edit` を使いません。field の更新は `bd update <id> --title ... --description ... --notes ...` のような非対話 command を使います。

## strandkanban が見せるもの

strandkanban は Beads issue をブラウザで見る live 看板です。タスクの作成・依存・完了状態の正本を別に持つものではありません。

| 確認したいこと | 使うもの |
|---|---|
| 次に着手可能な1件 | `bd ready` |
| ブロック理由・依存先 | `bd blocked` / `bd show <id>` |
| 人が全 task を一覧し、状態を相談する | strandkanban |
| resource 競合と lease を含む並行実行候補 | `/dev-graph next` |
| 仕様 → feature → task の全体 DAG | `/dev-graph render` |
| PR merge を含む完了の最終状態 | GitHub PR fact → `/dev-graph sync` → Beads |

看板を起動していなくても、Beads CLI と dev-graph だけで開発・自動同期は成立します。

---

# Part 4: 迷ったときの戻り先

| 状況 | 実行すること |
|---|---|
| 要件や技術決定が変わった | `/dev-graph spec` へ戻る |
| feature の範囲・依存が変わった | `/dev-graph decompose` を再実行し、必要な node 差分を正規 writer で反映する |
| feature context が変わった | `/dev-graph plan --feature-id ... --feature-context ...` を再実行する。生成済み task を個別手編集しない |
| requirements が handoff されない | `missing_sections` と readiness を直し、`/dev-graph requirements` を再実行する |
| Beads に task が見えない | `/dev-graph sync` 後に `bd ready` と `bd stats` を確認する |
| 何を着手すべきか分からない | `bd ready`、`/dev-graph next`、strandkanban を比較し、Claude Code に読み取り専用で相談する |
| lease が衝突した | `/dev-graph worktree list` で所有者を確認する。勝手に release しない |
| 実装中に要件不足を発見した | 実装で推測して埋めず、`/dev-graph spec` または Beads follow-up へ戻す |
| PR後に状態がずれる | `/dev-graph sync` を再実行し、`bd show` と `/dev-graph status` を確認する |

## いつでも実行できる状態確認

```bash
bd ready
bd blocked
bd stats
git status --short
python3 scripts/lint-artifact-placement.py
```

```text
/dev-graph status
/dev-graph next
/dev-graph worktree list
/dev-graph render
```

---

# 参考

- `/dev-graph` dispatcher の正本: `plugins/dev-graph/commands/dev-graph.md`
- dev-graph の実装契約: `plugins/dev-graph/skills/`
- exact-13 task plan の正本: `plugins/system-dev-planner/skills/run-system-dev-plan/SKILL.md`
- feature context schema: `plugins/system-dev-planner/schemas/feature-context.schema.json`
- 実行 tracker／完了 authority の正本: `plugins/dev-graph/references/execution-tracker-contract.md`
- Beads の全運用 context: `bd prime`
- Beads 同期の概要とアンチパターン: <https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md>
- Harness Hub の要件正本: `system-spec/index.md`
- 配布境界: `CONVENTIONS.md`
