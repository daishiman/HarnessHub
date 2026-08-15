---
graph_node_id: "SYS-EMPHASIS-ICONS-P07"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-semantic-emphasis-icons"
domain: "documentation"
tags: ["feat-semantic-emphasis-icons","macro-feature","documentation","phase-p07"]
priority: null
start_date: null
target_date: null
iteration: null
title: "受入 — goal-spec acceptance 5 項目の確認"
owners: ["daishiman"]
created_at: "2026-08-13T23:31:45Z"
updated_at: "2026-08-14T11:04:51Z"
status: "closed"
depends_on: ["SYS-EMPHASIS-ICONS-P06"]
related_nodes: ["feat-semantic-emphasis-icons","arch-harness-hub-design-system","arch-harness-hub-frontend"]
resource_scope: ["docs/features/feat-semantic-emphasis-icons/acceptance-review.md"]
purpose: "goal-spec.json の acceptance 5 項目それぞれについて、P01〜P06 の成果物とテスト結果を根拠に充足を確認する。"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollback を満たし、再実行可能な証跡を残す"
scope_in: ["docs/features/feat-semantic-emphasis-icons/acceptance-review.md"]
scope_out: ["配色仕様書 v2 そのものの改訂 (architecture/harness-hub-design-system.md の所有)","各画面の情報構造・機能追加 (feat-card-list-shell の担当)","Markdown のカードブロック記法 (feat-card-block-authoring の担当)","公開 API・DB schema・認可判定・Cloudflare deploy unit の変更","実装コードの修正 (不合格の場合は P05/P06 へ差し戻す)"]
acceptance: ["goal-spec.json の acceptance 5 項目それぞれについて、充足の根拠 (対応する実装ファイル・テスト結果) が acceptance-review.md に個別に記録されている","5 項目全てが充足と判定され、未充足の項目がある場合はその項目が明示され P05/P06 への差し戻しが記録されている"]
architecture_refs: ["arch-harness-hub-design-system","arch-harness-hub-frontend"]
parent_feature: "feat-semantic-emphasis-icons"
feature_package_id: "feature-package/feat-semantic-emphasis-icons"
phase_ref: "P07"
file_path: "tasks/feat-semantic-emphasis-icons/sys-emphasis-icons-p07.md"
template_id: "task"
template_version: "1.1.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"b10daedf4d24a112c73943e2cecac213a193042aaa0e6e43518a2314a64cfbdf","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-semantic-emphasis-icons/b10daedf4d24a112c73943e2cecac213a193042aaa0e6e43518a2314a64cfbdf/plan-findings.json"}
source_lineage: {"imported_at":"2026-08-13T23:31:45Z","origin_kind":"system-dev-planner","source_digest":"b10daedf4d24a112c73943e2cecac213a193042aaa0e6e43518a2314a64cfbdf","source_path":".dev-graph/plans/generations/feature-package-feat-semantic-emphasis-icons/b10daedf4d24a112c73943e2cecac213a193042aaa0e6e43518a2314a64cfbdf/task-specs/phase-07-acceptance.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.9
classification_reason: "goal-spec.json を入力に P07 の単一責務 (documentation) を実行する task"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-semantic-emphasis-icons/sys-emphasis-icons-p07.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-xo7n.7","linked_at":"2026-08-14T03:40:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-08-14T00:20:00Z","missing_sections":[],"status":"complete"}
---

# 受入 — goal-spec acceptance 5 項目の確認

> task projection (P07 / parent: feat-semantic-emphasis-icons)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-semantic-emphasis-icons/b10daedf4d24a112c73943e2cecac213a193042aaa0e6e43518a2314a64cfbdf`
- task spec: `.dev-graph/plans/generations/feature-package-feat-semantic-emphasis-icons/b10daedf4d24a112c73943e2cecac213a193042aaa0e6e43518a2314a64cfbdf/task-specs/phase-07-acceptance.md`
- package digest: `sha256:b10daedf4d24a112c73943e2cecac213a193042aaa0e6e43518a2314a64cfbdf`
- task spec SHA-256: `sha256:fc0d4ce8c7498537ee7213b5cff42558a9ee5ae2594fea5687abce6de59d01cc`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-semantic-emphasis-icons/b10daedf4d24a112c73943e2cecac213a193042aaa0e6e43518a2314a64cfbdf/dev-graph-registration-receipt.json`

## 依存

- SYS-EMPHASIS-ICONS-P06

## 実行契約

- claim: Beads issue を atomic claim し、並行実行時は worktree lease を取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-semantic-emphasis-icons` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authority と default-branch reconciliation を満たすまで durable done にしない。
- source integrity: task spec SHA-256 または package digest が変わった場合は実行せず、current pointer から再解決する。
