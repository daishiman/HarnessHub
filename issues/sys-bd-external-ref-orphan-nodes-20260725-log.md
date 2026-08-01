# 棚卸し実測ログ: bd external_ref orphan (2026-07-26 以降)

本ファイルは `issues/sys-bd-external-ref-orphan-nodes-20260725.md` (graph node `issue-bd-external-ref-orphan-nodes-20260725`) の**本文の続き**である。
課題の定義・対処方針・受け入れ条件は親ファイルにあり、ここには**時系列の実測ログだけ**を置く。

分離した理由: 親ファイルが 533 行まで伸び、課題の定義と実測の追記ログが同一ファイルに混在して読めなくなったため (HarnessHub-w7n7)。**内容は 1 文字も変えず、切り出しただけ**である。
以降の追記もこのファイルの末尾へ時系列で積む。

graph node は親ファイルのみが持つ。本ファイルは node 実体ではないので frontmatter を持たない。

---

# 棚卸し結果 (2026-07-26)

## 実測値の更新

| 指標 | 初版 (07-25) | 本棚卸し (07-26) |
|---|---|---|
| orphan external_ref 合計 | 74 | **79** |
| うち closed | 35 | 49 |
| **非クローズ小計** | **39** | **30** |
| `parity_manifest_missing` | 22 | **26** |

数が動いた理由: beads の Dolt DB は **全 worktree / 全ブランチで 1 個を共有**しており、git branch に
紐づかない。棚卸し中の別セッションが `HarnessHub-v22l` `HarnessHub-njkm` 等を起票したため、
観測のたびに増える。**ドリフトは時間とともに単調増加する**ことが実測で裏付けられた。

## AC3: 非クローズ 30 件の 3 系統仕分け

判定軸は「graph node の実体がどこに在るか」。**全 ref (`refs/heads` + `refs/remotes`) の
`graph.json` と `issues/*.md` を横断走査**して分類した。ローカル作業ツリーだけを見ると
系統 B がすべて系統 C に誤分類されるため、ref 横断が必須である。

| 系統 | 件数 | 判定 | 対処 owner と次の一手 |
|---|---|---|---|
| **A. node を復元すべき** | **0** | ローカル `content_roots` に spec 実体があるのに graph 未登録 | (該当なし) |
| **B. マージ待ち** | **9** | 未マージブランチの `graph.json` に node が実在 | **対処不要**。参照は正しく、当該ブランチのマージで自然解消する |
| **C. 真の orphan** | **21** | どの ref の graph にも `issues/` にも実体が無い | 個別に「node 化」か「参照剥がし」かを中身で判断 (下記) |

### 系統 B (9 件) — マージ待ち・対処不要

| bd issue | status | graph_node_id | node が在る ref |
|---|---|---|---|
| `HarnessHub-a4ks` | open | `feat-task-spec-test-strategy` | `devgraph/feat-task-spec-test-strategy` |
| `HarnessHub-a4ks.13` | in_progress | `SYS-TASK-SPEC-TEST-STRATEGY-P13` | 同上 |
| `HarnessHub-33ho` | open | `issue-qa-log-id-uniqueness-gate-20260726` | 同上 |
| `HarnessHub-dxfe` | open | `issue-qa070-qa-log-entry-missing-20260726` | 同上 |
| `HarnessHub-ji8y` | open | `issue-task-spec-validate-command-unrunnable-20260725` | 同上 |
| `HarnessHub-11qt` | open | `issue-governance-lint-local-entry-20260725` | `devgraph/issue-auth-tenancy-ci-wiring-20260725` |
| `HarnessHub-yhc3` | open | `issue-verify-local-gate-parity-20260725` | 同上 |
| `HarnessHub-aqi` | in_progress | `issue-hub-cwv-tbt-over-budget-20260724` | `devgraph/feat-dev-pipeline-improvement` 他 4 ref |
| `HarnessHub-5rb` | open | `issue-qa070-lineage-restoration-20260724` | `wip/p73-worktree-snapshot` (spec 実体も在り) |

