/**
 * skills-package manifest (plugin.json) の緩い型 (feat-publisher-plugin AD-1)。
 *
 * 値域・必須判定の正本は @harness-hub/inspection の package-rules.ts
 * (PKG-REQUIRED-META / PKG-SEMVER / PKG-OWNER-DECLARED) であり、ここでは判定しない。
 * ここは「manifest というものが持ちうるフィールドの形」を宣言するだけの緩い schema にする
 * — 必須/形式チェックを重ねると判定 owner が 2 箇所になる (AD-3)。
 */
import { z } from 'zod';

export const publisherPackageVisibilitySchema = z.enum(['private', 'workspace']);
export type PublisherPackageVisibility = z.output<typeof publisherPackageVisibilitySchema>;

export const publisherPackageManifestSchema = z.object({
  name: z.string().min(1).optional(),
  version: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  owner: z.string().min(1).optional(),
  visibility: publisherPackageVisibilitySchema.optional(),
  summary: z.string().min(1).optional(),
});
export type PublisherPackageManifest = z.output<typeof publisherPackageManifestSchema>;
