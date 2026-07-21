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

## 4. 現在の CI 状態と、その意味

`lint-live-trial-verdict --all` は render/status について **`downgraded` と `verdict=DEGRADED`** を報告する (計 4 violation)。

| 時点 | lint | 意味 |
|---|---|---|
| 是正前 | **OK (偽の緑)** | 実行していない検証を実行したことにしていた |
| 再 trial 後 | **FAIL** | **実際に実行した結果、goal に適合しなかった** |

**この赤は解消すべき赤ではなく、記録すべき事実である。** 緑にするには (a) シナリオを現行契約 (exact-13) 前提へ更新し、(b) trial が skill の実行契約を守るようにしたうえで、再々 trial する必要がある。いずれも本 issue の範囲を超える。

## 5. 残課題

| # | 内容 | 備考 |
|---|---|---|
| 1 | **render シナリオの現行契約への更新** | 「feature 進捗 1/2 + registration receipt」を exact-13 パッケージ (13 子・`register-package.py` 発行 receipt を `--registration-receipt` で渡す) 前提へ書き換える。要起票 |
| 2 | **live-trial が skill 実行契約を守ることの強制** | 2 件とも下位 script 直叩きでゴールシーク配線を省略した。transcript の tool_use を検査して「skill をロードしたのに契約手順を踏んでいない」を検出する仕組みが要る。要起票 |
| 3 | **OUT1 criterion 文言の再定義** | 「子 task 進捗 X/Y が receipt の applied_count/expected_count と一致」は applied/expected が常に 13/13 である以上、全 13 子が done の feature でしか字義的に成立しない。criterion 側を「Y ↔ expected_count」に限定するか要判断 |
| 4 | 旧 r3 verdict の扱い | 最新 run が新設されたため lint の検査対象から外れた。書き換えられた digest は履歴として残るが、`dst` の provenance 検査 (base=origin/main) の対象外 |

## 6. 検証

| 検査 | 結果 |
|---|---|
| `lint-live-trial-verdict.py --plugin dev-graph` | **4 violation** (render/status とも downgraded + DEGRADED)。stale-sha は解消 |
| 最新 run の判定対象 | render → `20260721T130000-r6` / status → `20260721T140000-r5` (旧 r3 は対象外へ) |
| transcript 実体束縛 | 両 verdict とも `transcript_sha256` == 実ファイル sha256 |
| digest 書き換え | **0 件** (旧 verdict に一切触れていない) |