**判断理由**: これらは「参照が壊れている」のではなく「参照先がまだ main に来ていない」だけである。
`bd close` も参照張り替えも**誤り**であり、当該ブランチのマージが唯一の正しい解消手段。
初版の 3 系統 (復元 / 張り替え / close) はこのケースを想定しておらず、そのまま適用すると
生きている 9 件を破棄してしまう。**この系統の発見が本棚卸しの主要成果**である。

### 系統 C (21 件) — 真の orphan

全 21 件が `issue-*-2026MMDD` 形式の単発 issue で、起票日は 2026-07-21〜07-26。すべて `open`。

```
issue-actions-secrets-provisioning-evidence-20260725   HarnessHub-vns9
issue-aggregate-completeness-file-split-20260722       HarnessHub-4d8
issue-auth-501-doc-refresh-20260726                    HarnessHub-mr3c
issue-completeness-report-session-id-migration-20260723 HarnessHub-6ib
issue-contract-s10-unmappable-status-overstated-20260722 HarnessHub-rzc
issue-db-write-gate-sweep-20260726                     HarnessHub-mb7c
issue-devgraph-decompose-inline-dag-check-20260721     HarnessHub-ifo
issue-g4-parallel-rpc-timeout-20260725                 HarnessHub-pyb3
issue-governance-notion-steps-always-skipped-20260725  HarnessHub-5u5k
issue-guard-hook-block-latency-20260721                HarnessHub-7dw
issue-harness-creator-entry-points-under-declared-20260721 HarnessHub-zrn
issue-libsql-connection-recovery-20260726              HarnessHub-njkm
issue-make-lint-ci-skill-description-parity-20260726   HarnessHub-kkqq
issue-pkg-contract-skill-dependencies-undefined-20260721 HarnessHub-936
issue-refresh-race-observability-20260726              HarnessHub-v22l
issue-resource-map-deep-cards-20260722                 HarnessHub-ldq
issue-run-skill-feedback-ref-format-unify-20260722     HarnessHub-883
issue-shared-layers-registry-baseline-drift-20260724   HarnessHub-42g
issue-spec-state-writer-implicit-contracts-20260721    HarnessHub-d15
issue-upsert-node-body-overwrite-20260725              HarnessHub-v1yh
issue-worker-secret-ledger-conflict-20260725           HarnessHub-x2x9
```

**判断理由 (close しなかった理由)**: 21 件はいずれも中身が生きている P1/P2 バックログである
(guard hook のブロック遅延、CI ゲート未結線、DB write ゲートの掃き出し、libSQL 接続復旧など)。
`bd close` は「解決した」という記録を残す操作であって「参照が壊れていたから消す」操作ではない。
参照の不整合を理由に未解決課題を閉じるのは、**受入条件 AC1 の数値を満たすためにバックログを
破棄する Goodhart 型の対処**であり、本 issue の `scope_out`「silent drop 禁止」と同じ原則に反する。

したがって正しい処分は次のいずれかで、いずれも 21 件それぞれの中身を読んで決める必要がある。

1. `issues/sys-*.md` を書き起こして C02 `upsert-node.py` で node 化する (graph 管理下に戻す)
2. graph 管理外の課題と判断し、`external_ref` を落として `external_ref_absent` 側へ移す

**これは本ブランチの `resource_scope` (C28 + parity manifest + issues/) で完結せず、21 件分の
仕様書作成という独立した作業量を持つ。** よって派生 issue へ切り出した (AC4 参照)。

### 系統 A が 0 件だったことの意味

「spec 実体があるのに graph 未登録」= C02 upsert の取りこぼしは**現時点で存在しない**。
つまり `upsert-node.py` 側に穴は無く、原因は下記 P1/P2 の 2 経路に絞られる。

## AC2: `parity_manifest_missing` の期待値と根拠

```bash
python3 plugins/dev-graph/scripts/build-parity-manifest.py --repo-root . \
  --out eval-log/dev-graph/run-dev-graph-schedule/parity-manifest.json
python3 plugins/dev-graph/scripts/bd-bridge.py --op ready --repo-root . \
  --parity-manifest eval-log/dev-graph/run-dev-graph-schedule/parity-manifest.json
```

実測 (2026-07-26):

```json
{"ready_set": 14, "conflicts": 0, "unmapped": 40,
 "unmapped_summary": {"external_ref_absent": 14, "parity_manifest_missing": 26}}
```

