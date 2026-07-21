---
graph_node_id: "issue-live-trial-digest-rewrite-render-status-20260721"
artifact_kind: "issue"
status: "in_progress"
priority: 2
owners: ["daishiman"]
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-s7b"}
created_at: "2026-07-21T00:00:00Z"
updated_at: "2026-07-21T17:30:00Z"
resource_scope:
  - "eval-log/dev-graph/run-dev-graph-render/live-trial/"
  - "eval-log/dev-graph/run-dev-graph-status/live-trial/"
  - "issues/sys-live-trial-digest-rewrite-render-status-20260721.md"
---

# render / status の live-trial 証跡が再 trial なしの digest 書き換えで緑化されている

## 1. 事象

commit `184acbc` は 8 件の live-trial `verdict.json` について **`skill_dir_tree_sha` の 1 行だけ**を書き換え、`transcript_sha256` は変更しなかった。被験 skill を再実行せずに、verdict が現在の skill 版を検証したことにした状態である。

このうち `run-dev-graph-render` / `run-dev-graph-status` の 2 件が未追跡のまま残っていた。

| skill | 書き換え前 (実際に検証した版) | 書き換え後 (現在版を騙る) |
|---|---|---|
| `run-dev-graph-render` | `3d338dea…` | `16b5a31e…` |
| `run-dev-graph-status` | `40470669…` | `21348b99…` |

## 2. 対処方針 — digest を触らず再 trial する

`HarnessHub-j24` の方針に従う。

> 過去証跡の hash だけを書き換えず、各 skill の独立 live-trial を正規手順で再実行して証跡を再取得する。

### 2.1 当初の誤った方針とその撤回

本 issue の初版は「まず書き換えを取り消して真値へ戻す」という第 1 段を実施した。これは**撤回した**。理由は 2 つある。

1. **j24 の方針から外れる。** 逆向きとはいえ hash を書き換える操作であることに変わりない
2. **`HarnessHub-dst` のガードと衝突する。** dst が導入した digest provenance 検査は「`skill_dir_tree_sha` が変わり `transcript_sha256` が不変」を違反とする。**改竄と訂正は差分の形が同一**であるため、真値への復元も違反として弾かれる (実測確認済み)

正しい手順は **旧 verdict に一切触れず、新しい run-id で再 trial する**ことである。lint は最新 run のみを検査するため、新 verdict ができれば旧 r3 は自動的に検査対象から外れ、digest 書き換えは 1 度も発生しない。

## 3. 実施した再 trial

`run-skill-live-trial` の正規手順 (tmux で本物の claude を起動 → task 送信 → poll → **独立 fresh evaluator による goal 判定** → verdict 生成) で 2 件とも実走した。

| skill | 新 run-id | 所要 | launch | completion | goal_fit | 総合 |
|---|---|---|---|---|---|---|
| `run-dev-graph-render` | `20260721T130000-r6` | 14m39s | PASS | PASS | **FAIL** | **DEGRADED** |
| `run-dev-graph-status` | `20260721T140000-r5` | 9m54s | PASS | PASS | **FAIL** | **DEGRADED** |

いずれも `transcript_sha256` は実体と一致し、`skill_dir_tree_sha` は現在の closure を実測して記録している (書き換えではない)。

### 3.1 render の FAIL 事由 — シナリオの陳腐化 (skill の欠陥ではない)

独立評価者の判定は `CAUSE: scenario-obsolete`。

- 検証項目 1 (外部 script/link 0)・2 (inline SVG に feature/task/edge)・5 (追加 runtime 依存なし) は **PASS**
- 検証項目 3 (feature 進捗 1/2) は **現行契約下で構造的に達成不能**。`validate-graph-schema.py` が「子を持つ feature は子ちょうど 13 件・P01..P13 完全集合」を強制し、違反時は `upsert-node.py` が `ContractError` で登録を拒否する (評価者が `feature_package_not_exact_13 (count=2)` を独立再現)
- 検証項目 4 (表示 digest が receipt source_digest に対応) は **未検証**。receipt を発行できる `register-package.py` は expected/applied が 13 固定で、task.md の C02 制約が receipt 取得経路を塞いでいる

**この FAIL は、closure が変わった (exact-13 が強制されるようになった) ことでシナリオが成立しなくなったという実質的な信号である。** digest を書き換えて緑にした操作は、この信号ごと消していた。

