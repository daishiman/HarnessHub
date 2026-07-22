---
graph_node_id: "issue-lint-verdict-null-transcript-sha-20260722"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["live-trial","evidence-integrity","dev-graph","anti-goodhart"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "lint-live-trial-verdict の check_verdict が transcript_sha256=null を素通りさせる"
owners: ["daishiman"]
created_at: "2026-07-22T06:10:00Z"
updated_at: "2026-07-22T06:10:00Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["issues/sys-lint-verdict-null-transcript-sha-20260722.md"]
purpose: "check_verdict の transcript 束縛検査が `recorded is not None` ガードで書かれており、transcript_sha256 が null の verdict を突合せずに OK と判定する。証跡と実体の束縛が切れた状態が緑で通る。"
goal: "transcript.jsonl が存在する run について transcript_sha256 の欠落を violation として検出し、束縛が切れた verdict が lint を通過できない状態にする"
scope_in: ["issues/sys-lint-verdict-null-transcript-sha-20260722.md"]
scope_out: []
acceptance: ["transcript.jsonl が存在し transcript_sha256 が null または欠落の verdict について lint-live-trial-verdict.py が violation を報告する","既存の全 verdict が新検査を通過する"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-lint-verdict-null-transcript-sha-20260722.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-22T06:10:00Z","origin_kind":"manual","source_digest":null,"source_path":"scripts/lint-live-trial-verdict.py","source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "lint の transcript 束縛検査が null を素通りさせる穴を追跡する issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-lint-verdict-null-transcript-sha-20260722.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-22T06:10:00Z","missing_sections":[],"status":"complete"}
---


# 概要

`scripts/lint-live-trial-verdict.py` の `check_verdict` は、`transcript_sha256` が `null` の verdict について transcript 実体との突合を**スキップ**する。証跡と実体の束縛が切れた verdict が `[OK]` として通過する。

## 背景と問題

transcript 束縛検査は次のように書かれている。

```python
recorded_transcript = data.get("transcript_sha256")
transcript = path.parent / "transcript.jsonl"
if recorded_transcript is not None and transcript.is_file():
    actual = hashlib.sha256(transcript.read_bytes()).hexdigest()
    if actual != recorded_transcript:
        errs.append("transcript-mismatch: ...")
```

`recorded_transcript is not None` が前提条件になっているため、**digest が記録されていない verdict は検査対象から外れる**。

同じファイルの provenance 検査 (`--check-provenance`) 側は、この故障モードを既に認識して肯定形へ書き直されている。

> 本検査は path 同一性を鍵に履歴を突き合わせるため、この述語を「変化したか」で書くと削除も変化として通ってしまう。**transcript.jsonl を消して `transcript_sha256` を null にするだけで遮断を迂回できた (2026-07-21 実測)**。肯定形の実体確認で書くこと。

**`check_verdict` 側にはこの修正が入っていない。** 同一ファイル内で、片方は肯定形、片方は `is not None` ガードのままという取りこぼしである。

## 現在の挙動 (実測)

2026-07-22、`HarnessHub-rix` の作業中に `live-trial-verdict.py` を `--transcript` 引数なしで実行したところ、verdict が次の状態になった。

```json
{
  "transcript_sha256": null,
  "actual_model": [],
  "environment": {"claude_version": null, "transcript_layer": "tui"},
  "timeline": {"boot_s": null, "poll_exit": "DONE", "wall_clock_s": null},
  "overall": {"launch": "PASS", "completion": "PASS", "goal_fit": "PASS", "verdict": "PASS"}
}
```

この状態で `lint-live-trial-verdict.py --plugin dev-graph` を実行すると **`[OK] 9 verdict(s) verified` / EXIT=0** を返した。

**verdict がどの会話ログにも束縛されていないのに、live 受け入れ証拠として通過する。**

## 影響と優先度

- 影響範囲: live-trial verdict を根拠とする全ての受け入れ判定
- 深刻度: high
- 緊急度: 高 — `HarnessHub-dst` が導入した provenance 検査は「digest が変わり transcript が不変」を捉えるが、**digest を消す**経路はこの穴を通る。`transcript_sha256` を null にして transcript を削除すれば、実行していない verdict を PASS として通せる
- 本質: 束縛の検査を「値が入っていれば照合する」と書くと、**値を入れないことで検査を無効化できる**。検査は「値が入っていること」自体を要求しなければならない

## 期待する挙動

`transcript.jsonl` が存在する run について、`transcript_sha256` が `null` または欠落している verdict を violation として報告する。

## 再現手順またはユースケース

```bash
# 任意の verdict の transcript_sha256 を null にする
python3 - <<'PY'
import json, pathlib
p = pathlib.Path('eval-log/dev-graph/<skill>/live-trial/<run-id>/verdict.json')
d = json.loads(p.read_text())
d['transcript_sha256'] = None
p.write_text(json.dumps(d, ensure_ascii=False, indent=2))
PY

python3 scripts/lint-live-trial-verdict.py --plugin dev-graph; echo "EXIT=$?"
# → [OK] ... EXIT=0  (transcript との束縛が切れているのに通過する)
```

## スコープ

- In: `scripts/lint-live-trial-verdict.py` の `check_verdict` における transcript 束縛検査
- Out: `--check-provenance` 側 (既に肯定形へ修正済み)、`skill_dir_tree_sha` の検査 (別途 stale-sha で検出される)

## 是正の選択肢

| # | 案 | 影響 |
|---|---|---|
| (a) **推奨** | `transcript.jsonl` が存在するなら `transcript_sha256` を必須とし、null/欠落を violation にする | 肯定形で書けるので抜けが無い。既存 verdict のうち null を持つものは再生成が要る |
| (b) | schema 側で `transcript_sha256` を required にする | schema 検査で弾けるが、既存 verdict との後方互換を壊す |
| (c) | `transcript.jsonl` の存在自体を必須にし、digest 一致まで含めて検査する | 最も強いが、transcript を持たない tier (static/fork) との整合を確認する必要がある |

(a) を推す理由: provenance 検査側が既に採った「肯定形の実体確認」と同じ方針で、同一ファイル内の書き方を揃えられる。

## 備考 — 発見の経緯

`HarnessHub-rix` の r9 verdict について、`scenario_id` の記録漏れを補完するため複数の担当が同時に再生成を走らせた。片方が `--transcript` 無しで実行した瞬間に null 版が生成され、その状態で lint が `[OK]` を返した。実害は復元により無く、最終的に commit された verdict は `transcript_sha256` が実体と一致している。

**副次的な学び**: 同一 verdict を複数の書き手が同時に再生成すると、null 版を掴む瞬間が生じる。verdict 再生成の担当は 1 人に固定するのが安全である。

## 関連グラフ

- 発見元: `HarnessHub-rix` の r9 verdict 再生成
- 同根: `issue-live-trial-evidence-provenance-20260721` (`HarnessHub-dst`) — provenance 検査側は肯定形へ修正済み
- 同根: `issue-live-trial-digest-rewrite-render-status-20260721` (`HarnessHub-s7b`) — digest 単独書き換えの是正
- 併発: `issue-scenario-verdict-stale-live-trial-ref-20260721` (`HarnessHub-yg3`)
