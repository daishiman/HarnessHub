---
status: confirmed
layer: architecture-decision
---

# Harness Hub dev-workflow アーキテクチャ — 差分追記ログ

> [architecture/harness-hub-dev-workflow.md](../../../architecture/harness-hub-dev-workflow.md) の「Risks and verification」節から分離した変更履歴分冊。300 行上限 (`lint-doc-line-limit.py`) を超えたための分割remediation (先例: `HarnessHub-3d8` の `docs/security-spec.md` 分冊)。時系列は本体側で追記せず、新規エントリはここへ追記する。

### 差分追記 (2026-07-21): 検証証跡の真正性リスク

live-trial 証跡の調査 (`HarnessHub-s7b`/`-rix`/`-aoe`/`-m7d`) で、**成果物だけを見る検査では「実行した」と「実行したことにした」を区別できない**というリスクが実測された。同一構造の抜け道が別々の局面で 3 回選ばれている (digest 単独書き換え / 下位 script 直叩き / registration receipt 偽造)。

本リスクは製品 (Harness Hub) の仕様ではなく**リポジトリ内の開発ツール統治**に属するため、正本章へは逆輸入しない (`system-spec/dev-workflow.md` qa-066 の「下流投影を system-spec へ逆輸入して二重正本にしない」原則)。詳細と実務ルールは次を参照する。

- [`doc/evidence-integrity-practices.md`](../../../doc/evidence-integrity-practices.md) — 3 局面の記録、4 つの教訓 (指標の独立性 / 充足可能性の担保 / 改竄と訂正の同型性 / 検証主体の分離)、導入した検証入口とその限界

検証入口 (いずれも read-only):

| 入口 | 検出対象 |
|---|---|
| `validate-receipt.py` (検査 SSOT は `register-package.py` を共有) | registration receipt の手書き・事後改変 |
| `run-skill-live-trial/scripts/validate-goal-seek-evidence.py` | `goal_seek` 実行契約の省略 |
| `lint-live-trial-verdict.py --check-provenance` | commit 差分での digest 単独書き換え |
| `lint-live-trial-verdict.py` の `check_c02_bypass` (`scripts/receiptguard_helper.py`) | `.gitignore` された fixture 内で registration receipt を `register-package.py` を通さず書換え/削除する C02 迂回 (束縛済み transcript を走査) |
| `plugins/dev-graph/scripts/validate-repo-config.py` | live-trial fixture および caller repo の `.dev-graph/config.json` が「本番なら起動ゲートで落ちる」不適合入力であること (schema 条件制約・repo 外脱出・秘密材料混入) |

> **差分追記 (2026-07-24):** `check_c02_bypass` を追加し、`--check-provenance` が届かない fixture 内 receipt 偽造 (局面 3 の実手口) を verdict 生成側の最終ゲートで塞いだ。実装は責務分離のため `scripts/lint-live-trial-verdict.py` から `receiptguard_helper.py` (C02 迂回検出) と `provenance_helper.py` (digest provenance) へ抽出済み (各ファイル ≤500 行)。

> **差分追記 (2026-07-25):** 検証入口を「証跡の真正性」から **trial 入力の適合性** へ 1 軸広げた (`validate-repo-config.py`)。成果物が真正でも、**入力が本番の起動ゲートを通らない状態**なら PASS は挙動の保証にならない。実測として 8 kind 全ての live-trial fixture が schema 違反 config で走っていたことが本入口で初めて機械検出された (`HarnessHub-n88`)。
>
> 同時に、C02 単一 writer の強制点である `guard-graph-schema.py` が **Bash 破壊操作枝のみ hook timeout で fail-open する**ことが実測された。判定に寄与しない `schema_ok()` (実測 66.47s) が fail-closed 経路の内側にあり、`Write` 0.32s に対し `Bash` は 23.88s。live-trial 中に被験セッションが自力でこの窓を発見し、`.dev-graph/state/graph.json` への生書きまで通している。**C02 の不変条件は現状「guard が遅すぎて止められない」ことに依存しており、保証ではない。** 併発して `.dev-graph/config.json` を書く sanctioned な writer が不在であり、fail-open を閉じるだけでは init が実行不能になる。是正は `HarnessHub-6in4` (`issues/sys-guard-graph-schema-timeout-fail-open-20260725.md`) で追跡する。

