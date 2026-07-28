---
status: draft
layer: operations
graph_node_id: issue-worktree-main-ref-desync-20260728
sources:
  - issues/sys-worktree-main-ref-desync-20260728.md
  - scripts/guard-cross-worktree-ref-update.py
  - scripts/guard-worktree-desync.py
  - scripts/validate-git-hooks-wiring.py
---

# 並列 worktree 運用 runbook

複数の worktree（同じリポジトリを別ディレクトリに複数展開したもの）やエージェントセッションを同時に走らせる際の、事故の予防・検知・復旧手順をまとめる。

対象事象は `issues/sys-worktree-main-ref-desync-20260728.md`（2026-07-28 実測）。

---

## 1. 何が起きるのか — main ref の desync

git は **HEAD**（今どのコミットにいるか）・**index**（コミット予定の内容）・**作業ツリー**（実ファイル）の 3 層で状態を持つ。

| 操作 | 更新される層 |
|---|---|
| `git pull` / `git checkout` | HEAD・index・作業ツリーの 3 層すべて |
| `git update-ref` / `git fetch origin main:main` | **ref だけ**（作業ツリーは置き去り） |

worktree は `.git` を共有するため、**別ディレクトリの worktree からでも主ワークツリーが checkout 中の `refs/heads/main` を動かせてしまう**。動かされた側は HEAD と index だけが最新へ進み、実ファイルが古いまま取り残される。これを desync と呼ぶ。

### 症状の見分け方

desync 状態では、次の 2 つが**同時に**現れる。

| 症状 | 実際に起きていること |
|---|---|
| `git pull` が `Already up to date` | ref は最新なので pull に仕事がない。git は正しい |
| 身に覚えのない大量の差分 | PR で**追加された**ファイルが手元に無いので `deleted`、**更新された**ファイルが古いので `modified` と表示される |

差分の向きが直感と逆（自分は何も消していないのに `deleted` が並ぶ）ため、「自分が壊した」と誤認しやすい。

### 放置した場合の実害

この状態で `git commit -a` すると、**直前にマージされた PR の内容を丸ごと打ち消すコミット**が main に載る。2026-07-28 の実測では 65 files / -5,467 行の巻き戻しコミットが生成される直前だった。CI は「意図された削除」と区別できないため緑のまま通過しうる。

### 原因の特定方法

`git reflog show main --date=iso` を見る。**理由メッセージが空**のエントリが ref 直接書き換えの指紋である。

```
9fe09e5 main@{2026-07-28 10:52:28 +0900}:            <- 空 = 直接書き換え
03093e4 main@{2026-07-28 09:36:22 +0900}: pull: Fast-forward   <- 正常な経路
```

---

## 2. 予防 — 導入済みの多層防御

### 層 1: ref 更新の遮断（`reference-transaction` hook）

`scripts/guard-cross-worktree-ref-update.py` が、**他ワークツリーが checkout 中の `refs/heads/*` への更新**を transaction 段階で拒否する。

hook の実体は `scripts/install-git-hooks.sh` が
`<git-common-dir>/harness-hub-hooks/`（全 worktree が共有する Git 管理領域）へ設置する。
`core.hooksPath=.githooks` のような相対指定は使わない。相対指定では古い branch の
worktree が自分の古い `.githooks` を参照し、新しい guard が無いまま更新できるため。

- 誰も checkout していない ref → 許可
- 自分が checkout している ref → 許可（通常の commit / pull / merge がこれ）
- 他の worktree が checkout 中 → **遮断**

判定材料が取れない場合は **fail-open**（通す）。ref 更新は git のあらゆる操作が通る根幹経路であり、ここで止めると修復作業そのものができなくなるため。この穴は層 2 が塞ぐ。

意図的に行う場合のみ:

```bash
HH_ALLOW_CROSS_WORKTREE_REF_UPDATE=1 git update-ref refs/heads/main <sha>
```

### 層 2: 巻き戻しコミットの遮断（`pre-commit` hook）

`scripts/guard-worktree-desync.py` が、コミット直前に **index の tree hash が HEAD の祖先コミットの tree hash と一致するか**を調べる。一致すれば「作業ツリーが過去の状態のままコミットされようとしている」ことが確定する（誤検知なし）。

補助として staged 削除数の異常（既定 20 件以上）も検知する。こちらは閾値による推定なので、意図した大量削除では bypass できる。

こちらは **fail-closed**（検査できなければ止める）。止まるのは commit だけで、bypass と復旧手順で必ず前進できるため。

```bash
HH_SKIP_DESYNC_CHECK=1 git commit ...          # 検査を skip
HH_DESYNC_DELETION_THRESHOLD=50 git commit ... # 閾値を変更
```

### 層 3: hook 配線の検知（`validate-git-hooks-wiring.py`）

`core.hooksPath` は**リポジトリに 1 つしか設定できない**。beads は `.beads/hooks` を要求し、リポジトリは `.githooks` を持つため、片方を選ぶともう片方の hook が無言で死ぬ。本仕組みの導入前、`.githooks/pre-push` の CI 等価チェックは実際に死んでいた。

そこで、主経路を全 worktree 共通の bundle にし、beads 側を保険経路にしてある。

```
<git-common-dir>/harness-hub-hooks/<hook>
                      … repo ガード + 現 worktree の beads hook への委譲 (主経路)
.githooks/<hook>      … 共有 bundle の tracked template
.beads/hooks/<hook>   … beads 管理ブロック + 共有 bundle 呼び出し       (保険経路)
```

`core.hooksPath` は共有 bundle の**絶対パス**を指すため、古い branch の worktree からも
同じ guard が走る。beads が `.beads/hooks` を再生成して保険経路が消えても、主経路は
`.beads` の外なので無傷である。配線ずれ・bundle の古さ・保険経路の消失は次で検知する。

