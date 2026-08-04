---
graph_node_id: "SYS-AUTH-TENANCY-P13"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-auth-tenancy"
domain: "operations"
tags: ["feat-auth-tenancy","macro-feature","security","release"]
priority: null
start_date: null
target_date: null
iteration: null
title: "リリース/デプロイ — 本番 OIDC provider 反映と Device Flow スモークテスト"
owners: ["daishiman"]
created_at: "2026-07-19T14:10:09Z"
updated_at: "2026-07-30T10:59:32.786142Z"
status: "done"
depends_on: ["SYS-AUTH-TENANCY-P12"]
related_nodes: ["feat-auth-tenancy","arch-harness-hub-security","arch-harness-hub-backend"]
resource_scope: ["apps/hub/src/app/api/v1/device/","apps/hub/src/app/api/v1/token/","docs/features/feat-auth-tenancy/release-record.md","packages/schemas/auth-tenancy/"]
purpose: "feat-auth-tenancy の P13 を実行する: リリース/デプロイ — 本番 OIDC provider 反映と Device Flow スモークテスト"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["apps/hub/src/app/api/v1/device/","apps/hub/src/app/api/v1/token/","docs/features/feat-auth-tenancy/release-record.md","packages/schemas/auth-tenancy/"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["release-record.md に本番反映内容とスモークテスト結果 (ログイン・role 4 種認可判定・Device Flow E2E・session 緊急失効・dev provider 非存在) が pass として記載され、acceptance 3 項目の本番再確認結果が記録されている","現行feature context sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5のscope_in/acceptance全件をP13責務として追跡し、未割当0件である","Normative closure: 本 package が所有するのは Hub 側 Device Authorization Flow（code/approve/token、短命 access token、refresh rotation/reuse detection、本人・管理者失効）である。OS 資格情報保存は feat-publisher-plugin が所有する consumer 実装であり、auth package は保存 API を実装したと偽らず、token response/rotation/revocation の公開 contract と downstream evidence key を提供する。Device Flow acceptance は Hub E2E（承認→発行→rotation→失効）で判定し、macOS Keychain/Windows Credential Manager は publisher package の E2E evidence を相互参照する。循環依存は作らない。 Evidence: P04/P06 は server-side Device Flow と downstream token contract を別 test ID に分け、P10/P11 は auth 自身の証跡と publisher consumer evidence reference を混同せず記録する。"]
architecture_refs: ["arch-harness-hub-security","arch-harness-hub-backend"]
parent_feature: "feat-auth-tenancy"
feature_package_id: "feature-package/feat-auth-tenancy"
phase_ref: "P13"
file_path: "tasks/feat-auth-tenancy/sys-auth-tenancy-p13.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"98fd3cc31bb17e536f40d38cc09ef8c21116bae295e33adcd2c40df83b977f52","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-auth-tenancy/98fd3cc31bb17e536f40d38cc09ef8c21116bae295e33adcd2c40df83b977f52/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:10:09Z","origin_kind":"system-dev-planner","source_digest":"98fd3cc31bb17e536f40d38cc09ef8c21116bae295e33adcd2c40df83b977f52","source_path":".dev-graph/plans/generations/feature-package-feat-auth-tenancy/98fd3cc31bb17e536f40d38cc09ef8c21116bae295e33adcd2c40df83b977f52/task-specs/phase-13-release-deploy.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.85
classification_reason: "P12 の runbook を前提に、本番テナントの OIDC provider 設定を反映し apps/hub をデプロイして Device Flow E2E を含むスモークテストで疎通確認する P13 リリース/デプロイタスク (required-node)"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-auth-tenancy/sys-auth-tenancy-p13.md","confidence":0.85}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-15h.13","linked_at":"2026-07-18T01:42:04Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: [{"base_branch":"main","closing_reference_verified":true,"head_branch":"devgraph/sys-auth-tenancy-p13-oidc-owner-gate","linked_at":"2026-07-30T10:59:32.781110Z","merge_commit_sha":"bcca528c76fd2c15d4973547542f34df2a352628","merged_at":"2026-07-30T07:17:10Z","pr_number":614,"repo":"daishiman/HarnessHub","state":"merged","url":"https://github.com/daishiman/HarnessHub/pull/614"}]
execution_contexts: []
completion_evidence: {"completed_at":"2026-07-30T07:17:10Z","evidence_refs":["https://github.com/daishiman/HarnessHub/pull/614"],"policy":"linked_pr_merged_all","reconciled_at":"2026-07-30T10:59:32.781983Z","source":"github_pr_merge","status":"done"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# リリース/デプロイ — 本番 OIDC provider 反映と Device Flow スモークテスト

> task projection (P13 / parent: feat-auth-tenancy)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-auth-tenancy/98fd3cc31bb17e536f40d38cc09ef8c21116bae295e33adcd2c40df83b977f52`
- task spec: `.dev-graph/plans/generations/feature-package-feat-auth-tenancy/98fd3cc31bb17e536f40d38cc09ef8c21116bae295e33adcd2c40df83b977f52/task-specs/phase-13-release-deploy.md`
- package digest: `sha256:98fd3cc31bb17e536f40d38cc09ef8c21116bae295e33adcd2c40df83b977f52`
- task spec SHA-256: `sha256:86e6749a1fabc4dd9fa166d347e51392d2c81327fc29d6013a3fa60a7fdb16ff`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-auth-tenancy/98fd3cc31bb17e536f40d38cc09ef8c21116bae295e33adcd2c40df83b977f52/dev-graph-registration-receipt.json`

## 依存

- `SYS-AUTH-TENANCY-P12`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-auth-tenancy` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。

## 2026-07-28〜30 リリース実行・最終レビュー追補

- Beads: `HarnessHub-15h.13` / feature: `HarnessHub-15h`
- `docs/features/feat-auth-tenancy/production-auth-manual-setup.md` に、
  Worker Secret・通常変数・HarnessHub OIDC 接続・確認・rollback を具体化した。
- 2026-07-30 の運用判断により、本番IdPはGoogle、対象はHarnessHub 1テナントだけとする。
  追加テナントや他のIdPの登録・検証はP13の対象外とする。
- Googleの`client_secret`は1Passwordを運用保管・受け渡し元とし、登録時に
  `ENCRYPTION_KEK`で暗号化して本番DBへ保存する。GitHub Secretsやテナント別の
  Cloudflare Worker Secretsには登録しない。
- 初期read-only確認、途中の未投入状態、最終的な本番R1〜R5完了を
  `release-record.md`へ時系列で分離記録した。最新判定は同文書§7を正とする。
- 本番資格情報投入、暗号化DB登録、Worker配信、HarnessHubログイン/JIT、
  Device Flow E2E、refresh再利用検知、session失効は完了した。
- 本変更はrollout境界・credential境界・CSRF flowに仕様影響があるため、
  `system-spec`のauth/security/infrastructureをR4 reopenし、qa-097〜qa-099へ再確定した。
  対応表は`docs/features/feat-auth-tenancy/p13-spec-reflection-receipt.md`を正とする。
- published task specの実装・本番acceptance、PR #614 merge、mainの本番CI完走、
  default-branch C26 reconciliationが完了し、`completion_evidence.status=done`へ収束した。

## 2026-07-29 Google OIDC実行タスク

P13内のGoogle設定は次の順序で実行し、各完了ゲートを満たした場合だけ次へ進む。
正確な入力値、停止条件、公式資料は`runbook-oidc-provider-onboarding.md`を正本とする。

| ID | 作業単位 | 完了ゲート |
| --- | --- | --- |
| G-01 | HarnessHubの入力値・callback確定 | 確定値が実環境と一致 |
| G-02 | 顧客所有Cloud project・Organization・IAM確定 | owner/operator記録済み |
| G-03 | Branding・Audience・連絡先設定 | G-01と保存値が一致 |
| G-04 | identity scope限定 | 3 scopeのみ |
| G-05 | 1Password受取item準備 | secret以外のfield入力済み |
| G-06 | Web OAuth client作成・secret保存 | redirect/client/itemが同一tenant |
| G-07 | tenant単位のGoogle設定検証 | 秘密値を含まない合格記録 |
| G-08 | HarnessHub設定値の最終確認 | project/client/callback/itemの混線0件 |
| G-09 | 暗号化DB登録へ引渡し | 本番手順§7を開始可能 |

## 2026-07-30 完了証跡

- 本番: Google/HarnessHub 1テナント、login/JIT、Workspace所属、role 4種、
  Device Flow、refresh rotation/reuse失効、session緊急失効をR1〜R5で確認。
- 実装: Auth.js MissingCSRFループをtenant別CSRF取得＋native form navigationで修正。
- 秘密管理: 1Passwordは運用受渡し、DBは暗号文、Workerは共通`ENCRYPTION_KEK`。
  GitHub Secretsとテナント別Worker SecretにGoogle client secretを置かない。
- 後続: 共通Google client方式`HarnessHub-fnej`、顧客持ち込み方式`HarnessHub-uk2i`。
  いずれも今回の本番acceptanceを置換せずopenで継続する。
- task状態: PR #614 mergeとC26 reconciliationを根拠に`HarnessHub-15h.13`をclosedへ収束した。

## 2026-07-30 main反映後の追補

- PR #612はmainへmerge済み。`hub-ci` run `30518334455`はDB S1〜S3とcleanupが成功し、
  R2専用`CLOUDFLARE_R2_API_TOKEN`未登録によりS4で失敗した。Worker rollbackは成功した。
- follow-upではmigration前の必須設定preflight、本番OIDC start-flow smoke、
  owner関係roleを含むG14認可契約ゲート、rollback outcome記録を追加する。
- OIDC自動試験はprovider/CSRF/native POST/Google 302/state/nonce/PKCEまでとし、
  人のGoogle資格情報が必要なcallback後のlogin/JITは既存R1手動証跡を正とする。
- 本追補は既存`qa-091` / `qa-097` / `qa-099`とowner認可表の実装接地で、
  仕様・roleモデル・API・DB schemaへの意味変更はない。受領書:
  `docs/features/feat-auth-tenancy/p13-postmerge-auth-gate-spec-receipt.md`。
- Cloudflare account所有者がWorkers Scripts権限なしのaccount-scoped
  `Workers R2 Storage Write` tokenを発行し、GitHub secretへ投入した後、
  `check-actions-secrets.mjs --live`とmainの`hub-ci`完走を最終証跡とする。
- PR #614 merge後のmain `hub-ci` run `30522434412`で全項目が成功し、
  C26により`HarnessHub-15h.13`をclosedへ収束した。
- `HarnessHub-bda4`はbackup workflow所有の`BACKUP_HEARTBEAT_URL`
  （`HarnessHub-fnzl`）が残るため、P13とは分離して`in_progress`を維持する。
