/**
 * Workspace Catalog の閲覧契約 (S01 一覧 / S02 詳細 / install descriptor)。
 *
 * 本 feature は**消費側**であり、これらの endpoint の実装は feat-publish-pipeline が所有する。
 * ここは「消費するときに満たしていなければならない形」を単一ソースとして固定するためのもの。
 */
import { z } from 'zod';

import { publishTargetSchema, publishVisibilitySchema, releaseStatusSchema } from '../publish-pipeline/primitives.js';
import { identifierSchema, isoDateTimeSchema } from '../src/primitives.js';

/**
 * S01 一覧の 1 行。表示項目は docs/screen-inventory.md の
 * 「S01: name/summary/target/status/version/download count」に対応する。
 */
export const catalogEntrySchema = z.object({
  project_id: identifierSchema,
  name: z.string().min(1),
  summary: z.string(),
  target: publishTargetSchema,
  visibility: publishVisibilitySchema,
  /** stable pointer が指す版。未公開なら null。 */
  stable_version: z.string().min(1).nullable(),
  /** stable release の状態。未公開なら null。 */
  release_status: releaseStatusSchema.nullable(),
  download_count: z.number().int().nonnegative(),
  updated_at: isoDateTimeSchema,
});
export type CatalogEntry = z.output<typeof catalogEntrySchema>;

export const catalogListResponseSchema = z.object({
  items: z.array(catalogEntrySchema),
  next_cursor: z.string().min(1).nullable(),
});
export type CatalogListResponse = z.output<typeof catalogListResponseSchema>;

/** S02 詳細。release 一覧は履歴表示 (S04) と共有する。 */
export const catalogDetailSchema = z.object({
  project_id: identifierSchema,
  name: z.string().min(1),
  summary: z.string(),
  target: publishTargetSchema,
  visibility: publishVisibilitySchema,
  stable_version: z.string().min(1).nullable(),
  /**
   * stable pointer が指す release の id。未公開なら null。
   * 導入要求に必要だが、UI が version 文字列から逆算できてはいけない
   * (逆算できると pointer 切替の瞬間に古い release を掴む) ため、サーバが明示して返す。
   */
  stable_release_id: identifierSchema.nullable(),
  release_status: releaseStatusSchema.nullable(),
  download_count: z.number().int().nonnegative(),
  updated_at: isoDateTimeSchema,
  /** web_app target の起動先。skill target では null。**UI 側で組み立てない**。 */
  launch_url: z.url().nullable(),
});
export type CatalogDetail = z.output<typeof catalogDetailSchema>;

/**
 * install descriptor (`POST /api/v1/harnesses/:projectId/install` の応答)。
 *
 * **UI 側で内容を組み立てることを禁じる** (frontend-spec §3.2 S02)。
 * R2 object key や配布 URL をクライアントで合成すると、pointer 切替と表示内容がずれ、
 * 「画面には出るが実際には取得できない」導線が生まれる。サーバが完成形で返した値だけを表示・コピーする。
 */
export const installDescriptorSchema = z.object({
  project_id: identifierSchema,
  release_id: identifierSchema,
  target: publishTargetSchema,
  version: z.string().min(1),
  /** 利用者に提示する導入手順の見出し。 */
  label: z.string().min(1),
  /** そのままコピーさせる導入コマンド。持たない target では null。 */
  command: z.string().min(1).nullable(),
  /** サーバ発行のダウンロード URL。持たない target では null。 */
  download_url: z.url().nullable(),
  /** web_app の起動先。持たない target では null。 */
  launch_url: z.url().nullable(),
  /** 署名付き URL の失効時刻。失効を持たない場合は null。 */
  expires_at: isoDateTimeSchema.nullable(),
});
export type InstallDescriptor = z.output<typeof installDescriptorSchema>;

/** S01 の絞り込み条件。URL 状態 (searchParams) と 1:1 で対応させる。 */
export const catalogListQuerySchema = z.object({
  target: publishTargetSchema.optional(),
  q: z.string().max(200).optional(),
  cursor: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});
export type CatalogListQuery = z.output<typeof catalogListQuerySchema>;
