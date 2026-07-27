---
graph_node_id: "issue-make-lint-ci-skill-description-parity-20260726"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","ci","local-gate","skill-governance","drift"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "make lint が CI の repo-wide skill description lint を再現しない"
owners: ["daishiman"]
created_at: "2026-07-25T15:44:20Z"
updated_at: "2026-07-25T15:49:08Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["Makefile",".github/workflows/governance-check.yml","scripts/run-ci-checks.sh","scripts/lint-skill-description.py","tests/test_plugin_lint_coverage.py"]
purpose: "CI の governance-check と scripts/run-ci-checks.sh は python3 scripts/lint-skill-description.py を引数なしで実行し、既定の対象である plugins/harness-creator/skills、.claude/skills、.claude/agents を検査する。一方 make lint は --skills-dir 付きの個別呼び出しだけで、.claude/skills と .claude/agents を含む引数なし実行を再現しない。このためローカルの推奨ゲートが成功しても、CI で初めて skill description 違反が見つかる経路が残っている"
goal: "make lint が CI の repo-wide skill description lint と同じ対象・同じ失敗条件を実行し、ローカルで CI 固有の description 違反を事前検出できる状態にする"
scope_in: ["Makefile の lint ターゲットへ引数なし lint-skill-description.py または意味的に同等な repo-wide 検査を結線する","Makefile と CI の対象集合が再び乖離したとき失敗する回帰テストを追加する","scripts/run-ci-checks.sh を含む既存呼び出しとの重複・責務を整理する"]
scope_out: ["lint-skill-description.py の R1-R5 ルール自体の変更","既存 skill description の文言変更","skill description 以外のローカル・CI ゲート乖離の一括是正"]
acceptance: ["make lint から python3 scripts/lint-skill-description.py の引数なし実行、または同じ対象集合を検査する等価コマンドが起動する",".claude/skills または .claude/agents に違反を置いた検証 fixture でローカル lint が非 0 終了する","Makefile と governance-check.yml の対象集合の乖離を検知する回帰テストが追加される","現行ツリーで make lint と python3 scripts/lint-skill-description.py がともに成功する"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-make-lint-ci-skill-description-parity-20260726.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-25T15:44:20Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.96
classification_reason: "ローカル品質ゲートと CI 品質ゲートの対象集合が一致しない再現可能な追跡課題"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-make-lint-ci-skill-description-parity-20260726.md","confidence":0.96}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-kkqq","linked_at":"2026-07-25T15:49:08Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-25T15:44:20Z","missing_sections":[],"status":"complete"}
---

# 概要

`make lint` が CI の repo-wide（リポジトリ全体を対象にする）skill description 検査を再現しておらず、ローカル成功後に CI で初めて違反が見つかる経路が残っている。

## 背景と問題

`.github/workflows/governance-check.yml` の `lint skill description (03章 R1-R5)` と `scripts/run-ci-checks.sh` は、次のコマンドを引数なしで実行する。

```bash
python3 scripts/lint-skill-description.py
```

引数なし実行の既定対象は `scripts/lint-skill-description.py` の `SKILL_GLOBS` で定義されており、次を含む。

- `plugins/harness-creator/skills/*/SKILL.md`
- `.claude/skills/*/SKILL.md`
- `.claude/agents/*.md`

一方、開発者向けの標準ローカルゲートである `make lint` は `--skills-dir` 付きの個別呼び出しだけを実行する。`plugins/harness-creator/skills` は重なるが、`.claude/skills` と `.claude/agents` を含む引数なし実行は結線されていない。

## 現在の挙動

- `make lint`: plugin ごとの `--skills-dir` 付き検査を実行する。
- CI `governance-check`: 引数なしの repo-wide 検査を別途実行する。
- `scripts/run-ci-checks.sh`: 引数なしの repo-wide 検査を実行する。
- 2026-07-26 時点の現行ツリーでは `python3 scripts/lint-skill-description.py` は `OK=203 / VIOLATION=0` で成功するため、問題は現在の赤ではなく将来の検出経路の欠落である。

## 期待する挙動

`make lint` が CI と同じ対象集合・失敗条件で repo-wide skill description 検査を実行し、`.claude/skills` または `.claude/agents` の違反をローカルで検出する。

## 再現手順またはユースケース

1. `Makefile` の `lint` ターゲットを確認する。
2. `lint-skill-description.py` の呼び出しがすべて `--skills-dir` 付きであることを確認する。
3. `.github/workflows/governance-check.yml` の `lint skill description (03章 R1-R5)` を確認する。
4. CI では `python3 scripts/lint-skill-description.py` が引数なしで実行されることを確認する。
5. `scripts/lint-skill-description.py` の `SKILL_GLOBS` と Makefile の対象を比較し、`.claude/skills` と `.claude/agents` がローカル側だけ欠けていることを確認する。

## 影響と優先度

- 影響範囲: skill / agent frontmatter を変更する開発者と CI
- 深刻度: medium
- 緊急度: 現行ツリーは緑だが、ローカルで再現できない CI-only failure（CI だけで発生する失敗）を将来再発させるため、品質ゲートの次回整備時に是正する

## スコープ

- In: `Makefile` の結線、CI との対象集合を固定する回帰テスト、既存の `scripts/run-ci-checks.sh` との責務整理
- Out: R1-R5 の規則変更、既存 description の文言修正、他 lint の CI 乖離の一括是正

## 関連グラフ

- 原因/親ノード: なし（standalone quality issue）
- 関連仕様: なし
- 関連アーキテクチャ: なし
- 解決タスク: 本 issue の実装時に作成する

## 受入条件

- `make lint` から引数なしの `python3 scripts/lint-skill-description.py`、または同じ対象集合を検査する等価コマンドが起動する。
- `.claude/skills` または `.claude/agents` に違反を置く fixture でローカル lint が非 0 終了する。
- Makefile と `governance-check.yml` の対象集合が再び乖離したとき失敗する回帰テストがある。
- 現行ツリーで `make lint` と引数なしの `python3 scripts/lint-skill-description.py` がともに成功する。

## 検証証跡

- 現状確認: `python3 scripts/lint-skill-description.py` → `summary: OK=203 VIOLATION=0`
- 静的比較: `Makefile`、`.github/workflows/governance-check.yml`、`scripts/run-ci-checks.sh`、`scripts/lint-skill-description.py`
- 実装後の証跡: 回帰テスト結果と `make lint` の終了コードを本 issue の notes に記録する
