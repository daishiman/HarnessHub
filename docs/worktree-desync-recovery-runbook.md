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

課題の追跡は `issues/sys-worktree-main-ref-desync-20260728.md`（bd `HarnessHub-7xi9`）。本書は**発生してしまった後の復旧**を扱う。発生前の防御は 2026-07-28 に共有 hook bundle として実装済みで、導入・検査・制約の正本は `docs/worktree-parallel-operations-runbook.md` とする。

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

### 2.1 別機構: 作業ツリーの丸ごと差し替え（clobber）

2026-07-28 夕に、**ref が一切動いていないのに作業ツリーだけが古い実体に置き換わる**事象を観測した。症状（大量の `deleted` / `modified`）は §2 と同じだが、原因も検知法も予防策も異なる。取り違えると「reflog が正常だから問題なし」と誤判定する。

| | ref desync（§2） | 作業ツリー clobber |
| --- | --- | --- |
| HEAD / refs | 進む | **無傷** |
| reflog | 理由メッセージが空のエントリ | **異常なし。指紋が残らない** |
| 作業ツリー | 古い実体が取り残される | **古いスナップショットで丸ごと置換** |
| 必要条件 | その ref を checkout 中の worktree がある | **なし。作業ブランチでも起きる** |
| 未コミットの編集 | 残る | **消える**（HEAD にも無いので復元不能） |

**見分けるには mtime を見る。**

```bash
git diff --shortstat HEAD                    # 大量差分を確認
git reflog show <checkout 中のブランチ> --date=iso   # 異常なし → clobber を疑う
ls -la <消えたはずのファイル> <古く見えるファイル>   # ← 決め手
```

git の checkout は書き込んだファイルの mtime を**現在時刻**にする。にもかかわらず mtime がバラバラの過去日時（実測では `Jul 14 12:34` / `Jul 11 22:35` / `Jul 24`）を指しているなら、**過去のツリーを mtime 込みで展開した**ことを意味し、git 操作では説明できない。

派生症状として、**テストが偽の赤を出す**。依存ファイルが古い実体に置き換わっているためで、実測では dev-graph のテストが 24 件失敗し別のテストは収集エラーになった。原因を実装側に探すと時間を丸ごと失う。**テストが説明のつかない失敗をしたら、まず `git diff --shortstat HEAD` を撃つ。**

#### 2.1.1 発生源調査 (2026-08-02 時点)

clobber の発生源はまだ確定していないが、以下の実測により**候補機構を1つ具体化**できた。

**観測1: 現存する未コミット差分の mtime 指紋**

2026-08-02 時点で主 WT に残る未コミット 401 件のうち 276 件が、日付だけでなく**分単位まで完全一致**する mtime (`2026-07-31 06:56`) を持っていた。対象は dev-graph / ubm-goal-setting / slide-report-generator / skill-governance など相互に無関係な 15+ プラグインにまたがる。個々のセッションが別々の時刻に編集した場合この一致は起こり得ず、**単一の一括書き込み処理が同時刻に全ファイルへ mtime を刻んだ**ことを示す。git の `checkout` は書き込み時点の現在時刻を mtime にするため、この指紋は git 由来ではなく、**元 mtime を保持するコピー機構** (`rsync -a` / `tar` 展開 / `cp -p` / Finder コピー等) を示唆する。

**観測2: 同時刻帯の orca 操作ログ**

orca アプリのトレースログ (`~/Library/Application Support/orca/logs/main.trace.ndjson.2`, unix nano timestamp・`git.exec` span に `cwd`/`git.subcommand` を記録) を `2026-07-31 06:56` 前後 ±60 秒で検索したところ、主 WT (`/Users/dm/dev/dev/個人開発/HarnessHub`) に対する `status` / `diff` / `remote` / `fetch` / `rev-parse` / `for-each-ref` / `symbolic-ref` / `check-ignore` のみが記録されており、**working tree のファイル内容を書き換えうる `checkout` / `reset` / `worktree` 系コマンドは同時間帯に一件も無かった**。これにより、orca 自身の git 操作ループが直接の書き込み元である可能性は低いと判断できる。

**観測3: 同ディレクトリの Finder コピー中断マーカー**

`/Users/dm/dev/dev` (主 WT の親ディレクトリ) に `com.apple.metadata:kMDItemResumableCopy` という拡張属性が付与されていた。これは Finder が「大容量コピーが中断され再開待ち」の状態を記録する印である。中身を復号すると、**2022-11-16 の Time Machine バックアップ**（`/Volumes/.timemachine/.../2022-11-16-194401.backup/.../Users/manjumotodaishi/dev`、当時の別ユーザー名アカウント）から現在の `dev` ディレクトリへの Finder コピーが未完了のまま残置されていることが分かった。これは git を経由しない、mtime を保持した一括ファイル配置という「メカニズムのクラス」が同一ディレクトリで過去に実際に発生した物証であり、観測1の指紋と整合する。ただし日付が2022年のものであり、2026-07-31 の事象と同一の実行であるとまでは断定できない。

