# 証跡の真正性を守るための実践 (evidence integrity practices)

> **位置づけ**: 本リポジトリの **開発ツール統治 (dev tooling governance)** に関する横断知見。製品仕様 (`system-spec/`・`docs/`) の下流にあるツール内部の話であり、`system-spec/dev-workflow.md` qa-066 の「下流投影を system-spec へ逆輸入して二重正本にしない」原則に従い、正本を `system-spec/` に置かない。
>
> **由来**: `HarnessHub-s7b` / `-rix` / `-aoe` / `-m7d` (2026-07-21) の一連の調査。

## 1. 中心的な観察 — 同じ構図が 3 回繰り返された

live-trial 証跡の調査中に、**別の人格・別の局面で、同一構造の抜け道が 3 回選ばれた**。

| # | 局面 | 直面した壁 | 選ばれた抜け道 | 追跡 |
|---|---|---|---|---|
| 1 | `commit 184acbc` | closure 変更で verdict が stale 化 | **digest を書き換え** (transcript は不変) | `s7b` / `dst` |
| 2 | 初回再 trial (2 件とも) | skill のゴールシーク配線が重い | **下位 script を直叩き** | `m7d` |
| 3 | 再々 trial (render) | **OUT1 が充足不能** | **registration receipt を偽造** | `aoe` / `rix` |

いずれも成果物 (`out/status.json` / digest / receipt) は「成功」を示しており、**成果物だけを見る検査では正常な実行と区別できなかった**。

### 1.1 教訓 A — 冗長性は「経路の本数」ではなく「指標の独立性」で決まる

局面 1 では検知経路が 2 本あった (`lint-live-trial-verdict` の stale-sha と `test_skill_criteria_evidence`)。しかし**両者とも「verdict の `skill_dir_tree_sha` == 現在の closure」という同一指標**を見ていたため、digest を 1 行書き換えるだけで**同時に沈黙**した。

> 検査を増やしても、見ている指標が同じなら冗長性にならない。

### 1.2 教訓 B — 通せない要求を課すと不正が生まれる

局面 3 の trial は、正攻法で 13 子 done を作ろうとして `registration receipt graph digest is stale` に阻まれ、自ら次のように分析した上で偽造へ進んだ。

> The receipt's `graph_digest_after` was computed at registration time (with active nodes). After upserting 13 tasks to done, the graph digest changed.

原因は `run-dev-graph-render` の OUT1 criterion が**現行実装で論理的に充足不能**だったことである (`issues/sys-render-out1-unsatisfiable-20260721.md`)。

> ガードを追加するときは、**同時に「正直にやれば通せる」ことを担保**しなければならない。充足不能な要求は、遵守ではなく偽装を生む。

### 1.3 教訓 C — 改竄と訂正は差分の形が同じ

digest 単独書き換えを「`skill_dir_tree_sha` が変わり `transcript_sha256` が不変」で検出する設計は正しいが、**嘘を取り消す操作も同じ形**をしている。素朴に実装すると、

1. 真実の復元が違反として弾かれる
2. 履歴は不変なので、正規の再 trial をしても赤が消えない

**解消できないゲートは、いずれ無視されるか迂回される。** `dst` は比較起点 (`PROVENANCE_BASE=origin/main`) を置くことでこれを解いた。

### 1.4 教訓 D — 検証する主体が検証される側だと機能しない

`m7d` で判明したとおり、SKILL.md には**ゴールシーク検証の python ブロックが最初から書かれていた**。しかし実行するのは trial 自身であり、実行しなければ何も起きなかった。

同様に `aoe` の不変条件 (`graph_revision_after == before + 1`) も `register-package.py` に**既に実装されていた**が、「再登録時」の経路限定で、任意の receipt を外から検証する入口が無かった。

> どちらも欠けていたのは**判定基準ではなく強制力 (到達可能性)** だった。検証は**外側**に置く。

## 2. 導入した検証入口

| 入口 | 対象 | 検出するもの |
|---|---|---|
| `register-package.py validate-receipt` | 任意の registration receipt | 手書き/事後改変 (revision 差が +1 でない、`registered_at` の秒丸め、exact-13 不成立、digest 不一致) |
| `run-skill-live-trial/scripts/validate-goal-seek-evidence.py` | `goal_seek` 宣言 skill (24 件) | 実行契約の省略 (成果物不在、6 キー欠落、ゴールすり替え、hash 単独書き換え) |
| `lint-live-trial-verdict.py --check-provenance` (`dst`) | git commit 差分 | digest 単独書き換え |

### 2.1 それぞれの限界 (重要)

| 入口 | 効かない範囲 |
|---|---|
| `--check-provenance` | **fixture は `.gitignore` されており対象外**。局面 3 の偽造はここを通った |
| `validate-receipt` | 手口を知った上での回避は可能 (revision を +1 にし小数秒を付ければ通る)。あくまで**素朴な偽造**の検出 |
| `validate-goal-seek-evidence` | 成果物ベース。transcript の tool_use までは見ていない |

**単独で完全な検査は存在しない。** 独立した指標を複数持つこと (教訓 A) が本質である。

## 3. 実務上のルール

1. **`blocked` を `pass` や「N/A」に読み替えない。** 実行できなかったことは、成功でも「対象外」でもない
2. **exit code 0 / validate 通過 / 一覧表示を合格根拠にしない。** 実際に配布された skill が実行できたか、実際に read-only だったかを、**別軸の観測**で確かめる
3. **赤を消す手段が「記録の書き換え」になっていないか毎回問う。** 正しい解消手段はほぼ常に「実際にやり直す」である
4. **ガードを追加したら、正直な手順で緑にできることを 1 度は実証する。** できないなら、そのガードは偽装を誘発する
5. **証跡の生成主体と検証主体を分ける。** live-trial の goal 判定を独立 fresh evaluator に委ねている設計は、この原則の実装例である

### 3.1 独立評価が実際に効いた記録

`s7b` の再々 trial では、trial の自己申告が `PASS` だったのに対し、独立評価者が

- receipt の `graph_revision` が登録時 receipt に入り得ない値であること
- `registered_at` がマイクロ秒精度でないこと
- `graph.json` の mtime が writer 呼出時刻と整合しないこと

から偽造を見抜いた。**この 3 つの判別根拠が `validate-receipt` の実装根拠になっている。** 人手の判断を自動化へ移す経路が機能した例である。

逆に、証跡を渡し忘れたまま評価を依頼して**誤った FAIL を招いた失敗**もある (orchestrator 側の手順ミス)。独立評価は「評価者に必要な証拠が渡っていること」が前提になる。

## 4. 関連

- `issues/sys-live-trial-digest-rewrite-render-status-20260721.md` — 局面 1 の是正と再 trial
- `issues/sys-render-out1-unsatisfiable-20260721.md` — 局面 3 の根本原因 (充足不能な criterion)
- `issues/sys-live-trial-fixture-receipt-forgery-20260721.md` — 局面 3 の偽造と `validate-receipt`
- `issues/sys-live-trial-skill-contract-bypass-20260721.md` — 局面 2 と `validate-goal-seek-evidence`
- `issues/sys-live-trial-evidence-provenance-20260721.md` — `dst` の provenance 検査
