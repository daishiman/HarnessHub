---
status: draft
layer: operations
graph_node_id: issue-beads-jsonl-stash-conflict-20260725
sources:
  - .beads/README.md
  - plugins/dev-graph/hooks/guard-graph-schema.py
  - plugins/dev-graph/scripts/bd-bridge.py
---

# Beads 運用 runbook

本リポジトリにおける Beads（課題トラッカー）の運用手順書。とくに **`.beads/*.jsonl` のコンフリクト解消** と **beads 変更操作の許可経路** を扱う。

一般的な Beads の使い方は `.beads/README.md` と `bd prime` を参照。本書はリポジトリ固有の制約と、事故時の復旧手順のみを記す。

## 1. 前提となるデータ構造

| 要素 | 役割 |
| --- | --- |
| `.beads/embeddeddolt`（Dolt DB） | **正本（source of truth＝唯一の正しい原本）**。課題の実データはここにある |
| `.beads/interactions.jsonl` | **passive export（受動的エクスポート＝DB から書き出された写し）**。append-only（追記専用） |
| `refs/dolt/data`（git リモート） | Dolt 同士の同期に使う ref。通常の git ブランチとは別系統 |

重要なのは、**`.jsonl` を手で編集しても DB は変わらない**という点である。jsonl は DB の投影であり、逆流しない。したがって jsonl のコンフリクトは「ログの取りこぼしを防ぐ」問題であって、課題データそのものの損失ではない。

## 2. beads 変更操作は bd-bridge 経由に限定される

`plugins/dev-graph/hooks/guard-graph-schema.py`（PreToolUse hook）が、beads の mutation（変更操作）を **`plugins/dev-graph/scripts/bd-bridge.py` の単一チョークポイント（choke-point＝唯一の通り道）** 経由に強制する。`bd create` / `bd update` / `bd close` を直接実行すると次のように遮断される。

```
[guard-graph-schema] BLOCKED: Beads mutation は scripts/bd-bridge.py の単一チョークポイント経由に限定
```

### 許可される経路

```bash
# 課題の作成（--graph-node-id が必須。dev-graph node と 1 対 1 で結びつく）
python3 plugins/dev-graph/scripts/bd-bridge.py --op create --repo-root . \
  --graph-node-id <graph-node-id> --title "<タイトル>" [--dry-run]

# 状態更新・クローズ
python3 plugins/dev-graph/scripts/bd-bridge.py --op update --repo-root . --bd-issue-id <id> --status <status>
python3 plugins/dev-graph/scripts/bd-bridge.py --op close  --repo-root . --bd-issue-id <id> --reason "<理由>"
```

`--op create` は `--graph-node-id` を必須とする。これは **beads 課題が必ず dev-graph node に紐づく**という設計上の制約で、先に `upsert-node.py` で node を作ってから課題を作る順序になる。

### 読み取りは直接実行してよい

`bd list` / `bd show` / `bd ready` / `bd stats` は変更を伴わないため guard の対象外である。

## 3. `.beads/*.jsonl` のコンフリクト解消

**2026-08-10 以降: 恒久対策済み。** `.gitattributes` に `.beads/interactions.jsonl merge=union` を追加した。これは git 組み込みの union（合併）マージ driver で、`.dev-graph/state/graph.json` の `merge=devgraph-json` と違いカスタムスクリプトの `--install` が不要（clone するだけで有効）。append-only なこのファイルの性質上、双方の追記行を両方残せばよいケースがほとんどのため、以下の手動手順は不要になり、`git stash pop` / `git merge` はマーカーなしで自動解決されるはず。

以下の §3.1〜3.6 は、union merge では拾えない例外（解決結果の JSONL が壊れている、行の意味的な重複が紛れ込む等）が起きたときのフォールバック手順として残す。

### 3.1 発生源を特定する

コンフリクトマーカーの文言で発生源が判別できる。**ここを取り違えると復旧手順ごと間違える**ため、最初に確認する。

| マーカー | 発生源 |
| --- | --- |
| `<<<<<<< HEAD` … `>>>>>>> <branch>` | merge |
| `<<<<<<< Updated upstream` … `>>>>>>> Stashed changes` | **stash pop / stash apply** |
| `<<<<<<< ours` … `>>>>>>> theirs` | rebase / cherry-pick |

```bash
grep -n '^<<<<<<<\|^|||||||\|^=======\|^>>>>>>>' .beads/interactions.jsonl
```

補足: stash pop 由来の場合、`.git/MERGE_HEAD` は**存在しない**。`git status` も「マージ中」を表示しないため、マージ由来と誤認しやすい。次で確認する。

