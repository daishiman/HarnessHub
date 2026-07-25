---
graph_node_id: "issue-governance-lint-local-entry-20260725"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["follow-up","ci","governance","local-parity"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "governance-check.yml のメタ層 lint (成果物配置・doc 行数) に local 入口が無い"
owners: ["daishiman"]
created_at: "2026-07-25T14:49:37.241305Z"
updated_at: "2026-07-25T15:25:44.708199Z"
status: "draft"
depends_on: []
related_nodes: ["issue-auth-tenancy-ci-wiring-20260725"]
resource_scope: [".github/workflows/governance-check.yml","scripts/"]
purpose: "scripts/lint-artifact-placement.py と scripts/lint-doc-line-limit.py --ratchet-base origin/main は .github/workflows/governance-check.yml にしか結線されておらず、local から呼ぶ手順が明文化されていない。2026-07-25 の PR #63 で change-category-guard が fail し、原因は lint-artifact-placement の docs-frontmatter 規則違反 8 件だったが、local の pnpm verify は exit 0 だったため事前に検出できなかった。docs/shared-layers.md §3 はプロダクト層 (ci.yml) とメタ層 (governance-check.yml) を独立系統と定めており、root の pnpm verify へ直接混ぜるのは境界違反になるため、別入口の設計判断が要る"
goal: "メタ層の配置 lint が、PR を出す前に local で 1 コマンドで確認できる状態"
scope_in: ["メタ層 lint の local 入口の設計 (別 script か手順の明文化か)","プロダクト層 verify との境界を保った結線","判断根拠の docs 記録"]
scope_out: ["lint 自体のルール変更","プロダクト層 verify への直接混入 (境界違反)"]
acceptance: ["メタ層 lint が local から 1 コマンドで実行でき、CI と同一実装であることが記録される","プロダクト層とメタ層の独立が docs 上で維持されていることを確認する"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-governance-lint-local-entry-20260725.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":null,"origin_kind":"manual","source_digest":null,"source_path":"issues/sys-auth-tenancy-ci-wiring-20260725.md","source_plugin":null,"source_version":null}
classification_confidence: 0.9
classification_reason: "issue-auth-tenancy-ci-wiring-20260725 の notes が「併せて評価する」と記した追加検討事項を独立 issue として切り出したもの"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-governance-lint-local-entry-20260725.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-11qt","linked_at":"2026-07-25T14:51:06Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":null,"missing_sections":[],"status":"incomplete"}
---

## 概要

`governance-check.yml` が回すメタ層 lint (`lint-artifact-placement.py` / `lint-doc-line-limit.py`) に
local 入口が無く、PR を出すまで違反に気づけない。
プロダクト層 (`ci.yml`) との独立を保ったまま、local から 1 コマンドで確認できる入口を設計する。

## 背景と問題

`docs/shared-layers.md` §3 は、本リポジトリに **独立した 2 系統の CI** があると定める。

- プロダクト層 … `ci.yml` / `cwv.yml` が `apps/hub`・`packages/*` を検査する。入口は root `pnpm verify`
- メタ層 … `governance-check.yml` が `plugins/*`・`scripts/*`・`docs/*` の配置と規約を検査する。入口は無い

2026-07-25 の PR #63 で `change-category-guard` が fail したが、
原因は `lint-artifact-placement.py` の docs-frontmatter 規則違反 8 件だった。
このとき local の `pnpm verify` は exit 0 で、事前検出できなかった。

単純に root `pnpm verify` へ混ぜると、プロダクト層の検査にメタ層が混入して
上記の層分離が崩れる (shared-layers.md が明示的に禁じている形)。
したがって「別入口を作るか、手順を明文化するか」という **設計判断** が必要で、
機械的な結線では解決しない。

## 現在の挙動

- メタ層 lint は `.github/workflows/governance-check.yml` の step としてのみ存在する
- local から呼ぶ手順はどのドキュメントにも書かれていない
- 2026-07-25 時点の local 実測では両 lint とも exit 0 (現在の tree は違反なし)

## 期待する挙動

- メタ層 lint が local から 1 コマンドで実行でき、CI と同一実装であることが記録される
- プロダクト層とメタ層の独立が docs 上で維持されていることを確認できる

## 再現手順

1. `.github/workflows/governance-check.yml` の lint step を確認する
2. root `package.json` に対応する script が無いことを確認する
3. `pnpm verify` が exit 0 でも `python3 scripts/lint-artifact-placement.py` が落ちうることを確認する

## 影響と優先度

優先度 medium。plugins / docs / scripts を触る PR でのみ顕在化する。
プロダクトコードのみの変更には影響しない。

## スコープ

- **in**: メタ層 lint の local 入口の設計 (別 script か手順の明文化か)、境界を保った結線、判断根拠の docs 記録
- **out**: lint 自体のルール変更、プロダクト層 `verify` への直接混入 (層分離の違反)

## 検討事項

- 案 1: root に `verify:meta` を新設し、`verify` からは呼ばない (層分離を script 名で表現する)
- 案 2: 結線せず `docs/shared-layers.md` に python 起動手順を明記する (入口を増やさない)
- どちらを採るかで「R-18 の local 実行要件がメタ層にも及ぶか」の解釈が変わるため、先に解釈を確定させる

## 関連グラフ

- `issue-auth-tenancy-ci-wiring-20260725` — notes で「併せて評価する」と記した項目を本 issue へ切り出した
