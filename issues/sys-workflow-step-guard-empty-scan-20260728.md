---
graph_node_id: "issue-workflow-step-guard-empty-scan-20260728"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["follow-up","ci","fail-open","lint","governance-check"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "lint-workflow-step-guard.py が workflows 不在・走査 0 件でも exit 0 (残存 fail-open)"
owners: ["daishiman"]
created_at: "2026-07-28T04:30:00Z"
updated_at: "2026-07-29T12:55:00Z"
status: "done"
depends_on: []
related_nodes: ["issue-governance-notion-steps-always-skipped-20260725"]
resource_scope: ["scripts/lint-workflow-step-guard.py","tests/scripts-root/test_root__lint_workflow_step_guard.py","tests/scripts-root/test_root__lint_workflow_step_guard_empty_scan.py","system-spec/spec-state.json","system-spec/dev-workflow.md","specs/harness-hub-system-specification.md","architecture/harness-hub-dev-workflow.md","features/feat-dev-pipeline-improvement.md","tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-p11.md","tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-p12.md","docs/features/feat-dev-pipeline-improvement/foq6-workflow-step-guard-spec-reflection.md","eval-log/system-spec-harness/audit-fork-ledger.jsonl","eval-log/system-spec-harness/assign-system-spec-completeness-evaluator/completeness-report-20260729-qa092.json","eval-log/system-spec-harness/assign-system-spec-completeness-evaluator/audit-results-20260729-qa092/c06-hearing-auditor.json","eval-log/system-spec-harness/assign-system-spec-completeness-evaluator/audit-results-20260729-qa092/c07-matrix-auditor.json","eval-log/system-spec-harness/assign-system-spec-completeness-evaluator/audit-results-20260729-qa092/c08-doc-freshness-auditor.json"]
purpose: "scripts/lint-workflow-step-guard.py の main() が workflows dir 不在および走査 0 件を成功として返すため、検査が起動していない緑と検査した結果の緑を区別できない。防ごうとしている defect と同型の fail-open が検査器自身に残っている"
goal: "検査対象が 0 件のときに lint が非 0 で停止し、意図的な空走査だけが明示 opt-in で許される状態"
scope_in: ["main() の空走査 fail-closed 化 (dir 不在 / 検査 0 件)","--allow-empty による明示 opt-in の追加","self-test fixture と単体テストによる分岐固定","system-spec qa-092 と下流仕様・設計文書への正規反映"]
scope_out: ["lint の検出ルール自体の変更 (classify_env_reference の判定基準)","--simulate の出力仕様変更","呼び出し 3 経路 (governance-check.yml / make lint / run-ci-checks.sh) の再設計"]
acceptance: ["存在しない --workflows-dir を渡すと非 0 で落ちる","空ディレクトリを渡すと非 0 で落ちる","--allow-empty を付けた場合に限り 0 を返す","上記 3 ケースが tests/scripts-root/test_root__lint_workflow_step_guard_empty_scan.py に追加されている"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-workflow-step-guard-empty-scan-20260728.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-28T04:30:00Z","origin_kind":"manual","source_digest":null,"source_path":"issues/sys-governance-notion-steps-always-skipped-20260725.md","source_plugin":null,"source_version":null}
classification_confidence: 0.9
classification_reason: "HarnessHub-5u5k の最終レビューで検出した、追加した lint 自身に残る空走査 fail-open。5u5k のスコープ (defect 是正 + 同型遮断) を膨らませないため独立 issue として分離した"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-workflow-step-guard-empty-scan-20260728.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-foq6","linked_at":"2026-07-28T04:26:49Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-07-29T12:47:25Z","evidence_refs":["scripts/lint-workflow-step-guard.py","tests/scripts-root/test_root__lint_workflow_step_guard_empty_scan.py","system-spec/dev-workflow.md","docs/features/feat-dev-pipeline-improvement/foq6-workflow-step-guard-spec-reflection.md"],"policy":"manual","reconciled_at":"2026-07-29T12:47:25Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-07-28T04:30:00Z","missing_sections":[],"status":"complete"}
---

# 概要

`scripts/lint-workflow-step-guard.py` の `main()` に、検査器自身の fail-open が残っている。`--workflows-dir` が存在しなければ `[SKIP]` を出して `return 0`、glob が 0 件でも `summary: workflows=0 violations=0` で exit 0 になる。「検査した結果 0 件」と「1 件も検査していない 0 件」が同じ緑を出す。

## 背景と問題

本 lint は `HarnessHub-5u5k` で、step-level `if` が同一 step の `env:` を参照する形 (Actions の評価順により式が恒久 false になり、secret を投入しても step が永久 skip される) を遮断するために追加した。つまり **「検査が起動していないのに緑」を防ぐための検査器**である。

その検査器自身が、対象 0 件を成功として返す。防ごうとしている defect と同型であり、`5u5k` の受入条件が守られているかどうかを、この lint の緑では判定できない。

呼び出し経路が 3 つ (`governance-check.yml` / `make lint` / `scripts/run-ci-checks.sh`) あり、それぞれ CWD 前提が異なる点も効く。checkout 漏れ・path 変更・別ディレクトリからの起動のいずれでも、違反が実在したまま緑になる。

## 現在の挙動

`scripts/lint-workflow-step-guard.py:440-441`。

```python
if not workflows_dir.is_dir():
    print(f"[SKIP] workflows dir not found: {workflows_dir}")
    return 0
```

および、glob 結果が空でも `checked = 0` のまま `summary` を出して exit 0 へ抜ける。

## 期待する挙動

- workflows dir が不在なら非 0 で停止する (fail-closed)。
- 検査件数が 0 件なら非 0 で停止する。
- 意図的に検査対象を持たない環境 (単独 install など) は `--allow-empty` の明示 opt-in でのみ 0 を返す。
- 上記の分岐を `--self-test` の fixture と単体テストで固定する。

## 再現手順またはユースケース

```bash
# dir 不在でも成功してしまう
python3 scripts/lint-workflow-step-guard.py --workflows-dir /nonexistent; echo "exit=$?"

# 空 dir でも workflows=0 で成功してしまう
mkdir -p /tmp/empty-wf && python3 scripts/lint-workflow-step-guard.py --workflows-dir /tmp/empty-wf; echo "exit=$?"
```

## 影響と優先度

- 影響範囲: system。メタ層 CI の再発防止ゲート 1 件の実効性。
- 深刻度: medium。現状 3 経路とも repo-root から起動され `workflows=10` を実測できているため、実被害は出ていない。
- 緊急度: 低いが、path 変更や新しい呼び出し経路の追加で静かに無効化されるため、構造として残すべきでない。

## スコープ

- In: `main()` の空走査 fail-closed 化 / `--allow-empty` の追加 / self-test fixture と単体テストの追加。
- Out: lint の検出ルール自体の変更 (`classify_env_reference` の判定基準)。`--simulate` の出力仕様変更。

## 関連グラフ

- 原因/親ノード: `issue-governance-notion-steps-always-skipped-20260725` (本 lint の追加元)
- 関連仕様: `docs/infrastructure-spec.md` §7
- 関連アーキテクチャ: `arch-harness-hub-dev-workflow` (差分追記 2026-07-28「結線されていても起動条件が恒久 false なら走らない」)
- 解決タスク: 本 issue 内で完結 (task 分解なし)

## 受入条件

- [x] 存在しない `--workflows-dir` を渡すと非 0 で落ちる
- [x] 空ディレクトリを渡すと非 0 で落ちる
- [x] `--allow-empty` を付けた場合に限り 0 を返す
- [x] 上記 3 ケースを専用の
  `tests/scripts-root/test_root__lint_workflow_step_guard_empty_scan.py`
  に分離し、包括テストと合わせて固定した

## 検証証跡

- focused pytest: 41 passed
- self-test: 9 checks passed
- repository workflow scan: 10 workflows / 0 violations
- 500 行 gate: 実装 497 行 / 包括テスト 482 行 / 空走査テスト 66 行
- task spec gate: published baseline contract 1.1.0 として P01〜P13 PASS
- repository CI: PASS 123 / WARN 4（既存・非 blocking）/ FAIL 0
- completeness evaluator: PASS（session `1068ed92-67cd-411a-b7f1-e08a496147fb`）
- Dev Graph: source-digest / evidence-ref / schema gate PASS
- 仕様反映: `system-spec/dev-workflow.md` qa-092 / appr-013
- 受領書:
  `docs/features/feat-dev-pipeline-improvement/foq6-workflow-step-guard-spec-reflection.md`