```bash
ls .git/MERGE_HEAD 2>/dev/null || echo "MERGE_HEAD なし → stash pop 由来の可能性が高い"
```

### 3.2 3 つのステージを取り出して比較する

git は未解決ファイルを 3 つの版（stage）として index に保持している。**マーカーを手で消す前に、この 3 版を比べて包含関係を判定する。**

```bash
git ls-files -u .beads/interactions.jsonl
# 出力の 3 列目が stage 番号:
#   1 = 共通の祖先 (base)
#   2 = 自分側 (HEAD / Updated upstream)
#   3 = 相手側 (stash / theirs)
```

各版の中身は blob ハッシュで取り出せる。

```bash
git cat-file -p <stage2 の blob> | wc -l
git cat-file -p <stage3 の blob> | wc -l
```

### 3.3 上位集合なら丸ごと採用する

`.beads/interactions.jsonl` は append-only なので、**片方がもう片方を先頭から完全に含む「上位集合（superset）」になることが多い**。その場合は長い方を採用するだけで、両者の行が欠落なく残る。

```bash
# stage3 の先頭 N 行が stage2 と一致するか（N = stage2 の行数）
diff <(git cat-file -p <stage2 blob>) <(git cat-file -p <stage3 blob> | head -<stage2 の行数>) \
  && echo "上位集合 → stage3 を採用してよい"
```

一致したら書き出す。

```bash
git cat-file -p <stage3 blob> > .beads/interactions.jsonl
```

上位集合でない場合（双方に独自の行がある）は、両者を結合したうえで `id` で重複を除き、`created_at` 昇順に並べ直す。

### 3.4 解消結果を機械検証する

**マーカーが消えたことだけを確認して commit してはいけない。** JSONL として壊れていないか、`id` が重複していないかを検証する。

```bash
python3 - <<'PY'
import json, collections
ids = []
with open('.beads/interactions.jsonl') as f:
    for i, line in enumerate(f, 1):
        if not line.strip():
            continue
        try:
            ids.append(json.loads(line)['id'])
        except Exception as e:
            raise SystemExit(f'PARSE ERROR line {i}: {e}')
dup = [k for k, v in collections.Counter(ids).items() if v > 1]
print(f'records={len(ids)} duplicate_id={len(dup)} {dup[:5]}')
PY
```

`duplicate_id` が 0 でなければ、結合時に同じ行を二重に取り込んでいる。3.3 をやり直す。

### 3.5 DB との整合を確認して確定する

```bash
bd stats          # DB が正常に読めることを確認（読み取りなので guard 対象外）
git add .beads/interactions.jsonl
```

`bd` の読み取りが通れば DB 側は健全である。jsonl は写しなので、DB が無事なら最悪 export し直せる。

### 3.6 stash の後始末

`stash pop` はコンフリクトで中断した場合 **stash を消さずに残す**。解消後、内容が完全に反映されたことを確認してから削除する。

```bash
# 反映漏れがないことを確認してから
diff <(git show 'stash@{0}:.beads/interactions.jsonl') .beads/interactions.jsonl \
  && git stash drop 'stash@{0}'
```

## 4. commit / push の扱い

CLAUDE.md の「保守的（既定）」プロファイルでは、**明示的な指示なしに commit・push・Dolt 同期を実行しない**。

push 時は beads の `pre-push` hook が Dolt 同期を試みる。conservative プロファイルではこれをスキップしてよい。

```bash
git push --no-verify -u origin <branch>
```

## 5. よくある誤り

| 誤り | 何が起きるか | 正しい対処 |
| --- | --- | --- |
| マーカーだけ手で消す | 片側の行が丸ごと消え、課題ログが欠落する | 3.2〜3.3 で包含関係を判定してから採用する |
| `bd create` を直接実行 | guard hook が BLOCK する | `bd-bridge.py --op create` を使う（§2） |
| jsonl を編集して DB が直ると思う | DB は変わらない。次の export で上書きされる | DB の変更は `bd-bridge.py` 経由で行う |
| 検証せず commit | 壊れた JSONL や id 重複が混入する | 3.4 の検証を必ず通す |
| stash を放置 | 同種のコンフリクトが反復する | 3.6 で確認のうえ drop する |

## 関連

- `.beads/README.md` — Beads 一般の使い方
- `bd prime` — ワークフロー全体のコンテキスト
- [SYNC_CONCEPTS.md](https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md) — 同期アーキテクチャとアンチパターン
- `plugins/dev-graph/scripts/bd-bridge.py` — beads 変更の単一経路
- `plugins/dev-graph/hooks/guard-graph-schema.py` — 経路強制の実装
