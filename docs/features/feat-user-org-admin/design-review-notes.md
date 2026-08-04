---
status: confirmed
layer: feature-design
task: SYS-USER-ORG-ADMIN-P03
parent_feature: feat-user-org-admin
feature_package_id: feature-package/feat-user-org-admin
reviewed_artifact: docs/features/feat-user-org-admin/architecture-decision-record.md
---

# feat-user-org-admin 独立設計レビュー (3 回目)

> 本レビューは、前回 (2 回目) レビューが差し戻した AD-4 (`tenant_coefficients` の重複定義前提) と AD-5 (`toPiiViewer` の role リテラル比較・`isAdmin` 識別子) の 2 件が、今回の P02 改訂で実際に解消されているかを、先入観なく実ファイルと突合して一から再検証した結果である。1 回目 (AD-5/AD-7 の共通層見落とし) の指摘は 2 回目の時点で既に解消済みであることが確認されているため、本書では再確認のみ行う。

## 総合判定

**条件付き承認**

2 回目レビューが差し戻した 2 件は、いずれも実ファイルとの突合により**解消を確認**した。一方、今回の独立検証で新たに 2 件の**非ブロッキングな不整合**を検出した (指摘事項 3・4)。いずれも「実装すれば即座に CI/ビルドが落ちる」種類の欠陥ではなく、(a) 本 ADR が典拠とする文書間の既存ドリフトに無言で倣っている、(b) 未実装の他 feature 資産への依存を AD-4 ほど明示的に手当てしていない、という設計文書間の整合性の問題であり、P02 再実行を要する技術的欠陥ではない。P04 (test-design) へ引き継いでよいが、指摘事項 3・4 を確実にフォローすることを条件とする。

## 前回・前々回指摘の解消状況

| 指摘 (回) | 内容 | 今回の検証結果 |
|---|---|---|
| AD-5/AD-7 共通層見落とし (1 回目) | `apps/hub/src/shared/pii/`・`apps/hub/src/shared/notification/` を見落とし独自再実装。AD-7 に「notifications 未実装」という事実誤認 | **解消 (2 回目で確認済み、本書は再確認のみ)**。現行 AD-5/AD-7 は両共通層の型・シグネチャを正確に引用しており、実装 (`apps/hub/src/shared/pii/index.ts`, `apps/hub/src/shared/notification/index.ts`) と一致することを本書でも再確認した |
| AD-4 `tenant_coefficients` 重複定義 (2 回目) | `packages/db/schema/core/` への新規テーブル追加として設計しており、実際には `packages/db/schema/hearing-intake/schema.ts:86-91` に feat-hearing-intake の write_scope として既に実装済みの `tenant_coefficients` と衝突する | **解消** (本書で実ファイル突合により確認)。§1 参照 |
| AD-5 `toPiiViewer` の role リテラル比較・`isAdmin` 識別子 (2 回目) | `role === 'workspace-admin'` 等の比較と `isAdmin` という判定語彙識別子を feat-user-org-admin の write_scope (lib/authz 外) に書いており、`check-single-authz-middleware.mjs` の機械検査に抵触 | **解消** (本書で checker の正規表現をトレースして確認)。§2 参照 |

## 1. AD-4 (`tenant_coefficients`) の再検証

`packages/db/schema/hearing-intake/schema.ts` を実際に読んだ。

```
86: export const tenantCoefficients = sqliteTable('tenant_coefficients', {
87:   tenantId: text('tenant_id').primaryKey(),
88:   annualHours: integer('annual_hours').notNull().default(2_000),
89:   minutesPerRun: integer('minutes_per_run').notNull().default(15),
90:   sheetReductionRate: real('sheet_reduction_rate').notNull().default(0.35),
91:   updatedBy: text('updated_by').notNull(),
92: });
```

`packages/db/repository/hearing-intake.ts` の `HearingIntakeRepository` interface を読むと、公開メソッドは `getCoefficients(context): Promise<TenantCoefficientRow>` のみで、書込み用メソッド (`updateCoefficients` 相当) は存在しない。AD-4 の 2 つの事実主張——「`getCoefficients()` は既に port 化されている」「書込み用 port は現時点で存在しない」——はいずれも実装と一致する。

`docs/features/feat-hearing-intake/architecture-decision-record.md:36` も実際に読み、`tenant_coefficients` が同 ADR の AD-1 で feat-hearing-intake の write_scope として明記されていることを確認した (AD-4 の引用行番号と一致)。

