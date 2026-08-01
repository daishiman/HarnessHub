/**
 * feat-dual-catalog-web の値域プリミティブ。
 *
 * publish pipeline 側の値域 (`../publish-pipeline/primitives.ts`) は再定義せず参照する。
 * ここに置くのは **catalog 閲覧・配布出口に固有の値域だけ**。
 */
import { z } from 'zod';

/**
 * marketplace 配信の source 解決状態。
 *
 * `pending-h7` は「公開ツールが 0 件」ではなく「**採用配布経路 (Stage 0 technical gate H7) が未確定**」を表す。
 * この 2 つを同じ空応答で表すと、gate 未成立が配信面から観測できなくなる (P03 指摘 R5)。
 * body 側のこの値と `x-catalog-source-status` ヘッダの両方で表明する。
 */
export const catalogSourceStatusSchema = z.enum(['ready', 'pending-h7']);
export type CatalogSourceStatus = z.output<typeof catalogSourceStatusSchema>;

/**
 * catalog 取得失敗の分類 (§6.1 縮退)。
 *
 * `degraded` は「Hub 側が応答しないが、導入済みのツールは動き続ける」状態。
 * 画面全体をエラーで潰さず、閲覧と install descriptor のコピーは残す。
 */
export const catalogFailureKindSchema = z.enum(['degraded', 'unauthorized', 'forbidden', 'fatal']);
export type CatalogFailureKind = z.output<typeof catalogFailureKindSchema>;