### 差分追記 (2026-07-26): C02 guard fail-open の解消

`HarnessHub-6in4` と `HarnessHub-7dw` の是正により、C10 の破壊操作遮断は subprocess と graph 全件 schema 検査に依存しない静的判定へ移行した。redirect は quote 外の演算子と宛先だけを解析し、遮断例を含む Beads notes 等の散文を誤遮断しない。`.dev-graph/config.json` は `build-repo-config.py`、初期 `.dev-graph/state/graph.json` は `build-graph-store.py` の preview/receipt 付き atomic writer が所有する。最終 live-trial で実測した `Path.write_text()` 迂回も静的遮断へ追加し、node 登録後の graph 変更は C02 `upsert-node.py` に限定した。

実装責務は `guard-graph-schema.py` (entrypoint と判定順序)、`guard_graph_commands.py` (shell 書込み先解析)、`build-repo-config.py` (config writer)、`build-graph-store.py` (初期 graph writer) へ分離し、各手書きファイルを 500 行以下に保った。正本契約は `plugins/dev-graph/references/claude-code-hooks-contract.md`。これは製品 API・state・security・UI contract を変えないため、`system-spec/` と `specs/` へは反映しない。

`Path.write_text/write_bytes/touch/unlink/rmdir` と書込み mode の `Path.open` は遮断対象へ含めた。一方、`os` / `shutil` / `json.dump` 等の広域 API は静的判定の誤遮断リスクを別途設計する必要があるため、architecture 上の既知の残余リスクとして `HarnessHub-lp36` で追跡する。

### 差分追記 (2026-07-29): interpreter 書込み API の BLOCK / ALLOW 境界

`HarnessHub-lp36` では、上記残余リスクのうち明示対象にした API を同一 command 内の
「書込み API 字面 + graph authority path」の共起で遮断する。対象は
`shutil.copy*/move`、`os.replace/rename`、`json.dump`、`Path.write_text/write_bytes` と
`open(path, w|a|x|r+)` である。`open(path, r|rb)`、`json.load(open(path))`、
`Path.read_text()` は read-only 調査を妨げないよう ALLOW に固定する。

この境界は Python AST 全体の完全解析ではない。変数化された path/mode、alias import、
`exec`/`eval`、`os.open` は保証外とし、C02 atomic writer の利用規約を残す。粗い共起判定に
よる誤遮断可能性は実装 docstring と focused test に固定し、「任意の interpreter 書込みを
完全遮断」とは表現しない。既存の「graph authority 直書込み禁止」契約への適合修正であり、
製品仕様への影響はないため `system-spec/`・`specs/` は非変更とする。

境界は BLOCK 17 形 / ALLOW 5 形の focused test、Dev Graph 9 skill の fresh live-trial
9/9 PASS、全体 pytest 697 passed / 2 skipped で検証した。C19 は system-spec-harness の
正規 4 entry point と C02 writer だけを使い、lineage・digest・evidence を独立 evaluator と
canonical verdict の双方で PASS とした。

PR #598 の最終統合では最新 `main` (`bb95580`) に含まれる C14 live-trial acceptance と
session ownership 契約を本 guard と同一ツリーで再検証した。feature 文書の競合は各設計履歴を
保持し、C14 receipt は統合後も有効な behavior closure `c0d843d7…4801` の beads / none
fresh 2 系列へ更新した。旧 reaper で終了した試行は失敗証跡として残し、その原因は main の
ownership 修正で閉じた。製品 API・state・security・UI の契約は非変更である。

### 差分追記 (2026-07-28): 500 行分割規約が entry point 宣言契約と衝突する

上記の責務分離で `hooks/` に import 専用の support module (`guard_graph_commands.py`) が生まれた。一方 plugin 完全性の契約テストは、`package-contract.json` の `entry_points.hooks` を **「`hooks/` にある `.py` / `.sh` の一覧」** と厳密一致で突合していた。両規約は個別には妥当だが同時には満たせず、PR #82 の CI がこれを「未宣言の entry point」として落とした。**片方の規約に従うともう片方を必ず破る**という構造であり、実装の不備ではない。

