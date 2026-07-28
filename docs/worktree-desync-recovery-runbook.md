---
status: draft
layer: operations
graph_node_id: issue-worktree-main-ref-desync-20260728
sources:
  - issues/sys-worktree-main-ref-desync-20260728.md
  - architecture/harness-hub-dev-workflow.md
  - plugins/dev-graph/scripts/manage-worktree-lease.py
---

# worktree desync 復旧 runbook

並列 worktree 運用下で、**主ワークツリーの `refs/heads/main` だけが最新へ進み、実ファイルが古いまま取り残される**状態（以下 desync）の検知・復旧手順書。

この状態に気づかず `git commit -a` すると、**直前にマージされた PR の内容を丸ごと打ち消すコミット**が main に載る。CI は「意図された削除」と区別できないため緑のまま通過しうる。

課題の追跡は `issues/sys-worktree-main-ref-desync-20260728.md`（bd `HarnessHub-7xi9`）。本書は**発生してしまった後の復旧**のみを扱う。発生そのものを止める仕組み（hook による遮断、pre-commit 検査）は同課題で追跡中であり、**2026-07-28 時点では未実装**である。

## 1. なぜ起きるか

git は状態を 3 層で持つ。

| 層 | 実体 | 何が入っているか |
| --- | --- | --- |
| HEAD（ref＝ブランチの指し先） | `.git/refs/heads/main` | 「今どのコミットにいるか」の記録だけ |
| index（インデックス＝コミット予定表） | `.git/index` | 次のコミットに含める内容のスナップショット |
| 作業ツリー（working tree） | ディスク上の実ファイル | 実際に編集するファイル |

`git pull` や `git checkout` は **3 層すべて**を更新する。一方 `git update-ref` 系（`git fetch origin main:main` を含む）は **ref だけ**を書き換える。

worktree（同じリポジトリの別チェックアウト）は `.git` を共有するため、**別ディレクトリの worktree からでも、主ワークツリーが checkout 中の `refs/heads/main` を動かせてしまう**。結果、ref だけが進み index と作業ツリーが古い基点に取り残される。

## 2. 症状の見分け方

desync は「自分が壊した」ように見えるのが厄介である。**差分の向きが直感と逆になる**。

| 見えるもの | 実際に起きていること |
| --- | --- |
| `git pull` が `Already up to date` | ref は最新なので pull に仕事がない。**git は正しい** |
| 身に覚えのない大量の `deleted` | PR で**追加された**ファイルが手元に無いだけ |
| 身に覚えのない大量の `modified` | PR で**更新された**ファイルが手元で古いだけ |

「pull したのに直らない」は desync の典型症状である。ref を更新する操作をいくら足しても、作業ツリーは動かない。

## 3. 検知手順

### 3.1 reflog の理由メッセージが空か

これが **ref 直接書き換えの指紋**である。`pull` / `merge` / `checkout` はいずれも理由を書き残す。

```bash
git reflog show main --date=iso
```

```
dedfdc3 main@{2026-07-28 12:34:40 +0900}:            <- 空 = 直接書き換え
9fe09e5 main@{2026-07-28 10:52:28 +0900}:            <- 空
03093e4 main@{2026-07-28 09:36:22 +0900}: pull: Fast-forward   <- 正常
```

### 3.2 HEAD と作業ツリーが乖離しているか

```bash
git diff --shortstat HEAD
```

**空でなければ desync を疑う**。とくに削除行数が数百〜数千行に及ぶ場合は、直前の PR の打ち消しがそのまま出ている。

### 3.3 実体で裏を取る

ref の指すコミットにあるはずのファイルが、ディスク上に無いことを直接確かめる。パスは直近の PR が追加したものを使う。

```bash
# HEAD 側にはあるか
git show HEAD:<PR が追加したファイル> | head -1
# 手元にあるか
ls -la <PR が追加したファイル>
```

HEAD 側にあって手元に無ければ desync で確定する。

## 4. 復旧手順（2026-07-28 に 2 度実証）

**前提: 並列セッションを止める必要はない。** `--detach` で HEAD を SHA に固定すると、作業中に他セッションが ref を書き換えても作業ツリーが巻き込まれない。実際、1 度目の復旧作業の実行中に PR #86 のマージで main が動いたが影響を受けなかった。

### 4.1 固有の変更を先に退避先へ複製する

