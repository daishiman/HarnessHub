---
graph_node_id: "issue-lint-skill-tree-pytest-cache-false-positive-20260726"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","lint","skill-governance","test-pollution","false-positive","ci","duplication","qa-6in4"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "lint-skill-tree.py の第13条が .pytest_cache を除外せず per-plugin pytest 実行後に criteria テストが 7 件偽陽性で落ちる"
owners: ["daishiman"]
created_at: "2026-07-26T01:20:00Z"
updated_at: "2026-07-30T01:41:44Z"
status: "closed"
depends_on: []
related_nodes: []
resource_scope: ["scripts/lint-skill-tree.py","plugins/skill-governance-lint/scripts/lint-skill-tree.py","tests/criteria/test_all_skills_criteria.py","tests/scripts-plugins/test_skill_governance_lint__lint_skill_tree.py",".github/workflows/harness-creator-kit-ci.yml","docs/features/feat-dev-pipeline-improvement/skill-tree-cache-spec-reflection-receipt.md"]
purpose: "第13条の生成物除外が __pycache__ と .pyc しか持たず .pytest_cache が漏れているため、CI 機構B (cwd=test_root の per-plugin pytest) の生成物が続く機構A を落とす。CI はクリーン checkout のため構造的に検出できず、ローカル実行者だけが踏む順序依存の偽陽性になっている"
goal: "テスト実行順序に依存せず 0 failed になる状態にし、生成物ディレクトリの除外を個別名の列挙から一般規則へ移す"
mvp_alignment: null
scope_in: ["lint-skill-tree.py 第13条の生成物ディレクトリ除外の一般化","scripts/ と plugins/skill-governance-lint/scripts/ の複製 2 箇所への同時反映",".pytest_cache 相当の生成物を含む skill ツリーで exit 0 を確認する回帰テスト","機構B の直後に機構A を走らせても 0 failed になることの確認"]
scope_out: ["lint-skill-tree.py の複製そのものの SSOT 化 (別課題として切り出す判断がありうる)","ルートからの pytest が pytest-asyncio の collect で INTERNALERROR になる件 (CI が per-plugin 実行を採る前提のため別問題)","ALLOWED_DIRS / ALLOWED_NESTED_DIRS の規約そのものの見直し"]
acceptance: ["skill ディレクトリ配下に .pytest_cache/v/cache が存在する状態で lint-skill-tree.py が exit 0 を返す","CI 機構B (per-plugin pytest) の直後に機構A (pytest tests/) を走らせても 0 failed になる","除外が scripts/ と plugins/skill-governance-lint/scripts/ の両複製で同時に効いている","回帰テストが .pytest_cache という個別名のみに依存せず同性質の生成物ディレクトリ全般で通る"]
architecture_refs: ["arch-harness-hub-testing-qa"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-lint-skill-tree-pytest-cache-false-positive-20260726.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-26T01:20:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "lint-skill-tree.py:205-221 の除外条件を原文で確認し、.pytest_cache 削除前 7 failed / 削除後 0 failed を同一 HEAD で実測して因果を本欠陥に限定した"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-lint-skill-tree-pytest-cache-false-positive-20260726.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-xswf","linked_at":"2026-07-26T03:25:49Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-07-29T12:10:50Z","evidence_refs":["docs/features/feat-dev-pipeline-improvement/skill-tree-cache-spec-reflection-receipt.md"],"policy":"manual","reconciled_at":"2026-07-29T12:10:50Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-07-26T01:20:00Z","missing_sections":[],"status":"complete"}
---

## 概要

`scripts/lint-skill-tree.py` の第13条 (フラットツリー、深さ <= 2) 検査が `.pytest_cache/` を規約外の nested dir として数えるため、pytest を skill ディレクトリを cwd にして走らせた直後に `tests/criteria/test_all_skills_criteria.py::test_criterion_is_genuinely_verified` が 7 件失敗する。実害はテスト結果の偽陽性 (false positive = 本当は壊れていないのに失敗と出ること) で、CI では露見せずローカル実行者だけが踏む。

## 再現手順 (2026-07-26 実測)

1. CI の `harness-creator-kit-ci.yml` の「Run plugin behavior tests (pytest, per-plugin)」機構B と同じ探索・実行をローカルで行う。この機構は `cwd=test_root` で pytest を起動するため、skill ディレクトリ配下に `.pytest_cache/` が生成される。実測で 21 個の test_root すべてに生成された。
2. 続いて機構A (`python3 -m pytest tests/ plugins/skill-governance-lint/tests/ -q`) を走らせる。
3. `7 failed, 7475 passed, 5 skipped` になる。`.pytest_cache` を削除して再実行すると `7482 passed, 5 skipped` で 0 failed。

失敗した 7 件 (すべて `test_criterion_is_genuinely_verified` の inner scope):

- `system-spec-harness/run-system-spec-compile::IN1`
- `system-spec-harness/run-system-spec-elicit::IN1`
- `system-spec-harness/run-system-spec-doc-fetch::IN1`
- `extract-system-blueprint/run-blueprint-apply::IN1`
- `extract-system-blueprint/run-extract-blueprint::IN1`
- `plugin-dev-planner/run-plugin-dev-plan::IN1`
- `plugin-dev-planner/run-plugin-dev-plan::IN2`

実際のエラー本文 (elicit の例):

```
AssertionError: lint-skill-tree FAIL system-spec-harness/run-system-spec-elicit:
  [Warn]LS-203: run-system-spec-elicit: 規約外 top-level dir '.pytest_cache' (許可: examples, hooks, log, prompts, references, schemas, scripts, templates)
  第13条違反: nested dir '.pytest_cache/v'
  第13条違反: nested dir '.pytest_cache/v/cache'
```

## 根本原因

`scripts/lint-skill-tree.py:205-221` の第13条ループは生成物の除外を持つが、除外リストに `.pytest_cache` が無い。

```python
for p in root.rglob("*"):
    # __pycache__ / .pyc を除外
    if "__pycache__" in p.parts or p.suffix == ".pyc":
        continue
```

`__pycache__` と `.pyc` は「Python 実行が生む `.gitignore` 対象の生成物」として除外されているのに、同性質の `.pytest_cache` (`.gitignore:8` に `.pytest_cache/` として登録済み) だけが漏れている。列挙の穴であり、規約の意図 (人が置いたディレクトリ構造を検査する) からすれば除外されるべき側。

top-level の `.pytest_cache` 自体は LS-203 の Warn 扱いで exit 1 にしないが、その内側の `v/` と `v/cache/` が nested dir 判定に落ちて errs に入り exit 1 になる。つまり LS-203 が Warn に留める設計判断が、第13条の側で無効化されている。

## なぜ CI では露見しないか

CI はジョブごとにクリーンな checkout から始まり、機構B の生成物が機構A の実行環境に残らない。したがってこの偽陽性は CI では構造的に検出できず、ローカルで CI を再現した開発者だけが踏む。「CI が緑だから健全」が成り立たない領域であり、順序依存 (test pollution = あるテストの副作用が別のテストの結果を変えること) の典型。

## 影響範囲

skill ディレクトリ直下に `tests/` を持つ 10 箇所が `.pytest_cache` の生成先になる (実測):

- `plugins/extract-system-blueprint/skills/run-blueprint-apply`
- `plugins/extract-system-blueprint/skills/run-extract-blueprint`
- `plugins/plugin-dev-planner/skills/assign-plugin-plan-evaluator`
- `plugins/plugin-dev-planner/skills/run-plugin-dev-plan`
- `plugins/system-spec-harness/hooks`
- `plugins/system-spec-harness/skills/assign-system-spec-completeness-evaluator`
- `plugins/system-spec-harness/skills/ref-system-design-knowledge`
- `plugins/system-spec-harness/skills/run-system-spec-compile`
- `plugins/system-spec-harness/skills/run-system-spec-doc-fetch`
- `plugins/system-spec-harness/skills/run-system-spec-elicit`

このうち criteria の loop_scope=inner を持つ skill が実際に失敗する。dev-graph は skill 配下に tests/ を持たず plugin 直下に集約しているため影響を受けない。

## 修正方針

1. `scripts/lint-skill-tree.py:207` の除外条件へ `.pytest_cache` を追加する。ただし個別の名前を足し続けるのは同じ穴を再生産するため、`.gitignore` 対象または先頭が `.` の生成物ディレクトリを一括で除外する形が望ましい。判断が必要なのは「`.claude` のような意味のある dot ディレクトリを誤って除外しないか」で、skill 規約の許可リスト `ALLOWED_DIRS` に dot 始まりが 1 つも無いことを根拠にできる。
2. `plugins/skill-governance-lint/scripts/lint-skill-tree.py` は `scripts/lint-skill-tree.py` と sha256 完全一致 (dfea55170fbcc807ba9ce5683ef2a3a73cfe74aa8e60d068866237c7b7caa53b) の複製である。片方だけ直すと乖離するため両方直す。この複製自体が別の欠陥であり、SSOT 化は別課題として切り出す判断もありうる。
3. 回帰テストを足す。`.pytest_cache/v/cache` を持つ一時 skill ディレクトリを作り lint-skill-tree.py が exit 0 を返すことを検査する。生成物名を pytest に限定せず `.mypy_cache` 等でも通ることを見る。

## 受入条件の候補

- skill ディレクトリ配下に `.pytest_cache/v/cache` が存在する状態で `lint-skill-tree.py` が exit 0 を返す。
- 機構B (per-plugin pytest) を走らせた直後に機構A (`pytest tests/`) を走らせても 0 failed になる。実行順序に依存しない。
- 除外が `scripts/` と `plugins/skill-governance-lint/scripts/` の両複製で同時に効いている (sha256 が一致し続ける、または SSOT 化されている)。
- 回帰テストが `.pytest_cache` という個別名のみに依存せず、同性質の生成物ディレクトリ全般で通る。

## 検出経緯

2026-07-26、HarnessHub-6in4 / HarnessHub-q5h9 の完了確認として「変更範囲外への波及がないこと」をリポジトリ全体テストで検証しようとした際に判明した。まずルートから `pytest -q` を試したが pytest-asyncio の collect で INTERNALERROR になり (CI もこれを避けて per-plugin 実行にしている)、CI と同じ機構B を再現したところ生成された `.pytest_cache` が続く機構A を落とした。7 failed はいずれも 6in4 の変更 (dev-graph) とは無関係で、因果は本欠陥に限定される。

## 最終レビュー結果 (2026-07-29)

第13条は dot で始まる directory とその配下を test tool の生成物として除外し、
通常の nested directory 違反、`__pycache__` / `.pyc` の既存境界を維持した。
回帰検体は `.pytest_cache`、`.mypy_cache`、任意の `.tool-cache` を含み、
root / plugin の実装が同一バイト列であることも固定した。

- focused pytest: `41 passed`
- CI と同じ実行順序: 全21 per-plugin group 成功後、
  repository pytest `7626 passed, 5 skipped, 0 failed`
- repository CI: `PASS 123 / WARN 4 / FAIL 0`
- task package: P01-P13 exact、validation PASS
- dev-graph: schema / source digest / evidence refs / open residue の対象検査 PASS

仕様・設計への影響は製品機能ではなく repository の品質ゲート契約に限定される。
`system-spec/testing-qa.md` の qa-095、仕様要約、architecture wrapper、feature、
P12/P13 task へ正規反映し、詳細を
`docs/features/feat-dev-pipeline-improvement/skill-tree-cache-spec-reflection-receipt.md`
へ記録した。Beads `HarnessHub-xswf` と本 node は完了状態へ同期済みである。
