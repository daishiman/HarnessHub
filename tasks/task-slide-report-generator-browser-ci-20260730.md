---
graph_node_id: "task-slide-report-generator-browser-ci-20260730"
artifact_kind: "task"
artifact_subtypes: []
project_id: "harness-hub"
domain: "testing-qa"
tags: ["slide-report-generator","playwright","chromium","github-actions","testing-qa"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "slide-report-generator の実 Chromium 受入試験を CI へ接続する"
owners: ["daishiman"]
created_at: "2026-07-30T11:41:12Z"
updated_at: "2026-07-30T11:41:12Z"
status: "active"
depends_on: []
related_nodes: ["feat-task-spec-test-strategy","arch-harness-hub-testing-qa"]
resource_scope: [".github/workflows/slide-report-generator-ci.yml","plugins/slide-report-generator/","system-spec/spec-state.json","system-spec/testing-qa.md","specs/harness-hub-system-specification.md","architecture/harness-hub-testing-qa.md","features/feat-task-spec-test-strategy.md","tasks/task-slide-report-generator-browser-ci-20260730.md","docs/features/feat-task-spec-test-strategy/slide-report-browser-ci-spec-reflection-receipt.md"]
purpose: "ローカルで成立している plugin-local Chromium 受入試験を CI から到達可能にし、未実行の検査を緑と誤認する経路を閉じる"
goal: "plugin または専用 workflow の変更時に clean runner が runtime 復元、実 Chromium を使う npm test、plugin-local runtime check を順番に完走し、配線消失を契約テストが検知する状態"
scope_in: ["slide-report-generator 専用 GitHub Actions workflow","plugin-local Playwright runtime の clean-runner 復元と read-only check","実 Chromium 起動、16:9 検査、複数 slide screenshot の npm test 到達","workflow 配線の Python 契約テスト","EVALS、README、testing-qa 仕様・設計・受領書の同期"]
scope_out: ["Harness Hub 製品の UI、API、DB schema、認証認可の変更","Cloudflare deploy unit と production runtime の変更","Playwright version の更新","flaky test の quarantine や retry による失敗の隠蔽","GitHub repository secret の追加"]
acceptance: ["plugin または workflow の変更で専用 GitHub Actions job が発火する","clean runner で runtime install、npm test、runtime check を順番に実行する","npm test が plugin-local Chromium 起動、16:9 検査、2 slide screenshot、report self-test を含む","workflow の配線を Python 契約テストが検査する","EVALS の mechanical checks と README の script inventory が実態に一致する","testing-qa の system-spec、compiled spec、architecture、feature、task、受領書が同期される","対象品質ゲートと repository CI が blocking failure 0 で完了する"]
architecture_refs: ["arch-harness-hub-testing-qa"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "tasks/task-slide-report-generator-browser-ci-20260730.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"3865ef3f39c5dd1c20adb54bd38f89139d702b0ecbb33b76389e0d299f1b21ce","evaluator":"codex-final-review","evidence_ref":"docs/features/feat-task-spec-test-strategy/slide-report-browser-ci-spec-reflection-receipt.md"}
source_lineage: {"imported_at":"2026-07-30T11:41:12Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.98
classification_reason: "既存 plugin の実装を変えずに CI 到達と検証証拠を補完する、単一責務の repository tooling task"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/task-slide-report-generator-browser-ci-20260730.md","confidence":0.98}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-nznu","linked_at":"2026-07-30T11:41:12Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-07-30T11:41:12Z","evidence_refs":["docs/features/feat-task-spec-test-strategy/slide-report-browser-ci-spec-reflection-receipt.md","plugins/slide-report-generator/tests/test_build_playwright_runtime.py",".github/workflows/slide-report-generator-ci.yml"],"policy":"manual","reconciled_at":"2026-07-30T11:41:12Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-07-30T11:41:12Z","missing_sections":[],"status":"complete"}
---

# 目的

`slide-report-generator` の plugin-local Chromium 受入試験を GitHub Actions から実行し、ローカルでだけ成功する未到達テストを防ぐ。

## 背景

Beads `HarnessHub-nznu` で救出した Playwright 対応は、ローカルの実 Chromium 起動と `npm test` には到達していた。一方、専用 GitHub Actions workflow がなく、runner 上で依存復元から screenshot 検証までを実行する保証が欠けていた。

## 入力と前提条件

- 入力: `plugins/slide-report-generator` の Playwright runtime、vendor test、`EVALS.json`
- 前提: Node.js 22、Python 3.11、npm registry と Playwright Chromium 配布先へ到達できる GitHub-hosted runner

## 出力と成果物

- 生成物: `.github/workflows/slide-report-generator-ci.yml`
- 更新対象: plugin の EVALS、README、workflow 配線回帰テスト、testing-qa 系の仕様・設計・受領書

## 依存関係

- `depends_on`: N/A: 救出済み実装は main に存在し、本 task は CI 到達の補完だけを担当する
- ブロッカー: GitHub-hosted runner の外部障害は draft PR 上の実 run で観測する

## 実装対象

- Frontend: N/A: Harness Hub の画面 UI は変更しない
- Backend/API: N/A: API と実行時 service は変更しない
- Database/Data: N/A: schema と永続データは変更しない
- Infrastructure: plugin path 変更時に macOS runner で runtime 復元、`npm test`、runtime check を実行する GitHub Actions workflow
- Security/Privacy: workflow token は repository checkout に必要な read-only 権限へ限定し、secret を追加しない
- Documentation: EVALS、README、task、feature、system spec、compiled spec、architecture、仕様反映受領書を同期する

## Write scope と競合制約

- `touches`: `.github/workflows/slide-report-generator-ci.yml`、`plugins/slide-report-generator/`、`system-spec/testing-qa.md`、`specs/harness-hub-system-specification.md`、`architecture/harness-hub-testing-qa.md`、`features/feat-task-spec-test-strategy.md`、`tasks/task-slide-report-generator-browser-ci-20260730.md`、`docs/features/feat-task-spec-test-strategy/`
- 排他資源: `.dev-graph/state/graph.json` は C02 writer だけが更新する
- 並列実行条件: 上記 path と active lease が重複しないこと
- branch: `devgraph/task-slide-report-generator-browser-ci-20260730`
- worktree lease: 本 session の専用 worktree で実行し、共有 main worktree を変更しない
- completion projection: 実装・ローカル証拠は本 branch に記録し、PR merge 後の durable reconciliation は default branch 側が担当する

## GitHub publication

- Mode: `local_only`
- Project aliases: N/A: Beads を tracker 正本とし、GitHub Issue は新設しない
- Issue labels/milestone: N/A: draft PR だけを作成する
- Initial Project fields: N/A: GitHub Projects へ投影しない
- Publication gate: task 本文、仕様反映、品質ゲート、Beads linkage が整合していること
- Failure policy: push または PR 作成が失敗した場合は Beads notes にエラーと再実行コマンドを記録する
- Completion policy: manual。実装と draft PR 作成を本 task の完了とし、merge 後 reconciliation は別ライフサイクルとする
- PR linkage requirement: PR 本文へ `HarnessHub-nznu` と `dev-graph: task-slide-report-generator-browser-ci-20260730` を記載し、base `main` を対象にする
- Closed without merge: 実装証拠は保持し、merge 判断は reviewer に委ねる
- Local reconciliation: draft PR 作成後に Beads notes へ URL と検証結果を追記する

## 実行手順

1. local `main` を `origin/main` へ同期し、本 branch へ merge する。
2. plugin-local Chromium の復元、`npm test`、read-only runtime check を順番に実行する専用 workflow を追加する。
3. workflow 配線の消失を検出する Python 契約テストと、EVALS／README の実態差を補正する。
4. testing-qa の正本を R4-reopen から再確定し、仕様・設計・feature・受領書へ書き戻す。
5. task spec、plugin test、vendor test、repository CI、dev-graph、文書制約を再実行する。
6. 対象差分だけを commit・push し、`main` 向け draft PR を作成する。

## 受入条件

- [x] plugin または workflow の変更で専用 GitHub Actions job が発火する
- [x] clean runner で `build-playwright-runtime.py --install` → `npm test` → `--check` の順に実行する
- [x] `npm test` が plugin-local Chromium 起動、16:9 検査、2 slide screenshot、report self-test を含む
- [x] workflow の配線を Python 契約テストが検査する
- [x] EVALS に `test-verify-slides.js` が明示され、README の script 数が実態と一致する
- [x] 仕様影響を testing-qa の各正本へ反映し、受領書と Beads を更新する
- [x] 変更文書を repository の 300 行上限、その他手書きファイルを 500 行以下に保つ

## 検証方法

- 自動検証: `python3 -m pytest plugins/slide-report-generator/tests -q`
- 自動検証: `cd plugins/slide-report-generator/vendor && npm test`
- 自動検証: `python3 plugins/slide-report-generator/scripts/build-playwright-runtime.py --check`
- 自動検証: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-task-spec-test-strategy`
- 自動検証: `python3 scripts/run-ci-checks.sh`
- 手動検証: `git status`、`git diff --check`、PR の base/head/body を確認する
- 証跡: `docs/features/feat-task-spec-test-strategy/slide-report-browser-ci-spec-reflection-receipt.md`

## リスクとロールバック

- リスク: Chromium download 障害で CI が失敗する
- ロールバック: 専用 workflow と配線テストを同時に revert する。受入試験を skip や warning へ弱めず、外部障害として再実行する
- リスク: cache が古い runtime を正常と誤認する
- ロールバック: cache を削除して install から再実行し、最終 `--check` の version/path 検証を完了条件にする

## Handoff

- 実装 route: capability-build 完了、draft PR review へ引き渡す
- 次に利用するノード: `feat-task-spec-test-strategy`（横断適用記録）と `arch-harness-hub-testing-qa`（CI 到達設計）
