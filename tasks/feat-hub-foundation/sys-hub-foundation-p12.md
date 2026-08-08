---
graph_node_id: "SYS-HUB-FOUNDATION-P12"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-hub-foundation"
domain: "documentation"
tags: ["feat-hub-foundation","stage-1","infrastructure","p12"]
priority: null
start_date: null
target_date: null
iteration: null
title: "Hub 基盤 運用ドキュメント整備"
owners: ["daishiman"]
created_at: "2026-07-19T14:15:47Z"
updated_at: "2026-07-26T01:19:20.811908Z"
status: "closed"
depends_on: ["SYS-HUB-FOUNDATION-P11"]
related_nodes: ["feat-hub-foundation","arch-harness-hub-infrastructure","arch-harness-hub-frontend"]
resource_scope: ["docs/features/feat-hub-foundation/runbook.md","README.md"]
purpose: "feat-hub-foundation の P12 を実行する: Hub 基盤 運用ドキュメント整備"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["docs/features/feat-hub-foundation/runbook.md","README.md"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["docs/features/feat-hub-foundation/runbook.md にデプロイ・ロールバック・障害対応・エラーバジェット運用・restore drill の 5 手順が記載されている","現行feature context sha256:938ecf38d145496bba7a439b829d3934718b8f43b4f4628d8ba821594d17062dのscope_in/acceptance全件をP12責務として追跡し、未割当0件である","共通層の変更管理、consumer再テスト、owner境界をrunbook/handoverへ含める。","Normative closure: acceptanceは4件、quality_constraintsは9件。P05は雛形だけでなく、packages/ui・packages/schemas・packages/inspection・packages/estimation、auth adapter/認可middleware、audit/AiJob/Notification/PII共通adapterの公開contract実体、CI/運用共通境界を単一ownerとして実装する。domain-specific logicはconsumer featureに残す。P04/P06/P07/P09/P10/P11は複数consumer contract testと重複実装detector=0を第4 acceptanceとして実判定する。 Evidence: 全登録共通層のowner/public API/consumer一覧、consumer contract tests、duplicate implementation scan=0、CI/bundle/SLO/healthの4 acceptance証跡を必須とする。"]
architecture_refs: ["arch-harness-hub-infrastructure","arch-harness-hub-frontend"]
parent_feature: "feat-hub-foundation"
feature_package_id: "feature-package/feat-hub-foundation"
phase_ref: "P12"
file_path: "tasks/feat-hub-foundation/sys-hub-foundation-p12.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-hub-foundation/8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:15:47Z","origin_kind":"system-dev-planner","source_digest":"8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502","source_path":".dev-graph/plans/generations/feature-package-feat-hub-foundation/8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502/task-specs/phase-12-documentation-operations.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.87
classification_reason: "P13 の本番デプロイに先立ち運用 runbook と利用者向けドキュメントを整備する P12 タスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-hub-foundation/sys-hub-foundation-p12.md","confidence":0.87}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-37h.12","linked_at":"2026-07-18T01:45:48Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-07-24T21:01:55Z","evidence_refs":["issues/sys-lint-open-residue-ci-red-20260725.md"],"policy":"manual","reconciled_at":"2026-07-26T01:19:20.811908Z","source":"reconciliation","status":"done"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# Hub 基盤 運用ドキュメント整備

> task projection (P12 / parent: feat-hub-foundation)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-hub-foundation/8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502`
- task spec: `.dev-graph/plans/generations/feature-package-feat-hub-foundation/8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502/task-specs/phase-12-documentation-operations.md`
- package digest: `sha256:8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502`
- task spec SHA-256: `sha256:68c1e1b4772d29c0ee1fbb8b58751a4eb6024560e1919b8bc0338beb0039c52f`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-hub-foundation/8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502/dev-graph-registration-receipt.json`

## 依存