**観測4 (訂正): reflog に同時刻の git 操作が実在した**

復旧作業 (§4) 実行時に `git reflog show HEAD --date=iso` を確認したところ、観測1の mtime 指紋 (`2026-07-31 06:56`) と**秒単位で一致する** git 操作が記録されていた。

```
44521451 HEAD@{2026-07-31 06:56:28 +0900}: reset: moving to HEAD    (= git reset --hard HEAD 相当)
c4e6ad9b HEAD@{2026-07-31 06:56:34 +0900}: pull: Fast-forward
```

`git reset --hard` は working tree の全対象ファイルを書き込み時点の現在時刻で mtime 更新する。観測1で「git 由来ではない」と判断した根拠（mtime がバラバラの過去日時ではなく実行時刻に完全一致すること）は、実は `git checkout` だけでなく `git reset --hard` にも等しく当てはまる。**つまり 2026-07-31 06:56 の事象は、非 git 系コピー機構ではなく、`git reset --hard HEAD` → `git pull` という通常の (ただし他セッションの未コミット変更を巻き込む点で破壊的な) git 操作列で説明できる。**

これは観測3 (2022年の Time Machine コピー中断マーカー) を否定するものではない。観測3は「mtime を保持する非 git コピー機構がこの環境で過去に発生した物証」としては依然有効だが、**2026-07-31 06:56 の事象そのものの説明としては reflog の git 操作が優先する** (直接証拠 > 状況証拠)。

**現時点の結論 (訂正版)**: 2026-07-31 06:56 の mtime クラスタは `git reset --hard` + `git pull` という git 操作の組み合わせで説明が付く。ただし `reset: moving to HEAD` は「HEAD が既に指しているコミットへの reset」であり、コマンド実行者の意図（どのセッションが・なぜ実行したか）は reflog だけでは分からない。mtime 指紋そのものは今後も「一括書き込みの発生時刻を特定する」材料として有効であり、`lint-worktree-clobber-mtime.py` は git 起因・非 git 起因を問わず両方を拾う検知網として維持する価値がある。

**再発検知ツール**: 観測1の指紋（無関係な複数ディレクトリへまたがる mtime 分単位完全一致クラスタ）を自動検知する `scripts/lint-worktree-clobber-mtime.py` を追加した。`guard-worktree-desync.py` が index (staged 内容) しか見ないのに対し、こちらは working tree を直接見るため**未 stage の clobber も捕捉できる**。誤検知の余地がある状況証拠ベースの判定のため、commit を止める blocking hook としては配線していない (fail-open)。

```bash
python3 scripts/lint-worktree-clobber-mtime.py            # 人間向け報告
python3 scripts/lint-worktree-clobber-mtime.py --json     # 判定材料を JSON で出力
```

疑わしい状態に気づいたら (テストの説明不能な失敗・大量差分など)、上記を実行してクラスタの有無を確認し、疑いが出たら §2.1 の mtime 見分け方で裏を取る。

#### 2.1.2 鮮度ゲートの偽陽性に従ってはいけない

もう一つの派生症状として、**作業ツリーの内容を入力とする鮮度ゲートが偽陽性で発火する**。実測では Stop hook (`check-review-trigger.py`) が「未評価 or stale な変更 skill が 16 件」と報告したが、当該セッションは SKILL.md を 1 バイトも編集していなかった。同 script は変更検出に `git diff --name-only HEAD` を使うため、clobber で古い実体に戻った 9 件の SKILL.md が「変更された」と判定されていた。

このとき指示に従って評価を実行すると、**汚染された古い内容を評価し、そのハッシュを台帳へ焼き付ける**。台帳は緑になり、リポジトリの実際のファイルは未評価のまま残る。汚染に従うことで汚染が正当化される。

判別は台帳と HEAD の照合で確定する。

```bash
git show HEAD:<SKILL.md> | shasum -a 256          # HEAD 版
shasum -a 256 <SKILL.md>                          # 作業ツリー版
jq -r .target.skill_md_sha256 eval-log/<plugin>/<skill>/content-review/elegance-verdict.json
```

**台帳の記録が HEAD 版と一致するなら、stale なのは台帳ではなく作業ツリーである。** この場合ゲートには従わず、先に汚染を復旧する。`git diff HEAD` を変更検出に使う機構はすべて同じ性質を持つ。

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

### 4.0 汚染が大規模なら、復旧せず清浄な worktree へ退避する

差分が数百ファイル規模（実測 403 files / -29,159 行）のとき、§4.1 以降の選択復元は現実的でない。残すべき固有変更と汚染由来の差分を判別するコストが高く、判別中も汚染が継続している可能性がある。

**汚染ツリーを一切触らず、別の場所に清浄なワークツリーを作って作業を続行する。**

