---
graph_node_id: "issue-icon-ownership-boundary-lint-20260814"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "ui-ux"
tags: ["design-system","iconography","lint","ci","follow-up"]
priority: "medium"
start_date: "2026-08-14"
target_date: null
iteration: null
title: "所有境界 lint: apps/hub 側の inline SVG アイコン再実装を検出する"
owners: ["daishiman"]
created_at: "2026-08-14T11:30:00Z"
updated_at: "2026-08-14T12:54:30.297011Z"
status: "active"
depends_on: []
related_nodes: ["feat-semantic-emphasis-icons"]
resource_scope: ["scripts/lint","apps/hub/src",".github/workflows/ci.yml"]
purpose: "アイコンの供給元を packages/ui/src/icons に限る所有境界を、実測ではなく CI ゲートで守らせる"
goal: "apps/hub 側での inline SVG によるアイコン再実装が CI で検出され落ちる状態にする"
scope_in: ["apps/hub/src の <svg> リテラル検出","lucide / react-icons / heroicons / @tabler/icons の import 検出","static-gates への結線","検出ロジック自体のテスト (G17 / G19 と同形の二重化)"]
scope_out: ["packages/ui 側の SVG 定義の制限","アイコン意匠そのものの変更"]
acceptance: ["apps/hub/src へ inline SVG を置いた変更で CI が落ちる","アイコンライブラリを package.json へ足した変更で CI が落ちる","lint 自身の判定能力喪失を検出するテストがある"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/icon-ownership-boundary-lint-20260814.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"b10daedf4d24a112c73943e2cecac213a193042aaa0e6e43518a2314a64cfbdf","evaluator":"feat-semantic-emphasis-icons P09/P10 の品質ゲート確認で検出","evidence_ref":"docs/features/feat-semantic-emphasis-icons/quality-gate-report.md"}
source_lineage: {"imported_at":"2026-08-14T11:30:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.98
classification_reason: "G17 の check-ui-hardcoding は色やサイズなど視覚値を見るもので SVG の実装元を見ないため、所有境界の退行がどのゲートにも掛からない"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/icon-ownership-boundary-lint-20260814.md","confidence":0.98}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-pbrl","linked_at":"2026-08-14T12:30:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-14T11:30:00Z","missing_sections":[],"status":"complete"}
---

# 所有境界 lint: apps/hub 側の inline SVG アイコン再実装を検出する

## 背景

`feat-semantic-emphasis-icons` の P09 / P10 で、アイコンの供給元を `packages/ui/src/icons` に限る
所有境界が**実測では成立している**ことを確認した。

| 検査 | 結果 (2026-08-14) |
| --- | --- |
| `apps/hub/src` 内の `<svg` | 0 件 |
| アイコンライブラリ依存 | 0 件 |
| `iconNames` の定義箇所 | 1 箇所 |

しかし**これを守らせる CI ゲートは存在しない**。G17 (`check-ui-hardcoding`) は色・サイズなどの
視覚値を検査するもので、SVG の実装元は見ない。画面側で inline SVG を書き直す退行は
現状どのゲートにも掛からず、レビューでの目視だけが防御になっている。

## やること

- `apps/hub/src` の `<svg` リテラルと、`lucide` / `react-icons` / `heroicons` / `@tabler/icons` の
  import・依存を禁止する lint を追加する
- CI の `static-gates` へ結線する
- 検出ロジック自体のテストを先に走らせる二重化を入れる (G17 / G19 と同じ形)。
  判定が空になったときに「違反 0 件」として緑で素通りする無音の失効を塞ぐため

## 出所

`docs/features/feat-semantic-emphasis-icons/quality-gate-report.md` §4-1、
`final-review.md` §4.2-1、`runbook.md` §4.4