support module を `entry_points` へ書き足す解は採らない。`entry_points` は Claude Code が起動する入口の台帳であり、起動されないファイルを載せると台帳としての意味が失われる。hook 本体を `hooks/` の外へ移す解も採らない。live-trial receipt の behavior closure digest (`skill_dir_tree_sha`) が own-plugin の `hooks/` ツリー全体を含むため、無関係な 9 件の receipt が一斉に stale になる。

採った是正は**代理指標の廃止**である。突合相手を「ディスク上のファイル一覧」から **`hooks/hooks.json` が実際に登録している command の起動先** へ変え、宣言・登録・実体の 3 者一致を検査する。`hooks/` に残る未宣言ファイルは、「単体起動の入口を持たない」こと (`.py` かつ import 可能な名前、shebang なし、`if __name__ == "__main__"` なし) を満たすときだけ support module として許容する。命名規則だけを許容条件にすると、underscore 名を付けた実 hook の宣言漏れを素通りさせるためである。

この契約テストは repo-root の `tests/` にあり behavior closure の外側なので、是正は既存 receipt を一切失効させない。**どの層を触ると何が失効するか**が是正案の選択を決めた点は、以後の同種判断でも参照する。

### 差分追記 (2026-07-28): 同じ衝突が harness coverage にも現れる (2 例目)

上記と同じ責務分離で、`validate-harness-coverage.py` の `scripts/llm_eval` にも回帰が出た。同指標は**分母をファイル数、分子を code-review verdict が PASS のファイル数**で数えるため、1 実装を 5 ファイルへ割ると分母が +4、分子は +0 になる。実測は 63.1% (floor 64.1%) だが、新規 7 件を除くと 64.2% で floor 超え、分割元 `upsert-node.py` の verdict も PASS/91 のまま残っていた。**回帰の全量が分母希釈に由来し、品質は下がっていない。**

暫定対応は先例 2 件 (2026-07-12 の plugins/ 再編、2026-07-23 の `HarnessHub-aoe`) に倣った floor の手動 baseline reset である。`--update-floor` は `max(old, 現値)` で回帰時に据え置く設計のため使えない。verdict を書いて率を戻す道は取らない。`eval-log/harness-coverage-floor.json` の note が明示するとおり、それは「evaluation の捏造による緑化」であり、指標を守るために指標の意味を壊す。

**代理指標の衝突は 1 回限りの事故ではなく、500 行分割規約が持つ系統的な副作用である。**entry point 台帳は「ファイル一覧」を、coverage は「ファイル数」を、それぞれ実体の代理として使っていた。分割はファイルを増やすが実体を増やさないため、どちらも同じ向きに壊れる。構造的な是正 (分母を entry point 単位にするか、除外方向の変更が測定対象を減らして率を上げる Goodhart 経路にならないかの評価) は `HarnessHub-2mor` で追跡する。

あわせて、`--update-floor` が floor note を固定文字列で上書きし、**過去 2 回の baseline reset 経緯を消す**ことが判明した。今回は実行後に note を復元・追記している。判断の履歴が指標ファイル自身に載っていることが「なぜこの floor なのか」を後から検証可能にしていたため、この上書きは記録の欠落として同課題で扱う。

### 差分追記 (2026-07-28): 3 例目 — PKG-006/007 の「配下は全て起動対象」前提

`scripts/validate-plugin-packages.py` (PKG-006 = hook 登録整合 / PKG-007 = script shebang・実行ビット) も同じ規約で落ちた。両 check は **`hooks/` と `scripts/` の配下にあるファイルは全て起動される入口である**という前提で書かれていたため、責務分離で生まれた import 専用 module (`hooks/guard_graph_commands.py`, `scripts/node_body.py` ほか 3 件) を「未登録の hook」「shebang 欠落の script」として P0 で遮断した。

**ここまでで前提の壊れ方は 3 通り揃った** — 台帳との一致 (entry point)、母数の件数 (coverage)、そして配置ディレクトリによる役割推定 (PKG-006/007)。共通するのは、**ファイルシステム上の存在を「起動される実体」の代理として扱っている**点である。分割はファイルを増やすが起動点を増やさないため、代理を使っている検査は例外なく同じ向きに壊れる。