stash に入れる前に、**残したい変更の実体を git の外へコピーする**。stash は可逆だが、並列セッション下では参照が揺れる（§5）ため、git に依存しない控えを持つ。

```bash
BK=<scratchpad など repo 外のディレクトリ>
mkdir -p "$BK"
cp <残したいファイル> "$BK/"
(cd "$BK" && find . -type f -exec shasum {} \;)   # 復元後の照合用
```

### 4.2 HEAD を SHA に固定する

```bash
git checkout --detach
git rev-parse HEAD    # 以後の基点。控えておく
```

### 4.3 メッセージ付きで全退避する

`-u` で未追跡ファイルも含める。**メッセージは必須**（§5）。

```bash
git stash push -u -m "wt-main-desync-<YYYYMMDD>: 取り残し分 + 固有変更 バックアップ済"
```

### 4.4 一致を検証する

ここで**必ず空であることを確認する**。空でなければ退避が不完全なので、先へ進まない。

```bash
git status --porcelain=v1   # 空であること
git diff --shortstat HEAD   # 空であること
```

実体でも裏を取る（§3.3 で欠けていたファイルが復活しているか）。

### 4.5 固有の変更だけを戻す

§4.1 の控えから選択的にコピーし直す。stash から直接戻す場合、**未追跡分は `^3`** に入っている。

```bash
git checkout 'stash@{N}^3' -- <未追跡で残したいパス>
```

追跡ファイルは「main 側がそのファイルを触ったか」で保全対象を選別する。

```bash
git diff --shortstat <古い基点> <最新> -- <path>
# 出力が空 = main 側は無変更 = 作業ツリー側の固有変更なので戻してよい
```

### 4.6 ブランチへ戻る

作業を続けるブランチを切るか、main へ追従する。

```bash
git checkout -b devgraph/<graph-node-id>   # 作業を続ける場合
git checkout main                          # main へ追従する場合
```

## 5. stash は番号ではなくメッセージで参照する

`stash@{N}` は**スタックの位置**であって識別子ではない。並列セッション下では、別セッションの `git stash push` で `stash@{0}` の指す対象が入れ替わる（2026-07-28 の復旧中に実際に観測）。

**規約: stash push には必ず `-m` で内容の分かるメッセージを付け、参照はメッセージ検索で行う。**

```bash
# 番号を直接使わず、メッセージから解決する
git stash list | grep "wt-main-desync-20260728"
```

`git stash pop`（番号省略 = `stash@{0}`）は、並列稼働下では**触る対象が確定しないため使わない**。

## 6. 予防（現時点で有効な運用制約）

仕組みによる遮断は未実装のため、当面は運用で抑える。

- エージェント／自動化からの ref 操作は **`git fetch origin`（remote-tracking のみ更新）に限定**する
- **`git fetch origin main:main` と `git update-ref refs/heads/main` は使わない**。どちらも他ワークツリーが checkout 中の ref を作業ツリー無しで動かす
- main を最新にしたいときは、その worktree 自身で `git pull`（3 層すべてを更新する経路）を使う
- コミット前に `git diff --shortstat HEAD` を確認する。大量削除が出たら §3 で検証する
- **主ワークツリーで `main` を checkout したまま放置しない。**作業は必ず作業ブランチで行う

最後の項目が現時点で最も効く。desync は「ref が直接書き換えられた」だけでは起きず、**その ref を checkout 中のワークツリーが存在する**ことで初めて成立するためである。2026-07-28 15:08 に 5 件目の直接書き換え（`4c66e5e`）が発生したが、主ワークツリーが作業ブランチ上にあったため無害だった。

## 7. 発生履歴

| 日付 | 検知した状態 | 結果 |
| --- | --- | --- |
| （日付不明・`stash@{26}` に痕跡） | `main-4bf2a66` 同期前、index+worktree が `7e250f1` のまま | 手動退避で収束 |
| 2026-07-28 午前 | 作業ツリーが `03093e4` に取り残し。commit していれば 65 files / -5,467 行 | commit 前に検知・復旧 |
| 2026-07-28 午後 | 作業ツリーが PR #87 前に取り残し。commit していれば 19 files / -878 行 | commit 前に検知・復旧 |

**3 回とも人間／エージェントの目視で止めている。**仕組みで止めていないため再発しており、これが `HarnessHub-7xi9` を P1 として扱う根拠である。
