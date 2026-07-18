# HarnessHub

Claude Code 用 plugin 群の配布ハブです。plugin の正本は `plugins/` 配下にあります (設計資料は `doc/`、配布境界の取り決めは `CONVENTIONS.md` を参照)。

このリポジトリのタスク管理には **beads (bd)** を使います。本 README では bd と、その live 実行看板である **strandkanban (ビーツ看板、旧称 beads-kanban)** の使い方をまとめます。

---

# Part 1: beads (bd) の使い方

## beads とは

**bd (beads)** は、依存関係を第一級で扱える軽量 issue トラッカーです。issue は数珠 (beads) のように依存でつながり、「今着手できる仕事 (ready)」「ブロックされている仕事 (blocked)」を機械的に判別できます。

- issue の実体はローカルの Dolt DB (`.beads/embeddeddolt`) にあります
- リモート同期は git remote 上の `refs/dolt/data` を使います (`bd dolt push` / `bd dolt pull`)
- `.beads/issues.jsonl` は受動的なエクスポートであり、直接編集しません

## セッションの始め方

```bash
bd prime     # AI/人間向けのワークフロー全体像とコマンド一覧を表示 (迷ったらまずこれ)
bd ready     # ブロッカーの無い「着手可能な issue」を一覧
bd show <id> # issue の詳細 (依存関係・ブロック状況を含む) を表示
```

## 基本ワークフロー

```bash
# 1. 仕事を見つけて引き受ける
bd ready
bd show <id>
bd update <id> --claim

# 2. 新しい issue を作る (コードを書く前に issue を作るのが原則)
bd create --title="要約" --description="なぜ必要か・何をするか" --type=task --priority=2
#   priority は 0-4 (0=critical, 2=medium, 4=backlog)。"high"/"low" などの文字列は不可
#   --parent=<id> で epic 配下の子 issue として作成できる

# 3. 完了したら閉じる (複数まとめて閉じるほうが効率的)
bd close <id1> <id2> ...
bd close <id> --reason="補足"
bd close <id> --suggest-next   # 閉じたことで着手可能になった issue を表示
```

## 依存関係

```bash
bd dep add <issue> <depends-on>  # <issue> は <depends-on> に依存する (依存先が先に完了すべき)
bd blocked                       # ブロックされている issue の一覧
bd graph <id>                    # その issue の依存グラフを表示 (epic なら子 issue 群も表示)
bd graph --all                   # 全 open issue を連結成分ごとに表示
bd graph --html <id>             # D3.js のインタラクティブ HTML を生成 (--box / --compact / --dot もあり)
```

## 記憶 (persistent memory)

セッションをまたいで残したい知見は bd に保存します (MEMORY.md 等のファイルは使いません)。

```bash
bd remember "得られた知見"   # 保存
bd memories <keyword>        # 検索
bd recall <id>               # 個別取得
```

## 状態確認・健全性

```bash
bd stats      # open / closed / blocked の統計
bd doctor     # インストール・同期の健全性チェック (困ったらまずこれ)
bd stale      # 最近更新されていない issue
bd lint       # 必須セクション欠落の検査
bd preflight  # PR 前チェックリスト (lint + stale + orphans)
bd search <query>  # キーワード検索
```

## リモート同期

```bash
bd dolt pull   # リモートの issue を取り込む
bd dolt push   # ローカルの issue をリモートへ送る
```

## このリポジトリ固有のルール

- **AI エージェントによる issue の変更 (create / update / close 等) は `plugins/dev-graph/scripts/bd-bridge.py` 経由に限定**されています (hook が直接の `bd create` 等を遮断します)。人間がターミナルから使う分には制限はありません
- `bd edit` は `$EDITOR` (vim 等) を開くため **AI エージェントは使用禁止**。`bd update <id> --title/--description/--notes` を使います
- タスク管理は bd に一本化します。markdown の TODO リストや他のタスク管理は併用しません
- git の commit / push、`bd dolt push` は既定で保守的運用です (明示的な承認があるときだけ実行)

---

# Part 2: ビーツ看板 (strandkanban) の使い方

## strandkanban とは