是正は entry point 契約テストと同じ「代理指標の廃止」で統一した。`is_import_only_support_module()` が `.py` / import 可能な名前 / shebang なし / `if __name__` なし の 4 条件を**構造として**検査し、これを満たすものだけを起動対象から除外する。命名規則だけを許容条件にすると underscore 名を付けた実 hook の宣言漏れを素通りさせるため採らない。逆に verb-hyphen 名 (`build-repo-config.py`) は import 不能なので「起動されるしかない」と確定でき、shebang 欠落は従来どおり FAIL のままである。実際、同時に検出された `build-repo-config.py` の実行ビット欠落は真の不備だったので `chmod +x` で直している。

判別境界は単体テスト 8 件で固定した (`test_harness_creator__validate_plugin_package_s2.py`)。この 3 例目までは「分割のたびに個別の検査を直す」対応だが、次に同型が出たら検査側ではなく規約側を見直す。

### 差分追記 (2026-07-25): CI にしか存在しないゲートは「着手前に気づけない」

出典: `issue-auth-tenancy-ci-wiring-20260725` (bd `HarnessHub-1f28`)。

qa-039【2】(CI と local の乖離防止) は required status check を local から同一実装で実行できることを求める。実測で、feat-auth-tenancy が追加した認証・認可の静的検査 3 件が **CI からも local `pnpm verify` からも 1 度も呼ばれていない**状態が見つかった。原因は feature の write scope が共有 CI を含まないことで、**検査を実装した本人が結線できない構造**にある。呼ばれない検査は存在しないのと同じで、手動 pass の記録は挙動の保証にならない。「検査を書いた」と「検査が走り続ける」は別の達成である。

是正として `.github/workflows/ci.yml` の静的ゲート段へ **G12** を、root には `pnpm check:auth` を同時に用意した。あわせて、必須ゲートとして名指しされている tenant 分離テストが `pnpm -r test` に紛れて実行されるだけの状態を、`scripts/ci/check-tenant-isolation-gate.mjs` (対象実在 / ケース ID 網羅 / `skip`・`only` の不在を fail-closed で検査) で名指し化した。ゲート数は増やしていない。

この作業中に **同型の未結線が G7 / G7b / G9 に残っている**ことが判明した (`HarnessHub-yhc3`)。またメタ層 lint (`governance-check.yml`) には local 入口そのものが無く、プロダクト層 `verify` へ混ぜると層分離を壊すため設計判断を要する (`HarnessHub-11qt`)。ゲート登録簿と local 入口の対応表は `docs/shared-layers.md` §3 (下流投影) が持ち、本節は「乖離が構造的に再発する」というリスクの記録に留める。

### 差分追記 (2026-07-28): 結線されていても「起動条件が恒久 false」なら走らない

出典: `issue-governance-notion-steps-always-skipped-20260725` (bd `HarnessHub-5u5k`)。

上節は「検査を書いた」と「検査が走り続ける」を別の達成として区別した。今回はその**さらに内側**が壊れていた。`governance-check.yml` の Notion 検査 2 step は workflow に結線済みで、step-level `if: ${{ env.NOTION_TOKEN != '' }}` という一見自然な gate を持っていた。しかし参照先の `env.NOTION_TOKEN` は**同じ step の `env:`** にしか無く、Actions は step の `if` を step の `env` 適用より前に評価するため、式は恒久的に `'' != '' = false` になる。`steps.if` から `secrets` context は参照できないので、この書き方では gate を secret 有無へ結び付ける経路がそもそも存在しない。結果は「secret を投入しても永久に skip」であり、未設定ゆえの skip と CI 上は完全に同じ緑を出す。

**前 3 例が「ファイルシステム上の存在を、起動される実体の代理として使った」誤りだったのに対し、これは「宣言の存在を、実行可能性の代理として使った」誤りである。**ゲート登録簿・結線チェックはいずれも「その step が workflow に書かれているか」しか見ておらず、「起動条件が真になりうるか」を検査していなかった。人手のレビューでも同型は自然に見えるため再発しやすい。

是正は 3 段構えとした。(1) 判定を job-level `env` の真偽値 (`HAS_NOTION_TOKEN: ${{ secrets.NOTION_TOKEN != '' }}`) 経由に変え、step-level `if` から解決可能にする。(2) 同型を全 workflow に対し fail-closed で遮断する `scripts/lint-workflow-step-guard.py` を追加し、`--simulate` で実 workflow の run/skip を実測可能にする。(3) 上節が指摘した CI-local 乖離を再生産しないよう、**新設ゲートを CI と同時に `make lint` / `scripts/run-ci-checks.sh` (pre-push) へも結線する**。`HarnessHub-11qt` が扱う `lint-artifact-placement` / `lint-doc-line-limit` の local 入口設計 (`--ratchet-base origin/main` を要するため別途判断が要る) とは分離してある。

