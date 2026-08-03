---
status: confirmed
layer: feature-design
task: SYS-USER-ORG-ADMIN-P02
parent_feature: feat-user-org-admin
feature_package_id: feature-package/feat-user-org-admin
source: docs/features/feat-user-org-admin/requirements-baseline.md
feature_context_digest: sha256:e67d33e37c98456225d7391c7f47a71c19e2efe043a76607487a50897adfa84f
architecture_refs: [arch-harness-hub-security, arch-harness-hub-backend, arch-harness-hub-frontend]
---

# feat-user-org-admin アーキテクチャ決定記録 (ADR)

> **位置づけ**: P02 の成果物。[requirements-baseline.md](./requirements-baseline.md) の acceptance 3 件・quality_constraints 8 件を実装可能な構造へ具体化する。本書で確定した決定は P05 実装の拘束条件であり、実装が本書と矛盾した場合は実装側を是正する (P05 rollback 規約)。

## 0. 決定一覧 (索引)

| id | 決定 | 対応する quality_constraint |
|---|---|---|
| [AD-1](#1-ad-1-users-テーブルのカラム-owner-は-feat-domain-model-db-であり本-feature-は-port-越しにのみ消費する) | `users.department`/`users.salary` のスキーマ owner は feat-domain-model-db。本 feature はカラムを追加せず `UsersRepo`/`AuditRepo` を port として消費する | coefficient-and-user-entities |
| [AD-2](#2-ad-2-s17s18-画面構成と共通-ui-部品の再利用方針) | S17 (ユーザー管理 + 個別ダッシュボード)・S18 (アカウント設定 + `/legal`) の画面構成 | backend-b10-user-management |
| [AD-3](#3-ad-3-api-契約は-packagesschemasuser-org-admin-に-zod-単一ソースで置く) | `packages/schemas/user-org-admin/` に zod スキーマを新設し、既存 authz `ACTION_RULES` の action 語彙とハンドラを 1:1 対応させる | backend-b10-user-management, role-4-integration |
| [AD-4](#4-ad-4-tenant_coefficients-テーブルは-feat-hearing-intake-が-owner-であり本-feature-は-port-越しにのみ消費する) | `tenant_coefficients` テーブルは feat-hearing-intake が owner。本 feature は新規テーブルを作らず、owner が公開する `HearingIntakeRepository.getCoefficients()` / `updateCoefficients()` を port として消費する | coefficient-and-user-entities |
| [AD-5](#5-ad-5-salary-の-pii-ガードは-feat-hub-foundation-の共通-pii-層-apphubsrcsharedpii-をそのまま消費する) | salary は `apps/hub/src/shared/pii/` の `PiiFieldPolicy`/`canView`/`maskPii`/`maskPiiForExport` をそのまま消費し、admin 限定の `decryptSalary` 明示呼出しと組み合わせて適用する (共通層の再実装はしない) | salary-pii-guard |
| [AD-6](#6-ad-6-監査統合は-auditrepoappend-を消費し既存-action-語彙をそのまま使う) | role/salary/coefficient 変更は `AuditRepo.append()` を呼び、`user.role_change`/`user.salary_change`/`user.salary_read`/`coefficient.change` の既存語彙をそのまま使う (新語彙を作らない) | audit-event-expansion |
| [AD-7](#7-ad-7-通知ディスパッチは-feat-hub-foundation-の共通層-apphubsrcsharednotification-をそのまま消費する) | `notifications` の配信は既に実装済みの `apps/hub/src/shared/notification/` (`NotificationDispatcher`/`createNotificationDispatcher`) をそのまま消費する。本 feature は呼出しメッセージの組立てのみを担う | notification-dispatch-common-layer |
| [AD-8](#8-ad-8-role-判定は-feat-auth-tenancy-の-lib​authz-に完全委譲する) | role 4 種の認可判定は新規実装せず `apps/hub/src/lib/authz/` の `withAuthz`/`ACTION_RULES` に完全委譲する | role-4-integration, auth-delegation-unchanged |

---

## 1. AD-1: `users` テーブルのカラム owner は feat-domain-model-db であり、本 feature は port 越しにのみ消費する

### 背景 (訂正の経緯)

本タスクの旧公開 plan (`tasks/feat-user-org-admin/sys-user-org-admin-p02.md` 由来) は「User 拡張 (department/salary) のカラム設計」「User テーブルへの department/salary 列追加」を本 feature の責務としていた。しかし [`docs/features/feat-domain-model-db/architecture-decision-record.md` §1](../feat-domain-model-db/architecture-decision-record.md) が確定後、`users` テーブル (department/salary を含む完全な基底定義) は feat-domain-model-db が唯一の owner であり、既に `packages/db/schema/core/identity.ts` + `packages/db/repository/users.ts` として実装済みであることが判明した。同 ADR は「feat-user-org-admin 側 P02 再実行時に User 拡張列設計を PII ガード適用・監査・tenant_coefficients 設計へ置き換え、department/salary 列のスキーマ定義記述を削除する」ことを本タスクへの follow-up として申し送っている。本書はこの follow-up を反映する。

### 決定

- 本 feature は `users`/`user_settings` テーブルへの列追加・スキーマ変更を一切行わない (write_scope に `packages/db/schema/core/` を含めない)。
- 本 feature は `packages/db/repository/users.ts` の `UsersRepo` (`insert`/`findById`/`list`/`update`/`updateSalary`/`decryptSalary`/`markLastLogin`) と `packages/db/repository/audit.ts` の `AuditRepo` (`append`/`read`) を port として消費するのみ。
- `UsersRepo` の型定義コメント (`users.ts:4` 「PII ガード…の適用は feat-user-org-admin の責務」) が本 feature の責務境界を実装側から裏付けている。

### 根拠

feat-domain-model-db ADR §1 の 3 系統の証跡 (文書証跡・write_scope の構造的制約・アクセス制御責務の分離)。本書はこれを覆さない。

---

## 2. AD-2: S17/S18 画面構成と共通 UI 部品の再利用方針

### 画面構成

| 画面 | 経路 (`apps/hub/src/app/(dashboard)/`) | 対象 role | 内容 |
|---|---|---|---|
| S17 ユーザー管理一覧 | `users/page.tsx` | workspace-admin 以上 | テーブル一覧 (name/department/role/status)。salary 列は非表示 (AD-5) |
| S17 個別ダッシュボード | `users/[id]/page.tsx` | workspace-admin 以上 | 対象ユーザーの削減効果 rollup (`metrics_rollups` dim=user 読取。集計のみ消費し本 feature は算出しない) + role/department/status 編集 + salary 編集 (admin 限定 UI 分岐) |
| S18 アカウント設定 | `settings/account/page.tsx` | member 以上 (自分自身のみ) | プロフィール (`GET/PATCH /api/v1/me`)・通知設定・表示設定 (theme/density/language) |
| S18 配下 `/legal` | `legal/page.tsx` | 全利用者 (未ログイン含む、静的公開) | 利用規約・プライバシーポリシー。screen-inventory.md 注記「規約 (legal) は静的ページとして S18 配下に置く」に従う |

既存の `settings/auth/` (feat-auth-tenancy 実装済み) と並列に `settings/account/` を新設する。ルーティング構造の慣習は `apps/hub/src/app/(dashboard)/settings/auth/page.tsx` に倣う。

### 共通 UI 部品の再利用

`docs/shared-layers.md` §1 表に本 feature (`user-org-admin`) が明記されている部品のみ消費する: KPI カード/チャート (個別ダッシュボード)、テーブル/一覧部品 (S17)、インライン編集テーブル (S17、P4 実装順)、状態チップ/確認ダイアログ (role 変更・退職処理等の破壊的操作)。部品自体の新規実装は行わない。

---

## 3. AD-3: API 契約は `packages/schemas/user-org-admin/` に zod 単一ソースで置く

### 決定

`packages/schemas/auth-tenancy/` 等の既存 feature ディレクトリと同じ配置規約で `packages/schemas/user-org-admin/` を新設し、以下のエンドポイント (`docs/backend-spec-api-state.md` §4.2 準拠) の request/response zod スキーマを定義する。

| Method Path | authz action (rules.ts 既定義) | 備考 |
|---|---|---|
| `GET/PATCH /api/v1/me` | (session 本人限定、rules.ts 未登録につき本 task で `me.read`/`me.update` を追加登録) | user_settings 込み |
| `GET /api/v1/users` | `users.read` | salary は応答 DTO に残るが、`maskPii` (AD-5) が非 admin viewer に対して常に `'***'` へ置換する (共通 PII 層の既定動作。フィールド自体を消す独自 DTO 分岐は作らない) |
| `POST /api/v1/users` | `users.write` | 事前登録 (role/department/salary) |
| `GET /api/v1/users/:id` | `users.read` | 個別ダッシュボード用 |
| `PATCH /api/v1/users/:id` | `users.role_change`/`users.write` | role 変更時のみ `users.role_change` を要求 |
| `GET/PATCH /api/v1/tenant/coefficients` | `coefficients.change` (書込) / `users.read` 相当の読取新設要 | AD-4 |
| `GET/PATCH /api/v1/me/notification-settings` | (session 本人限定) | AD-7 接続点 |

`users.read_salary`/`users.write_salary` は個別ダッシュボードの salary 編集/表示 UI から `PATCH /api/v1/users/:id` 呼出し時に role 分岐でガードする (AD-5)。`ACTION_RULES` (`apps/hub/src/lib/authz/rules.ts:73-83`) に該当 action が既に定義済みであることを確認済み — 本 feature は新規 action 登録 (`me.read`/`me.update`/`coefficients.read`) のみ追加する。

---

## 4. AD-4: `tenant_coefficients` テーブルは feat-hearing-intake が owner であり、本 feature は port 越しにのみ消費する

### 背景 (訂正の経緯)

初版の本 AD は `tenant_coefficients` を本 feature の新規テーブルとして `packages/db/schema/core/` へ追加する設計だった。しかし実際には `packages/db/schema/hearing-intake/schema.ts:86-91` に `tenant_coefficients` (tenantId PK, annualHours 既定2000, minutesPerRun 既定15, sheetReductionRate 既定0.35, updatedBy) が**既に実装済み**であり、`packages/db/repository/hearing-intake.ts` の `HearingIntakeRepository.getCoefficients()` として既に port 化され、`docs/features/feat-hearing-intake/architecture-decision-record.md:36` が feat-hearing-intake を owner と明記している。同名テーブルを本 feature 側で重複定義すると、drizzle の barrel 経由 migration 生成が破綻する。P03 独立レビューがこの重複を指摘して差し戻した。本節は既存 owner を尊重する設計に置き換える。

### 決定

1. 本 feature は `tenant_coefficients` のスキーマ定義・migration を一切行わない (write_scope に `packages/db/schema/` を含めない。AD-1 と同型のパターン)。
2. 読取りは `HearingIntakeRepository.getCoefficients(context)` を、書込みは同 owner が公開する `updateCoefficients(context, input)` をそのまま port として消費する。`updateCoefficients` は actorId を持つ `RepositoryContext` を必須にし、係数テーブルへの更新責務を owner に維持する。
3. 本 feature は owner port を呼ぶ API/service consumer であり、`tenant_coefficients` の SQL・migration・第2の repository は持たない。port 呼出し後、consumer 文脈の監査を `coefficient.change` として記録する。
4. 変更は `coefficient.change` action 経由・`AuditRepo.append()` で記録必須 (AD-6)。監査呼出しは port 呼出し側 (本 feature の API ハンドラ) の責務とし、`HearingIntakeRepository` 側には持たせない (監査は消費者ごとに文脈が異なるため owner 側に埋め込まない)。

### スコープ外

試算エンジン (annualHours 等を用いた実際の削減時間/削減額の算出) は feat-metrics-tracking の scope。本 feature は係数の管理 API (取得・変更) のみを担う (requirements-baseline.md scope_out に準拠)。

---

## 5. AD-5: salary の PII ガードは feat-hub-foundation の共通 PII 層 (`apps/hub/src/shared/pii/`) をそのまま消費する

### 背景 (訂正の経緯)

初版の本 AD は `apps/hub/src/shared/pii/` の存在を見落とし、DTO フィルタ + 明示 decrypt 呼出しという設計を本 feature 側で独自に組み立てていた。P03 独立レビューが `docs/shared-layers.md` §2 の PII ガード owner=feat-hub-foundation の記載と、既に実装済みの共通層 (`PiiFieldPolicy`/`canView`/`maskPii`/`maskPiiForExport`) を指摘して差し戻した。本節はこれを反映し、共通層をそのまま消費する設計に置き換える。

### role 語彙のマッピング問題

共通層の `PiiViewer.roles: readonly string[]` と `ADMIN_ROLE = 'admin'` は汎用の単一文字列を前提にしており、本リポジトリの実 role 語彙 (`provider-admin`/`workspace-admin`/`owner`/`member`、`apps/hub/src/lib/authz/types.ts` の `EffectiveRole`) とは値が一致しない。共通層自体 (`apps/hub/src/shared/pii/index.ts`) を書き換えると他の消費者にも影響するため変更しない。

初版はこの変換を role リテラル比較 (`role === 'workspace-admin'`) と `isAdmin` という判定系識別子で本 feature 側に実装しようとしたが、これは `apps/hub/scripts/check-single-authz-middleware.mjs` が機械検査する不変条件 (「role の順序関係を知ってよいのは `lib/authz` だけ」、`types.ts:1-6` のコメントに明記) に抵触し、AD-8 の「role 判定を新規実装しない」とも矛盾する。P03 独立レビューがこれを指摘して差し戻した。

代わりに、`lib/authz/types.ts` が判定層の外への安全な消費経路として公開している `atLeast(actual, required)` を使う。`atLeast` はロール比較を関数呼出しの内側に閉じており、呼出し側にロール順序の知識やリテラル比較・`isAdmin` 系識別子を持ち込まない (checker のホワイトリストではなく、正規表現の対象パターン外という構造で安全)。

```ts
import { atLeast } from '../../lib/authz/types';
import type { EffectiveRole } from '../../lib/authz/types';
import { ADMIN_ROLE, type PiiViewer } from '../../shared/pii';

// role の順序判定は行わず、lib/authz が公開する atLeast() の結果をそのまま
// 共通 PII 層の汎用ロール文字列へ詰め替えるだけ。role 順序の知識は持たない。
function toPiiViewer(role: EffectiveRole): PiiViewer {
  return { roles: atLeast(role, 'workspace-admin') ? [ADMIN_ROLE] : [] };
}
```

### 決定

1. salary の可視性は `PiiFieldPolicy = { field: 'salary', sensitivity: 'admin_only' }` として宣言し、一覧・個別取得のレスポンス組立て時に `maskPii(record, [salaryPolicy], toPiiViewer(effectiveRole))` へ通す (`canView`/`maskPii` は共通層の既存関数をそのまま使い、独自のフィルタ関数は作らない)。
2. salary の復号自体 (`UsersRepo.decryptSalary()`) は `role in (workspace-admin, provider-admin)` の API ハンドラでのみ呼ぶ。呼出し前に `withAuthz('users.read_salary' | 'users.write_salary')` を通す (AD-8 と同じ認可経路。PII マスクと認可は別レイヤーで、マスクは表示制御、`withAuthz` は API 呼出し自体の可否)。
3. export (CSV 等) は `maskPiiForExport(record, [salaryPolicy])` を使う (viewer を渡さず常に admin 以外扱いでマスクする、共通層の既定動作をそのまま利用)。
4. `user.salary_read` の監査記録は `decryptSalary` 呼出しのラッパー関数内で必須化し、呼出し側での書き忘れを防ぐ (呼出し即監査、業務ロジック側に監査呼出しを分散させない)。

### 根拠

`salary-pii-guard` 制約 (分離テスト + 監査記録) と `docs/shared-layers.md` §2 (PII ガードの owner=feat-hub-foundation、consumer は共通層をそのまま消費し再実装しない)。role マッピングを 1 関数に閉じることで、共通層のロール語彙と本リポジトリの role 語彙が将来ずれても修正箇所が 1 箇所で済む。

---

## 6. AD-6: 監査統合は `AuditRepo.append()` を消費し、既存 action 語彙をそのまま使う

### 決定

新規 action 語彙を追加しない。`docs/backend-spec.md` §3.8 で既に確定している以下の語彙をそのまま `AuditRepo.append()` の `action` に渡す。

- `user.role_change` / `user.salary_change` / `user.salary_read` (security-spec 追加分) / `coefficient.change`

`summary_json` には変更の事実 (どのフィールドが変わったか) のみを書き、salary の金額そのものは書かない (`audit.ts:24` のコメント規約に従う)。

---

## 7. AD-7: 通知ディスパッチは feat-hub-foundation の共通層 (`apps/hub/src/shared/notification/`) をそのまま消費する

### 背景 (訂正の経緯)

初版の本 AD は「`notifications` テーブル・配信実装はリポジトリ内に未実装」と記載していたが、これは誤りだった。`apps/hub/src/shared/notification/index.ts` に `NotificationDispatcher`/`NotificationMessage`/`createNotificationDispatcher` が既に実装済みであり、初版が独自定義した `NotificationDispatchPort` (フィールド名・シグネチャとも既存実装と非互換) は不要な車輪の再発明だった。P03 独立レビューがこの事実誤認を指摘して差し戻した。本節は既存実装をそのまま消費する設計に置き換える。

### 決定

1. 本 feature は `apps/hub/src/shared/notification/` の型をそのまま使う。独自インタフェースは定義しない。

```ts
import type { NotificationDispatcher, NotificationMessage } from '../../shared/notification';

// 本 feature 側で組み立てるのは NotificationMessage のみ。
// tenantId/workspaceId/recipientSubject/kind/subject/body/idempotencyKey は
// 既存型 (apps/hub/src/shared/notification/index.ts) の定義をそのまま使う。
function buildSheetGeneratedMessage(input: {
  tenantId: string;
  workspaceId: string | null;
  recipientSubject: string;
  sheetId: string;
}): NotificationMessage { /* kind/subject/body/idempotencyKey を本 feature の業務語彙で組み立てる */ }
```

2. `NotificationDispatcher` のインスタンス化 (`createNotificationDispatcher` への transports 注入) は feat-hub-foundation 側の責務のまま変更しない。本 feature は注入済みの `NotificationDispatcher` を呼び出す側 (`dispatch(message, channels)`) としてのみ関与する。
3. S18 の通知設定 UI (`notify_generation`/`notify_review`/`notify_weekly`/`notify_feedback`/`email_enabled`, `user_settings` 経由) は、`dispatch()` に渡す `channels: readonly NotificationChannel[]` (`'in_app' | 'email'`) を本 feature 側で組み立てる際の入力フラグとして機能する。
4. 本 feature からの直接 Resend API 呼出しは行わない (quality_constraint `notification-dispatch-common-layer` の明示禁止)。SEC9 (メール本文への PII 非包含) は `NotificationMessage.body` を組み立てる本 feature 側の関数が salary 等の PII フィールドを一切参照しないことで担保する (共通層側は body の中身を検査しない、生成元が守る責務)。

---

## 8. AD-8: role 判定は feat-auth-tenancy の `lib/authz` に完全委譲する

### 決定

role 4 種 (`provider-admin`/`workspace-admin`/`owner`/`member`) の認可判定を本 feature 側で再実装しない。全 API ハンドラは `apps/hub/src/lib/authz/with-authz.ts` の `withAuthz(action, handler)` でラップし、`ACTION_RULES` (rules.ts) に既定義の `users.*`/`coefficients.change` 語彙をそのまま使う。新規に必要な `me.read`/`me.update`/`coefficients.read` の 3 action のみ本 feature が `ACTION_RULES` へ追加登録する (追加登録の write_scope は `apps/hub/src/lib/authz/rules.ts` の該当行のみで、判定ロジック自体は変更しない)。

### 根拠

`auth-delegation-unchanged`・`role-4-integration` 制約。feat-auth-tenancy ADR AD-4 が定める「認可判定の単一集約点」を維持する。

---

## スコープ外 (再掲・確認)

- PII ガード共通層・通知ディスパッチ共通層・検査 pipeline 自体の再設計 (feat-hub-foundation が実装 owner)
- Auth.js アダプタ・認可ミドルウェア自体の設計変更 (feat-auth-tenancy の scope)
- `users`/`tenants`/`workspaces` 等コアドメインのスキーマ変更 (feat-domain-model-db の scope、AD-1)
- 試算エンジンの設計 (feat-metrics-tracking の scope、AD-4)

## 実装追補・未解決事項

- `/legal` の Studio mockup 上の詳細要件 (静的コンテンツの更新 owner、axe 検証範囲) は本タスクの「Normative implementation closure」オーバーレイと `docs/features/feat-user-org-admin/requirements-baseline.md` (P01 確定 acceptance 3 件) の記載件数に差異がある (baseline は 8 quality_constraints、オーバーレイは 9 件目として `legal-static-page-all-users` を追加)。screen-inventory.md の「規約は S18 配下」という既存確定事項とは整合するため本書では設計に含めたが、P01 baseline 側への正式な差分反映は spec-drift-triage の対象として別途起票する。
- 2026-08-03 最終レビュー訂正: AD-5 の role マッピングは実装済みだが、AD-7 の `NotificationMessage` 組立て・`NotificationDispatcher.dispatch()` 呼出しは grep 0 件で未実装だった。「最初に統合する consumer」という将来形を完了済みと扱わない。P05 を再オープンし、PII 非混入のメッセージ生成・注入済み dispatcher 呼出し・実配線テストを追加する。
- 2026-08-04 AD-4 実装追補: `HearingIntakeRepository.updateCoefficients(context, input)` を owner 側 repository に追加し、`PATCH /api/v1/tenant/coefficients` はこの port、`AuditRepo.append(action: 'coefficient.change')`、共有 `NotificationDispatcher.dispatch()` を順に利用する。監査 summary と通知本文には係数の実値を含めない。スキーマ/migration の追加はしていない。
- P03 (3回目、条件付き承認) の申し送り: (a) AD-3 の `GET /api/v1/users` は `users.read` (workspace-admin 限定) としているが、`docs/backend-spec-api-state.md:32` は同エンドポイントを「member (簡易: name/department のみ) / admin (全列)」と記載しており、両 `status: confirmed` 文書間でドリフトがある。現行 screen-inventory/acceptance に member 向け一覧要求は無く機能的欠落ではないが、正式な是正は spec-drift-triage の対象として別途起票する (AD-3 は security-spec/実装済み `rules.ts` 側を優先する現行設計を維持)。(b) AD-2 の個別ダッシュボードが読む `metrics_rollups` は feat-metrics-tracking 側に実装が確認できず (`packages/db/schema/`・`packages/db/repository/` に該当なし)、AD-4 と同型の cross-feature 依存が未解決のまま残っている。P05 着手前に feat-metrics-tracking 側の実装状況を確認し、未実装であれば AD-4 と同様に follow-up を起票する。

## 参照情報

- System specification: system-spec/database.md (qa-024), system-spec/security.md (qa-025 SEC2/SEC4/SEC6/SEC9), system-spec/backend.md (qa-023 B8/B10), docs/shared-layers.md §1/§2, docs/backend-spec.md §2.2-2.3/§3.8/§4.2/§6.2, docs/screen-inventory.md
- Architecture: arch-harness-hub-security, arch-harness-hub-backend, arch-harness-hub-frontend
- 依存 ADR: [feat-domain-model-db ADR](../feat-domain-model-db/architecture-decision-record.md) §1, [feat-auth-tenancy ADR](../feat-auth-tenancy/architecture-decision-record.md) AD-4, [feat-hearing-intake ADR](../feat-hearing-intake/architecture-decision-record.md) (`tenant_coefficients` owner、AD-4)
- Feature: feat-user-org-admin
- Dependencies: sys-user-org-admin-p01
