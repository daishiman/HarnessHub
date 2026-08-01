# タスク: dev-graph:run-dev-graph-decompose の実走 (scenario C14-OUT1-positive-macro-decomposition-r2)

## 最優先の出力契約 (これを外すと実走全体が不合格になる)

完了マーカーの書き出し先は、**次の 1 パスちょうど**です。ディレクトリを省略・変更してはいけません。

```
/Users/dm/orca/workspaces/HarnessHub/wt-26/eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260729T021657Z-bk8v-decompose-r3/out/status.json
```

- 末尾は必ず `.../out/status.json` です。`out/` を省いて run ディレクトリ直下へ書くと完了検知が働かず不合格になります。
- 内容は次の 2 キーだけの最小 JSON にしてください。追加キーを入れないでください。
  `{"status": "PASS|FAIL|ERROR", "scenario": "C14-OUT1-positive-macro-decomposition-r2"}`
- `out/` には **この 1 ファイル以外を一切書かない**でください。詳細サマリを書きたい場合は fixture 側の `eval-log/` へ書いてください。
- 最後に「DONE: <status>」と 1 行だけ報告してください。

## 検証内容

scenario `C14-OUT1-positive-macro-decomposition-r2` を、独立 fixture
`/Users/dm/orca/workspaces/HarnessHub/wt-26/eval-log/dev-graph/live-trial-fixtures/bk8v-decompose-r3`
だけで検証してください。入力 want は「ユーザー登録・ログインと、ログイン後の
ダッシュボードを持つ小規模 Web アプリを作りたい」です。管理対象 graph/config/content
root を手で編集してはいけません。

## goal-seek の開始

`run-dev-graph-decompose-goal-spec.json` の `original_goal` には、入力 want ではなく
SKILL.md の `## ゴールシーク実行 > ### ゴール (Goal)` にある次の正本文を、一字も
変更せず格納してください。

```text
自然文の「やりたいこと(大)」からfeatureノード群+architectureノード+機能間depends_onを生成するマクロ分解を行い、ready featureごとにsystem-dev-planner(ミクロ層)を自動起動または手動`/system-dev-plan`実行結果を受理してpromoted typed task群をparent_feature付きでC02へatomic登録し、binding=beadsはC28へissue/依存edge、binding=githubはC12へIssue/任意Projects、binding=noneはローカルのみへ冪等投影した状態になっている
```

この完全な UTF-8 文字列の SHA-256 を `original_goal_hash` に使い、Skill 実行前に
`run-dev-graph-decompose-intermediate.jsonl` の最初の行を作ってください。各行には
`original_goal`、`original_goal_hash`、`current_goal_snapshot`、
`delta_from_original`、`merged_directive_for_next`、`drift_signal` が必要です。

次に Git index 登録済み共通監査ヘルパーで pre-state を取ってください。

```bash
python3 /Users/dm/orca/workspaces/HarnessHub/wt-26/plugins/dev-graph/tests/fixtures/audit_decompose_live_trial.py snapshot \
  --repo-root /Users/dm/orca/workspaces/HarnessHub/wt-26/eval-log/dev-graph/live-trial-fixtures/bk8v-decompose-r3 \
  --output /Users/dm/orca/workspaces/HarnessHub/wt-26/eval-log/dev-graph/live-trial-fixtures/bk8v-decompose-r3/eval-log/pre-state.json
```

## 被験 Skill

以下を必ず Skill ツール呼出しで実行してください。`plugins/dev-graph/scripts/` 配下の
script を Bash から直接叩いて skill 本体を代替してはいけません (transcript 上の Skill
起動を機械判定しており、代替すると launch=FAIL になります)。

