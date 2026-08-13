/**
 * 正規着地画面集約 (GET /api/v1/dashboard/summary) の wire 表現。
 *
 * sheets/feedback/builds は別 feature の list item schema をそのまま再利用する
 * (`@harness-hub/schemas`) — home-dashboard 側で見出しを重複定義すると、
 * 元の schema が変わったときに片方だけ直す事故になる。
 *
 * docs/users を持たない理由は home-dashboard/service.ts の JSDoc を参照
 * (要対応の概念がないため対象外、という設計判断そのものはサービス層に属する)。
 */
import { buildListItemSchema, feedbackListItemSchema, sheetListItemSchema } from '@harness-hub/schemas';
import { z } from 'zod';

const homeSectionSchema = <TItem extends z.ZodTypeAny>(itemSchema: TItem) =>
  z.discriminatedUnion('visible', [
    z
      .object({
        /** false は「0件」ではなく「この session には見せない (権限不足)」を表す。 */
        visible: z.literal(false),
        actionable_count: z.literal(0),
        recent_items: z.tuple([]),
      })
      .strict(),
    z
      .object({
        visible: z.literal(true),
        actionable_count: z.number().int().nonnegative(),
        recent_items: z.array(itemSchema),
      })
      .strict(),
  ]);

export const homeSummaryResponseSchema = z
  .object({
    sheets: homeSectionSchema(sheetListItemSchema),
    feedback: homeSectionSchema(feedbackListItemSchema),
    builds: homeSectionSchema(buildListItemSchema),
  })
  .strict();

export type HomeSummaryResponse = z.infer<typeof homeSummaryResponseSchema>;

export interface HomeSectionVisibility {
  readonly sheets: boolean;
  /** 要対応だけは既存の sheets own/all 契約に合わせる。recent は role にかかわらず本人だけ。 */
  readonly sheetsReadAll: boolean;
  readonly feedback: boolean;
  readonly builds: boolean;
}
