/**
 * S01 Web 公開で Project を準備するための最小契約。
 *
 * Project の作成者を owner にする判断と tenant/workspace の束縛は server が行う。
 * client に owner や scope を申告させないことで、Web 経路だけが広い権限を得る余地を作らない。
 */
import { z } from 'zod';

import { identifierSchema } from '../src/primitives.js';

export const createPublishProjectSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2_000).default(''),
  })
  .strict();
export type CreatePublishProject = z.output<typeof createPublishProjectSchema>;

export const publishProjectSchema = z.object({
  id: identifierSchema,
  name: z.string().min(1),
  description: z.string(),
});
export type PublishProject = z.output<typeof publishProjectSchema>;
