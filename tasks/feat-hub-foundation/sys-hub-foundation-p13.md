---
graph_node_id: "SYS-HUB-FOUNDATION-P13"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-hub-foundation"
domain: "infrastructure"
tags: ["feat-hub-foundation","stage-1","infrastructure","p13"]
priority: null
start_date: null
target_date: null
iteration: null
title: "Hub 基盤 本番リリース・デプロイ"
owners: ["daishiman"]
created_at: "2026-07-19T14:15:47Z"
updated_at: "2026-08-10T00:39:51.388550Z"
status: "closed"
depends_on: ["SYS-HUB-FOUNDATION-P12"]
related_nodes: ["feat-hub-foundation","arch-harness-hub-infrastructure","arch-harness-hub-frontend"]
resource_scope: [".github/workflows/ci.yml","apps/hub/src/middleware/","apps/hub/src/shared/","docs/features/feat-hub-foundation/release-notes.md","packages/estimation/","packages/inspection/","packages/schemas/","packages/ui/"]
purpose: "feat-hub-foundation の P13 を実行する: Hub 基盤 本番リリース・デプロイ"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: [".github/workflows/ci.yml","apps/hub/src/middleware/","apps/hub/src/shared/","docs/features/feat-hub-foundation/release-notes.md","packages/estimation/","packages/inspection/","packages/schemas/","packages/ui/"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["docs/features/feat-hub-foundation/release-notes.md にデプロイ日時・Worker バージョン・本番 URL・/health 初回応答・bundle サイズ最終値が記録されている","現行feature context sha256:938ecf38d145496bba7a439b829d3934718b8f43b4f4628d8ba821594d17062dのscope_in/acceptance全件をP13責務として追跡し、未割当0件である","Hub本体と共通packageを同一release closureで公開し、consumer参照のsmoke evidenceを残す。","Normative closure: acceptanceは4件、quality_constraintsは9件。P05は雛形だけでなく、packages/ui・packages/schemas・packages/inspection・packages/estimation、auth adapter/認可middleware、audit/AiJob/Notification/PII共通adapterの公開contract実体、CI/運用共通境界を単一ownerとして実装する。domain-specific logicはconsumer featureに残す。P04/P06/P07/P09/P10/P11は複数consumer contract testと重複実装detector=0を第4 acceptanceとして実判定する。 Evidence: 全登録共通層のowner/public API/consumer一覧、consumer contract tests、duplicate implementation scan=0、CI/bundle/SLO/healthの4 acceptance証跡を必須とする。"]
architecture_refs: ["arch-harness-hub-infrastructure","arch-harness-hub-frontend"]
parent_feature: "feat-hub-foundation"
feature_package_id: "feature-package/feat-hub-foundation"
phase_ref: "P13"
file_path: "tasks/feat-hub-foundation/sys-hub-foundation-p13.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-hub-foundation/8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:15:47Z","origin_kind":"system-dev-planner","source_digest":"8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502","source_path":".dev-graph/plans/generations/feature-package-feat-hub-foundation/8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502/task-specs/phase-13-release-deploy.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.9
classification_reason: "P12 の runbook に従い wrangler CLI で Hub を Cloudflare Workers 本番環境へデプロイする P13 タスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-hub-foundation/sys-hub-foundation-p13.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-37h.13","linked_at":"2026-07-18T01:45:50Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: [{"base_branch":"main","branch":"devgraph/SYS-HUB-FOUNDATION-P13","head_sha":"f055796a5412a8f1ec9b59e9cb2f589663650ffa","last_seen_at":"2026-07-25T11:07:45.666064Z","lease_acquired_at":"2026-07-25T11:01:35.019032Z","released_at":"2026-07-25T11:07:45.665778Z","state":"released","worktree_id":"wt_34e5e34b31310b4a"}]
completion_evidence: {"completed_at":"2026-07-25T16:06:31Z","evidence_refs":["issues/sys-lint-open-residue-ci-red-20260725.md","docs/features/feat-hub-foundation/ci-local-gate-registry-spec-reflection-receipt.md"],"policy":"manual","reconciled_at":"2026-08-10T00:00:00Z","source":"reconciliation","status":"done"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# Hub 基盤 本番リリース・デプロイ

> task projection (P13 / parent: feat-hub-foundation)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-hub-foundation/8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502`
- task spec: `.dev-graph/plans/generations/feature-package-feat-hub-foundation/8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502/task-specs/phase-13-release-deploy.md`
- package digest: `sha256:8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502`
- task spec SHA-256: `sha256:b9b9a5ef3944b77ddd2eb4324dd8030a71f1f5032f77cfa495f4abefd74de1ff`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-hub-foundation/8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502/dev-graph-registration-receipt.json`

## 依存

- `SYS-HUB-FOUNDATION-P12`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-hub-foundation` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。

## リリース後 security hardening (2026-07-29 / `HarnessHub-bda4`)

- P13 後に判明した Cloudflare token の権限共用を、deploy / rollback 用 `CLOUDFLARE_API_TOKEN` と backup / production smoke 用 `CLOUDFLARE_R2_API_TOKEN` へ分離した。
- repository 内の受入は、Actions secret 台帳と workflow 参照の双方向一致、deploy step と R2 操作 step の相互 token 不参照、task / graph / system-spec の品質ゲート再実行とする。
- Cloudflare での token 発行、GitHub secret 投入、deploy token による R2 write 拒否、R2 token による workflow 完走は外部状態を変更する後続作業として `HarnessHub-bda4` で継続する。実測前に本項を完了証拠へ読み替えない。
- 仕様影響は infrastructure.web の credential 境界にあり、正式な reopen / compile 結果を `system-spec/infrastructure.md` qa-091、詳細を `docs/features/feat-hub-foundation/ci-token-least-privilege-spec-reflection-receipt.md` に記録する。

## 最終 closure (2026-08-02 / `HarnessHub-37h.13`)

- P13 の責務は本番 release / deploy と再実行可能な証跡の確立までとして完了した。
- SLO 30 日観測は独立 follow-up `HarnessHub-37h.15` へ分離済みで、ユーザー判断により `not_applicable` で閉じた。これは SLO PASS ではなく、P13 と feature の delivery closure を阻害しないという受入境界の決定である。
- task 仕様書の再検証は `validate-system-plan.py --feature-package feature-package/feat-hub-foundation` を使い、結果を [feature closeout 仕様反映受領書](../../docs/features/feat-hub-foundation/feature-closeout-spec-reflection-receipt.md) に残す。

## post-release CWV hardening (2026-08-02 / `HarnessHub-9cgb`)

- P13 で確立した G11 定期測定を、実際に認証が必要な `/catalog` へ拡張する。通常の session/access token を CI に複製せず、最大 5 分・固定 tenant/workspace・GET/HEAD catalog read 専用の `CWV_PROBE_*` credential を使う。
- repository 内の実装・secret 台帳・artifact sanitizer・負例テストは本変更で完了する。Worker/GitHub secret 投入、main deploy、初回 Lighthouse 実測は外部状態変更のため `HarnessHub-9cgb` を open のまま追跡する。
- 仕様正本は `system-spec/*` の qa-133、詳細手順と受領書は [CWV probe 仕様反映受領書](../../docs/features/feat-hub-foundation/cwv-probe-credential-spec-reflection-receipt.md) を参照する。

## UI 基盤 wave の公開追補 (2026-08-08)

- 公開単位は `issue-ui-foundation-final-review-20260808`、branch は `devgraph/issue-ui-foundation-final-review-20260808` とする。閉じた exact-13 に 14 個目の task を追加しない。
- draft PR までは 5 Beads と issue node を in_progress / active に維持し、merge 後に default branch reconciliation で閉じる。
- 本追補は UI 基盤と品質ゲートの repository 公開までを扱い、Cloudflare 本番 deploy は行わない。

## 共通シェル wave の公開追補 (2026-08-08 / `HarnessHub-imzk`)

- 公開単位は `issue-hub-shell-page-surface-unification-20260808`、branch は `devgraph/issue-hub-shell-page-surface-unification-20260808` とする。閉じた exact-13 に新しい canonical task は追加しない。
- draft PR merge 前は Beads を `in_progress`、graph node を `active` に維持する。PR gate を登録し、merge 後の default branch reconciliation で閉じる。
- repository 公開までを対象とし、Cloudflare 本番 deploy と VRT baseline の無条件更新は行わない。

## 2026-08-10 MVP follow-up (HarnessHub-2fo1 / HarnessHub-5vlq)

- root layout の theme CSS を `@harness-hub/ui/tokens.css` 静的成果物へ置換（drift 検査付き）。
- G13 に 95% 警告帯を追加。構造的 headroom 残件は HarnessHub-vwxc、navigation VRT 差分は HarnessHub-preq。
- 受領: [mvp-followups-20260810-spec-reflection-receipt.md](../../docs/features/feat-dual-catalog-web/mvp-followups-20260810-spec-reflection-receipt.md)

## 2026-08-11 post-closeout ローカル開発信頼性 (`HarnessHub-bmhq`)

- 閉じた exact-13 に14個目の task は追加せず、P13 後のローカル運用 writeback として記録する。
- absolute local state、launchd + supervisor、loopback bind、health、認証付き sheets smoke、middleware 公開入口一意化を同一 issue で追跡する。
- 公開 API、DB schema、本番 deploy は非変更。task package の再検証と仕様反映は [受領書](../../docs/features/feat-hub-foundation/local-dev-runtime-reliability-spec-reflection-receipt.md) を正とする。
- 仕様ゲートの legacy 不足11件は `set-qa-design-applications` による原文非改変 backfill で0件化し、`--require-complete --require-foundation` を完走した。exact-13 の構造や本 P13 の完了状態は変更しない。
- P13 後 writeback（2026-08-11）: production smoke の cwd 非依存 path と `needs_fix` channel slot 解放検証を追加。状態機械・partial UNIQUE 契約は不変で、task package の 14 個目は作らない。

## 2026-08-12 UI MVP wave (表示名・情報設計・一覧一貫性)

- 公開単位 primary: `issue-ui-identifier-display-name-20260811`（Beads `HarnessHub-62ah`）。関連: `2mu6` / `oanz` / `z45h` / `vaov` / `ck3d` / `5yen`。
- exact-13 に 14 個目の task は追加しない。P13 後の UI 一貫性 writeback として扱う。
- 表示 claim は optional で認可非使用。Project 名解決は `HarnessHub-pwph` 待ち。
- 受領: [ui-mvp-wave-20260812-spec-reflection-receipt.md](../../docs/features/feat-hub-foundation/ui-mvp-wave-20260812-spec-reflection-receipt.md)。