あわせて、条件付き必須という第 3 の状態を台帳へ導入した。`NOTION_TOKEN` は任意 (未投入なら skip して成功) だが、**投入したなら DB ID 3 件 (variable) がすべて必要**で、欠ければ `prepare notion config` step が exit 1 で落ちる。「必須/任意」の 2 値だけでは、token だけ入れて DB ID を忘れた中途半端な設定が緑のまま残る。

**後日談 — 是正そのものが同じ罠を踏んだ。** 追加した `lint-workflow-step-guard.py` は PyYAML を要求する。開発機には入っているので `make lint` は緑になったが、`change-category-guard` job は lint 専用で依存を install しておらず、CI では `[ERR] PyYAML が必要です` の exit 2 で落ちた (PR #589)。上節が扱った「local 入口が無い」の**裏返し**で、こちらは*入口はあるが実行前提が local にしか無い*形である。結線 (どこから呼ぶか) と前提 (何があれば動くか) は別々に検査しなければならない。是正は install step を step guard より前へ置くことだが、それだけでは「後から順序が入れ替わっても気づけない」ため、①依存が本当に必要であること (PyYAML を解決不能にすると exit 2)、②install が guard より前にあり無条件であること、③版指定が `requirements-dev.txt` から実際に取り出せること、を契約テストで固定した。なお `-r` で丸ごと install しないのは、本 job が pytest を持たないこと自体が「plugin pytest は kit-ci に一元化する」の前提になっているためで、この境界も同テストで機械化した。

### 差分追記 (2026-07-28): 並列 worktree が共有する ref は「作業ツリーを持たない更新経路」を持つ

出典: `issue-worktree-main-ref-desync-20260728` (bd `HarnessHub-7xi9`)。復旧手順は `docs/worktree-desync-recovery-runbook.md`。

git は HEAD (ref) / index / 作業ツリーの 3 層で状態を持ち、`pull` と `checkout` は 3 層すべてを、`update-ref` 系は **ref だけ**を更新する。worktree は `.git` を共有するため、**別ディレクトリの worktree から、主ワークツリーが checkout 中の `refs/heads/main` を作業ツリー無しで動かせる**。これは git の仕様であり不具合ではない。

結果として主ワークツリーは ref だけが最新へ進み、実ファイルが古い基点に取り残される。この状態で `git commit -a` すると**直前の PR のマージ内容を丸ごと打ち消すコミット**が main に載る。2026-07-28 に 2 度実測しており、それぞれ 65 files / -5,467 行、19 files / -878 行の巻き戻しに相当した。`stash@{26}` に残る同種の退避を含めれば 3 回目の再発である。

**危険なのは検知が目視に依存している点である。** `git pull` は ref が最新なので `Already up to date` を返し (git は正しい)、`git status` は PR が追加したファイルを `deleted`、更新したファイルを `modified` と表示する。差分の向きが直感と逆になるため「自分が壊した」と誤認しやすく、CI も「意図された削除」と区別できないため緑のまま通過しうる。**巻き戻しコミットは、レビュー済みの変更が無言で消える形で main に到達する。**

現時点の是正は運用制約と runbook に留まる — エージェントの ref 操作を `git fetch origin` (remote-tracking のみ) に限定し、`git fetch origin main:main` / `git update-ref refs/heads/main` を禁じる。仕組みによる遮断 (`reference-transaction` hook による他ワークツリー checkout 中 ref への更新拒否、desync 状態での commit を止める pre-commit 検査) は同課題で追跡する。`core.hooksPath` が `.beads/hooks` を指すため、hook の設置場所が beads 更新で消えないことの検証が前提になる。

あわせて、**`stash@{N}` はスタックの位置であって識別子ではない**という制約が並列稼働下で顕在化した。復旧作業中に別セッションの `git stash push` で `stash@{0}` の指す対象が入れ替わる事象を観測している。退避内容を番号で参照する手順は、それ自体が事故要因である。規約は「`-m` でメッセージを必須とし、参照はメッセージ検索で行う」。

### 差分追記 (2026-07-28): 共有 hook と commit 前検査で worktree desync を二重防御する

出典: `issue-worktree-main-ref-desync-20260728` (bd `HarnessHub-7xi9`)。実装後の運用・
復旧手順は `docs/worktree-parallel-operations-runbook.md`。

観測時点では運用制約だけだったが、最終的に次の 2 層を実装した。

1. `reference-transaction` hook は、更新対象の `refs/heads/*` を checkout 中の worktree
   を列挙し、実行元以外が所有する ref の更新を transaction 確定前に拒否する。
   ref 更新はリポジトリ修復にも必要な根幹経路なので、worktree 情報を取得できない場合は
   fail-open（判定不能なら通す）とする。
2. `pre-commit` hook は、index tree が HEAD の過去の tree と一致する巻き戻し、および
   閾値以上の staged 削除を拒否する。こちらは commit だけを止めればよいため、
   Python や検査材料が欠けた場合も fail-closed（判定不能なら止める）とする。

`core.hooksPath=.githooks` のような相対指定は、コマンド実行元 worktree の内容を参照する。
そのため導入前の古い branch には hook が存在せず、防御を迂回できる。
`scripts/install-git-hooks.sh` は tracked template を
`<git-common-dir>/harness-hub-hooks/` へコピーし、その絶対パスを `core.hooksPath` に
設定する。これにより branch の新旧に関係なく全 worktree が同じ hook を実行する。

beads が管理する `.beads/hooks` との競合は、共有 hook から現在の worktree の beads hook
へ委譲し、beads 側にも共有 guard を呼ぶ保険経路を置いて解消する。共有 bundle の欠落・
tracked template との差・`core.hooksPath` のずれ・beads 再生成による保険経路の消失は
`scripts/validate-git-hooks-wiring.py` を pre-push と CI に結線して検知する。
pre-push の installed-bundle 経路も、現在の branch に tracked template が存在する場合は
内容差を検査する。導入前の古い branch では source template が無い pair の freshness
比較だけを省略し、共有 bundle 単独での遮断能力を維持する。

並列環境の stash は、push 時に固有メッセージを付け、
`git stash list --format='%H %gs'` から commit SHA を直接取得して復元する。番号を得てから
SHA へ変換する 2 段階手順にも競合窓があるため使用しない。

### 差分追記 (2026-07-28): 登録済みの merge driver が、宣言の欠落で一度も発火していなかった

出典: bd `HarnessHub-3829`。

`.dev-graph/state/graph.json` は約 340 ノードが 1 配列に並ぶ単一 JSON であり、git 標準の行ベース 3-way マージは「配列の同じ位置への両側追加」を衝突として誤検出する。これに対し `graph_node_id` を鍵とする構造マージ driver (`plugins/dev-graph/scripts/build-merged-graph.py`) が用意され、各 worktree の `git config merge.devgraph-json.driver` にも登録されていた。**しかし発火条件である `.gitattributes` の宣言がリポジトリのどこにも存在せず、driver は一度も呼ばれていなかった。**

git は merge driver を 2 段で解決する。`.gitattributes` が「どのパスにどの**名前**の driver を割り当てるか」を宣言し、`git config merge.<name>.driver` が「その名前をどの**コマンド**で実行するか」を解決する。driver 本体のコマンドを `.gitattributes` に書くことは git が禁じている (clone しただけで任意コマンドが実行されるため)。この分離自体は fail-safe に効いており、未 install の clone では名前が解決できず従来どおり行ベースで衝突表示される — 壊れた自動解決にはならない。**壊れるのは逆側、宣言が無いまま config だけが揃っている場合である。**このとき driver は静かに使われず、行ベースマージが偶然成功する限り誰も困らない。

是正は `.gitattributes` の追加と、**対照実験を伴う機械検査**である (`plugins/dev-graph/tests/test_build_merged_graph.py`)。本命テストが「driver が衝突を解決する」ことを見るだけでは、シナリオが行ベースでも解決できるものへ退化したときに気づけない。同ファイルに「driver 未 install の repo では同じシナリオが必ず衝突する」対照群を置き、本命の緑が driver の発火を実際に含意するようにした。

これは先行する 4 例 (代理指標の衝突 3 件と、恒久 false な起動条件 1 件) とは別種だが、**「動いていないことが観測できない」という点で同型**である。代理指標は実体と代理がずれても緑を出し、恒久 false な gate は起動しない step が緑を出し、本件は有効化されていない機構が緑を出す。いずれも検査の不在ではなく、検査が何を含意しているかの取り違えに由来する。

### 差分追記 (2026-07-29): live-trial cleanup の所有権境界

出典: system-spec `qa-090`、bd `HarnessHub-cjwm` / `HarnessHub-0vs2`。

tmux server は複数 worktree・複数 trial から共有されるため、`lt-` prefix だけでは
削除権限を表せない。session 作成時に `@lt_run_id` と `@lt_owner_pid` を記録し、
通常の reaper は次の三条件をすべて満たす session だけを削除する。

1. session 名が対象 run-id の正規 prefix に一致する。
2. tmux metadata の `@lt_run_id` が対象 run-id と一致する。
3. tmux metadata の `@lt_owner_pid` が boot から handoff された owner PID と一致する。

一条件でも不明または不一致なら削除しない fail-closed 境界とする。現在の shell PID を
owner PID の代用品にせず、boot の READY 出力をそのまま cleanup へ渡す。
全 session の回収は通常フローから分離した明示 `--all` だけに許可する。
fake tmux と実 tmux の sibling 生存テストを設計境界の回帰証拠とする。

### 差分追記 (2026-07-29): C02/C11 の安全境界

- C11 は frontmatter・見出し・placeholder だけの artifact を incomplete として後段を止める ([受領書](../../../docs/features/feat-dev-pipeline-improvement/c11-artifact-body-readiness-spec-reflection.md))。
- C02 は stale full snapshot による lifecycle 後退を無変更で拒否し、重複報告 `HarnessHub-j66m` は既存 node `issue-c02-upsert-lifecycle-regression-20260729` へ統合する ([受領書](../../../docs/features/feat-dev-pipeline-improvement/bk8v-c02-lifecycle-spec-reflection.md))。
- workflow step guard は対象 directory 不在・対象 0 件を既定で拒否し、明示 `--allow-empty` だけを許可する ([受領書](../../../docs/features/feat-dev-pipeline-improvement/foq6-workflow-step-guard-spec-reflection.md))。
- いずれも repository 内の開発管理・品質ゲートに限定し、製品 runtime 契約は変更しない。

### 差分追記 (2026-07-30): CI-local parity の集合契約

CI blocking invocation を local hard gate または理由付き exact allowlist へ束縛する。引数を保持した集合包含、fail-closed 境界、3 入口への結線は [設計受領書](../../../docs/features/feat-dev-pipeline-improvement/local-ci-parity-spec-reflection-receipt.md) §4 を正とする。`HarnessHub-pyb3` は同じ入口の G4 を `workspaceConcurrency: 1` で安定化した。詳細は [受領書](../../../docs/features/feat-hub-foundation/g4-workspace-test-concurrency-spec-reflection-receipt.md)。

### 差分追記 (2026-07-30): C02 document parity と live-trial session 環境隔離

`qa-102` は C02 の本文保持・schema/lint parity と、tmux global environment を routing 正本にせず `new-session -e` で trial 固有の監査台帳 path を上書きする境界を確定した。詳細は [仕様反映確認](../../../docs/features/feat-dev-pipeline-improvement/c02-document-layer-spec-reflection.md)。

### 差分追記 (2026-08-01): 遮断レイテンシ test の代理指標 — 赤側の偽陽性

出典: bd `HarnessHub-5iuq` (`issues/sys-flaky-guard-graph-schema-latency-20260728.md`)。

`test_guard_graph_schema_fail_open_window.py::test_denial_latency_does_not_depend_on_the_repository_graph` が、20+ worktree 並列稼働下で `assert 3.559s < 1.0s` により偽陽性で落ちていた。固定したい契約は「遮断が graph サイズに依存せず確定する」であり、絶対所要時間はそれを間接的に測る代理指標にすぎない。マシン負荷という契約外の変数が混入し、契約が破れていなくても赤になっていた。

上記の系列 (2026-07-28 の 3 例、entry point 台帳・harness coverage・PKG-006/007) はいずれも**緑側の偽陰性** (実体は壊れているのに検査が通る) だったのに対し、本件は**赤側の偽陽性** (実体は健全なのに検査が落ちる) である。方向は逆だが、「検査が何を含意しているかの取り違え」という同じ原因に由来する。赤の偽陽性は緑の偽陰性と対称の害を持つ — 「またこれか」と読み飛ばす習慣がつき、同じ見た目の本物の退行を見逃す土壌になる。

是正は閾値の引き上げを採らず、契約を直接測る構造検査へ置き換えた。遮断対象コマンドが `context_ok()` (repository context 解決。唯一 subprocess を起動する後段) へ到達しないことを `monkeypatch` で直接検証し、本体 repo (大きい graph) と空 repo の双方で成立することを固定した。陽性対照 (`echo safe` が `context_ok()` へ進み、trap が発火する) を添えて、判定ロジックの空振りを排除している。実プロセスでの exit-2 smoke test は維持し、遮断そのものの実測は残した。

対象は `plugins/dev-graph/tests/test_guard_graph_schema_fail_open_window.py` の 1 ファイルに限定され、`guard-graph-schema.py` の遮断ロジックは変更していない。製品 API・state・security・UI の契約は非変更のため `system-spec/`・`specs/` は非変更。検証は focused file 3 回連続 48 passed/2 skipped、`plugins/dev-graph/tests` 全体 pytest-xdist 721 passed/2 skipped、`make lint` / `plugin-package-check` PASS。判断と検証の全量は [仕様反映受領書](../../../docs/features/feat-dev-pipeline-improvement/5iuq-guard-latency-proxy-metric-spec-reflection.md) を正とする。

### 差分追記 (2026-08-02): exact-13 registration と task projection の境界

`HarnessHub-cvli` は、system-dev-planner の registration manifest と C02
`upsert-node.py` の task Markdown 投影が同じ node を順に更新する境界を明文化した。
manifest は exact-13、source digest、immutable generation receipt を所有し、C02 は
`purpose`、`goal`、`scope_in`、`scope_out`、`acceptance`、`architecture_refs` を task
frontmatter と graph node に具体化する。再登録時に manifest が六項目を省略している場合だけ、
`register-package.py` が保存済みの投影値をコピーして比較・置換する。明示 manifest 値を保存値で
上書きすること、または六項目以外を無差別に引き継ぐことはしない。

projection により `updated_at` が前進する場合だけを同一状態として許可する。時刻後退、解釈不能な
時刻、または非時刻フィールドの差分は fail-closed とし、drift として止める。この最小の共有 helper
により 500 行を超えた registration script と test を責務分離し、公開 CLI・graph schema・
source digest・receipt contract は維持する。製品 runtime の component 境界は変更しない。詳細は
[仕様反映受領書](register-package-projection-idempotency-spec-reflection-receipt.md) を正とする。

### 差分追記 (2026-08-07): task kind の C11 conditional_templates 見出し検査解決

`HarnessHub-yzv0` は `HarnessHub-85z0` が `specification` のみへ限定していた
`HEADING_MISSING_KINDS` (C11 本文見出し欠落検査対象 kind) を `task` へ拡張した。
system-dev-planner 由来 task は `source_lineage.origin_kind` を条件分岐トリガーに、
`conditional_required_sections` の複数 variant (フル19見出し / 軽量3見出し) のいずれかに
一致すれば heading_missing なしと判定する。manual origin task は従来通り base
required_sections で検査する。`issue` kind は構造が異なる別課題としてスコープ外へ切り出した。
製品 API・state・security・UI の契約は非変更のため `system-spec/`・`specs/` の本文は非変更。
判断と検証の全量は
[仕様反映受領書](../../../docs/features/feat-dev-pipeline-improvement/yzv0-task-conditional-heading-check-spec-reflection-receipt.md)
を正とする。

### 差分追記 (2026-08-08): system-spec import の C11 heading contract

`HarnessHub-o4zi` は system-spec index と requirements definition の正当な本文形を `conditional_triggers` で表現し、同じ origin の通常章へ緩和が波及しないよう source_path まで完全一致させる。architecture を heading 検査へ加え、base 完全準拠も受理する。製品 API・DB・認証認可・UI は非変更。判断と検証は [仕様反映受領書](../../../docs/features/feat-dev-pipeline-improvement/o4zi-system-spec-import-heading-contract-spec-reflection-receipt.md) を正とする。
