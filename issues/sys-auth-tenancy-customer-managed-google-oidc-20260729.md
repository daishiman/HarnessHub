---
graph_node_id: "issue-auth-tenancy-customer-managed-google-oidc-20260729"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "security"
tags: ["follow-up","auth-tenancy","google-oidc","byo-credential","admin-ui"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "顧客持ち込みGoogle OAuthクライアントの管理機能を実装する"
owners: ["daishiman"]
created_at: "2026-07-28T23:10:15Z"
updated_at: "2026-07-28T23:16:51.876731Z"
status: "active"
depends_on: ["issue-auth-tenancy-shared-google-oidc-20260729"]
related_nodes: ["feat-auth-tenancy","arch-harness-hub-security","arch-harness-hub-backend"]
resource_scope: ["apps/hub/src/app/","apps/hub/src/lib/auth/","apps/hub/src/lib/authz/","packages/schemas/auth-tenancy/","packages/db/repository/idp.ts","packages/db/schema/core/identity.ts","packages/db/migrations/","docs/features/feat-auth-tenancy/"]
purpose: "顧客が所有するGoogle OAuth clientを、Google側作成後にHarnessHubの管理画面から安全に登録・検証・ローテーション・無効化できるようにする"
goal: "共通方式を利用できない顧客でも、credentialをメール・GitHub・手動SQLへ露出させず、provider-adminが監査可能な手順で顧客所有Google SSOを運用できる"
scope_in: ["provider-admin専用のGoogle OIDC接続管理UI/APIを追加する","tenant固有callbackとGoogle Cloud手動設定値を画面に表示する","client IDとclient secretをマスク入力し、secretを封筒暗号化して保存する","登録前検証、接続テスト、段階的secretローテーション、無効化、mode切替を監査event付きで実装する","レスポンスにはsecretを返さず、識別用last4・作成時刻・状態だけを返す","tenant分離、role認可、CSRF、secret非露出、rollbackのテストを追加する"]
scope_out: ["Google OAuth clientをGoogle Cloudへ自動作成・変更・削除する機能","Google以外のIdP対応","client secretをGitHub Secretsまたはtenant別Cloudflare Worker Secretへ保存すること","失敗時に顧客方式から共通方式へ暗黙fallbackすること","現在進行中のP13手動投入を待たせること"]
acceptance: ["provider-adminだけが対象tenantの顧客Google credentialを登録・更新・無効化でき、全変更に監査eventが残る","管理画面とAPIがclient secret全値を保存後に返さず、ログ・エラー・監査にはlast4以外が出ない","client secretがENCRYPTION_KEKを使って暗号化保存され、直接SQLとGitHub Secretsを使用しない","新secret登録、接続テスト、新secret有効化、旧secret無効化確認の順で無停止rotationできる","顧客方式の接続失敗時に共有方式へ暗黙fallbackせず、tenantのログインをfail-closedにする","tenant Aのprovider-adminがtenant Bのcredentialを参照・更新できないことを分離テストで証明する","UI/API、認証、tenant分離、secret scan、typecheck、lint、buildの品質ゲートがpassする"]
architecture_refs: ["arch-harness-hub-security","arch-harness-hub-backend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-auth-tenancy-customer-managed-google-oidc-20260729.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"597d1ddac916bf7dc5e0283126215fbe21a3ae3638089f59d28a2fdfd9162dd3","evaluator":"codex-task-specification-creator","evidence_ref":"issues/sys-auth-tenancy-customer-managed-google-oidc-20260729.md"}
source_lineage: {"imported_at":"2026-07-28T23:10:15Z","origin_kind":"manual","source_digest":null,"source_path":"docs/features/feat-auth-tenancy/production-auth-manual-setup.md","source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "ユーザーが、将来の顧客持ち込みGoogle OAuth方式を共通方式とは別の実装タスクとして明示的に要求したため"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-auth-tenancy-customer-managed-google-oidc-20260729.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-uk2i","linked_at":"2026-07-28T23:16:19.236177Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-28T23:10:15Z","missing_sections":[],"status":"complete"}
---

# 概要

顧客所有のGoogle OAuthクライアントを、HarnessHubのprovider-admin向け管理画面/APIから安全に登録・検証・ローテーション・無効化できるようにする。

## 背景と問題

現在の顧客持ち込み方式は、Google Cloud Consoleで作成したclient ID/secretを1Passwordへ保管し、運用担当者がローカルのマスク入力とrepository scriptを使って本番DBへ登録する。安全な投入経路はあるが、通常運用がrunbook、CLI、1Password、DB登録に分散している。

また、現行repositoryは`insert`、`list`、復号、物理deleteが中心で、管理画面向けの状態表示、接続テスト、段階的rotation、無効化、監査付きmode切替を提供しない。

## 現在の挙動

- Google OAuth clientの作成はGoogle Cloud Consoleで手動実行する。
- client secretは1Passwordからマスク入力し、`idp_connections.client_secret_enc`へ暗号化保存する。
- runtimeはDBからcredentialを解決する。
- credential登録・更新・無効化を行うHub管理画面/APIは存在しない。
- 保存後の状態確認は本番スモークテストと手作業に依存する。

## 期待する挙動

provider-adminが対象tenantの設定画面で`顧客所有Google OAuth`を選び、正確なcallbackを確認できる。Google Cloudで手動作成したclient ID/secretをマスク入力し、保存前検証と接続テストを行う。保存後はsecret全値を再表示せず、状態、client ID末尾、secret末尾4文字、更新時刻だけを表示する。

rotationは新secretを先に登録して疎通確認し、Google側で旧secretを無効化した確認後に切り替える。途中失敗時は旧credentialを維持する。

## 再現手順またはユースケース

1. provider-adminがtenant設定の`認証`画面を開く。
2. `顧客所有Google OAuth`を選び、画面に表示されたcallbackをGoogle Cloudへ登録する。
3. client IDと一度だけ表示されるclient secretをマスク入力する。
4. Hubが形式、issuer discovery、callback、tenant、権限を検証して暗号化保存する。
5. pilot userで接続テストし、合格後に接続を有効化する。
6. rotation時は新secretをpendingとして保存し、合格後にactiveへ切り替える。
7. offboarding時は接続を無効化し、監査eventとGoogle側失効確認を残す。

## 影響と優先度

- 影響範囲: provider-admin UI/API、OIDC repository、暗号化、監査、tenant分離。
- 深刻度: medium。現在はrunbook経由で安全に運用できるため緊急障害ではない。
- 緊急度: 共通方式のcredential source abstraction完成後。企業顧客のオンボーディング前に実装する。

## スコープ

### In

- provider-admin専用のtenant認証設定画面とAPI。
- callback、Google project/client識別情報、接続状態、最終テスト結果の表示。
- client IDとsecretのマスク入力、封筒暗号化保存。
- `pending → tested → active → disabled`のcredential lifecycle。
- 段階的rotationとrollback。
- mode切替、登録、検証、rotation、無効化の監査event。
- tenant分離、role認可、CSRF、secret redactionテスト。

### Out

- Google Cloud側のOAuth client自動作成・変更・削除。
- Google以外のIdP。
- secretのメール、チャット、GitHub Secrets、tenant別Worker Secret保存。
- 接続失敗時の共有方式への暗黙fallback。
- 現在のP13本番投入を待たせること。

## 実装順序

1. 共通方式タスクが提供するcredential source abstractionとmode契約を確認する。
2. provider-admin UI/APIのrequest/response schemaと認可・監査契約を定義する。
3. repositoryへ暗号化update、pending/active、disable、last4 metadataを追加する。
4. masked form、callback copy、接続状態、test actionを実装する。
5. secretをレスポンス・ログ・監査・例外へ出さないredactionを実装する。
6. staged rotationとrollbackを実装する。
7. role/tenant/CSRF/secret/rotationのnegative testを追加する。
8. Google側手動作業とHub側操作の境界をrunbookへ反映する。

## 苦戦箇所【記入必須】

- Google OAuth clientはアプリから作成できないため、管理画面はGoogle設定を代行したように見せず、手動作業とHub管理の境界を明示する。
- client secretは保存後に再表示できない。接続確認に必要な復号は認証adapter内部へ限定し、管理APIへ復号値を返さない。
- rotation中はGoogle側で新旧2つのsecretが一時併存する。Hub側のpending/activeとGoogle側のenabled/disabledを取り違えない手順が必要。

## リスクと対策【記入必須】

- provider-admin権限の取り違えでtenant越境credential操作が起きる。全repository/APIをtenant context必須とし、cross-tenant negative testをCI必須にする。
- error objectや監査payloadからsecretが漏れる。入力値を構造化ログへ渡さず、last4以外をredaction gateで拒否する。
- rotation途中の失敗でログイン不能になる。新secretのtest合格までは旧activeを維持し、切替をCASで原子的に行う。
- 顧客方式の故障を共有方式へfallbackすると契約上の認証境界が変わる。mode別にfail-closedにする。

## 関連グラフ

- 依存ノード: `issue-auth-tenancy-shared-google-oidc-20260729`
- 関連仕様: `feat-auth-tenancy`
- 関連アーキテクチャ: `arch-harness-hub-security`、`arch-harness-hub-backend`
- 現行手動運用: `SYS-AUTH-TENANCY-P13`

## 受入条件

1. provider-adminだけが対象tenantのcredentialを登録・更新・無効化でき、監査eventが残る。
2. 保存後のUI/API/ログ/監査/エラーにsecret全値が出ない。
3. secretは`ENCRYPTION_KEK`を使う既存repository primitiveで暗号化保存される。
4. `新secret保存 → 接続テスト → active切替 → 旧secret無効化確認`で無停止rotationできる。
5. 途中失敗時は旧credentialでログインを継続できる。
6. 顧客方式の失敗時に共有方式へ暗黙fallbackしない。
7. tenant Aの管理者がtenant Bのcredentialを参照・更新できない。
8. UI/API、auth、tenant isolation、secret scan、typecheck、lint、buildがpassする。

## 検証方法【記入必須】

- provider-admin、workspace-admin、member、未認証のAPI認可テスト。
- tenant A/Bのcross-tenant read/write negative test。
- secretがresponse、structured log、audit payload、error、snapshotへ現れないgrep/scan。
- rotationの正常系、接続テスト失敗、CAS競合、rollbackテスト。
- `pnpm check:auth`
- `pnpm check:tenant-isolation`
- `pnpm check:secrets`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- provider-admin UIのPlaywright操作とアクセシビリティ検査。

## 検証証跡

- 実装時のAPI・UI・rotation test logとスクリーンショットを`docs/features/feat-auth-tenancy/`配下へ保存する。
- Google制約: https://developers.google.com/identity/protocols/oauth2/resources/best-practices
- 現行運用: `docs/features/feat-auth-tenancy/production-auth-manual-setup.md`