```bash
git worktree add --detach <repo 外のパス> <作業中のブランチ or SHA>
cd <repo 外のパス>
git checkout -b <一時ブランチ>
```

`.git` を共有するため、commit も push もそのまま行える。作業完了時は実ブランチへ push する。

```bash
git push origin <一時ブランチ>:<本来のブランチ>
git worktree remove <repo 外のパス> && git branch -D <一時ブランチ>
```

汚染ツリーの復旧は作業完了後に切り離して扱える。**ただし残置している間は `git commit -a` が巻き戻しコミットを生む危険が続く**ので、放置せず §4.1 以降で処理するか、利用者へ明示的に警告する。

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

## 6. 予防（機械防御と運用制約）

clone ごとに共有 hook bundle を設置し、配線検査が通ることを確認する。

```bash
bash scripts/install-git-hooks.sh
python3 scripts/validate-git-hooks-wiring.py --check-local-config
```

主経路の `reference-transaction` hook は、別 worktree が checkout 中の branch ref 更新を transaction 確定前に遮断する。第 2 層の `pre-commit` hook は、祖先 tree と一致する巻き戻し内容または大量の staged 削除を fail-closed で遮断する。機械防御に加えて、次の運用制約を守る。

- エージェント／自動化からの ref 操作は **`git fetch origin`（remote-tracking のみ更新）に限定**する
- **`git fetch origin main:main` と `git update-ref refs/heads/main` は使わない**。どちらも他ワークツリーが checkout 中の ref を作業ツリー無しで動かす
- main を最新にしたいときは、その worktree 自身で `git pull`（3 層すべてを更新する経路）を使う
- コミット前に `git diff --shortstat HEAD` を確認する。大量削除が出たら §3 で検証する
- **主ワークツリーで `main` を checkout したまま放置しない。**作業は必ず作業ブランチで行う

最後の項目が現時点で最も効く。desync は「ref が直接書き換えられた」だけでは起きず、**その ref を checkout 中のワークツリーが存在する**ことで初めて成立するためである。2026-07-28 15:08 に 5 件目の直接書き換え（`4c66e5e`）が発生したが、主ワークツリーが作業ブランチ上にあったため無害だった。

**ただしこの緩和策は §2 の ref desync にしか効かない。** §2.1 の clobber は作業ブランチ上のワークツリーで発生している。**作業ブランチにいることを、この変種に対する安全の根拠にしてはならない。**clobber に対して現時点で有効なのは予防ではなく検知（コミット前・テスト失敗時の `git diff --shortstat HEAD`）だけである。

## 7. 発生履歴

| 日付 | 機構 | 検知した状態 | 結果 |
| --- | --- | --- | --- |
| （日付不明・`stash@{26}` に痕跡） | ref desync | `main-4bf2a66` 同期前、index+worktree が `7e250f1` のまま | 手動退避で収束 |
| 2026-07-28 午前 | ref desync | 作業ツリーが `03093e4` に取り残し。commit していれば 65 files / -5,467 行 | commit 前に検知・復旧 |
| 2026-07-28 午後 | ref desync | 作業ツリーが PR #87 前に取り残し。commit していれば 19 files / -878 行 | commit 前に検知・復旧 |
| 2026-07-28 夕 | **clobber（§2.1）** | ref 無傷のまま作業ツリーが丸ごと過去スナップショットへ。403 files / -29,159 行。未コミットの編集が消失 | §4.0 で清浄 worktree へ退避し作業続行。**汚染ツリーは残置** |
| 2026-07-31 06:56 | **git 起因（`reset --hard` + `pull`）と判明・clobber ではなかった** | 未コミット 401 件中 276 件の mtime が分単位まで完全一致。dev-graph / ubm-goal-setting / slide-report-generator 等 15+ プラグインへ横断 | §2.1.1 観測4で reflog 突合により訂正。`reset: moving to HEAD` (06:56:28) → `pull: Fast-forward` (06:56:34) が実行時刻の一致として mtime クラスタを説明。2026-08-02 に `git checkout --detach origin/main` + `stash push -u` (index の未解決コンフリクト4件を ours で解消後) で復旧、主 WT は origin/main (`ce874d46`) と差分ゼロに収束。退避内容は `stash@{0}` (`fdw4-recovery-20260802`) に保全 |

表の 4 件（初出3件+2026-07-28夕）は、機械防御の導入前に人間／エージェントの目視で止めた履歴である。この再発を根拠に `reference-transaction` と `pre-commit` の二層防御を導入した。とくに 4 件目は reflog に指紋を残さないため ref 更新の遮断だけでは検知できないが、有害な巻き戻し内容を stage して commit する段階では第 2 層が遮断する。未 stage の clobber 自体は hook の検査対象外なので、テストの説明不能な失敗や大量差分が出たときは §2.1 の検知を引き続き行う。