**strandkanban** ([doublej/strandkanban](https://github.com/doublej/strandkanban)、旧称 beads-kanban) は、bd の issue をブラウザ上のかんばんボードとして表示・操作できる **live 実行看板** です。beads 束縛タスクの標準看板として採用しています (2026-07-12 決定。正本: `plugins/dev-graph/references/execution-tracker-contract.md` §9)。

- 「**今どのタスクに着手すべきか**」を人間が見て操作するための live サーフェスです
- ボード上の全編集は `bd` CLI を経由するため、CLI・エージェント・ボードが常に同じデータを見ます
- ドラッグ&ドロップ・キーボード操作 (hjkl)・live 更新・依存グラフ表示・検索/フィルタ・zen モードなどを備えます
- **bd は embedded (既定) のままで動きます**。現行版 (0.5.x) は `bd export` / `bd update` 等の通常 CLI で読み書きするため、Dolt サーバーや `bd sql` は不要です (契約文書 §9 の「server mode 必須」は旧版前提の記述)

## セットアップ (初回のみ)

`npx github:doublej/strandkanban` の直接起動は、npm が devDependencies (vite / @sveltejs/kit 等) を入れないため**現行版では失敗します**。clone してから依存をインストールするのが確実です。

```bash
# 前提: Node 18+ または Bun 1.0+、bd 1.0+ (bd --version で確認)
git clone https://github.com/doublej/strandkanban ~/tools/strandkanban
cd ~/tools/strandkanban
bun install        # bun が無ければ npm install (better-sqlite3 のビルドに Xcode CLT が必要)
```

## 起動と終了

```bash
# 起動 (対象リポジトリのパスを渡す)
~/tools/strandkanban/bin/strand /path/to/HarnessHub

# → 空きポートを自動で選び、表示された URL をブラウザで開くとボードが出ます
# 終了: Ctrl-C
```

> 💡 issue が 0 件だとボードは空です。まず `bd create --title="..." --description="..." --type=task --priority=2` で issue を作ってから開くと動きが分かります。
>
> 💡 エージェントペイン (ボード内で AI セッションを動かす機能) を使う場合のみ `ANTHROPIC_API_KEY` が必要です。看板だけなら不要です。

## ボード上の操作

- 列は **Backlog / In Progress / Hooked / Blocked / Complete** の5つで、bd の status (`open` / `in_progress` / `hooked` / `blocked` / `closed`) に対応します
- カードの**ドラッグ**で列を移動すると status 変更が bd に反映されます。列内の並べ替えは priority 変更に対応します
- タイトル・説明・コメントはボード上でインライン編集できます。依存関係 (parent / child / blocker) の付与と依存グラフ表示も可能です
- CLI やエージェントが issue を変更するとボードは**自動で live 更新**されます (リロード不要)

## 看板の位置づけ (重要)

- 看板は**表示・手動編集の層**であり、タスク完了の authority ではありません。完了の正は **bd CLI + PR merge** です
- 自動化 (PR close → task close の連鎖など) は bd CLI を直接叩き、看板を経由しません。**看板を起動していなくても運用は成立します** (CI / headless 環境でも bd だけで完結)
- 静的なスナップショットが欲しい場合は dev-graph の `render-graph-html.py` (ゼロ依存の単一 HTML) が補完します。live 操作は看板、機能横断の俯瞰・履歴 diff・オフライン閲覧は静的 render、と使い分けます

## 運用上の注意

- strandkanban の上流リポジトリのライセンス状況は導入時点で未確認です (LICENSE 無しの場合は既定で全権利留保)。業務利用・再配布の前に上流のライセンス状況を確認してください
- 上流が廃止された場合も、静的 render または omb-board へ無改修で切替可能な設計です (bd の安定 surface にのみ依存しているため)

---

# Part 3: Harness Hub の機能開発フロー (dev-graph パイプライン)

Harness Hub 本体 (Self-Service Publish Control Plane) の開発は、**仕様 → グラフ → タスク → 実装** の一方向パイプラインで進めます。各層は前の層を「参照」し、内容を複製しません。

## 情報の階層 (仕様書を肥大化させない設計)

| 層 | 場所 | 持つもの | 持たないもの |
|---|---|---|---|
| 要件の憲法 | `system-spec/` | 目的 U1-U9・技術決定 D1-D4・確定質疑録・出典・品質目標 (WCAG 2.2 AA / Core Web Vitals good / SLO 99.5%) | データ構造・API 詳細 |
| 仕様/アーキテクチャ ノード | `specs/` `architecture/` | system-spec への**参照** + source_digest による改変検出。frontend/backend/data/security/infrastructure の 5 subtype | 正本の複製 |
| macro feature | `features/` | 機能単位の目的・到達状態・スコープ・受入・機能間依存 (DAG)。**人が編集する正本** (draft の間) | phase task の詳細 |
| feature package (exact-13) | `.dev-graph/plans/feature-package-<id>/` | P01..P13 task 仕様書の**正本** + goal-spec (feature context の digest 付きスナップショット) + 検証・昇格証跡 | 実行状態 |
| task projection | `tasks/` | graph 登録済み task ノード。frontmatter に実行状態 (依存・claim・完了証跡・resource_scope)、本文は正本仕様書への**ポインタのみ** (複製しない) | 仕様本文 |

データモデルや API 契約などの詳細は、feature を 13 task に分解する際に**該当 task の仕様書**として生成されます。`system-spec/` には書き足さないでください (要件層の肥大化を防ぎ、詳細は実装単位に紐づけて管理します)。

### 正本・スナップショット・projection の関係 (重複に見えるが役割が違う)

```
features/feat-X.md ──(confirm)──→ features/feat-X.context.json   ← What/Why の正本 (人が編集)
        │ /dev-graph plan
        ▼
.dev-graph/plans/feature-package-feat-X/    ← How の正本 + 証跡 (生成物。手編集しない)
        │  goal-spec.json は feature context を sha256 digest 付きで複製 (乖離は機械検出)
        ▼ atomic 昇格
tasks/sys-x-p01..p13.md                     ← 実行状態の projection (本文は正本へのポインタ)
        ▼ bd 投影
beads issue                                 ← claim / close の authority
```

- 編集してよいのは要件層 (S1 経由) と draft の `features/*.md` だけ。`.dev-graph/plans/` と `tasks/` は生成物で、直したいときは S4 の re-plan で丸ごと再生成する (個別手編集はしない)
- goal-spec 内の複製 (約 30 行) は「計画時点の入力を固定する監査スナップショット」であり二重管理ではない。上流を変えると digest 不一致として検出される

## 保存先の正規表 (どこに何を置くか — 迷ったらこの表)

**この表に無い新種の成果物は、置く前に本表を更新する。** 配置規約は `python3 scripts/lint-artifact-placement.py` が fail-closed で機械検査する (CI 配線済み)。

| 作るもの | 置き場 | 書込み経路 |
|---|---|---|
| 要件・確定質疑・技術決定 (D1-D4) | `system-spec/` | `/spec-hearing-start` → `/spec-compile` のみ。直接編集は hook が遮断 |
| システム全体設計の草案 (全体フロー・画面一覧・共通化・データフロー) | `docs/` | 自由編集可。ただし frontmatter (`status:` / `layer:`) 必須 |
| 仕様/アーキテクチャ/feature/task ノード | `specs/` `architecture/` `features/` `tasks/` | dev-graph 正規経路のみ。graph.json 未登録の直置きファイルは lint が遮断 |
| タスク管理・TODO・セッションをまたぐ知見 | bd (`bd create` / `bd remember`) | markdown の TODO ファイル・MEMORY.md は作らない |
| 実行記録・検証証跡 (goal-seek ログ・監査レポート) | `eval-log/` | 追記のみ (整合性の管理対象外) |
| 一時ファイル・使い捨て作業スクリプト | セッション scratchpad (repo 外) | repo に置かない |
| Claude Code plugin の正本 | `plugins/<name>/` | HarnessHub 配布物 (`CONVENTIONS.md` 参照) |
| リポジトリ直下 | 追加禁止 (allowlist 制) | 新規ファイルは lint が遮断 |

> ⚠️ `doc/` (単数) は**既存の plugin 設計資料庫**で、Harness Hub 本体の開発文書は置かない。本体の設計文書はすべて `docs/` (複数) へ。

## 設計ファースト運用 (推奨フロー)

「設計をすべて固めてから実装する」場合は、次の 5 段階で進める。設計は**横串 (段階 0: システム全体設計) → 縦串 (段階 1-3: feature 単位の設計)** の順で行い、実装の分離は 13 phase 構造 (P01..P13) に組み込まれている (**P01-P04 が設計 phase、P05 以降が実装 phase**)。

| 段階 | やること | 実装コードを書くか |
|---|---|---|
| 0. システム全体設計 (横串) | 全体フロー (ユーザージャーニー・画面一覧と遷移・データフロー・システム構成図) と**共通化設計** (共通 UI コンポーネント / 認可ミドルウェア等の共通バックエンド層 / 共通インフラ) を `docs/` に設計 → 確定分を `architecture/` 5 ノードへ正規経路で反映 → 共通化の結果を feature DAG (draft) に反映 | 書かない |
| 1. feature 定義確定 | `features/*.md` の scope/acceptance を人がレビュー・調整 (draft のうちは自由に編集可) → feature-context JSON 作成 → confirmed 昇格 | 書かない |
| 2. task 仕様書の構築 | `/dev-graph plan` を DAG 順に全 feature へ実行。P01..P13 の task 仕様書が staging 生成 → 独立 evaluator 検証 → all-or-none 昇格 → bd 投影 | 書かない |
| 3. 設計 task の実行 | P01 (requirements) → P02 (**frontend/backend/API/data/infra/security の workstream 設計** — ER 図・API 契約・画面設計はこの成果物) → P03 (独立設計レビュー = 人の承認ゲート) → P04 (test-design で受入契約を先に固定) | 書かない |
| 4. 実装以降 | P05 (implementation) 〜 P13 (release)。`bd ready` が依存解決済み task を提示 | 書く |

この表は「考え方」の正本で、コマンドは書かない。各段階の実行コマンドは S0 の通し順表から辿る (段階 0 → 順 3、段階 1 → 順 4、段階 2 → 順 5、段階 3 → 順 6、段階 4 → 順 7)。

- **段階 0 の成果は全 feature の P02 が参照する前提**: 各 feature の設計 task は共通層を「使う」設計に徹し、共通層そのものの実装は `feat-hub-foundation` の task が担う (共通化の二重実装を防ぐ)
- **段階 2 (plan) は全 feature 先行してよい**: task 仕様書は「何をどの順に設計・実装するか」の作業契約であり、上流実装に依存しない
- **段階 3 (P02 設計の実行) は DAG 順を守る**: 下流 feature の設計 (例: catalog 画面) は上流の設計成果 (例: ドメインモデル) を前提にするため、feature DAG の順で設計する
- 設計内容の変更が要件に波及する場合は `/spec-hearing-start` (R4-reopen) → `/spec-compile` で要件層から流し直す

## やりたいこと別プレイブック (シナリオ → 入口 → 手順)

手順の正本はここに一本化する (S0 = 全体の流れ + コマンド索引、S1-S8 = シナリオ別の正本)。同じ手順を 2 箇所に書かない。

**入口の選び方**: 変更が「要件 (何を作るか)」に触るなら **S1**、「システム全体の形 (横串)」なら **S2**、「機能の追加・分割」なら **S3**、「1 機能の task 仕様書」なら **S4**、「設計/実装の実行」なら **S5/S6**、「見直し・手戻り」なら **S7**。迷ったら S0 の全体像から辿る。

### S0. トータルシステム開発の大きな流れ (ゼロ → リリース)

```
S1 要件定義 (C05 PASS まで) ─→ dev-graph 取込・macro 分解 ─→ S2 全体設計 (横串)
  ─→ S3 feature 確定 ─→ S4 13 task 化 (feature ごと) ─→ S5 設計 task (P01-P04)
  ─→ S6 実装 task (P05-P13) ─→ リリース (P13)
```

上から下への一方向。上流の変更は必ず該当シナリオの正規経路で行い、下流は digest 照合が自動追随する。
**現在地**: S1 完了 (C05 PASS)・取込/分解 完了・S2 が draft レビュー待ち (`docs/` 4 文書)・S4 完了 = feat-hub-foundation / feat-user-org-admin (13 task 登録済み。hub-foundation は P05 実装中)。

コマンドは 2 種類あり、実行する場所が違う:

- **`/xxx` = Claude Code スラッシュコマンド**: Claude Code セッション内のプロンプトで入力する。`plugins/` の skill へ dispatch される (例: `/dev-graph plan` → `system-dev-planner` の `run-system-dev-plan`)
- **それ以外 (`bd …` / `python3 …` / `git …`) = ターミナルコマンド**: シェルから直接実行する。Claude Code に依頼して実行させてもよい (ただし AI からの `bd create` は hook 遮断のため bd-bridge 経由 — S6 参照)

コマンドの通し順 (各行の詳細は右列のシナリオ節が正本):

| 順 | 段階 | Claude Code (スラッシュコマンド) | ターミナル | 詳細 |
|---|---|---|---|---|
| 1 | 要件定義 | `/spec-hearing-start` → `/spec-compile` (C05 PASS まで) | — | S1 |
| 2 | 取込・分解 | `/dev-graph init` → `/dev-graph spec` → `/dev-graph decompose` | — | S0 |
| 3 | 全体設計 (横串) | 確定後 `/dev-graph node` でノード反映 | `docs/` 4 文書を編集 → `python3 scripts/lint-artifact-placement.py` | S2 |
| 4 | feature 確定 | `/dev-graph node <id> を confirmed へ昇格` → context JSON 作成 | `features/*.md` を人がレビュー | S4 |
| 5 | 13 task 化 | `/dev-graph plan --feature-id <id> --feature-context features/<id>.context.json` (DAG 順) | — | S4 |
| 6 | 設計 task (P01-P04) | (`/dev-graph next` — graph 視点が要るときのみ) | `bd ready` → `bd update <id> --claim` → 設計成果物 → `bd close <id>` | S5 |
| 7 | 実装 task (P05-P13) | `/dev-graph worktree claim …` (並行開発時) | `bd ready` → `bd update <id> --claim` → 実装 → 品質ゲート → PR → `bd close <id>` | S6 |
| 8 | 随時 (副作用なし) | `/dev-graph status` / `/dev-graph render` / `/dev-graph sync` | `bd stats` / `bd blocked` / `bd ready` | S8 |

- 順 2 は実施済み。`/dev-graph init` は冪等 (再実行しても 2 回目は変更 0)。仕様変更後の再取込・再分解も同じ入口で、digest pin が差分に追随する

### 迷ったときのコマンド使い分け (早見表)

似た役割のコマンドはどちらを使うかをここで決める。詳細は各節。

| 迷い | 使い分け |
|---|---|
| `bd ready` か `/dev-graph next` か | 日常の「次にやる task」は `bd ready`。`/dev-graph next` は feature-ready/task-ready の分離や resource_scope 衝突まで見たいとき (並行開発・graph 視点) |
| `bd stats` か `/dev-graph status` か | task の消化状況・ブロックは bd 側。feature/architecture ノードの confirm 状態や digest 整合は `/dev-graph status` |
| `/dev-graph decompose` か `/dev-graph plan` か | decompose = 構想 → macro feature 群と DAG (S3)。plan = confirmed 済み 1 feature → 13 task (S4) |
| ファイル直接編集か `/dev-graph node` か | draft の `features/*.md` と `docs/` は直接編集可。confirmed 後の変更と graph への反映は必ず `/dev-graph node` (単一 writer) |
| `bd create` か bd-bridge か `bd remember` か | 人間は `bd create`。AI エージェントは bridge 経由 (hook が直接 create を遮断、S6 参照)。graph ノードに紐づかない知見は `bd remember` |
| `system-spec/` を直したい | 直接編集は hook が遮断。常に `/spec-hearing-start` → `/spec-compile` (S1) |

### S1. 要件定義を作る・変える

```bash
/spec-hearing-start            # 新規・追加ヒアリング (往復対話で確定)
/spec-hearing-start --resume   # 中断からの再開
/spec-compile                  # 章の再生成 + C05 完成度評価 (PASS まで下流に進めない)
```

- 確定済み項目の変更も同じ入口 (内部で R4-reopen が根拠付きで再オープンする。直接編集は hook が遮断)
- 出典 (公式ドキュメント) の取得・更新は `/spec-compile` が自動連鎖する

### S2. システム全体設計 (横串) を作る・見直す

```bash
# 1. 横串設計 4 文書を直接編集する (draft は自由編集可。frontmatter status/layer 必須)
#    docs/system-design-overview.md  … 構成図・データフロー・全体タスクマップ
#    docs/user-journeys.md           … 3+1 ジャーニー
#    docs/screen-inventory.md        … 画面一覧と遷移 (画面追加は必ずこの表への追記から。担当 feature + 根拠 qa 必須)
#    docs/shared-layers.md           … 共通化の登録簿 (2 つ以上の feature が使うものだけ)

# 2. 編集後の配置規約チェック (いつでも・副作用なし)
python3 scripts/lint-artifact-placement.py

# 3. レビュー確定後: ノードへ正規反映 (単一 writer 経由で digest 連鎖に入れる)
/dev-graph node docs/screen-inventory.md を documentation ノードとして登録        # 例: 文書のノード化
/dev-graph node arch-harness-hub-frontend へ画面一覧の確定内容を反映              # 例: architecture ノード更新
```

- 要件そのものに波及する変更に気づいたら S1 へ戻す

### S3. 機能 (macro feature) を追加・分割する

```bash
# 要件の範囲内の機能追加 (macro feature の追加と DAG 接続)
/dev-graph decompose 通知機能を feature として追加し feat-publish-pipeline の下流に接続   # 例
# 追加結果の確認は S8 (/dev-graph status・/dev-graph render)
```

- `features/*.md` は draft のうちは内容を直接調整できる
- **要件に無い**機能: 先に S1 で要件化してから戻ってくる

### S4. 1 機能の 13 task 仕様書を構築する (plan)

```bash
# 1. feature 定義の最終確認 (scope_in / scope_out / acceptance) → features/<feature-id>.md を人がレビュー
# 2. feature を confirmed へ昇格 (単一 writer 経由)
/dev-graph node feat-hub-foundation を confirmed へ昇格                    # 例
# 3. feature-context JSON を作成 (下の 9 キー厳密一致。作成は AI へ依頼可)
# 4. exact-13 task package の生成
/dev-graph plan --feature-id feat-hub-foundation --feature-context features/feat-hub-foundation.context.json
```

feature-context JSON の形 (9 キーの厳密一致・過不足不可):

```json
{"graph_node_id": "feat-hub-foundation", "artifact_kind": "feature",
 "purpose": "…", "goal": "…", "scope_in": ["…"], "scope_out": ["…"],
 "acceptance": ["…"], "architecture_refs": ["architecture/harness-hub-backend.md"],
 "updated_at": "2026-07-17T00:00:00Z"}
```

- P01..P13 の 13 task 仕様書が staging 生成 → 独立 evaluator 検証 → **all-or-none** で登録 → bd へ投影される
- **P01-P04 が設計 phase / P05-P13 が実装 phase** (13 phase の定義正本: `plugins/system-dev-planner/references/system-plan-phase-names.md`)

### S5. 設計 task を実行する (P01-P04・コードなし)

```bash
bd ready               # 依存解決済みの着手可能 task を提示 (graph 視点で見たいときは /dev-graph next — 早見表参照)
bd update <id> --claim # 引き受け
# → P01 要件精緻化 / P02 workstream 設計 (ER 図・API 契約・画面設計はここの成果物)
# → P03 独立設計レビュー (人の承認ゲート) / P04 test-design (受入契約の先行固定)
bd close <id>
```

- P02 の設計は S2 の共通層を「使う」設計に徹する (共通層の再発明をしない)
- 設計中に横串へ波及する発見があれば S2 の docs を先に更新する

### S6. 実装 task を実行する (P05-P13)

```bash
bd ready                    # 着手可能 task (P04 完了まで実装 task はブロックされている)
bd update <id> --claim
/dev-graph worktree claim <node-id> --branch <name> --session-id <session>  # 並行開発時の衝突防止
# 実装 → 品質ゲート (下記) → PR
bd close <id>               # 完了の authority は bd + PR merge
```

作業中に見つかった**追加タスク (follow-up) の起票**:

```bash
# 人間 (ターミナルから直接):
bd create --title="要約" --description="なぜ必要か・何をするか" --type=task --priority=2
bd dep add <新issue> <依存先issue>   # 依存があれば接続

# AI エージェント (直接 bd create は hook が遮断。bridge 経由のみ):
python3 plugins/dev-graph/scripts/bd-bridge.py --op create \
  --graph-node-id <node-id> --title "要約" --description "なぜ必要か・何をするか"
# bridge は graph ノード紐付け必須。ノードに紐づかない雑多なメモは bd remember を使う
```

### S7. 見直し・手戻りのパターン (どこを直すかで入口が変わる)

| 見直したい対象 | 手順 |
|---|---|
| 確定済みの要件・技術決定 | S1 (`/spec-hearing-start` → R4-reopen → `/spec-compile`)。章と digest が更新され、古い前提の feature は plan 昇格時に自動遮断される |
| 全体設計 (docs/) | S2。draft なら直接編集、ノード反映済みなら正規経路で更新 |
| feature の範囲・依存 | draft なら `features/*.md` を直接調整。confirmed 後は dev-graph 正規経路 |
| 生成済みの 13 task 仕様書 | 該当 feature を S4 で re-plan (all-or-none で丸ごと置換。個別 task の手編集はしない) |
| 実装済みコード | 通常の bd issue → 修正。設計に波及するなら S5/S2 へ遡る |

### S8. 状態確認・健全性チェック (いつでも・副作用なし)

各節に登場する読み取り専用コマンドの**集約一覧**。ここ以外の節では状態確認コマンドを繰り返さない。

```bash
/dev-graph status                # グラフ全体の進捗
/dev-graph render                # 依存 DAG の静的 HTML 俯瞰
bd ready / bd stats / bd blocked # タスク状況
/spec-hearing-start --status     # 要件マトリクスの充足状況
python3 scripts/lint-artifact-placement.py                                        # 保存先の配置規約
python3 plugins/dev-graph/scripts/validate-graph-schema.py --graph .dev-graph/state/graph.json  # グラフ整合
```

## 品質ゲート (全 feature 共通・仕様で確定済み)

- **アクセシビリティ**: WCAG 2.2 AA 準拠。axe 等の自動チェックで検出可能違反ゼロがリリース条件 (qa-018)
- **速度**: Core Web Vitals 全指標 good (LCP ≤ 2.5s / INP ≤ 200ms / CLS ≤ 0.1)。Worker 3MiB の bundle 予算を CI で管理
- **可用性**: SLO 99.5%/月 + エラーバジェット運用。Hub 停止中も導入済み Skill・公開 WebApp は動作継続 (縮退設計)
- **セキュリティ**: 全 API で Tenant/Workspace スコープ強制 (deny-by-default)。分離テスト必須
- **パッケージ管理**: pnpm のみ (npm 使用禁止。CI で混入検出)

## 開発の順序 (feature DAG)

```
feat-stage0-distribution-gate (配布経路検証) ─────────────┐
feat-hub-foundation (基盤) ─→ feat-domain-model-db ─→ feat-auth-tenancy ─→ feat-publish-pipeline
                                                                              ├─→ feat-publisher-plugin
                                                                              └─→ feat-dual-catalog-web ─→ feat-workspace-governance
```

依存のない `feat-stage0-distribution-gate` と `feat-hub-foundation` から着手できます。

---

# 参考

- bd の全体像: `bd prime` / `bd quickstart` / `bd human`
- 実行看板と tracker の設計正本: `plugins/dev-graph/references/execution-tracker-contract.md`
- 配布境界の取り決め: `CONVENTIONS.md`
- 設計思想と詳細仕様: `doc/ClaudeCodeスキルの設計書/`
- Harness Hub の要件正本: `system-spec/index.md` (完成度評価: `system-spec/completeness-report.json`)
- dev-graph 取込/分解の記録: `eval-log/run-dev-graph-system-spec-import-report.json` / `eval-log/run-dev-graph-decompose-macro-report.json`