```bash
git diff -- .beads/hooks                              # 上書きの差分として見える
python3 scripts/validate-git-hooks-wiring.py          # CI (run-ci-checks.sh) でも実行
python3 scripts/validate-git-hooks-wiring.py --check-local-config  # hooksPath/bundle も検査
```

`pre-push` は共有 bundle 内の検査スクリプトを起動し、現在の branch に tracked template
が存在する場合は両者の byte 差も比較する。guard を編集した後に installer を再実行
し忘れた場合も、古い bundle のまま push される前に fail-closed で停止する。導入前の
古い branch のように template 自体が存在しない場合は freshness 比較だけを省略し、
共有 bundle の構造・`core.hooksPath`・実行可能性は引き続き検査する。

### 層 4: 運用規約

エージェント / セッションは次を守る。

| 可 | 不可 |
|---|---|
| `git fetch origin`（remote-tracking のみ更新） | `git fetch origin main:main` |
| 自分の worktree での `git pull --ff-only` | `git update-ref refs/heads/main <sha>` |
| `git checkout --detach` での SHA 固定 | 他 worktree が checkout 中の branch を動かす操作全般 |

---

## 3. hook の有効化と復旧

```bash
bash scripts/install-git-hooks.sh
```

`<git-common-dir>/harness-hub-hooks/` へ tracked template と guard 本体をコピーし、
`core.hooksPath` をその絶対パスへ設定する。bundle は branch の作業ツリー外にあるため、
導入前の古い branch を checkout した worktree からも同じ hook が発火する。
設定は共有 `.git/config` に入るため、worktree を追加しても再実行は不要。

tracked template または guard 本体を更新した後は、上記コマンドを再実行して bundle を
更新する。古い bundle は `--check-local-config` と pre-push で検知される。

beads の再インストール等で `core.hooksPath` が `.beads/hooks` に戻された場合も、保険経路により repo ガードは動き続ける。`pre-push` 時に配線ずれが検知されるので、上記コマンドで戻す。

---

## 4. desync からの復旧手順（2026-07-28 実証済み）

**並列稼働を止める必要はない。** `--detach` で HEAD を SHA に固定すると、作業中に他セッションが ref を書き換えても作業ツリーが巻き込まれない。実際、この手順の実行中に PR #86 のマージで main が動いたが影響を受けなかった。

```bash
# 1. HEAD を SHA へ固定し、ref 書き換えの影響を遮断する
git checkout --detach

# 2. 作業ツリーの内容を退避する (-u で untracked も含む)
#    メッセージは後で検索できる固有語を含める (第 5 節の規約)
git stash push -u -m "desync-recovery-20260728: wt-1 の未コミット分"

# 3. 作業ツリーが HEAD と一致したことを確認する
git status
git diff --shortstat HEAD        # 出力が空であること

# 4. 第 5 節の手順でメッセージから不変の commit SHA を得て、
#    退避した中から本当に必要なものだけ選択的に戻す
git restore --source="$STASH_SHA" -- <path>      # tracked の変更
git restore --source="$STASH_SHA^3" -- <path>    # untracked だった分 (^3 が untracked ツリー)

# 5. ref の最新へ追従する
git checkout main
```

### 保全対象の選び方

退避物のうち「main 側が触っていないファイル」だけが自分の固有変更である。

```bash
git diff --shortstat <古い基点> <最新> -- <path>
# 出力が空 = main 側は無変更 = 作業ツリー側の固有変更なので戻す
# 出力あり = main 側が更新済み = 戻すと巻き戻しになるので戻さない
```

---

## 5. stash 参照の規約（必須）

**`stash@{N}` を手順書・スクリプト・引き継ぎメモに書かない。**

`stash@{N}` は識別子ではなく**スタックの位置**である。並列セッションが `git stash push` すると全体がずれ、`stash@{0}` の指す対象が入れ替わる。2026-07-28 の復旧中に実際に発生した。

### 規約

1. **push 時**: 必ず `-m` で固有のメッセージを付ける。`<用途>-<日付>: <対象>` 形式を推奨。

   ```bash
   git stash push -u -m "desync-recovery-20260728: wt-1 の未コミット分"
   ```

2. **参照時**: メッセージで検索して SHA を得てから使う。SHA は不変なので他セッションの影響を受けない。

   ```bash
   git stash list | grep "desync-recovery-20260728"
   STASH_SHA="$(git stash list --format='%H %gs' \
     | grep -F 'desync-recovery-20260728: wt-1 の未コミット分' \
     | head -n 1 | cut -d' ' -f1)"
   git show --stat "$STASH_SHA"
   git restore --source="$STASH_SHA" -- <path>
   ```

   `%H` は stash commit の SHA を直接返す。`stash@{N}` を得てから別コマンドで SHA に
   変換する 2 段階手順は、その間に別セッションが stash を追加すると参照先がずれるため
   使用しない。同じメッセージを複数回使わず、検索結果が意図した 1 件か確認する。

3. **記録時**: 引き継ぎには SHA とメッセージの両方を書く。番号は書かない。

---

## 6. 関連

- 課題: `issues/sys-worktree-main-ref-desync-20260728.md`
- ガード実装: `scripts/guard-cross-worktree-ref-update.py` / `scripts/guard-worktree-desync.py`
- 配線検査: `scripts/validate-git-hooks-wiring.py`
- hook 実体: `<git-common-dir>/harness-hub-hooks/`（主経路）
- tracked template: `.githooks/` / 保険経路: `.beads/hooks/`
- beads 運用: `docs/beads-operations-runbook.md`
