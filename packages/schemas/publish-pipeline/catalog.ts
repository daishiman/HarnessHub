/**
 * Release / TargetChannel / deployment の入出力契約 (docs/backend-spec.md §4.6 の 8〜12)。
 */
import { z } from 'zod';

import { identifierSchema, isoDateTimeSchema } from '../src/primitives.js';
import { deploymentProviderSchema, publishTargetSchema, releaseStatusSchema } from './primitives.js';

/** Release の応答表現。immutable なので更新入力の schema は存在しない (status 変更は専用 endpoint)。 */
export const releaseSchema = z.object({
  id: identifierSchema,
  project_id: identifierSchema,
  channel_id: identifierSchema,
  /** `v1` / `v2` … の自動採番。semver ではない (採番は channel 内の連番)。 */
  version: z.string().min(1),
  package_hash: z.string().min(1),
  status: releaseStatusSchema,
  created_by: identifierSchema,
  created_at: isoDateTimeSchema,
});
export type ReleaseView = z.output<typeof releaseSchema>;

export const releaseListResponseSchema = z.object({
  items: z.array(releaseSchema),
  next_cursor: z.string().nullable(),
});
export type ReleaseListResponse = z.output<typeof releaseListResponseSchema>;

/** TargetChannel の応答表現。stable pointer の現在値を含む。 */
export const targetChannelSchema = z.object({
  id: identifierSchema,
  project_id: identifierSchema,
  target: publishTargetSchema,
  /** まだ 1 度も公開されていない channel は null。 */
  stable_release_id: identifierSchema.nullable(),
});
export type TargetChannelView = z.output<typeof targetChannelSchema>;

/**
 * `POST /api/v1/channels/:id/promote` と `POST /api/v1/channels/:id/rollback` の要求。
 * 形は同じだが**別 schema にする** — promote と rollback は認可 action も検査要否も違うため、
 * 共有すると片方の契約変更がもう片方へ波及する。
 */
export const promoteRequestSchema = z.object({ release_id: identifierSchema }).strict();
export type PromoteRequest = z.output<typeof promoteRequestSchema>;

export const rollbackRequestSchema = z.object({ release_id: identifierSchema }).strict();
export type RollbackRequest = z.output<typeof rollbackRequestSchema>;

/**
 * `POST /api/v1/projects/:id/deployment` の要求 (web_app 出口)。
 * `exit_code` は deploy コマンドの終了コード。0 以外でも登録は受け付け、
 * orphan_candidate として記録する — 「失敗したので記録しない」にすると、
 * 実際に公開されてしまった deployment が Hub から見えなくなる (孤児化)。
 */
export const registerDeploymentSchema = z
  .object({
    channel_id: identifierSchema,
    release_id: identifierSchema,
    url: z.url('デプロイ先 URL の形式ではありません'),
    provider: deploymentProviderSchema,
    exit_code: z.number().int(),
  })
  .strict();
export type RegisterDeployment = z.output<typeof registerDeploymentSchema>;

export const deploymentReferenceSchema = z.object({
  id: identifierSchema,
  project_id: identifierSchema,
  channel_id: identifierSchema,
  release_id: identifierSchema,
  url: z.string().min(1),
  provider: deploymentProviderSchema,
  /** health 確認が取れなかった deployment。運用側の手動介入対象 (runbook 参照)。 */
  orphan_candidate: z.boolean(),
  created_at: isoDateTimeSchema,
});
export type DeploymentReferenceView = z.output<typeof deploymentReferenceSchema>;
