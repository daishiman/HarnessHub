---
graph_node_id: "SYS-EMPHASIS-ICONS-P01"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-semantic-emphasis-icons"
domain: "documentation"
tags: ["feat-semantic-emphasis-icons","macro-feature","documentation","phase-p01"]
priority: null
start_date: null
target_date: null
iteration: null
title: "要件ベースライン確定 — 絵文字禁止 semantic token/icon 表現の要件確定"
owners: ["daishiman"]
created_at: "2026-08-13T23:31:45Z"
updated_at: "2026-08-14T11:00:30Z"
status: "closed"
depends_on: []
related_nodes: ["feat-semantic-emphasis-icons","arch-harness-hub-design-system","arch-harness-hub-frontend"]
resource_scope: ["docs/features/feat-semantic-emphasis-icons/requirements-baseline.md"]
purpose: "本 feature の受入可能な要件ベースラインを確定し、P02 以降の全 task が同一の合意事項 (絵文字禁止の対象範囲・既存実装の再利用範囲・quality_constraints 5 件の充足条件) を参照できる状態にする。"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollback を満たし、再実行可能な証跡を残す"
scope_in: ["docs/features/feat-semantic-emphasis-icons/requirements-baseline.md"]
scope_out: ["配色仕様書 v2 そのものの改訂 (architecture/harness-hub-design-system.md の所有)","各画面の情報構造・機能追加 (feat-card-list-shell の担当)","Markdown のカードブロック記法 (feat-card-block-authoring の担当)","公開 API・DB schema・認可判定・Cloudflare deploy unit の変更","実装コードの作成 (本 task は要件確定のみ)"]
acceptance: ["docs/features/feat-semantic-emphasis-icons/requirements-baseline.md に goal-spec.json の purpose/goal/scope_in 5 件/scope_out 4 件/acceptance 5 件が逐語一致で転記されている","quality_constraints 5 件 (emoji-ban-semantic-token-qa232-5 / icon-lint-ci-fail-closed-qa233-6 / icon-ownership-boundary-qa233-3 / design-system-token-and-contrast-gate / state-value-visible-label-qa232-2) が個別の充足条件として書き下されている","既存実装 (packages/ui/src/icons/index.tsx の callout 4 アイコン、packages/ui/src/components/Markdown.tsx の remarkCallouts、packages/ui/src/tokens/tokens.ts の infoBlue/infoBlueSoft) が『すでに存在する部分』として明記され、本 feature の残作業が絵文字 lint 未整備・一覧/カード状態表現の token 監査・可視ラベル併置監査に限定されることが要件として確定している"]
architecture_refs: ["arch-harness-hub-design-system","arch-harness-hub-frontend"]
parent_feature: "feat-semantic-emphasis-icons"
feature_package_id: "feature-package/feat-semantic-emphasis-icons"
phase_ref: "P01"
file_path: "tasks/feat-semantic-emphasis-icons/sys-emphasis-icons-p01.md"
template_id: "task"
template_version: "1.1.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"b10daedf4d24a112c73943e2cecac213a193042aaa0e6e43518a2314a64cfbdf","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-semantic-emphasis-icons/b10daedf4d24a112c73943e2cecac213a193042aaa0e6e43518a2314a64cfbdf/plan-findings.json"}
source_lineage: {"imported_at":"2026-08-13T23:31:45Z","origin_kind":"system-dev-planner","source_digest":"b10daedf4d24a112c73943e2cecac213a193042aaa0e6e43518a2314a64cfbdf","source_path":".dev-graph/plans/generations/feature-package-feat-semantic-emphasis-icons/b10daedf4d24a112c73943e2cecac213a193042aaa0e6e43518a2314a64cfbdf/task-specs/phase-01-requirements.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.9
classification_reason: "goal-spec.json を入力に P01 の単一責務 (documentation) を実行する task"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-semantic-emphasis-icons/sys-emphasis-icons-p01.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-xo7n.1","linked_at":"2026-08-14T03:40:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-08-14T00:20:00Z","missing_sections":[],"status":"complete"}
---

# 要件ベースライン確定 — 絵文字禁止 semantic token/icon 表現の要件確定

> task projection (P01 / parent: feat-semantic-emphasis-icons)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-semantic-emphasis-icons/b10daedf4d24a112c73943e2cecac213a193042aaa0e6e43518a2314a64cfbdf`
- task spec: `.dev-graph/plans/generations/feature-package-feat-semantic-emphasis-icons/b10daedf4d24a112c73943e2cecac213a193042aaa0e6e43518a2314a64cfbdf/task-specs/phase-01-requirements.md`
- package digest: `sha256:b10daedf4d24a112c73943e2cecac213a193042aaa0e6e43518a2314a64cfbdf`
- task spec SHA-256: `sha256:c33d54021771616d2a71f1c6886e20525f47720e8a7b0ce36c3d5e223b6e918c`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-semantic-emphasis-icons/b10daedf4d24a112c73943e2cecac213a193042aaa0e6e43518a2314a64cfbdf/dev-graph-registration-receipt.json`

## 依存

- feature 内依存なし。P01 は parent feature の macro entry gate を実行時に評価する。

## 実行契約

- claim: Beads issue を atomic claim し、並行実行時は worktree lease を取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-semantic-emphasis-icons` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authority と default-branch reconciliation を満たすまで durable done にしない。
- source integrity: task spec SHA-256 または package digest が変わった場合は実行せず、current pointer から再解決する。