**結論**: AD-4 は事実に即しており、`packages/db/schema/core/` への重複定義という前回の欠陥は解消されている。「書込み port 追加は feat-hearing-intake への cross-feature follow-up」「P05 着手前に確定させる」という手当ても適切。

## 2. AD-5 (`toPiiViewer`) の再検証

`apps/hub/src/lib/authz/types.ts` を読み、`atLeast(actual: EffectiveRole, required: EffectiveRole): boolean` (`types.ts:31-35`) が `roleRank` の比較結果を返す公開関数であることを確認した。

`apps/hub/scripts/check-single-authz-middleware.mjs` の検査ロジックを実際にトレースした。

- `DECISION_IDENTIFIERS` = `/\b(?:ROLE_ORDER|ROLE_RANK|roleRank|roleOrder|minRole|requiredRole|hasRole|requireRole|isAdmin|canAccess|checkPermission|ACTION_RULES)\b/g`
- `ROLE_COMPARISON` = ロールリテラル (`'provider-admin'|'workspace-admin'|'owner'|'member'`) が `==`/`!=`/`===`/`!==` と隣接する形、または `[ 'literal',` のように配列の先頭要素になる形にのみマッチする正規表現

現行 AD-5 のコード例:

```ts
import { atLeast } from '../../lib/authz/types';
import type { EffectiveRole } from '../../lib/authz/types';
import { ADMIN_ROLE, type PiiViewer } from '../../shared/pii';

function toPiiViewer(role: EffectiveRole): PiiViewer {
  return { roles: atLeast(role, 'workspace-admin') ? [ADMIN_ROLE] : [] };
}
```

これを 1 語ずつ照合した。

- `DECISION_IDENTIFIERS`: `atLeast`/`toPiiViewer`/`EffectiveRole`/`ADMIN_ROLE`/`PiiViewer` のいずれもリスト内の 12 語に該当しない。前回差し戻しの原因だった `isAdmin` というローカル変数名は完全に消えている。
- `ROLE_COMPARISON`: `'workspace-admin'` は `atLeast(role, 'workspace-admin')` の**関数呼出しの第 2 引数**として現れており、`==`/`!=` 等の比較演算子とも配列の先頭要素とも隣接しない。したがって `ROLE_COMPARISON` にもマッチしない。

以上より、AD-5 のコード例は checker の 2 系統の検査 (`DECISION_IDENTIFIERS`/`ROLE_COMPARISON`) のいずれにも抵触しないことを、正規表現の挙動を実際にトレースして確認した。role の順序知識は `atLeast()` の呼出しに閉じられており、feat-user-org-admin 側は判定結果 (真偽値) を受け取るだけで role 語彙・順序を持ち込んでいない。AD-8 の「role 判定を新規実装しない」との内部矛盾も解消されている。

`apps/hub/src/shared/pii/index.ts` を実際に読み、`PiiViewer { roles: readonly string[] }`・`ADMIN_ROLE = 'admin'`・`maskPii<T>(record, policies, viewer)`・`maskPiiForExport<T>(record, policies)` の型・シグネチャが AD-5 の呼出し例と一致することも確認した。

## 3. AD-1〜AD-3・AD-6〜AD-8 の再確認 (新規矛盾の有無)

- **AD-1**: `packages/db/schema/core/identity.ts:140-142` のコメント「User 基底テーブル。owner は feat-domain-model-db」「feat-user-org-admin は列追加を行わない」と `packages/db/repository/users.ts:4` の「PII ガード…の適用は feat-user-org-admin の責務」を実際に読み、AD-1 本文の引用と行番号・内容とも一致することを確認した。`UsersRepo` interface (`users.ts:55-71`) には `insert`/`findById`/`list`/`update`/`markLastLogin`/`updateSalary`/`decryptSalary` が揃っており、AD-1 が列挙する port と一致する。
- **AD-2**: `apps/hub/src/app/(dashboard)/settings/auth/page.tsx` が実在することを確認し、AD-2 が新設する `settings/account/` のルーティング規約引用は妥当。ただし後述の指摘事項 4 (`metrics_rollups` 依存) を参照。
- **AD-3**: `packages/schemas/user-org-admin/` は現時点で存在せず (`packages/schemas/` 配下は `auth-tenancy`/`dual-catalog-web`/`hearing-intake`/`publish-pipeline`/`publisher-plugin`/`openapi`/`src` のみ)、新設が重複を生まないことを確認した。`ACTION_RULES` (`rules.ts:73-83`) に `users.read`/`users.write`/`users.role_change`/`users.read_salary`/`users.write_salary`/`coefficients.change` が定義済みで、`me.read`/`me.update`/`coefficients.read` が未定義であることも確認し、AD-3 の記述と一致する。ただし後述の指摘事項 3 (`GET /api/v1/users` の role 要件ドリフト) を参照。
- **AD-6**: `packages/db/repository/audit.ts:24` の「値そのもの (salary 金額・secret・token) を含めないこと」というコメントと、`docs/security-spec-data-integrity.md` の action 語彙 (`user.role_change`/`user.salary_change`/`user.salary_read`/`coefficient.change`) を実際に確認し、AD-6 本文と一致することを確認した。新語彙は追加されていない。
- **AD-7**: `apps/hub/src/shared/notification/index.ts` の `NotificationMessage`/`NotificationDispatcher`/`NotificationChannel` の型定義を実際に読み、AD-7 のコード例・呼出しシグネチャと完全一致することを確認した (前回確認済みの内容を本書でも再確認し、変化がないことを確かめた)。
- **AD-8**: `apps/hub/src/lib/authz/rules.ts`/`types.ts` を読み、role 4 種の判定は `ACTION_RULES`/`atLeast` に集約されていることを確認した。AD-8 が新規登録すると宣言する `me.read`/`me.update`/`coefficients.read` の 3 action は現行 `ACTION_RULES` に未定義であり、記述と実装が整合する。

