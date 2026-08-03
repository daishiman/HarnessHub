---
graph_node_id: "issue-auth-tenancy-shared-google-oidc-20260729"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "security"
tags: ["follow-up","auth-tenancy","google-oidc","multi-tenant","operations"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "HarnessHub共通Google OAuthクライアント方式を実装する"
owners: ["daishiman"]
created_at: "2026-07-28T23:10:15Z"
updated_at: "2026-08-01T12:29:53Z"
status: "active"
depends_on: ["SYS-AUTH-TENANCY-P13"]
related_nodes: ["feat-auth-tenancy","arch-harness-hub-security","arch-harness-hub-backend"]
resource_scope: ["apps/hub/src/lib/auth/","apps/hub/src/app/api/auth/","apps/hub/tests/auth-tenancy/","packages/schemas/auth-tenancy/","packages/db/schema/core/identity.ts","packages/db/repository/","packages/db/migrations/","packages/db/__tests__/","system-spec/","specs/harness-hub-system-specification.md","architecture/harness-hub-security.md","architecture/harness-hub-backend.md","architecture/harness-hub-infrastructure.md","features/feat-auth-tenancy.md","tasks/feat-auth-tenancy/sys-auth-tenancy-p11.md","docs/features/feat-auth-tenancy/"]
purpose: "新規テナントごとにGoogle CloudでOAuth clientとtenant固有callbackを追加する運用を、HarnessHub所有の共通Google OAuth clientを利用できる選択肢へ拡張する"
goal: "共通方式を選んだ新規テナントはGoogle OAuth clientを新規作成せず、HarnessHub上のtenant policy登録と必要なWorkspace管理者承認だけで安全にGoogleログインを開始できる"
scope_in: ["共有credentialと顧客credentialを切り替えられるOIDC credential source abstractionを定義する","共通callbackへtenant contextを署名付きstateで束縛し、別tenantへの差し替えを拒否する","Google ID tokenのhd claimをtenantの許可Workspace domainと厳密照合し、欠落・不一致を拒否する","共有client ID/secretを環境単位で一度だけ安全に保管し、tenant行へsecretを複製しない","既存のテナント別credential方式を壊さない移行・rollback・回帰テストを用意する"]
scope_out: ["Google OAuth clientをAPIから自動作成・変更する機能","Google以外のIdP対応","顧客持ち込みcredentialの管理画面・登録・ローテーションUI","現在進行中のP13本番投入方式の置換"]
acceptance: ["共通方式のtenant追加時にGoogle Cloud側のOAuth client作成・redirect URI追加が不要である","共通callbackのstateを別tenantへ差し替えた要求が拒否され、tenant越境成功が0件である","Google ID tokenのhdがtenantの許可Workspace domainと一致する場合だけ受理され、hd欠落・不一致は拒否される","共有client secretがtenant別idp_connectionsへ複製されず、ログ・レスポンス・Git・GitHub Secretsへ露出しない","既存の顧客別client方式が同じ認証テスト群で継続動作し、方式不明時は共有方式へ暗黙fallbackせずfail-closedになる","認証、tenant分離、secret scan、typecheck、lint、buildの品質ゲートがpassする"]
architecture_refs: ["arch-harness-hub-security","arch-harness-hub-backend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-auth-tenancy-shared-google-oidc-20260729.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"62ca8f40b93e696e727294171a1041e6502955e60c00821c9575eb41fbd047c5","evaluator":"codex-task-specification-creator","evidence_ref":"issues/sys-auth-tenancy-shared-google-oidc-20260729.md"}
source_lineage: {"imported_at":"2026-07-28T23:10:15Z","origin_kind":"manual","source_digest":null,"source_path":"docs/features/feat-auth-tenancy/requirements-baseline.md","source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "ユーザーが、現在のテナント別Google OAuth方式で本番を先行しつつ、将来のオンボーディング負荷を減らす共通方式を独立した実装タスクとして明示的に要求したため"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-auth-tenancy-shared-google-oidc-20260729.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-fnej","linked_at":"2026-07-28T23:15:50.962085Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-28T23:10:15Z","missing_sections":[],"status":"complete"}
---



# 概要

HarnessHub所有の共通Google OAuthクライアントを複数テナントで安全に利用できる方式を実装し、新規テナントごとのGoogle Cloud設定を原則不要にする。

## 背景と問題

現在の本番投入手順は、テナントごとに顧客所有Google Cloud project、OAuth client、tenant固有callback、client secretを作成する。分離と顧客所有権には優れる一方、テナント追加とsecretローテーションのたびにGoogle Cloud Consoleで手作業が発生する。

Google公式は、一般的なGoogleログイン用OAuth clientを不正利用防止のためプログラムから作成・変更できないとしている。そのため「テナントごとの作成を自動化する」のではなく、「HarnessHub所有の共通clientを一度だけ作り、アプリ側でtenantを安全に束縛する」方式を追加する。

## 現在の挙動

- `/{tenant_slug}/signin`でtenantを先に確定する。
- tenantごとの`idp_connections`から`client_id`と暗号化済み`client_secret`を解決する。
- ID tokenは`iss`、`aud`、`nonce`、`state`、PKCE、`email_verified`を検証する。
- Google Workspace所属を示す`hd` claimはschemaにも検証処理にも存在しない。
- callbackがtenant固有pathなので、clientを共有しても新規tenantごとにGoogle側redirect URI追加が必要になる。

## 期待する挙動

共通方式を選んだtenantは、共通callbackと環境単位のGoogle OAuth credentialを利用する。認可開始時にtenant contextを改ざんできない`state`へ束縛し、callbackで復元する。ID tokenの`hd`をtenantの許可Workspace domainと厳密照合し、別tenant・個人Googleアカウント・別WorkspaceからのJIT provisioningを拒否する。

## 再現手順またはユースケース

1. provider-adminがtenantへ`shared_google`方式と許可Workspace domainを登録する。
2. 利用者が`/{tenant_slug}/signin`を開く。
3. Hubが共通client ID、共通callback、署名付きtenant stateでGoogle認可を開始する。
4. callbackでstate、issuer、audience、nonce、PKCE、`email_verified`、`hd`を検証する。
5. 全条件が一致した場合だけ、`(tenant_id, sub)`へ利用者を束縛する。

## 影響と優先度

- 影響範囲: Googleログイン、tenant分離、認証設定、DB migration、Cloudflare Secret/Variable。
- 深刻度: medium。現在のテナント別方式で本番運用できるため直ちに停止する障害ではない。
- 緊急度: P13完了後。新規tenantが継続的に増える前に実装すると運用削減効果が高い。

## スコープ

### In

- credential sourceを`shared_google`と`customer_google`へ分ける明示的mode。
- tenant別の許可Google Workspace domain。
- 環境単位で1組だけ保持する共有client ID/secret。
- 共通callbackと署名付きtenant state。
- Google `hd` claimの必須検証。
- 現行顧客client方式との後方互換、段階移行、rollback。
- 単体・統合・tenant分離・secret非露出テスト。

### Out

- Google OAuth clientのAPI自動作成・変更。
- Google以外のIdP。
- 顧客credentialの管理画面とローテーションUI。
- 現在のP13を共有方式へ差し替えること。

## 実装順序

1. ADRで共有credentialの保管場所、共通callback、mode owner、migration境界を確定する。
2. schema/portへcredential modeと許可Workspace domainを追加する。
3. `hd`をclaims schemaと純粋検証関数へ追加し、欠落・不一致をfail-closedにする。
4. 署名付きtenant stateと共通callbackを実装する。
5. 共有credential resolverを実装し、tenant行へのsecret複製を禁止する。
6. 既存顧客client resolverを同じabstractionへ接続する。
7. unit/integration/tenant isolation/rollbackテストを追加する。
8. 段階導入runbookと監査証跡を更新する。

## 苦戦箇所【記入必須】

- 共通`aud`ではclient IDがtenant識別子にならないため、署名付きstateと`hd`検証を同時に成立させる必要がある。
- `hd` request parameterは画面上のhintであり認可境界ではない。ID tokenの`hd` claimをサーバーで検証する。
- schema ownerは`feat-domain-model-db`、認証port/検証ownerは`feat-auth-tenancy`なので、migrationとconsumer contractを同じ変更で整合させる。

## リスクと対策【記入必須】

- 共通secret漏えいの影響が全共有tenantへ広がる。環境単位Secret、即時rotation、全tenant失効runbookで抑える。
- stateだけ、または`hd`だけの片側実装ではtenant混線を防げない。両方を受入条件とCIテストに固定する。
- mode未設定時に共有credentialへfallbackすると既存tenantの認証境界が変わる。未設定・不明modeは拒否する。
- External Google appとしてbrand/domain verificationが必要になる可能性を、実装完了とproduction rolloutで分離する。

## 関連グラフ

- 原因/親ノード: `SYS-AUTH-TENANCY-P13`
- 関連仕様: `feat-auth-tenancy`
- 関連アーキテクチャ: `arch-harness-hub-security`、`arch-harness-hub-backend`
- 後続タスク: `issue-auth-tenancy-customer-managed-google-oidc-20260729`

## 受入条件

1. 共通方式のtenant追加時にGoogle Cloud側のOAuth client作成とredirect URI追加が不要である。
2. stateのtenant差し替え、`hd`欠落、`hd`不一致、`aud`不一致がすべて拒否される。
3. 同じGoogle `sub`が別tenantへ現れても`(tenant_id, sub)`で分離される。
4. 共有secretがtenant別DB行、ログ、レスポンス、Git、GitHub Secretsへ複製・露出しない。
5. 現行顧客client方式が継続動作し、不明modeはfail-closedになる。
6. auth、tenant isolation、secret scan、typecheck、lint、buildがpassする。

## 検証方法【記入必須】

- `pnpm check:auth`
- `pnpm check:tenant-isolation`
- `pnpm check:secrets`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- 共通callbackへ別tenantの署名付きstateを提示するnegative integration test。
- `hd`の一致・欠落・不一致・個人Googleアカウントを網羅するOIDC unit test。

## 検証証跡

- 実装時のtest logを`docs/features/feat-auth-tenancy/`配下の品質記録へ保存する。
- Google制約: https://developers.google.com/identity/protocols/oauth2/resources/best-practices
- `hd`仕様: https://developers.google.com/identity/openid-connect/reference

## 実装・最終レビュー追補 (2026-08-01)

- 共有 credential resolver、固定 callback、署名付き tenant state、
  Workspace `hd` 検証、DB mode/allow-list、migration、段階 rollout/rollback を実装した。
- 実 Auth.js と署名済み fake ID token を使う往復試験で、PKCE・nonce・state・`hd`・
  JIT/session・顧客方式の非回帰を検証する。
- 仕様・設計影響は **あり**。system-spec の auth/backend/security/database/
  infrastructure/maintenance-ops を R4-reopen し、`qa-110`〜`qa-115` として再確定した。
- 反映対応、品質ゲート、500 行分割判断は
  [共有 Google OIDC 仕様反映受領書](../docs/features/feat-auth-tenancy/shared-google-oidc-spec-reflection-receipt.md)
  に集約する。
- completion policy は manual。draft PR の merge と default branch reconciliation までは
  Beads `HarnessHub-fnej` と本 node を active/in_progress に維持する。
