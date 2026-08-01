/**
 * publish pipeline の値域プリミティブ。
 *
 * **DB の列 enum とアプリの型の唯一の突き合わせ点**をここに置く。
 * 同じ値域が `packages/db/schema` (drizzle の enum) と apps/hub (TS の union) に
 * 別々に書かれると、片方に値を足したときにもう片方が黙って古いままになる。
 * zod を正本にして、両側がここを参照する。
 */
import { z } from 'zod';

/**
 * PublishRequest の 9 状態 (docs/backend-spec.md §5.1)。
 * 並び順は `packages/db/schema/core/publish.ts` の `PUBLISH_REQUEST_STATUSES` と同じ。
 */
export const publishRequestStateSchema = z.enum([
  'draft',
  'validating',
  'needs_fix',
  'ready',
  'approval_pending',
  'approved',
  'publishing',
  'failed',
  'published',
]);
export type PublishRequestState = z.output<typeof publishRequestStateSchema>;

/**
 * 検査判定。`packages/inspection` の `pass/warn/fail` とは**語彙が異なる**。
 * 写像は apps/hub の verdict module 1 箇所だけが持つ (ADR AD-4 / test-design T3)。
 */
export const publishVerdictSchema = z.enum(['green', 'yellow', 'red']);
export type PublishVerdict = z.output<typeof publishVerdictSchema>;

/** 配布先の種別。TargetChannel の `target` 列と同じ値域。 */
export const publishTargetSchema = z.enum(['skill', 'web_app']);
export type PublishTarget = z.output<typeof publishTargetSchema>;

/** カタログ公開範囲。`public` は Stage 5 まで非対象なので値域に入れない。 */
export const publishVisibilitySchema = z.enum(['private', 'workspace']);
export type PublishVisibility = z.output<typeof publishVisibilitySchema>;

/** Release の状態。immutable Release で唯一更新される列。 */
export const releaseStatusSchema = z.enum(['available', 'suspended', 'deprecated']);
export type ReleaseStatus = z.output<typeof releaseStatusSchema>;

/**
 * finding の重大度。値域は `packages/inspection` の `FindingSeverity` と同じ 3 値。
 *
 * **名前に `publish` を付けているのは飾りではない**。`scripts/ci/check-shared-layer-duplicates.mjs` は
 * 「登録共通層の公開 API と同名の export が owner package の外にある」ことを重複実装として落とす。
 * ここで `FindingSeverity` と名乗ると、検査 pipeline の owner (`packages/inspection`) の外に
 * 同名の実装がある状態になり、detector が正しく fail する。
 * 値域が一致するのは `packages/inspection` を**参照している**からで、再定義したからではない。
 */
export const publishFindingSeveritySchema = z.enum(['info', 'warn', 'error']);
export type PublishFindingSeverity = z.output<typeof publishFindingSeveritySchema>;

/** 検査の 3 stage。値域は `packages/inspection` の `InspectionStage` と同じ (命名理由は上と同じ)。 */
export const publishInspectionStageSchema = z.enum(['static-validation', 'secret-scan', 'policy']);
export type PublishInspectionStage = z.output<typeof publishInspectionStageSchema>;

/** deployment の provider。現状 Cloudflare のみ。 */
export const deploymentProviderSchema = z.enum(['cloudflare']);
export type DeploymentProvider = z.output<typeof deploymentProviderSchema>;

/**
 * 冪等キー。scope は `(tenant, endpoint)` なので、キー自体の一意性は client 責務。
 * 長さだけを縛り、形式 (UUID 等) は強制しない — client の生成方式を契約で固定しない。
 */
export const idempotencyKeySchema = z.string().min(8).max(255);