**期待値の導出** — 非クローズ orphan 30 件が `bd ready` 候補集合を通ると何件残るか:

| 内訳 | 件数 | ready 候補に出るか |
|---|---|---|
| `in_progress` (`a4ks.13`, `aqi`) | 2 | 出ない (着手済みは ready ではない) |
| `HarnessHub-b7ng` に blocks される (`mr3c`, `v22l`) | 2 | 出ない (依存未了) |
| 残り | **26** | 出る → `parity_manifest_missing` |

**26 = 26。実測と期待値が一致する。**

**根拠 (最重要)**: `parity_manifest_missing` 26 件の external_ref を graph node 集合と突合したところ、
**26 / 26 がすべて orphan 由来**であり、「graph に実在するのに manifest が取りこぼした」件は **0 件**。

```
parity_manifest_missing: 26
  うち orphan 由来:                    26   (系統 C = 19, 系統 B = 7)
  うち graph 実在 = 真の manifest 取りこぼし:  0
```

したがって `build-parity-manifest.py` の生成ロジックに欠陥は無く、この札が常時 26 件立っていた
原因は **100% 参照側の宙吊り**である。manifest 側を触る必要はない。

## AC4: 発生経路の特定

### P1 — `--op create` が graph node の実在を検証していなかった (本変更で修正済み)

`bd-bridge.py --op create` は `--graph-node-id` を**必須**にしていたが、その値が canonical graph に
**実在するか**は一切見ていなかった。よって「まだ node を作っていない ID」「タイプミスした ID」
「別ブランチにしか無い ID」のいずれでも bd issue が作れてしまい、その瞬間に dangling reference が
1 件生まれる。guard hook が beads mutation を C28 に限定している以上、**C28 が唯一の入口であり、
ここに検証が無いことが orphan 量産の直接原因**だった。

**修正**: `_require_registered_nodes()` を追加し、`create` の書込**前**に canonical graph
(`.dev-graph/config.json` の `local_state.graph` から解決) との突合を行う fail-closed ゲートを入れた。
未登録なら `ContractError` で拒否し、`C02 upsert-node.py で先に node を登録せよ` と指示する。

設計上の要点:

- **canonical graph を読む** (parity manifest ではない)。起票前の node は `beads_linkage` を持たず
  manifest の `nodes[]` に載らないため、manifest で検証すると常に誤判定になる。
- **graph の path を引数で受け取らない**。受け取ると空の graph を指させてゲートを素通りできる。
  `config.json` から解決し `must_exist=True` で固定する。
- **all-or-nothing**。feature package 投影 (epic 1 + task 13 = 14 件) は、1 件でも書き始める前に
  全 14 件の実在を確かめる。途中で落とすと epic だけが dangling で残り、再実行時の冪等経路
  (`_find_external`) がそれを「登録済み」と誤認して穴が固定化する。
- **dry-run も同じ判定を通す**。preview が本番より甘いと、preview で通ったものが本番で落ちる。

### P2 — graph 側の node 削除が bd へ伝播しない (未修正・派生 issue)

commit `84c8076` の stale GC が `graph.json` から node を削除したが、対応する bd issue は
`open` のまま残った。graph → bd の削除伝播経路が存在しないため、**GC を実行するたびに
系統 C が増える**。P1 を塞いでも、この経路は独立に orphan を生み続ける。

系統 C 21 件のうち相当数がこの経路由来と考えられる。

### 派生 issue (起票済み)

| bd issue | graph_node_id | 担当範囲 |
|---|---|---|
| `HarnessHub-ii90` | `issue-devgraph-graph-gc-bd-close-propagation-20260726` | P2 の修正 (graph 削除 → bd 伝播ゲート) |
| `HarnessHub-eshr` | `issue-orphan-external-ref-backlog-disposition-20260726` | 系統 C 21 件の個別処分 (AC1 の残り) |

## P1 修正の end-to-end 実証 (dogfooding)

上記 2 件の起票を、**追加したゲートを実際に通して**行った。