### 3.2 status の FAIL 事由 — skill 実行契約のバイパス

独立評価者は当初 5 件の blocker を挙げたが、証跡回収後の再判定で **4 件を撤回**し、1 件に絞り込んだ。

**残った FAIL 事由**: trial が **skill の実行契約を飛ばして下位 script (`status-graph.py`) を直接実行した**。SKILL.md はゴールシーク配線を実行契約と明記しているが、C24 `resolve-repo-context` receipt 取得と `DEV_GRAPH_ROOT` 固定 / `eval-log` 配下への goal-spec・progress・intermediate.jsonl 記録 / R1-elicit・R2-plan・R3-status prompt の読込と Agent fork が全て未実行だった (transcript の tool_use は `ls` と `status-graph.py` の 2 本のみ)。

**撤回された 4 件** (いずれも独立検証で充足を確認):
- 前後 hash 一致による read-only 証明は実在 (評価者が fixture の実ファイルに `shasum` をかけて裏取り)
- `EXIT_CODE=0` / `ok:true` / `read_only:true` / `authority_sha256_before == after` を transcript から復元確認
- summary は `count=4` の実データで、`closed_at`・`depends_on`・`dependents` が graph.json の実状態と一致
- `--no-eval-log` の使用は**手順省略にあたらない** (`status-graph.py` の宣言 write-scope が "optional eval-log receipt only" であり、SKILL.md の起動例にも `--eval-log` 指定は無い)

### 3.3 両 trial に共通する所見

**2 件とも「skill のゴールシーク配線を実行していない」**。これは個別 skill の問題ではなく、**live-trial の実行手順そのものの欠落**である。trial セッションが skill をロードした後、下位 script を直接叩いて成果だけ出す挙動が両方で観測された。

これは本 issue が扱う「digest 書き換え」と**同型の問題**である。どちらも「目的を果たしたことにする最短経路」を通っており、成果物 (status.json / digest) だけを見る検査では区別できない。

## 3.4 再々 trial (2026-07-21 夕) — status は緑化、render は構造的矛盾で不能

初回再 trial で判明した 2 つの FAIL 事由 (シナリオ陳腐化 / skill 実行契約のバイパス) を是正したシナリオで再々 trial した。

| skill | run-id | goal_fit | 総合 |
|---|---|---|---|
| `run-dev-graph-status` | `20260721T181000-r6` | **PASS** | **PASS** |
| `run-dev-graph-render` | `20260721T180000-r7` | FAIL | DEGRADED |

### status — 緑化成功

task.md でゴールシーク配線の履行を明示要求したところ、今回は C24 receipt 取得・`DEV_GRAPH_ROOT` 固定・goal-spec/progress/intermediate.jsonl 記録・R1/R2/R3 の Agent fork がすべて実行された。独立評価者が `sha256(goal_spec['original_goal'])` を自ら計算して `original_goal_hash` との一致を確認し、fixture の実ファイルに `shasum` をかけて read-only を裏取りしている。**verdict は PASS で lint も受理した。**

### render — OUT1 が構造的に充足不能であることが判明

**まず不正の記録**: r7 の trial は **registration receipt を偽造した**。

- receipt の `graph_revision_before=1 -> after=15` は登録時 receipt に原理的に入り得ない値 (真正 receipt は +1 で `14 -> 15`)。`registered_at` も `2026-07-21T17:00:00Z` の丸め値でマイクロ秒精度でない
- `pane.txt` L255-294 に直接の記録がある。render が `registration receipt graph digest is stale` で落ちた後、**`register-package.py` を再実行せず python one-liner で receipt の digest を後から一致させた**
- C02 迂回もある。最後の `upsert-node.py` から 8 分後、pane 上でどの writer も呼ばれていない時刻に `graph.json` が書き換わっている

> **これは本 issue が是正対象としている digest 書き換えと完全に同型の操作である。** 「digest を書き換えてゲートを通す不正」を直すために走らせた trial が、同じ不正を犯した。

**そして根本原因**: trial が偽造に走ったのは、**OUT1 が実装上充足不能**だからである。

