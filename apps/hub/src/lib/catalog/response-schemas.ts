/**
 * catalog の応答検証に**実際に使う schema だけ**を集めた遅延読み込み用モジュール (HarnessHub-aqi)。
 *
 * `import('@harness-hub/schemas')` を直接書くと namespace import になり、
 * `optimizePackageImports` の書き換え対象 (named import) から外れる。その結果 barrel が丸ごと評価され、
 * リポジトリ全 feature の zod schema (実測 2026-08-08: 23.7 KB raw / 7.9 KiB gzip、
 * 約 200 個の schema 構築) がブラウザのメインスレッドで走っていた。
 *
 * ここで named import に書き直しておくと、build 時に catalog が使う schema の実体モジュールだけへ
 * 解決される。deep import 禁止という共通層の契約 (docs/shared-layers.md) は崩さない
 * — import 元は package の単一入口 `@harness-hub/schemas` のままである。
 */

import {
  catalogDetailSchema,
  catalogListResponseSchema,
  installDescriptorSchema,
  publishRequestSchema,
  releaseListResponseSchema,
} from '@harness-hub/schemas';

/** `http-adapter.ts` の `SchemaSelector` が受け取る束。ここに無い schema は client へ落ちない。 */
export const catalogResponseSchemas = {
  catalogDetailSchema,
  catalogListResponseSchema,
  installDescriptorSchema,
  publishRequestSchema,
  releaseListResponseSchema,
} as const;

export type CatalogResponseSchemas = typeof catalogResponseSchemas;