1. `issues/sys-*.md` + node JSON を用意し C02 `upsert-node.py` で graph へ登録 (revision 552 → 554)
2. C28 `--op create` で bd issue を起票 → `registration.registered: true`, `graph_node_count: 302`
3. `beads_linkage` を C02 の patch で graph へ書き戻し (revision 554 → 556)

**陰性確認 (ゲートが実際に発火するか)**:

```
$ bd-bridge.py --op create --graph-node-id issue-this-node-does-not-exist-99999999 ...
create requires every graph_node_id to exist in the canonical graph;
unregistered: issue-this-node-does-not-exist-99999999;
register the node with C02 upsert-node.py first
```

未登録 ID は書込前に拒否され、かつエラーが**次の一手まで指示**する。ゲートは止めるだけでは
不十分で、止められた側が何をすればよいか分からないと `--force` を探しに行くため。

**起票前後の parity 比較**:

| | 起票前 | 起票後 |
|---|---|---|
| `ready_set` | 14 | **16** (新 2 件が正しく入った) |
| `conflicts` | 0 | 0 |
| `parity_manifest_missing` | 26 | **26** (増えていない) |
| `external_ref_absent` | 14 | 14 |

**新規 2 件は `unmapped` に一切現れなかった。** 従来の経路なら、node 未登録のまま起票して
`parity_manifest_missing` が +2 されていた。正しい順序を通せばドリフトが 1 件も生まれないことの
end-to-end 実証である。

## 本変更で追加した棚卸し手段: `--op orphan-audit`

```bash
python3 plugins/dev-graph/scripts/bd-bridge.py --op orphan-audit --repo-root .
```

`bd list --status all` の全件を走査し、`dev-graph:` prefix を持つ `external_ref` のうち
canonical graph に実体が無いものを **closed も含めて全件**返す。`orphan_summary` に
`total` / `non_closed` / `by_status` / `by_disposition` を出す。

`disposition` は exact-set:

| 札 | 意味 | 次の一手 |
|---|---|---|
| `restore_node` | `content_roots` に spec 実体が在るのに graph 未登録 | C02 `upsert-node.py` で復元 |
| `repoint_or_close` | 実体も無い | 実在 node への張り替えか失効 close かを中身から人が決める |

**`unmapped` の reason 札 (`external_ref_absent` / `parity_manifest_missing`) に第 3 の札を
足さなかった理由**: その exact-set の正本は `plugins/dev-graph/references/execution-tracker-contract.md`
§10 であり、本 issue の `resource_scope` 外である。契約を勝手に広げず、独立した op として分離した。

**closed も返す理由**: 件数を絞ると「棚卸しの母数」が観測者によって変わる。`scope_out` の
「closed 済み 35 件の遡及復元は不要」は**復元しない**という判断であって、**数えない**という
判断ではない。母数を隠すと初版の 74 と本棚卸しの 79 のような差分が追えなくなる。

### `--scan-refs`: 系統 B を機械判定する

手作業で行った ref 横断の仕分けを op 本体へ取り込んだ。

```bash
python3 plugins/dev-graph/scripts/bd-bridge.py --op orphan-audit --repo-root . --scan-refs
```

`refs/heads` + `refs/remotes` の全 ref について `graph.json` を **ref ごとに 1 回だけ**読み、
node が実在する ref を `node_in_refs[]` に記録して `merge_pending` を付ける。

`disposition` の優先順位は「その札を見た人が次に**書き込む**か否か」で決めた。

| 条件 | 札 | 理由 |
|---|---|---|
| 他 ref に node あり | `merge_pending` | ここで C02 upsert を走らせると、マージで運ばれてくる同じ node を先回りで書き `graph.json` が衝突する |
| ref 無し + spec あり | `restore_node` | 復元先が一意。C02 一択で人の判断は不要 |
| ref 無し + spec 無し | `repoint_or_close` | 機械には決められない |

**ローカル spec と他 ref の両方に該当する場合も `merge_pending` が勝つ。**
「待て」は取り消せるが「書いた」は取り消しに手間がかかるため、曖昧なら書かない札を選ぶ。

