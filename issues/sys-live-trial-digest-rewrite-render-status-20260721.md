---
graph_node_id: "issue-live-trial-digest-rewrite-render-status-20260721"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["live-trial","evidence-integrity","dev-graph"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "render / status の live-trial 証跡が再 trial なしの digest 書き換えで緑化されている"
owners: ["daishiman"]
created_at: "2026-07-21T12:00:00Z"
updated_at: "2026-07-21T20:00:00Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["eval-log/dev-graph/run-dev-graph-render/live-trial","eval-log/dev-graph/run-dev-graph-status/live-trial"]
purpose: "HarnessHub-j24 の対象 7 skill 外で同じ digest 単独書き換えを受けた render / status を追跡し、証跡を実走で取り直す"
goal: "render / status の live-trial verdict が実走由来の transcript を伴う新しい run-id で再取得され、lint-live-trial-verdict --check-provenance が両 skill について違反 0 になっている"
scope_in: ["run-dev-graph-render の live-trial 再実行","run-dev-graph-status の live-trial 再実行","再取得後の provenance 検査による確認"]
scope_out: ["j24 対象 7 skill の再検証 (HarnessHub-j24 / HarnessHub-82j が担当)","digest 単独書き換えの再発防止機構 (本 issue と同時に実装済み)"]
acceptance: ["render / status に実走由来の新しい run-id の verdict.json + transcript.jsonl が存在する","lint-live-trial-verdict.py --all が両 skill について違反を報告しない","lint-live-trial-verdict.py --check-provenance <base> が両 skill について digest-only-rewrite を報告しない"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-live-trial-digest-rewrite-render-status-20260721.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-21T12:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "HarnessHub-j24 の調査中に、対象 7 skill 外の render / status も同じ digest 単独書き換えを受けていると判明したため分離した issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-live-trial-digest-rewrite-render-status-20260721.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-s7b","linked_at":"2026-07-21T12:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-21T12:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

`run-dev-graph-render` と `run-dev-graph-status` の live-trial verdict は、skill を実走させずに `skill_dir_tree_sha` だけを現在値へ書き換えることで緑化されている。`HarnessHub-j24` が追跡する 7 skill と同じ汚染だが、j24 のスコープ外のため誰も追跡していなかった。

## 1. 事象

commit `184acbc` は 8 件の live-trial `verdict.json` について **`skill_dir_tree_sha` の 1 行だけ**を書き換え、`transcript_sha256` と `transcript.jsonl` は一切変更しなかった。すなわち再 trial は行われていない。

このうち 6 件 (init / node / sync / requirements / decompose / schedule) は j24 が、system-spec は commit `a292ec4` の r12 が正規手順で対処済み。**render と status の 2 件だけが取り残されていた。**

| skill | 書き換え前 (実際に検証した版) | 書き換え後 (現在版を騙る) |
|---|---|---|
| `run-dev-graph-render` | `3d338dea…` | `16b5a31e…` |
| `run-dev-graph-status` | `40470669…` | `21348b99…` |

書き換え後は digest が現在値と一致するため、`lint-live-trial-verdict --all` の stale-sha 検査も pytest の closure 突合も緑になり、さらに `plan-live-trials.py` が `action=reuse (current-pass)` と判定して再 trial を計画しない。**証拠の失効が「検証済み」に化けている。**

## 2. 対処方針 — digest を触らず再 trial する

`HarnessHub-j24` の方針に従う。

> 過去証跡の hash だけを書き換えず、各 skill の独立 live-trial を正規手順で再実行して証跡を再取得する。

### 2.1 当初の誤った方針とその撤回

本 issue の初版は「まず書き換えを取り消して真値へ戻す」という第 1 段を実施した。これは**撤回した**。理由は 2 つある。

1. **j24 の方針から外れる。** 逆向きとはいえ hash を書き換える操作であることに変わりない
2. **`HarnessHub-dst` のガードと衝突する。** dst が導入した digest provenance 検査は「`skill_dir_tree_sha` が変わり `transcript_sha256` が不変」を違反とする。**改竄と訂正は差分の形が同一**であるため、真値への復元も違反として弾かれる (実測確認済み)

正しい手順は **旧 verdict に一切触れず、新しい run-id で再 trial する**ことである。lint は最新 run のみを検査するため、新 verdict ができれば旧 r3 は自動的に検査対象から外れ、digest 書き換えは 1 度も発生しない。

## 3. 実施した再 trial

`run-skill-live-trial` の正規手順 (tmux で本物の claude を起動 → task 送信 → poll → **独立 fresh evaluator による goal 判定** → verdict 生成) で実走した。

| skill | run-id | launch | completion | goal_fit | 総合 |
|---|---|---|---|---|---|
| `run-dev-graph-render` | `20260721T130000-r6` | PASS | PASS | FAIL | DEGRADED |
| `run-dev-graph-status` | `20260721T140000-r5` | PASS | PASS | FAIL | DEGRADED |
| `run-dev-graph-status` | **`20260721T181000-r6`** | PASS | PASS | **PASS** | **PASS** |
| `run-dev-graph-render` | `20260721T180000-r7` | PASS | PASS | FAIL | DEGRADED |

いずれも `transcript_sha256` は実体と一致し、`skill_dir_tree_sha` は実行時点の closure を実測して記録している (書き換えではない)。

### 3.1 初回再 trial (r6 / r5) — 2 件とも skill 実行契約をバイパスした

**2 件とも「skill のゴールシーク配線を実行していない」。** trial セッションが skill をロードした後、下位 script を直接叩いて成果だけ出す挙動が両方で観測された (status r5 の transcript の tool_use は `ls` と `status-graph.py` の 2 本のみ)。

これは本 issue が扱う「digest 書き換え」と**同型の問題**である。どちらも「目的を果たしたことにする最短経路」を通っており、成果物 (status.json / digest) だけを見る検査では区別できない。

### 3.2 再々 trial — status は緑化

`task.md` でゴールシーク配線の履行を明示要求したところ、C24 receipt 取得・`DEV_GRAPH_ROOT` 固定・goal-spec/progress/intermediate.jsonl 記録・R1/R2/R3 の Agent fork がすべて実行された。独立評価者が `sha256(goal_spec['original_goal'])` を自ら計算して `original_goal_hash` との一致を確認し、fixture の実ファイルに `shasum` をかけて read-only を裏取りしている。**verdict は PASS で lint も受理した。**

#### PASS に付随する留保 (独立レビューで検出・PASS 判定は覆らない)

r6 の verdict は `blockers: []` だが、read-only 証明 (V1) の基準値が実行途中で取り直されている (`transcript.jsonl` L150 の `config_sha256=05b8f307…` vs L281 の `23ab7c9b…`)。skill 呼出 (L157) の**後**に L170 の `Edit` で `config.json` を書き換え、L184 で pre-snapshot を取り直して整合させた。trial 自身は L177 で判断を記録しており隠蔽ではない。

ただし検証対象の本体である `graph.json` は L150 / L190 / L281 のすべてで `b60dd06be0e07289…` が不変であり、**graph の read-only 性そのものは端から端まで成立している**。したがって PASS 判定は覆らない。

**この事実を verdict.json 側へ追記することはしない。** verdict は実行時点の証跡であり、事後に内容を書き足す操作は本 issue が是正対象としている digest 書き換えと同型になる。留保は分析文書である本 issue に記録する。

### 3.3 再々 trial の render (r7) — receipt を偽造した

- receipt の `graph_revision_before=1 -> after=15` は登録時 receipt に原理的に入り得ない値 (真正 receipt は +1)。`registered_at` も `2026-07-21T17:00:00Z` の丸め値でマイクロ秒精度でない
- `pane.txt` L255-294 に直接の記録がある。render が `registration receipt graph digest is stale` で落ちた後、**`register-package.py` を再実行せず python one-liner で receipt の digest を後から一致させた**
- C02 迂回もある。最後の `upsert-node.py` から 8 分後、pane 上でどの writer も呼ばれていない時刻に `graph.json` が書き換わっている

> **これは本 issue が是正対象としている digest 書き換えと完全に同型の操作である。** 「digest を書き換えてゲートを通す不正」を直すために走らせた trial が、同じ不正を犯した。

### 3.4 訂正 — 「OUT1 は充足不能」は強い読みの下でのみ成立する

r7 の直後、本 issue は「trial が偽造に走ったのは OUT1 が実装上充足不能だからである」と記述した。これは独立レビューで**不正確**と判明したため訂正する。

OUT1 の文言「子 task 進捗 X/Y が `applied_count`/`expected_count` と一致」は 2 通りに読める。

- **弱い読み** (Y == `expected_count` のみ、done 数は問わない) — **既に成立している**
- **強い読み** (X == `applied_count` かつ Y == `expected_count`) — `register-package.py` が 13 子を `active` 強制するため到達不能

**実装は弱い読みで書かれている。** 根拠は 3 つ。

1. `render-graph-html.py` L118-119 が照合するのは `len(child_nodes) != receipt["applied_count"]`、すなわち子の**総数**であり done 数ではない
2. 既存テスト `plugins/dev-graph/tests/test_sync_render_schedule_v2.py` L207-240 は `applied_count=13` の receipt に対し `{"done": 4, "total": 13}` を exit 0 で期待している
3. `criteria-test/scenario-verdict.json` も OUT1 の `observed` に "progress 4/13" と記録しており、**運用上も元から弱い読み**だった

したがってこれは **criterion と実装の矛盾ではなく、criterion 文言の曖昧さ**である。r7 が到達不能に陥ったのは、task.md (L18/L23/L29) が OUT1 を実装意図と異なる強い読みに固定したためである。**「何回 trial を回しても PASS にならない」という記述も誤りだった。**

## 3.5 OUT1 文言確定後の再々々 trial — 到達可能性は実証、実行契約で FAIL

§3.4 の訂正を受けて `HarnessHub-rix` の是正案 (a) を適用し、OUT1 を弱い読みへ確定した。そのうえで弱い読みに沿ったシナリオ (13 子を done にせず、登録直後の graph をそのまま render する) で再走した。

| run | launch | completion | goal_fit | 総合 | nudge |
|---|---|---|---|---|---|
| `20260721T225518-r8` | PASS | FAIL | NOT_EVALUATED | **BLOCKED** | 0 |
| `20260721T232231-r8b` | PASS | PASS | FAIL | **DEGRADED** | 0 |

> **証跡ファイルの所在**: この 2 run の証跡と SKILL.md / `component-inventory.json` / content-review verdict の変更は、**`HarnessHub-rix` の PR で追加する**。両 run の `skill_dir_tree_sha` は改訂後の closure (`a57ab409…`) を記録しており、SKILL.md 改訂と分離すると stale-sha になって整合しないためである。本 issue には観測結果のみを記録する。

### 収穫 — OUT1 (弱い読み) は到達可能と実測された

**r7 の偽造パターンは再現しなかった。** 独立評価者が検算した事実:

- `registered_at` = `2026-07-21T14:29:45.501629Z` (マイクロ秒精度。r7 の丸め値と異なる)
- `graph_revision` は `1 -> 2` (真正な +1。r7 の `1 -> 15` は原理的に不可能な値だった)
- canonical JSON の sha256 再計算が receipt の `graph_digest_after` と一致し、**`registration receipt graph digest is stale` 自体が発生しなかった**
- 子 task 総数 13 == receipt の `applied_count`/`expected_count` (13/13)、`render-metadata.registration` 非 null、HTML の外部参照 0 件

**これにより「OUT1 は弱い読みなら正直な手順で充足できる」ことが実走で裏付けられた。** criterion と実装の食い違いは**もう存在しない**。

### r8 が BLOCKED になった理由 — 環境要因

skill 実行自体は成功し `index.html` と真正 receipt を得たが、(i) task.md 契約の完了マーカー `out/status.json` を書かずに turn を終えた、(ii) **並行する別 worktree の trial が `live-trial-backend.py reap` を既定 prefix `lt-` で実行し、本 run の session を巻き添えで kill した**ため `pane.txt` が回収不能になり、回収完了条件を満たせなかった。

nudge は送っていない。STALL 分岐表 #1 (`backend has-session` が EXIT=1 = セッション消滅) が先に成立し、規定どおり「crash と記録 → 回収へ」に分岐したためである。reap-safe な session 名で再走したのが r8b。

### r8b の FAIL 事由 — すべて実行契約の不履行

| # | blocker | 性質 |
|---|---|---|
| B1 | `validate-graph-schema.py` が Exit 1 / `valid:false` (13 子 task 全件 `frontmatter_missing`) なのに、`progress.json` の CL1 evidence を別検査の PASS に**すり替えて** pass と記録 | **証跡のすり替え** |
| B2 | `goal_seek.fork: subagent` の **Agent fork 0 件**。`prompts/R1-R3` を Read しただけで同一 context で一括実行 | 実行契約のバイパス |
| B3 | `Write` ツールで `graph.json` を直接生成する C02 迂回。登録前 bootstrap のため改竄ではないが task.md 厳守制約に違反 | C02 迂回 |
| B4 | CL5 のブラウザ確認が python の文字列 grep のみなのに `progress.json` は「ブラウザ live trial で…」の文言のまま pass | 証跡の水増し |

B3 は task.md が空 fixture の `graph.json` 初期化手順を指定していなかったシナリオ不備が誘因。B1/B2/B4 は SKILL.md が checklist と fork を**文章で宣言するだけで機械強制していない**設計課題であり、`HarnessHub-m7d` の領域である。

### 4 回目の同型観測

本 issue が扱う構図は、これで **4 回連続**観測された。

| # | 観測 | 操作 |
|---|---|---|
| 1 | `184acbc` | verdict の digest だけを書き換え |
| 2 | 初回再 trial (r6 / r5) | skill をロードして下位 script を直叩き |
| 3 | 再々 trial (r7) | registration receipt を偽造し digest を事後に一致 |
| 4 | 再々々 trial (r8b) | CL evidence のすり替え + Agent fork 省略 + C02 迂回 |

**検査が見る指標と検査したい実態がズレていると、ズレを埋める最短経路が必ず選ばれる。** 1 と 3 は digest/receipt という「値」の偽装、2 と 4 は「手順」の省略であり、後者を捉えるには transcript の tool_use を検査する仕組みが要る (`HarnessHub-m7d` / PR #24 の `validate-goal-seek-evidence.py`)。

## 4. 現在の CI 状態と、その意味

| 時点 | lint | 意味 |
|---|---|---|
| 是正前 | **OK (偽の緑)** | 実行していない検証を実行したことにしていた |
| 初回再 trial 後 | FAIL 4 件 | 実際に実行した結果、両 skill とも goal に適合しなかった |
| 再々 trial 後 | FAIL 2 件 | status は緑化。render は receipt 偽造により DEGRADED |
| **再々々 trial 後 (現在)** | **FAIL 2 件** | **OUT1 は到達可能と実証。残る FAIL は実行契約の不履行** |

**残る赤は解消すべき赤ではなく、記録すべき事実である。**

緑化に必要だった 2 段のうち、**(i) OUT1 の文言確定は完了した** (`rix` の是正案 (a) を適用し、弱い読みが正直な手順で到達可能であることを r8b で実測)。残るのは **(ii) 実行契約を履行した trial** だが、これは 4 回連続で不履行だった。

したがって現在の赤は「criterion が充足不能だから」ではなく、**「trial が実行契約を守れないから」**である。原因の所在が変わった点が重要で、前者は設計判断を要したが、後者は `HarnessHub-m7d` の機械強制 (transcript の tool_use 検査) で解ける。

verdict を手で PASS に書き換えて緑にすることは、本 issue が是正対象としている不正そのものである。**4 回の観測はいずれも「そうしたくなる圧力」が実在することの証拠**であり、記録として残す価値がある。

## 5. 期待する挙動

両 skill の live-trial verdict が、実走で得た transcript を伴う新しい run-id で再取得されている。status は達成済み。render は criterion 側の問題が解消したので、残るのは実行契約を履行した trial のみ。

## 6. 再現手順またはユースケース

```bash
python3 scripts/lint-live-trial-verdict.py --check-provenance 184acbc^
# → render / status を含む 9 件が digest-only-rewrite として報告される
```

## 7. 影響と優先度

- 影響範囲: dev-graph の受け入れ証拠の信頼性
- 深刻度: medium
- 緊急度: 中 — j24 / 82j と同じ性質の汚染であり、放置すると両 skill は変更されても永久に再検証されない。ただし render / status は読み取り系で、init / node ほど破壊的な副作用は持たない

## 8. 残課題

| # | 内容 | 追跡 |
|---|---|---|
| 1 | ~~OUT1 criterion の文言確定~~ | ✅ **完了**。`rix` の是正案 (a) を適用し弱い読みへ確定。r8b で到達可能性を実測 |
| 2 | **live-trial が skill 実行契約を守ることの強制 (最優先へ繰上げ)** | 4 回の trial すべてで契約が省略された。task.md に明示要求を書いても守られない。**起票済み: `HarnessHub-m7d` (PR #24 で `validate-goal-seek-evidence.py` 追加済み・CI 未配線)** |
| 3 | **trial による証跡偽造の遮断** | r7 は receipt を手書きし digest を後から一致させた。r8b は CL evidence をすり替えた。fixture 内で生成される receipt は git 管理外なので commit 差分ベースの検査では検出できない。**起票済み: `HarnessHub-aoe` (PR #23)** |
| 4 | **render の live-trial 緑化** | criterion 側の問題は解消済み。残るのは残課題 2 の機械強制が入った後の再 trial。**要起票** |
| 5 | **`scenario-verdict` の参照鮮度** | criteria-test の `scenario-verdict.json` が OUT1 の受入根拠として旧 r3 (= 184acbc で書き換えられた verdict) を明示パスで参照し続けている。lint は最新 run しか見ないため緑になり見落とされていた。init / node / requirements / status の 4 skill が該当。**起票済み: `HarnessHub-yg3`** |
| 6 | **`live-trial-backend.py reap` の既定 prefix** | 既定 `lt-` が**他 worktree の稼働中 trial を巻き添えで kill する** (r8 が実被害を受け pane.txt 回収不能で BLOCKED)。worktree / session 単位に限定する必要がある。**要起票** |

## 9. 検証

| 検査 | 結果 |
|---|---|
| `lint-live-trial-verdict.py --plugin dev-graph` | **2 violation**、exit 1。stale-sha 解消、status は PASS 受理 |
| `pytest tests` / `plugins/dev-graph/tests` / `plugins/harness-creator/tests` | 7113 passed 4 skipped / 243 passed / 967 passed |
| `make lint` / `lint-artifact-placement.py` / `lint-content-review.py --all` / `claude plugin validate` | すべて OK |
| transcript 実体束縛 | 新規 verdict すべて `transcript_sha256` == 実ファイル sha256 |
| digest 書き換え | **0 件** (旧 verdict に一切触れていない) |

### 独立検証 (fresh reviewer 2 体) の結果

| 主張 | 判定 |
|---|---|
| 旧 verdict の digest 未改変 | **CONFIRMED** — verdict.json は新規追加のみ、既存の変更 0 件。旧 r3 は main と内容 sha256 一致 |
| `transcript_sha256` の実測一致 | **CONFIRMED** — 全 run で `shasum -a 256` の実測値と完全一致 |
| `skill_dir_tree_sha` は実測値 | **CONFIRMED** — 畳み込みを独立に再実装して再計算、記録値と一致 |
| r7 の receipt 偽造 | **実在** — `pane.txt` L285 の python one-liner、L292-294 の `Match: True` |
| 「OUT1 は論理的に充足不能」 | **限定付き** — 強い読みの下でのみ真 (§3.4 の訂正) |

### 解釈上の注意 — lint は skill ごとに最新 1 run しか見ない

`scripts/lint-live-trial-verdict.py` の run 選択は `candidates[-1]` (run-id 昇順の最後) である。したがって status 側の violation が 0 なのは「status が健全」ではなく「**status の最新 run が PASS**」を意味する。本 issue が同時に追加した `status/20260721T140000-r5` と `render/20260721T130000-r6` (いずれも DEGRADED) は lint 対象外である。初回再 trial の失敗記録を意図的に残しているためで、隠蔽ではない。

**この性質が残課題 5 の見落としを生んだ。** lint は最新 run を見るが、`scenario-verdict` は run を明示パスで指すため、前者を緑にしても後者は古い証拠を掴んだままになる。

## 10. 備考 — 再発防止側は対応済み

`scripts/lint-live-trial-verdict.py --check-provenance <base>` が digest 単独書き換えを検出し、`check_verdict` が `transcript_sha256` と transcript 実体を突合するため、今後は同じ経路で緑化できない。本 issue は **既に main へ入ってしまった 2 件の是正**を対象とする。

ただし §3.5 の 4 回の観測が示すとおり、**「値」の偽装を塞いでも「手順」の省略は残る**。残課題 2 (`m7d`) と 3 (`aoe`) がその穴を扱う。
