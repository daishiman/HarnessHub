---
graph_node_id: "issue-ui-vrt-navigation-baseline-drift-20260810"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["vrt","navigation","workspace-switcher","ui-foundation"]
priority: "high"
start_date: "2026-08-10"
target_date: null
iteration: null
title: "navigation VRT の WorkspaceSwitcher 差分を確定する"
owners: ["daishiman"]
created_at: "2026-08-10T11:41:26Z"
updated_at: "2026-08-12T03:37:50Z"
status: "closed"
depends_on: []
related_nodes: ["issue-root-layout-theme-css-long-task-20260808","issue-ui-foundation-final-review-20260808"]
resource_scope: ["apps/hub/tests/browser/catalog/entries-shell.tsx","apps/hub/tests/browser/__vrt__","apps/hub/tests/browser/vrt.ts","packages/ui/src/shell/WorkspaceSwitcher.tsx"]
purpose: "navigation light/darkの赤いVRTを、意図的なfixture追加か視覚退行か判定して解消する。"
goal: "WorkspaceSwitcher追加の意図と表示を確認し、承認済みbaselineまたは実装修正でVRTをfail-closedのまま緑へ戻す。"
scope_in: ["actual/baseline差分確認","WorkspaceSwitcher fixture意図確認","light/dark baseline","navigation VRT再実行"]
scope_out: ["原因確認なしのbaseline更新","VRT閾値の緩和","navigation以外のデザイン変更"]
acceptance: ["高さ197px差の全要素を説明できる","意図的変更ならレビュー済みbaselineを更新する","退行なら実装を修正しbaselineを維持する","browser test 33件が全PASSする"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-testing-qa"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/ui-vrt-navigation-baseline-drift-20260810.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"cf8ad833bc1e74192f7636024fc32e15614884c2ebc70c67ad3fd8baaf5fc138","evaluator":"browser VRT 31 PASS / navigation light・dark 2 FAIL の実測","evidence_ref":"apps/hub/tests/browser/catalog/entries-shell.tsx"}
source_lineage: {"imported_at":"2026-08-10T11:41:26Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "実ブラウザでnavigation light/darkのみが基準より197px高く失敗し、actualにWorkspaceSwitcher追加を確認した。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/ui-vrt-navigation-baseline-drift-20260810.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-preq","linked_at":"2026-08-10T11:48:16Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-10T11:41:26Z","missing_sections":[],"status":"complete"}
---

# navigation VRT の WorkspaceSwitcher 差分を確定する

## 概要

navigationのlight/dark VRTだけが基準より197px高く、actualにはWorkspaceSwitcherが追加されている。意図を確認して正しく解消する。

## 背景と問題

CSS外部化後のbrowser testは31 PASS / 2 FAIL。全体崩壊ではないが、赤いVRTを視覚回帰PASSとは扱えない。

## 現在の挙動

基準1024x1739に対してactual1024x1936。navigation以外はPASSする。

## 期待する挙動

差分の意図が説明され、承認済みbaseline更新または実装修正後に33件全PASSする。

## 再現手順またはユースケース

pnpm --filter @harness-hub/hub run test:browserを実行しnavigation actualとdarwin baselineを比較する。

## 影響と優先度

HarnessHub-2fo1の視覚回帰受入を直接止めるためhigh。

## スコープ

WorkspaceSwitcher fixtureとnavigation baselineを対象とし、原因確認なしの更新はしない。

## 関連グラフ

HarnessHub-2fo1のblocking follow-up。UI foundationの既存baseline契約に従う。

Beads 課題は `HarnessHub-preq`。原因未確定のまま baseline を更新しない。

## 受入条件

- 197px差を説明
- 意図的なら承認済みbaseline更新
- 退行なら実装修正
- browser test 33件全PASS

## 検証証跡

2026-08-10 の再実行でも 31 PASS / 2 FAIL。navigation light/dark は基準 1024x1739、実際 1024x1936。`apps/hub/artifacts/vrt/` の actual/diff画像とbrowser testログを残す。