Skill({skill: "dev-graph:run-dev-graph-decompose", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-26/eval-log/dev-graph/live-trial-fixtures/bk8v-decompose-r3 --binding none --dry-run"})

Skill が入力 want から生成した feature / architecture / depends_on の preview graph を
一度だけ次へ保存してください。別の graph や期待 node は手書きしないでください。

`/Users/dm/orca/workspaces/HarnessHub/wt-26/eval-log/dev-graph/live-trial-fixtures/bk8v-decompose-r3/eval-log/macro-preview.json`

### preview の正本配列 (重要・過去に事故が起きた箇所)

監査は **`preview["nodes"]` だけ**を読みます。`nodes` が唯一の正本です。

- 昇格などの status 変更は **必ず `nodes[]` の要素に対して**行ってください。
- `features` のような便宜配列を併記する場合は、**同じ `graph_node_id` の
  `confirmation_status` / `evaluation_status` / `implementation_readiness.status` が
  `nodes[]` と完全に一致**していなければなりません。監査は乖離を検出して不合格にします。
- 併記が面倒なら `nodes` だけ持つ preview にして構いません。

## 昇格ステップ (省略禁止・今回の主眼)

scenario の `fixture_contract` は、**評価前 draft が publication 候補に入らないこと**
だけでなく、**昇格した feature は候補に入ること**を、同一 preview 上の両クラスで
実測することを要求しています。全 node が draft のままだと候補集合は空になりますが、
それは gate が効いた証拠ではなく「誰も昇格していない」の副産物なので、契約を
満たしません (監査の `publication.discriminating` が false になります)。

`nodes[]` の feature に対して、次の 2 クラスを**両方**作ってください。

1. **1 件目の feature を「完全昇格」させる。** 次を**すべて**満たす必要があります。
   - `confirmation_status` を `"confirmed"` へ
   - `evaluation_status` を `"pass"` へ
   - `implementation_readiness` を
     `{"status": "complete", "missing_sections": [], "checked_at": "<RFC3339 UTC>"}` へ
   - `confirmation_evidence` の `evaluator` / `evidence_ref` / `evaluated_digest` を
     すべて非空にする。`evaluated_digest` は下記の**正準レシピで計算した実値**である
     必要があります (64 桁 hex なら何でもよい、ではありません)。
2. **他の feature のうち少なくとも 1 件は draft のまま**残す
   (`confirmation_status: "draft"` / `evaluation_status: "pending"` /
   `implementation_readiness.status: "incomplete"`)。

`graph_node_id`・`title`・`depends_on` など node の同一性に関わる field は一切変更
しないでください。変更してよいのは上記の status / evidence / readiness だけです。

### evaluated_digest の正準レシピ

`evaluated_digest` は **その node 自身の内容の SHA-256** です。`"a"*64` のような
placeholder は 64 桁 hex の正規表現を通るだけで、confirmation を artifact へ pin する
という schema の意図を満たしません。監査は同じ手順で再計算して突き合わせます。

計算対象は **その node から `confirmation_evidence` キーだけを除いた JSON** です
(`confirmation_evidence` 自身は自己参照になるため除外。逆に言うと `evaluator` や
`evidence_ref` を後から書き換えても digest は変わりません)。

**順序が重要です。** `confirmation_status` / `evaluation_status` /
`implementation_readiness` を含む**昇格後の node の中身をすべて確定させてから**
digest を計算し、最後に `confirmation_evidence` へ入れてください。digest を入れた
後に node の他の field を書き換えると不一致になり監査が落ちます (これは
「昇格後に中身を差し替える stale PASS」を拒否する仕様であり、バグではありません)。

```bash
python3 - <<'EOF'
import hashlib, json
p = "/Users/dm/orca/workspaces/HarnessHub/wt-26/eval-log/dev-graph/live-trial-fixtures/bk8v-decompose-r3/eval-log/macro-preview.json"
doc = json.load(open(p, encoding="utf-8"))
for node in doc["nodes"]:
    if node.get("artifact_kind") != "feature":
        continue
    if node.get("evaluation_status") != "pass":
        continue
    payload = {k: v for k, v in node.items() if k != "confirmation_evidence"}
    canonical = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    node["confirmation_evidence"]["evaluated_digest"] = hashlib.sha256(
        canonical.encode("utf-8")
    ).hexdigest()
    print(node["graph_node_id"], node["confirmation_evidence"]["evaluated_digest"])
json.dump(doc, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
EOF
```

上のスクリプトを使う場合も、`evaluator` と `evidence_ref` は**先に**非空の値へ
設定しておいてください (digest 計算には影響しませんが、監査は 3 field すべての
非空を要求します)。

### なぜ「readiness incomplete のまま昇格」を指示しないのか

`plugins/dev-graph/schemas/graph-node.schema.json` の `allOf[7]` が
`evaluation_status == "pass"` のとき `implementation_readiness.status == "complete"` を
強制します。つまり **「confirmed + pass + readiness incomplete」は schema-valid な node
として存在できません**。**この状態を作ろうとしないでください。**必ず上記 1 の完全昇格に
してください。

昇格を反映した `macro-preview.json` を保存したら、次で両クラスが揃ったことを確認し、
出力をそのまま記録してください。

```bash
python3 - <<'EOF'
import json
p = "/Users/dm/orca/workspaces/HarnessHub/wt-26/eval-log/dev-graph/live-trial-fixtures/bk8v-decompose-r3/eval-log/macro-preview.json"
d = json.load(open(p, encoding="utf-8"))
for f in [n for n in d["nodes"] if n.get("artifact_kind") == "feature"]:
    print(f["graph_node_id"],
          f.get("tracker_binding"),
          f.get("confirmation_status"),
          f.get("evaluation_status"),
          (f.get("implementation_readiness") or {}).get("status"),
          (f.get("github_publication") or {}).get("mode"))
EOF
```

出力に **`confirmed pass complete` の行が 1 件以上**と、**`draft pending incomplete` の
行が 1 件以上**の両方が現れていなければ昇格に失敗しています。その場合は先へ進まず
修正してください。`tracker_binding` は全行 `none` (今回の `--binding none`) である必要が
あり、`repo-config-default` が残っていたら binding 解決が走っていないので監査が落ちます。
`github_publication.mode` は全行 `local_only` である必要があります (`--binding none` では
外部投影しないため。draft に publication intent を立てると監査が gate 違反として落とします)。

保存後、監査コードを作成・編集せず、次を実行してください。

```bash
python3 /Users/dm/orca/workspaces/HarnessHub/wt-26/plugins/dev-graph/tests/fixtures/audit_decompose_live_trial.py audit \
  --repo-root /Users/dm/orca/workspaces/HarnessHub/wt-26/eval-log/dev-graph/live-trial-fixtures/bk8v-decompose-r3 \
  --preview /Users/dm/orca/workspaces/HarnessHub/wt-26/eval-log/dev-graph/live-trial-fixtures/bk8v-decompose-r3/eval-log/macro-preview.json \
  --scenario /Users/dm/orca/workspaces/HarnessHub/wt-26/plugins/dev-graph/tests/fixtures/live-trial-positive-scenarios.json \
  --pre-state /Users/dm/orca/workspaces/HarnessHub/wt-26/eval-log/dev-graph/live-trial-fixtures/bk8v-decompose-r3/eval-log/pre-state.json \
  --plugin-dir /Users/dm/orca/workspaces/HarnessHub/wt-26/plugins/dev-graph \
  --output /Users/dm/orca/workspaces/HarnessHub/wt-26/eval-log/dev-graph/live-trial-fixtures/bk8v-decompose-r3/eval-log/decompose-audit.json
```

`pass` と `audit_implementation.provenance_valid` が true の場合だけ成功にしてください。
write count は共通監査が前後状態と実 bd/gh dry-run receipt から導出します。固定値を
自己申告してはいけません。

**audit が `pass=false` を返したとき、`macro-preview.json` を書き換えて再実行し
`pass=true` に見せかけてはいけません。** 原因を記録し、skill 手順の範囲で正しく直せない
場合は `FAIL` として報告してください (過去に、schema violation を避けるため昇格を
draft へ差し戻して 2 回目を通した事故があります)。ただし `evidence_binding` が
`digest_matches: false` を返した場合だけは例外で、上記レシピの**計算順序ミス**
(digest 計算後に node を書き換えた) が原因なら、node の中身は変えずに digest だけを
再計算して直して構いません。

## progress の evidence

`publication` の次の 3 点を **セットで** 記載してください。

- `publication.promoted` に完全昇格させた node の id が入っていること
- `publication.blocked` に draft の node が入り、その `blocked_by` に
  `confirmation_confirmed` / `evaluation_pass` / `readiness_complete` が並ぶこと
- `publication.eligible_by_binding` の `beads` と `github` が 0 件で、`none` に昇格 node
  だけが入ること (binding 解決が `none` へ倒れた結果として外部投影資格が空であること)

加えて次の 3 点も evidence に含めてください。

- `publication.discriminating` が true (両クラスが揃った)
- `evidence_binding.all_bound` が true (昇格 node の `evaluated_digest` が node 内容の
  再計算値と一致した)
- `gate_negative_controls.all_rejected` が true (この run の preview から合成した gate
  違反の反例が、正準 schema validator に拒否された)

**`publication.gate_respected` を単独の evidence に使わないでください。** `--binding none
--dry-run` では誰も外部投影されないため、この値は真になって当然であり
(受領書自身が `gate_respected_vacuous: true` と自己申告します)、gate が効いた証拠には
なりません。gate の証拠は `discriminating` と `gate_negative_controls` の 2 つです。

## goal-seek の終了

監査後に同じ `original_goal` と hash を持つ 2 行目だけを intermediate へ append します。
完了マーカーより前に progress の全 checklist を更新してください。

- 実測項目は `status: "pass"` とし、`decompose-audit.json` の具体的な field を evidence にする
- exact-13/commit のように、今回の dry-run では原理的に発火しない項目のみ
  `status: "not_applicable"` とし、発火しない根拠 field を evidence にする。
  「まだ実装していないから」を理由に `not_applicable` にしてはいけない
- `pending` と `evidence: null` を一つも残さない

特に前回の実走で証跡不足になったため、次の field と実値を省略してはいけません。

- OUT5: `derived_write_counts` の全経路が 0、`mutation_suppression` の全経路が true、
  外部 adapter receipt が dry-run / mutation suppressed であること
- OUT6: `graph.task_count=0`、`local_state.checks.graph_node_count_unchanged=true`、
  `local_state.checks.graph_revision_unchanged=true`
- OUT7: `graph.task_count=0`、`derived_write_counts.local=0`、
  `local_state.checks.graph_revision_unchanged=true`、
  `local_state.mutation_suppressed=true`

完了マーカーを書く前に progress を読み直し、`publication.promoted` /
`publication.blocked` / `publication.eligible_by_binding` の 3 点セットが evidence に
明記されていること、および OUT5・OUT6・OUT7 の evidence が上記の具体的 field と値を
含むことを自己検査してください。不足があればその時点で progress だけを修正し、
goal-seek 検証を通してから完了してください。

次の機械 self-check を必ず実行し、`PROGRESS_EVIDENCE_OK` が出ない限り
`out/status.json` を書いてはいけません。

```bash
python3 - <<'PY'
import json
from pathlib import Path

p = Path("/Users/dm/orca/workspaces/HarnessHub/wt-26/eval-log/dev-graph/live-trial-fixtures/bk8v-decompose-r3/eval-log/run-dev-graph-decompose-progress.json")
doc = json.loads(p.read_text(encoding="utf-8"))
rows = [*doc["checklist"], *doc["criteria"]]
assert not [r for r in rows if r["status"] == "pending" or r.get("evidence") is None]
all_evidence = "\n".join(r["evidence"] for r in rows)
for token in (
    "publication.promoted",
    "publication.blocked",
    "publication.eligible_by_binding",
):
    assert token in all_evidence, token
criteria = {r["id"]: r for r in doc["criteria"]}
for token in (
    "derived_write_counts",
    "mutation_suppression",
    "adapter_receipts.beads",
    "adapter_receipts.github_issue",
    "adapter_receipts.github_projects",
):
    assert token in criteria["OUT5"]["evidence"], ("OUT5", token)
for token in (
    "graph.task_count=0",
    "local_state.checks.graph_node_count_unchanged=true",
    "local_state.checks.graph_revision_unchanged=true",
):
    assert token in criteria["OUT6"]["evidence"], ("OUT6", token)
for token in (
    "graph.task_count=0",
    "derived_write_counts.local=0",
    "local_state.checks.graph_revision_unchanged=true",
    "local_state.mutation_suppressed=true",
):
    assert token in criteria["OUT7"]["evidence"], ("OUT7", token)
print("PROGRESS_EVIDENCE_OK")
PY
```

goal-spec、progress、intermediate の 3 点を fixture の `eval-log/` に揃え、正本 Goal/hash
の検査が通ることを確認してください。

## 完了 (再掲・省略禁止)

成功・失敗・中断のいずれでも、最後に次の 1 ファイルだけを Write してください。

`/Users/dm/orca/workspaces/HarnessHub/wt-26/eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260729T021657Z-bk8v-decompose-r3/out/status.json`

内容:

`{"status": "PASS|FAIL|ERROR", "scenario": "C14-OUT1-positive-macro-decomposition-r2"}`

その直後に「DONE: <status>」と 1 行だけ報告してください。

制約:

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- `out/` には上記 status.json 以外を書かないこと。

## 最後の 1 手 (書き忘れ防止のセルフチェック)

完了マーカーを Write した直後に、必ず次のコマンドを実行して結果を確認してください。

```bash
ls -1 /Users/dm/orca/workspaces/HarnessHub/wt-26/eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260729T021657Z-bk8v-decompose-r3/out/
```

出力が `status.json` の 1 行ちょうどでなければ、書き先が誤っています。誤って
`out/` の外 (run ディレクトリ直下など) へ書いてしまった場合は、そのファイルを削除し、
`out/status.json` へ書き直してから「DONE: <status>」を報告してください。