**既定 off の理由**: 全 ref の graph を読むため作業ツリー限定より重い。ただし `refs` が空なら
判定は走査導入前の 2 分岐と完全に一致するので、既定実行の意味は変わらない。走査したか否かは
`scanned_refs` として receipt に残す — 未走査を「他 ref に無いと確認済み」と読まれると、
`merge_pending` が 0 件なのは調べていないからなのか本当に無いのかが区別できなくなる。

**実データでの検証**: `--scan-refs` の `merge_pending` は **9 件**で、上記の手作業仕分け
(系統 B) と **bd_issue_id まで完全一致**した。

## ドリフト速度の実測

本棚卸しの実行中 (数時間) に、非クローズ orphan が **30 → 33** へ増えた。増分 4 件はすべて
`-20260726` 起票:

```
HarnessHub-74hx  issue-c02-skill-doc-regenerate-body-20260726
HarnessHub-n7gw  issue-completion-evidence-local-only-gap-20260726
HarnessHub-q5h9  issue-guard-fix-closure-verdict-refresh-20260726
HarnessHub-f84o  issue-guard-graph-schema-inline-python-variable-path-20260726
```

**原因**: beads の Dolt DB は全 worktree で 1 個を共有する一方、`bd-bridge.py` は
worktree ごとに別々の実体である。他 worktree はまだ**未修正版**を使っているため、
本ブランチのゲートは効かない。

**含意**: P1 の修正は **main にマージされて初めて有効になる**。それまではドリフトが
数時間あたり数件の速度で増え続ける。系統 C の在庫件数は
`issue-orphan-external-ref-backlog-disposition-20260726` の着手時点で再計測すること
(本 issue に記録した 21 件は 2026-07-26 時点のスナップショットに過ぎない)。

## AC1 の状態

> bd export × graph.json の突合で、status が closed 以外の orphan external_ref が 0 件

**本ブランチ単独では未達 (21 件残)。** 理由は系統 C の判断理由に記した通りで、
21 件を 0 にする手段は「バックログ破棄」か「21 件分の spec 作成」しかなく、前者は禁止、
後者は本 issue の変更範囲を超える。派生 issue へ切り出した。

**再発は止まった**: P1 を塞いだので、以後 C28 経由で新しい orphan は作れない。
残 21 件は在庫であり、フローは止血済みという状態。

## 2026-07-28 main 取り込み後の完了確認

`origin/main` 取り込み後の canonical graph と共有 Beads DB を正本に、受け入れ条件を
最初から再計測した。過去記録の 21/26 件はスナップショットであり、今回の判定には使っていない。

### AC1: 非クローズ orphan

初回再計測は `non_closed=19` (`merge_pending=2`, `repoint_or_close=17`)。
派生 task `HarnessHub-eshr` で 17 件を個別確認し、全件が未解決の実作業を持つため
参照剥がし・close ではなく C02 node 復元とした。作業中に新規発生した
`HarnessHub-cjwm` も同じ基準で確認・復元し、合計 18 node を追加した。

復元後の実測:

```text
orphan_summary.total = 43
orphan_summary.non_closed = 2
by_status.closed = 41
by_status.open = 2
by_disposition.merge_pending = 2
by_disposition.restore_node = 0
by_disposition.repoint_or_close = 0
```

残る 2 件:

| bd issue | graph_node_id | 実在 ref | 判断 |
|---|---|---|---|
| `HarnessHub-5rb` | `issue-qa070-lineage-restoration-20260724` | `refs/heads/wip/p73-worktree-snapshot` | merge-pending。先回り復元禁止 |
| `HarnessHub-cvli` | `issue-register-package-projection-idempotency-drift-20260728` | `origin/main` ほか | merge-pending。走査時点の作業ツリー graph へ未反映 |

したがって true orphan の在庫は **0 件**、`HarnessHub-eshr` の受け入れ条件は満たして close 済み。
一方、親 mfh7 の文言どおり「非クローズ orphan 全体を 0 件」と読むと **2 件残で未達**である。
2 件は他 ref の生きた node なので、数値のための複製・参照剥がし・close は行わない。

### AC2: `parity_manifest_missing`

`eval-log/dev-graph/mfh7-parity-current.json` を revision 939 の graph から再生成し、
`bd-bridge.py --op ready` を再実行した。

```text
unmapped_summary.external_ref_absent = 13
unmapped_summary.parity_manifest_missing = 3
```