AD-4/AD-5 以外の箇所に、今回の改訂で新たに持ち込まれた技術的矛盾は検出しなかった。

## レビュー観点別結果

### 1. SEC2 (role 4 種の認可判定の単一集約) — **適合**

- `toPiiViewer` の実装は checker の検査対象パターンの外にあり (§2 参照)、AD-8 の「role 判定を新規実装しない」との内部矛盾は解消済み。
- `apps/hub/src/lib/authz/rules.ts` の `ACTION_RULES` に本 feature が使う action が既定義であることを確認した (§3 参照)。

### 2. SEC4 (salary の PII 非露出) — **適合**

- `apps/hub/src/shared/pii/index.ts` の `PiiFieldPolicy`/`canView`/`maskPii`/`maskPiiForExport` を実際に読み、AD-5 の呼出し例のシグネチャと一致することを確認した。
- `decryptSalary` (`packages/db/repository/users.ts:70-71`) の「認可 MW 通過後のみ呼ぶこと」「呼出し側で `user.salary_read` の監査が必要」というコメントは、AD-5 の決定 2・4 (`withAuthz` を通してから呼ぶ、監査記録をラッパー関数内で必須化する) と整合する。

### 3. SEC6 (監査 event 記録範囲) — **適合**

- `coefficients.change` action は `rules.ts` に既定義で、AD-4 が要求する「変更は `coefficients.change` action 経由・`AuditRepo.append()` で記録必須」の経路は認可レベルで成立する。
- `audit.ts:24` のコメント規約と AD-6 の記述は一致する。

### 4. SEC9 (通知ディスパッチの PII 非混入) — **適合 (運用上の残課題 1 件、継続)**

- `NotificationMessage`/`NotificationDispatcher` の型・シグネチャは AD-7 のコード例と完全一致する。
- 2 回目レビューが指摘した「`body` への PII 非混入を担保する仕組みが実装者の注意のみに依存しており、機械検証 (自動テスト/lint) の設計が ADR に無い」という運用上の残課題は今回の改訂でも解消されていない (ブロッカーではないため据え置き)。P04 で明示的な acceptance として起票することを改めて推奨する。

### 5. qa-005 (role 4 種の統合方針) — **適合**

- `apps/hub/src/lib/authz/types.ts:24` の `ROLE_ORDER` は qa-005 の 4 role と一致し、AD-8 は新しい role を作っていない。

### 6. qa-024 (テナントスコープ列必須) とスキーマ所有権整合性 — **適合**

- AD-4 が新規テーブルを作らない設計に変わったことで、2 回目レビューが指摘した重複定義問題は解消され、D4/qa-024 の row-level-scope 要件との抵触も消滅した (新規テーブルが存在しないため、スコープ列の要否自体が論点でなくなった)。
- AD-1 の `users`/`user_settings` の owner 分離も引き続き整合している。

### 7. 認可ルール表整合 (`ACTION_RULES`) — **概ね適合 (指摘事項 3 参照)**

- `rules.ts:73-83` に本 feature が消費する action が定義済みであることを確認した。
- ただし `GET /api/v1/users` を `users.read` (minRole: workspace-admin) にマッピングしている点について、AD-3 自身が準拠すると明記する `docs/backend-spec-api-state.md` §4.2 (line 32) の記述との間にドリフトがある。詳細は指摘事項 3 参照。