- `SYS-HUB-FOUNDATION-P11`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-hub-foundation` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。

## 追補実行記録 (2026-07-26)

- foundation runbook の GitHub Actions 設定一覧は `scripts/ci/actions-secrets-registry.json` への案内と投入コマンドだけを保持し、現在の投入状態は `node scripts/ci/check-actions-secrets.mjs --live` で判定する。
- `HUB_HEALTH_URL` / `HUB_PUBLIC_URL` は variable、Turso / Cloudflare の認証値は secret として区別する。旧 backup 専用の `TURSO_API_TOKEN` / `TURSO_DATABASE_NAME` は landing 後の削除待ちとして扱う。
- 新 backup / deploy の remote 実走が終わるまでは `HarnessHub-fnzl` を blocked のまま維持する（2026-08-01 に両方の成功 run が揃い、同課題は closed）。

## 追補実行記録 (2026-07-28 / `HarnessHub-vns9`)

- 上記「landing 後の削除待ち」だった `TURSO_API_TOKEN` / `TURSO_DATABASE_NAME` は削除済み。`node scripts/ci/check-actions-secrets.mjs --live` が exit 0 (台帳 9 件 = workflow 参照 9 件) になり、投入状態と台帳の乖離は解消した。
- deploy の remote 実走は run `30143422049` で完走済み。**backup の remote 実走だけが未達**で、原因は secret ではなく `backup.yml` の採否判定にあった (データ行 0 を不採用にしており、稼働直後で全 19 テーブル 0 行の本番 DB を 3 夜連続で落としていた)。
- 是正として採否判定を `packages/db/scripts/verify-export-artifact.ts` へ一本化した。設計境界は [architecture/harness-hub-infrastructure.md](../../architecture/harness-hub-infrastructure.md)、検査内容の詳細正本は [docs/infrastructure-spec.md](../../docs/infrastructure-spec.md) §7 / §10。
- 3 夜連続の失敗が無音だった観測側の欠落 (`BACKUP_HEARTBEAT_URL` 未投入) は本 task の責務外として `HarnessHub-dbx6` へ分離した。2026-07-29 に同 issue でローカル実装と qa-094 の仕様反映まで完了し、2026-08-01 に外部適用・main 実走・ping 受理まで完了した。

## 追補実行記録 (2026-07-29 / `HarnessHub-dbx6`)

- Worker cron と backup の heartbeat を分離し、backup 専用 `hub-backup-daily` (`period=86400` / `grace=3600`) を設定正本へ追加した。
- `BACKUP_HEARTBEAT_URL` を required へ昇格し、workflow は未投入を fail-closed で拒否する。heartbeat は全 backup step 成功後だけ送る。
- Better Stack の backup 資源だけを扱う `--only-backup-heartbeat --put-github-secret` を追加し、別 task の paused health monitor / Worker heartbeat / status page / SLO dashboard を変更しない境界を回帰テストで固定した。
- 外部適用、GitHub secret 投入、main の成功 run、着信実測は本 branch の landing 後に行うため、この時点では `HarnessHub-dbx6` を `in_progress` とした。

## 追補実行記録 (2026-08-01 / `HarnessHub-fnzl`・`HarnessHub-dbx6`)

- backup 専用 heartbeat `477775` を外部適用し、Worker cron 用 `475650` との資源・secret 分離を維持した。
- `BACKUP_HEARTBEAT_URL` 投入後、Actions 台帳 live gate は 13/13 一致で exit 0。main の `hub-backup` run `30686023662` は export 19 テーブル / 64 行、R2 往復一致、heartbeat ping まで success した。
- run と独立に R2 成果物を再取得し、`verify-export-artifact.ts` で同じ 19 テーブル / 64 行を検証した。`HarnessHub-fnzl` は 6/6、`HarnessHub-dbx6` は 4/4 の受入条件を満たして closed。
- qa-094 の責務分離・fail-closed・検知時間契約は不変で、今回の追補は実現証跡と状態収束のみである。

## UI 基盤の文書・仕様反映追補 (2026-08-08)

- `HarnessHub-tiqw` / `snlo` / `xuhj` / `xaa3` / `4a2z` の AppShell、画面状態、実ブラウザ、VRT、responsive 実装を post-closeout follow-up として文書化した。
- `frontend.web` / `ui-ux.web` / `testing-qa.web` は正規 transition writer で qa-201 / qa-203 / qa-204 へ再確定し、specs / architecture / feature / docs へ同じ境界を反映した。
- 正本追補は [UI 基盤仕様](../../specs/harness-hub-ui-foundation-addendum.md)、判断・検証・残課題は [仕様反映受領書](../../docs/features/feat-hub-foundation/ui-foundation-spec-reflection-receipt.md) を参照する。

## 共通シェル・全ページ表面の文書追補 (2026-08-08 / `HarnessHub-imzk`)

- `frontend.web` / `ui-ux.web` を正規 transition writer で qa-205 / qa-206 へ再確定し、HubShell、role-aware navigation、page surface、overlay contract を system-spec / specs / architecture / features / docs へ反映した。
- 旧 PrimaryNav の到達性契約は HubShell と `nav-items.ts` へ移管した。運用時の一次切り分けは post-signin runbook、実装者向けの使い分けは `docs/frontend-ui-foundation-spec.md` を正とする。
- 仕様影響・品質ゲート・Beads / PR の受領証跡は [共通シェル仕様反映受領書](../../docs/features/feat-hub-foundation/hub-shell-page-surface-spec-reflection-receipt.md) に集約する。