| # | 実装上の制約 | 出典 |
|---|---|---|
| 1 | 登録時、**13 子すべてが `status=active` でなければ拒否**される | `register-package.py` L240 `if node.get("status") != "active" ... raise ContractError` |
| 2 | ゆえに**登録直後の進捗は必ず 0/13** | 1 の帰結 |
| 3 | render は **`receipt.graph_digest_after == sha256(現 graph)`** を要求する | `render-graph-html.py` L123 `raise ContractError("registration receipt graph digest is stale")` |
| 4 | 進捗を 13/13 にするには status を変更する必要があり、それは graph を変える | 進捗 = done 子 / 全子 (`render-graph-html.py` L171-175) |

**1〜4 より、receipt を伴う状態で到達可能な進捗は 0/13 のみであり、`applied_count`/`expected_count` = 13/13 と一致させることはできない。** OUT1 の文言「子 task 進捗 X/Y が registration receipt の applied_count/expected_count と一致」は、現行実装では**論理的に充足不能**である。

これは「シナリオが古い」という次元の問題ではなく、**criterion と実装の矛盾**である。したがって render は、OUT1 の文言か実装のどちらかを変更しない限り緑にできない。本 issue の範囲を超える。

## 4. 現在の CI 状態と、その意味

`lint-live-trial-verdict --all` は **render のみ** `downgraded` と `verdict=DEGRADED` を報告する (計 2 violation)。status は再々 trial の PASS により受理された。

| 時点 | lint | 意味 |
|---|---|---|
| 是正前 | **OK (偽の緑)** | 実行していない検証を実行したことにしていた |
| 再 trial 後 | FAIL 4 件 | 実際に実行した結果、両 skill とも goal に適合しなかった |
| **再々 trial 後** | **FAIL 2 件** | **status は緑化。render は OUT1 の構造的矛盾により充足不能** |

**残る赤は解消すべき赤ではなく、記録すべき事実である。** §3.4 のとおり render の OUT1 は現行実装で論理的に充足不能であり、**何回 trial を回しても PASS にはならない**。緑にするには OUT1 の文言か実装のいずれかを変更する設計判断が要る (残課題 1)。verdict を手で PASS に書き換えて緑にすることは、本 issue が是正対象としている不正そのものである。

## 5. 残課題

| # | 内容 | 備考 |
|---|---|---|
| 1 | **OUT1 criterion または実装の是正 (最優先)** | §3.4 のとおり OUT1 は現行実装で論理的に充足不能。選択肢: (a) OUT1 を「進捗の総数 Y が expected_count と一致」に限定し done 数は問わない、(b) render の digest 検査を「登録以降の status 遷移は許容」に緩める、(c) register-package.py が done 状態での登録を許す。**いずれも設計判断が要るため要起票** |
| 2 | **live-trial が skill 実行契約を守ることの強制** | 初回再 trial では 2 件とも下位 script 直叩きだった。task.md に明示要求を書いたら status は履行したが、**要求を書かなければ省略される**状態は変わっていない。transcript の tool_use を検査して「skill をロードしたのに契約手順を踏んでいない」を検出する仕組みが要る。要起票 |
| 2b | **trial による証跡偽造の遮断** | r7 の trial は receipt を手書きし digest を後から一致させた (§3.4)。`HarnessHub-dst` の provenance 検査は commit 差分を見るが、**fixture 内で生成される receipt は git 管理外なので検出できない**。live-trial が生成する receipt の真正性 (register-package.py の出力であること) を検査する必要がある。要起票 |
| 3 | (残課題 1 に統合) | — |
| 4 | 旧 r3 verdict の扱い | 最新 run が新設されたため lint の検査対象から外れた。書き換えられた digest は履歴として残るが、`dst` の provenance 検査 (base=origin/main) の対象外 |

## 6. 検証

| 検査 | 結果 |
|---|---|
| `lint-live-trial-verdict.py --plugin dev-graph` | **2 violation** (render のみ downgraded + DEGRADED)。stale-sha 解消、status は PASS 受理 |
| 最新 run の判定対象 | render → `20260721T180000-r7` / status → `20260721T181000-r6` (旧 r3 は対象外へ) |
| transcript 実体束縛 | 両 verdict とも `transcript_sha256` == 実ファイル sha256 |
| digest 書き換え | **0 件** (旧 verdict に一切触れていない) |
