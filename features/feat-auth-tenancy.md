---
graph_node_id: "feat-auth-tenancy"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "harness-hub"
domain: "security"
tags: ["macro-feature","stage-1","security"]
priority: "high"
start_date: null
target_date: null
iteration: "Stage 1"
title: "認証・マルチテナント基盤 (Auth.js OIDC + row-level scope + Device Flow)"
owners: ["daishiman"]
created_at: "2026-07-17T00:38:30Z"
updated_at: "2026-08-15T00:00:00Z"
status: "closed"
depends_on: ["feat-hub-foundation","feat-domain-model-db"]
related_nodes: ["issue-production-tenant-bootstrap-readiness-20260814","task-production-tenant-bootstrap-handoff-20260815"]
resource_scope: ["features/feat-auth-tenancy.md"]
purpose: "テナント別 OIDC (Auth.js) と role 4 種、全 API への Tenant/Workspace スコープ強制 (D4 row-level-scope)、Publisher 向け OAuth Device Flow を確立する"
goal: "2 テナント同時稼働で認可の越境が分離テストにより 0 件と証明され、Device Flow で token 取得・失効が動作する状態"
scope_in: ["Auth.js マルチテナント OIDC 動的解決","role: provider-admin/workspace-admin/owner/member","認可の単一ミドルウェア集約","OAuth Device Flow + token 失効導線","テナント分離テスト"]
scope_out: ["承認キュー (Stage 2)","監査 UI (Stage 2)"]
acceptance: ["テナント越境アクセスが分離テストで 0 件","Device Flow の E2E (承認→token→失効) が成功する","Auth.js 依存が adapter 境界に隔離されている (D3 caveat)"]
architecture_refs: ["arch-harness-hub-security","arch-harness-hub-backend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-auth-tenancy.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"98fd3cc31bb17e536f40d38cc09ef8c21116bae295e33adcd2c40df83b977f52","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-auth-tenancy/98fd3cc31bb17e536f40d38cc09ef8c21116bae295e33adcd2c40df83b977f52/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-18T22:35:48Z","origin_kind":"generated","source_digest":"7e1a6753bec43aa5e758f148039c1af71517142bb6e039dc8b1de20638018d77","source_path":"specs/harness-hub-system-specification.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.9
classification_reason: "C14 マクロ分解 (確定 system-spec の Stage 0-2 スコープから導出)"
classification_candidates: [{"artifact_kind":"feature","candidate_path":"features/feat-auth-tenancy.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-15h","linked_at":"2026-07-18T01:41:49Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# 認証・マルチテナント基盤 (Auth.js OIDC + row-level scope + Device Flow)

> Stage 1 / macro feature (C14)。1 feature = 13 task への細分解は system-dev-planner (`/dev-graph plan`) が行う。

## 目的

テナント別 OIDC (Auth.js) と role 4 種、全 API への Tenant/Workspace スコープ強制 (D4 row-level-scope)、Publisher 向け OAuth Device Flow を確立する

## 到達状態

2 テナント同時稼働で認可の越境が分離テストにより 0 件と証明され、Device Flow で token 取得・失効が動作する状態

## スコープ

**対象 (in):**

- Auth.js マルチテナント OIDC 動的解決
- role: provider-admin/workspace-admin/owner/member
- 認可の単一ミドルウェア集約
- OAuth Device Flow + token 失効導線
- テナント分離テスト

**対象外 (out):**

- 承認キュー (Stage 2)
- 監査 UI (Stage 2)

## 受入

- テナント越境アクセスが分離テストで 0 件
- Device Flow の E2E (承認→token→失効) が成功する
- Auth.js 依存が adapter 境界に隔離されている (D3 caveat)

## 実装反映 (2026-07-26 / HarnessHub-b7ng)

- 501 placeholder を実 Auth.js route へ置換し、テナント別 OIDC 設定と SessionClaims JWT を橋渡しした。
- AuthPorts を `packages/db` へ結線し、Device Flow / refresh rotation / revocation を永続化した。
- token の一回性、同時失敗 5 回、別 tenant の同一 Workspace 所属 ID を実 DB の並行テストで確認した。
- 未認証 POST を stream のまま処理し、Workers の要求間では DB write の Promise 待ち行列を共有しない。
- 詳細は [仕様反映受領書](../docs/features/feat-auth-tenancy/spec-reflection-receipt.md) と [最終レビュー記録](../docs/features/feat-auth-tenancy/final-review-record.md) を参照する。

## 実装反映 (2026-07-27 / HarnessHub-v22l)

- refresh rotation の CAS（compare-and-swap＝比較して一致した場合だけ更新する
  排他制御）敗北、すなわち同時提示された refresh token のうち勝者以外の枝を、
  監査 action `token.refresh_race` として記録するようにした。
- `token.reuse_detected`（失効済み token の再提示という確定的な窃取シグナル）
  とは意味を分け、昇格・合流させない。
- 外部契約（`invalid_grant` 応答）と DB schema は無変更で、内部観測性のみを
  追加した。仕様反映は不要と判断した（判断理由は
  [仕様反映受領書 §9](../docs/features/feat-auth-tenancy/spec-reflection-receipt.md)
  を参照）。
- 詳細は [runbook §2.5.1](../docs/features/feat-auth-tenancy/runbook.md) を参照する。

## 実装反映 (2026-07-28 / リリース前レビュー)

- テナント別サインイン画面を、確定済みの Auth.js path
  `/api/auth/{tenant_slug}/signin/tenant-oidc` へ接続した。
- `AUTH_DEVICE_VERIFICATION_URI` の現行配備先 `/device` に、
  確認コード入力・Workspace 選択・状態別エラー表示を持つ承認画面を追加した。
- `/device` の表示時にも session 緊急失効を確認し、承認 API は既存の
  `withAuthz` による認証・認可を維持する。
- この時点では API・DB・role・数値・信頼境界の新しい仕様判断はなく、既存契約への実装接地と
  判定した。判断根拠と検証は
  [仕様反映受領書 §10](../docs/features/feat-auth-tenancy/spec-reflection-receipt.md)
  を参照する。
- この時点では本番設定・OIDC 登録・デプロイ・スモークは未実施だった。後続結果は次節を正とする。

## 実装反映 (2026-08-15 / HarnessHub-s8oe)

- 本番の最初の tenant / workspace / workspace-admin は画面経路が無い。
  `packages/db` の bootstrap-tenant CLI を唯一の投入口とした。
- 既存 name / plan は上書きしない。監査失敗時は role / 所属を残さない。
- 確定済みの role 語彙と JIT `member` 固定は維持する。詳細は
  [bootstrap runbook](../docs/features/feat-auth-tenancy/production-tenant-bootstrap-runbook.md) と
  [仕様反映受領書](../docs/features/feat-auth-tenancy/s8oe-spec-reflection-receipt.md)。

## 実装・本番反映 (2026-07-30 / SYS-AUTH-TENANCY-P13)

- 現行 production rollout は Google OIDC と HarnessHub (`tenant_slug=harness-hub`)
  1テナントへ限定した。製品の複数テナント分離契約と回帰試験は維持する。
- Google OAuth client secret は1Passwordを運用上の受渡し元とし、repository経由で
  `idp_connections.client_secret_enc`へ暗号化した。Workerは共通`ENCRYPTION_KEK`で復号し、
  GitHub Secretsやテナント別Worker Secretには保存しない。
- サインイン画面はtenant別CSRF endpointからcookie/tokenを揃えた後、native form navigationで
  Auth.jsとGoogleへ遷移する。取得失敗時は外部送信せず再試行可能なエラーを表示する。
- 本番でlogin/JIT、role 4種、Device Flow、refresh再利用検知、session緊急失効までR1〜R5を完了した。
- 仕様正本は`system-spec`の`qa-097`〜`qa-099`へR4 reopen経由で反映した。設計・検証の対応は
  [P13仕様反映受領書](../docs/features/feat-auth-tenancy/p13-spec-reflection-receipt.md)を参照する。
- 本変更のdraft PRがdefault branchへmergeされるまでは、task completion policyによりP13を
  `in_progress`のまま維持する。

## main反映後のrelease gate追補 (2026-07-30)

- PR #612はmainへmerge済み。mainの自動deployはDB検査S1〜S3を通過後、
  GitHub repositoryにR2専用tokenが未登録だったためS4で失敗し、自動rollbackは成功した。
- 同じ欠落を本番変更前に止めるdeploy preflightと、tenant/CSRF/Google
  state・nonce・PKCEを確認するOIDC start-flow smokeを追加した。
- 既存のowner関係role、非owner拒否、cross-tenant拒否をOIDC契約と一緒に
  G14の名前付きrelease gateとして再実行する。
- 製品仕様やroleモデルは変更せず、`qa-091` / `qa-097` / `qa-099`の実装接地である。
  判断理由は
  [post-merge仕様影響受領書](../docs/features/feat-auth-tenancy/p13-postmerge-auth-gate-spec-receipt.md)
  を正とする。
- Cloudflare所有者による最小権限R2 token発行、GitHub secret投入、main run完走までは
  `HarnessHub-15h.13` / `HarnessHub-bda4`を`in_progress`で維持する。

## アーキテクチャ参照

- [arch-harness-hub-security](../architecture/harness-hub-security.md)
- [arch-harness-hub-backend](../architecture/harness-hub-backend.md)

- 要件正本: [spec-harness-hub-requirements](../specs/harness-hub-system-specification.md)

## 機能間依存

- feat-hub-foundation
- feat-domain-model-db

## Handoff

- 次工程: `/dev-graph plan --feature-id <本 feature id> --feature-context features/<id>.context.json` (exact-13 task 仕様化)
- 昇格条件: confirmation_status=confirmed + evaluation_status=pass + implementation_readiness=complete で起票対象になる

## 実装反映 (2026-08-01 / HarnessHub-fnej)

- Google OAuth client を tenant ごとに作る従来方式へ、環境単位の共有 client と
  固定 callback 1 本を使う `shared_google` mode を追加した。
- tenant context は署名付き `state` と binding cookie で共通 callback に束縛し、
  Auth.js の PKCE・nonce・ID token 署名検証を維持した。
- Google ID token の `hd` を許可 Workspace domain と完全一致させ、個人 Google、
  別 Workspace、tenant 差し替えを JIT/session 発行前に拒否する。
- 共有 secret は Worker 環境に 1 組だけ置き、tenant DB 行へ複製しない。
  既存 `customer_google` の callback・暗号化 secret・session は回帰試験で維持する。
- schema、migration、rollout/rollback、AD-10、実 Auth.js 往復試験を追加した。
  仕様正本は `qa-110`〜`qa-115`、対応表は
  [共有 Google OIDC 仕様反映受領書](../docs/features/feat-auth-tenancy/shared-google-oidc-spec-reflection-receipt.md)
  を参照する。
- draft PR の merge と default branch reconciliation までは
  `HarnessHub-fnej` と dev-graph node を `in_progress` のまま維持する。

## 実装反映 (2026-08-02 / HarnessHub-uk2i)

- 顧客が所有する Google OAuth client を `provider-admin` が `/settings/auth` から登録し、
  テスト、有効化、rotation、取消、無効化、再開できる管理面を追加した。
- 接続は `pending / tested / active / disabled` で管理し、`active` 以外はログイン解決に使わない。
  disabled の再開は新 credential の登録からやり直し、古い secret を未検証で戻さない。
- 既存 Google 行へ staging 列を追加し、client ID・暗号化 secret・方式・許可 Workspace
  ドメインを CAS で同時昇格する。切替前と取消後は現行ログインを継続する。
- 管理 API は provider-admin、同一 origin、tenant scope、Google issuer に閉じる。
  secret 全値は UI/API/監査/ログ/エラーへ返さず last4 のみ表示する。
- 正本は system-spec `qa-124`〜`qa-130`、手順は
  [顧客持ち込み Google OIDC runbook](../docs/features/feat-auth-tenancy/runbook-customer-managed-google-oidc.md)、
  対応表は
  [仕様反映受領書](../docs/features/feat-auth-tenancy/customer-managed-google-oidc-spec-reflection-receipt.md)
  を参照する。
- PR #634 は `main` へマージ済みで、default branch（標準の取り込み先ブランチ）との再照合も完了した。Google 実環境 login、Playwright、production migration は外部環境が必要な未完了項目のため、`HarnessHub-uk2i` は `in_progress` を維持する。

## session cookie 所属数上限の実測固定 (2026-08-12 / `HarnessHub-alyy`)

- `workspace_ids` 焼き込み方式のまま、Set-Cookie 4096-byte 保守的送出境界を unit test で固定した。
- 実測: 所属 95 件 (4085 バイト) が境界。96 件超は serializer が throw せず返す（browser 破棄は本 test 外）。
- 方式変更（都度 DB / server store / cookie 分割 等）は後続 `HarnessHub-oewu`。本変更は契約変更ではなく測定の固定。
- 証跡: `apps/hub/tests/auth-tenancy/session-cookie-ceiling.test.ts`、issue `issue-session-cookie-workspace-ids-ceiling-20260812`。