期待値 3 の内訳:

1. `HarnessHub-5rb`: merge-pending orphan
2. `HarnessHub-cvli`: merge-pending orphan
3. `HarnessHub-ji8y`: graph node は実在するが `beads_linkage` が無く manifest 対象外

観測値 **3 = 期待値 3**。true orphan 由来は 0、graph 実在 node の manifest/linkage
取りこぼしは `HarnessHub-ji8y` の 1 件として識別可能になった。

### AC3/AC4 と品質ゲート

- 18 件の処分区分・判断理由・登録結果は
  `issues/sys-orphan-external-ref-backlog-disposition-20260726.md` に記録した。
- 発生経路 P1 (`bd-bridge.py --op create` の node 実在未検証) は本変更で fail-closed 化済み。
- 発生経路 P2 (graph GC 時の Beads 参照放置) は派生 task `HarnessHub-ii90` に切り出し済み。
- 最新 behavior closure に対し C02/C03/C14/C15 の live trial を再実行し、全4件が
  `launch=PASS / completion=PASS / goal_fit=PASS`。criteria receipt も最新 verdict へ更新した。

## 2026-07-28 最新 main (`9fe09e5`) 反映後の再確認

作業中に `origin/main` が複数回進んだため再 fetch し、本ブランチを commit を作らない
fast-forward で最終 `9fe09e5` へ更新した。最初の main 側 1 node 追加・15 node 更新に加え、
後続 main の 1 node 更新も、このタスク側の復元 node と三者差分で統合した。
main 統合直後の graph revision は 947 で、その後の本記録 C02 更新により revision は進む。
統合後の schema 検証は
`valid=true / implementation_readiness=complete / violations=[]` だった。

main 反映により `HarnessHub-cvli` は canonical graph に入り自然解消した。一方、共有 Beads DB に
並行作業の `HarnessHub-ory6`
(`issue-id-uniqueness-gate-generalization-20260728`) が新規 orphan として現れた。
`bd --readonly show HarnessHub-ory6 --json` で、重複 ID 検査を他 validator へ一般化する
未解決の実作業を持つことを確認したため、参照剥がし・close ではなく
`restore_node` と分類した。C02 を dry-run 後に適用し、graph revision 942 → 943、
`operation=added / write_count=2` で node と issue 本文を復元した。

最終確認中にも共有 DB へ `HarnessHub-7xi9`
(`issue-worktree-main-ref-desync-20260728`) が追加された。並列 worktree による main ref と
作業ツリーの desync を防ぐ具体的な受入条件を持つ未解決 issue であることを `bd show` で読み、
同じ基準で `restore_node` とした。C02 dry-run 後の適用は graph revision 950 → 951、
`operation=added / write_count=2`。今回の個別復元は累計 20 件となった。

最終実測:

```text
graph_node_count = 363
dev_graph_reference_count = 393
orphan_summary.total = 42
orphan_summary.non_closed = 1
by_status.closed = 41
by_status.open = 1
by_disposition.merge_pending = 1
by_disposition.restore_node = 0
by_disposition.repoint_or_close = 0
```

非クローズ残件は `HarnessHub-5rb`
(`issue-qa070-lineage-restoration-20260724`) のみで、
`refs/heads/wip/p73-worktree-snapshot` に node が実在する `merge_pending` である。
本タスクの分類規則どおり、先回り node 複製・参照剥がし・close は行わない。
したがって **true orphan は 0 件**だが、AC1 の文言を厳密に
「全非クローズ orphan 0 件」と読む場合は **1 件残で未達**である。

parity manifest を最新 graph から再生成した `ready` 実測:

```text
unmapped_summary.external_ref_absent = 13
unmapped_summary.parity_manifest_missing = 2
conflict_count = 3
```

`parity_manifest_missing` の期待値 2 は、(1) 上記 merge-pending の
`HarnessHub-5rb`、(2) graph node は実在するが `beads_linkage` が無く manifest 対象外の
`HarnessHub-ji8y` である。観測値 **2 = 期待値 2** で、true orphan 由来は 0 件。
3 件の parity conflict は既存 dependency 差であり、orphan 分類とは別信号として保持した。
