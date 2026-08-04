/**
 * PublishRequest の入出力契約 (docs/backend-spec.md §4.6 の 1〜7)。
 *
 * 応答 schema に**パッケージ本体を含めない**。R2 の実体は content_hash 経由でしか辿れない形にし、
 * 一覧応答から中身が漏れる経路を作らない。
 */
import { z } from 'zod';

import { identifierSchema, isoDateTimeSchema } from '../src/primitives.js';
import {
  publishFindingSeveritySchema,
  publishInspectionStageSchema,
  publishRequestStateSchema,
  publishTargetSchema,
  publishVerdictSchema,
  publishVisibilitySchema,
} from './primitives.js';

/**
 * `POST /api/v1/publish` の要求。
 * `channel_id` を client に選ばせない — project と target の組から server が channel を決める
 * (`target_channels_project_target_uq` があるため 1 意に定まる)。client が channel を指定できると、
 * 他 project の channel を指す要求を作れてしまう。
 */
export const createPublishRequestSchema = z
  .object({
    project_id: identifierSchema,
    target: publishTargetSchema,
    visibility: publishVisibilitySchema,
  })
  .strict();
export type CreatePublishRequest = z.output<typeof createPublishRequestSchema>;

/** 検査 finding 1 件。message は利用者向けの説明で、内部パスや secret を含めない。 */
export const publishFindingSchema = z.object({
  rule_id: z.string().min(1),
  stage: publishInspectionStageSchema,
  severity: publishFindingSeveritySchema,
  message: z.string().min(1),
  path: z.string().nullable(),
  line: z.number().int().positive().nullable(),
});
export type PublishFinding = z.output<typeof publishFindingSchema>;

/** PublishRequest の応答表現。 */
export const publishRequestSchema = z.object({
  id: identifierSchema,
  project_id: identifierSchema,
  channel_id: identifierSchema,
  status: publishRequestStateSchema,
  /** 検査前は null。検査後に green/yellow/red のいずれか。 */
  verdict: publishVerdictSchema.nullable(),
  findings: z.array(publishFindingSchema),
  /** 公開が成立した場合のみ非 null。 */
  release_id: identifierSchema.nullable(),
  content_hash: z.string().min(1).nullable(),
  requested_by: identifierSchema,
  created_at: isoDateTimeSchema,
});
export type PublishRequestView = z.output<typeof publishRequestSchema>;

/** `GET /api/v1/publish` の絞り込み。全て任意で、未指定なら呼び出し元テナント全体。 */
export const publishListQuerySchema = z.object({
  project_id: identifierSchema.optional(),
  channel_id: identifierSchema.optional(),
  status: publishRequestStateSchema.optional(),
  cursor: z.string().min(1).max(512).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type PublishListQuery = z.output<typeof publishListQuerySchema>;

export const publishListResponseSchema = z.object({
  items: z.array(publishRequestSchema),
  next_cursor: z.string().nullable(),
});
export type PublishListResponse = z.output<typeof publishListResponseSchema>;

/**
 * `PUT /api/v1/publish/:id/package` の応答。
 * R2 key を返さない — 鍵の組み立て規則を client へ露出させると、
 * client が直接 R2 を叩く経路を想像できてしまう (アクセスは必ず Hub 経由)。
 */
export const packageUploadResponseSchema = z.object({
  content_hash: z.string().min(1),
  size_bytes: z.number().int().nonnegative(),
});
export type PackageUploadResponse = z.output<typeof packageUploadResponseSchema>;
