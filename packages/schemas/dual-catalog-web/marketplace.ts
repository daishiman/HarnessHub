/**
 * marketplace document の契約。
 *
 * 形式は `.claude-plugin/marketplace.json` (既存 marketplace-integrity CI が
 * `scripts/build-plugins-from-harness.py --check-only` で検証している形) を正本とし、**新形式を発明しない**。
 * 別形式を作ると、既存の検証資産がそのまま使えず、消費側 (installer) の実装も二重になる。
 */
import { z } from 'zod';

import { catalogSourceStatusSchema } from './primitives.js';

/**
 * plugin 1 件。`source` は**採用配布経路が確定して初めて確定する**値なので、
 * 経路未確定 (H7 未成立) の間はこの要素自体を生成しない (§3.1 fail-closed)。
 */
export const marketplacePluginSchema = z.object({
  name: z.string().min(1),
  /** 配布経路固有の参照。相対パス / URL / git 参照のいずれになるかは採用経路で決まる。 */
  source: z.string().min(1),
  description: z.string(),
  version: z.string().min(1),
  category: z.string().min(1),
  tags: z.array(z.string().min(1)),
});
export type MarketplacePlugin = z.output<typeof marketplacePluginSchema>;

export const marketplaceOwnerSchema = z.object({
  name: z.string().min(1),
});

/**
 * marketplace document 本体。
 *
 * `source_status` は既存 `.claude-plugin/marketplace.json` には無い**本 Hub 固有の追加項目**。
 * 「plugins が空」の理由が「公開ツール 0 件」なのか「配布経路未確定」なのかを、
 * 消費側が body だけで判別できるようにするために置く (P03 指摘 R5)。
 * 追加項目であり既存キーを変更しないため、既存 consumer の解釈は壊れない。
 */
export const marketplaceDocumentSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  version: z.string().min(1),
  metadata: z.object({
    description: z.string(),
    version: z.string().min(1),
  }),
  owner: marketplaceOwnerSchema,
  plugins: z.array(marketplacePluginSchema),
  source_status: catalogSourceStatusSchema,
});
export type MarketplaceDocument = z.output<typeof marketplaceDocumentSchema>;
