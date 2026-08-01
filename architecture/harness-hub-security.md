---
graph_node_id: "arch-harness-hub-security"
artifact_kind: "architecture"
artifact_subtypes: ["security"]
project_id: "harness-hub"
domain: "security"
tags: ["system-spec-import","security"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "Harness Hub security アーキテクチャ (system-spec 取込)"
owners: ["daishiman"]
created_at: "2026-07-17T00:35:59Z"
updated_at: "2026-08-01T12:29:53Z"
status: "active"
depends_on: ["spec-harness-hub-requirements"]
related_nodes: ["arch-harness-hub-frontend","arch-harness-hub-backend","arch-harness-hub-data","arch-harness-hub-infrastructure","arch-harness-hub-dev-workflow"]
resource_scope: ["architecture/harness-hub-security.md"]
purpose: "deny-by-default (Tenant/Workspace スコープ強制 = D4 row-level-scope)・Auth.js マルチテナント OIDC・Device Flow の正本参照"
goal: "qa-005/qa-006/qa-008/qa-020 の確定要件に適合する認証・認可・分離テストの指針を提供する"
scope_in: ["system-spec/security.md","system-spec/auth.md"]
scope_out: ["正本章の内容複製","未確定章の取込"]
acceptance: ["正本章が confirmed かつ evaluator PASS","source_digest が正本と一致"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "architecture/harness-hub-security.md"
template_id: "architecture"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"5e1ce5ab6e76bd234f47c59f6f91e54c0bb2c682602098cca8598c1c50245575","evaluator":"validate-coverage-matrix.py","evidence_ref":"system-spec/spec-state.json"}
source_lineage: {"imported_at":"2026-08-01T11:54:39Z","origin_kind":"system-spec-harness","source_digest":"5e1ce5ab6e76bd234f47c59f6f91e54c0bb2c682602098cca8598c1c50245575","source_path":"system-spec/security.md","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.95
classification_reason: "system-spec-harness 確定章の R3-import 正規取込 (confirmed + evaluator PASS)"
classification_candidates: [{"artifact_kind":"architecture","candidate_path":"architecture/harness-hub-security.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-07-17T00:35:59Z","missing_sections":[],"status":"complete"}
---



# Harness Hub security アーキテクチャ (system-spec 取込)

> 本 artifact は system-spec 確定章への **参照型 wrapper** (R3-import)。内容は複製せず、正本の変更は source_digest 不一致として検出される。

## 正本 (source of truth)

- [system-spec/security.md](../system-spec/security.md) (sha256: `4c4572235580b8a6…`)
- [system-spec/auth.md](../system-spec/auth.md) (sha256: `ee2467537a90363e…`)

- confirmation: `confirmed` / evaluator: `assign-system-spec-completeness-evaluator` → **PASS** (`system-spec/completeness-report.json`)
- 再取込日時: 2026-07-30T04:40:19Z / plugin: system-spec-harness v0.1.0

## Architecture overview

正本: system-spec/security.md と system-spec/auth.md。認可の単一ミドルウェア集約、secret は環境 binding のみ、OS 資格情報域への token 保存 (qa-008)。doctrine anchor: OWASP ASVS + Secrets Management。

## Context and drivers

正本章 (system-spec/security.md, system-spec/auth.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Goals and non-goals

正本章 (system-spec/security.md, system-spec/auth.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## System context and boundaries

正本章 (system-spec/security.md, system-spec/auth.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Container and component view

正本章 (system-spec/security.md, system-spec/auth.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Cross-cutting contracts

正本章 (system-spec/security.md, system-spec/auth.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Subtype architecture

- subtype: security — 詳細は正本章を参照 (複製しない)

## Architecture decisions

正本章 (system-spec/security.md, system-spec/auth.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

**差分追記 (2026-07-26 / HarnessHub-b7ng)**:

- Auth.js cookie と edge 認可は同じ SessionClaims JWT を使い、callback origin を設定値へ固定する。
- device_code / refresh token の一回性と user_code 失敗計数を CAS で保証する。
- session / access token の署名鍵を別 Secret に分け、binding 更新時は runtime を再構成する。

**差分追記 (2026-07-30 / SYS-AUTH-TENANCY-P13)**:

- credential境界は`Google → 1Password（運用受渡し）→ masked登録処理 →
  idp_connectionsの暗号文 → Worker共通ENCRYPTION_KEK`とする。
- Google client secretをGitHub Secrets、文書、ログ、テナント別Worker Secretへ複製しない。
  Workerは実行時に1Passwordを参照しない。
- sign-inはtenant別CSRF endpointのcookie/token対を同じAuth.js basePathへ送る。
  別slugのtoken混用、取得失敗、空tokenでは外部IdPへ遷移しない。
- 本番対象はGoogle/HarnessHub 1テナントだが、row-level tenant isolationと
  複数テナント回帰試験は製品の防御境界として維持する。
- 正式な確定記録は`system-spec/auth.md`のqa-097と`system-spec/security.md`のqa-098、
  対応証跡は[P13仕様反映受領書](../docs/features/feat-auth-tenancy/p13-spec-reflection-receipt.md)を参照する。

**差分追記 (2026-07-30 / SYS-PUBLISH-PIPELINE-P13)**:

- `Authorization: Bearer` がある要求は access token の署名・期限・tenant/workspace claims を
  edge middleware で fail-closed に検証し、無効 token から Auth.js cookie へ fallback しない。
- route 認可は共有 `withAuthz` に集約し、scope・Project 所有者・credential 種別・token 失効を
  最終判定する。edge と route の二段階は防御の重複ではなく、到達可否と資源操作可否の責務分離である。
- 本番 smoke の結果と rollback 判断は
  [feat-publish-pipeline release record](../docs/features/feat-publish-pipeline/release-record.md) を証跡正本とする。

## Delivery, migration and rollback

正本章 (system-spec/security.md, system-spec/auth.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Risks and verification

正本章 (system-spec/security.md, system-spec/auth.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

**差分追記 (2026-08-01 / `HarnessHub-fnej` / qa-111・qa-115)**:

- 共有 callback へ tenant を運ぶ `state` は HS256、10 分 TTL、token type、
  tenant id/slug、CSRF binding hash を持つ。binding 平文は
  HttpOnly/Secure/SameSite=Lax/`__Host-` cookie にだけ置き、署名・期限・cookie を
  DB lookup より先に検証する。
- PKCE S256 と nonce を維持し、Auth.js が署名・issuer・audience・nonce を検証した
  Google ID token の `hd` を許可 Workspace domain と完全一致させる。
  authorization parameter の `hd` は表示ヒントであり認可境界ではない。
- 共有 secret は Cloudflare Worker の環境 secret 1 件に限定し、tenant DB 行、
  構造化ログ、API response、Git、GitHub Secretsへ複製しない。
- 未知 mode、Google 以外の shared issuer、空 allow-list、片方だけの環境 credential は
  fail-closed とし、顧客方式・共有方式のどちらにも暗黙 fallback しない。
- 詳細は [AD-10](../docs/features/feat-auth-tenancy/architecture-decision-record-shared-google-oidc.md)
  と [仕様反映受領書](../docs/features/feat-auth-tenancy/shared-google-oidc-spec-reflection-receipt.md)
  を参照する。