## 指摘事項

1. **[解消確認] AD-4 (`tenant_coefficients`)**: 2 回目レビューの差し戻し理由は解消されている。`packages/db/schema/hearing-intake/schema.ts:86-91` の既存実装を owner として尊重する設計に修正済み。追加対応不要。
2. **[解消確認] AD-5 (`toPiiViewer`)**: 2 回目レビューの差し戻し理由は解消されている。`atLeast()` の呼出し結果のみを使う実装に修正され、`check-single-authz-middleware.mjs` の `DECISION_IDENTIFIERS`/`ROLE_COMPARISON` のいずれにも抵触しないことを正規表現トレースで確認済み。追加対応不要。
3. **[非ブロッキング・要 spec-drift-triage] AD-3 / `GET /api/v1/users` の role 要件ドリフト**: AD-3 (`architecture-decision-record.md:77`) は `GET /api/v1/users` を `users.read` (minRole: workspace-admin。`security-spec-authorization.md:95` の action 語彙表・実装 `rules.ts:73` と一致) にマッピングしている。一方、AD-3 自身が典拠として明記する `docs/backend-spec-api-state.md` §4.2 (line 32) は同エンドポイントの最小 role を「member (簡易) / admin (全列)」とし、「member には name/department のみ」という簡易一覧アクセスを要求している。両文書はともに `status: confirmed` であり、内容が矛盾している。AD-3 はこの矛盾に触れず、`security-spec-authorization.md`/実装側 (workspace-admin 限定) を無言で採用している。`screen-inventory.md:39` (S17 は workspace-admin 限定) および `requirements-baseline.md` の acceptance/quality_constraints には member 向け簡易ユーザー一覧を要求する記載が無いため、**今回の acceptance 範囲では機能的な抜け漏れにはならない**と判断しブロッカーとはしないが、放置すると P05 実装時に「どちらの文書に従うべきか」の判断が実装者に委ねられてしまう。spec-drift-triage で `docs/backend-spec-api-state.md` §4.2 側の記述を是正するか、`users.read` とは別の member 向け action を新設するかを確定させることを推奨する。
4. **[非ブロッキング・推奨] AD-2 / `metrics_rollups` port 未実装への言及不足**: AD-2 の S17 個別ダッシュボード (`architecture-decision-record.md:56`) は `metrics_rollups` (dim=user) の読取りを前提としているが、`packages/db/schema`・`packages/db/repository` のいずれにも `metrics_rollups` のテーブル定義・repository は現時点で存在しない (owner は feat-metrics-tracking、`docs/features/feat-metrics-tracking/requirements-baseline.md:53` で確認)。AD-4 は同種の cross-feature port 依存 (`tenant_coefficients`) について「P05 着手前に確定させる」「dev-graph 側の依存関係として明示する」という明示的な手当てを行っているが、AD-2 の `metrics_rollups` 依存には同様の手当てが無い。実装未着手のため今回は不適合と判定しないが、AD-4 と同水準の cross-feature 依存の明示 (feat-metrics-tracking 側の port 確定を P05 の前提条件として dev-graph へ記録する等) を推奨する。

## 次フェーズへの申し送り

- 本 ADR は **承認可 (条件付き)**。P04 (test-design) へ引き継いでよい。
- 指摘事項 3・4 は P02 への差し戻し理由にはしないが、次のいずれかで確実にフォローすること: (a) 指摘事項 3 は spec-drift-triage を別途起票し `docs/backend-spec-api-state.md` §4.2 と `docs/security-spec-authorization.md` §3.4 の `GET /api/v1/users` role 記述を一致させる、(b) 指摘事項 4 は AD-4 と同水準の cross-feature 依存記録を P02 側 (または dev-graph の依存関係) に追記する。
- SEC9 残課題 (`NotificationMessage.body` の PII 非混入を機械検証する自動テストが ADR に無い) は 2 回目レビューからの継続申し送りであり、P04 で確実に acceptance として拾うこと。
- 1 回目・2 回目の差し戻し理由 (AD-5/AD-7 共通層見落とし、AD-4 の重複テーブル定義、AD-5 の role 判定分散) はいずれも実ファイル突合により解消を確認した。後退させないこと。
- 本レビューは ADR 自体を修正していない (write_scope 外)。指摘事項 3・4 のフォローアップ起票は本タスクの範囲外のため、別途 dev-graph 側で起票すること。
