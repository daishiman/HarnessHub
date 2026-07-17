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
| macro feature | `features/` | 機能単位の目的・到達状態・スコープ・受入・機能間依存 (DAG) | phase task の詳細 |
| task (exact-13) | `tasks/` | feature ごとに system-dev-planner が生成する P01..P13 の実行可能タスク仕様 | — |

データモデルや API 契約などの詳細は、feature を 13 task に分解する際に**該当 task の仕様書**として生成されます。`system-spec/` には書き足さないでください (要件層の肥大化を防ぎ、詳細は実装単位に紐づけて管理します)。

## 機能開発の流れ

```bash
# 0. 現在の feature と依存を確認
#    features/ 配下 8 feature (Stage 0-2)。DAG は eval-log/run-dev-graph-decompose-macro-report.json 参照

# 1. (仕様を変えたいときだけ) 要件層を更新 — 必ず正規経路で
/spec-hearing-start          # ヒアリング (単一 writer 経由で spec-state.json を更新)
/spec-compile                # 章再生成 + C05 完成度評価 (PASS するまで下流に進めない)

# 2. feature を確定 (draft → confirmed) して 13 task へ分解
/dev-graph plan --feature-id feat-hub-foundation --feature-context features/feat-hub-foundation.context.json
#    → system-dev-planner が P01..P13 の exact-13 task package を all-or-none 登録

# 3. 着手可能なタスクを見つけて実装
/dev-graph next              # 依存解決済みの ready task を提示
bd ready                     # bd 側でも確認できる (task は bd issue に投影される)
/dev-graph worktree claim <node-id> --branch <name> --session-id <session>   # 並行開発は worktree lease で衝突防止

# 4. 完了処理
bd close <id>                # タスク完了 (完了の authority は bd + PR merge)
/dev-graph status            # グラフ全体の進捗確認
/dev-graph render            # 静的 HTML でグラフを俯瞰
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
