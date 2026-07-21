/** 本 package が API 契約として公開する schema の登録簿。OpenAPI/zod drift 検査 (CI G8) の入力になる。 */
import { dependencyCheckSchema, healthResponseSchema, healthStatusSchema } from './health.js';
import { fieldErrorSchema, problemDetailsSchema } from './envelope.js';
import { paginationQuerySchema } from './primitives.js';
import { createSchemaRegistry, createOpenApiDocument } from './openapi.js';
import type { OpenApiDocument, SchemaRegistry } from './openapi.js';

/**
 * 契約名 (`components.schemas` のキー) の一覧。
 * ここに載る = 外部に公開される契約、という宣言なので、追加時は drift 検査の snapshot 更新が要る。
 */
export const contractSchemaNames = [
  'HealthStatus',
  'DependencyCheck',
  'HealthResponse',
  'FieldError',
  'ProblemDetails',
  'PaginationQuery',
] as const;

export type ContractSchemaName = (typeof contractSchemaNames)[number];

/**
 * 契約 schema の登録簿を作る。
 * 業務ドメイン固有の schema は含めない (本 package の責務は共通プリミティブと共通エンベロープまで)。
 */
export function createContractRegistry(): SchemaRegistry {
  return createSchemaRegistry([
    { name: 'HealthStatus', schema: healthStatusSchema, description: '死活状態の語彙' },
    { name: 'DependencyCheck', schema: dependencyCheckSchema, description: '依存先 1 件の検査結果' },
    { name: 'HealthResponse', schema: healthResponseSchema, description: 'GET /health の応答契約' },
    { name: 'FieldError', schema: fieldErrorSchema, description: '項目単位の検証エラー' },
    { name: 'ProblemDetails', schema: problemDetailsSchema, description: 'RFC 9457 problem+json' },
    { name: 'PaginationQuery', schema: paginationQuerySchema, description: 'cursor ページングの問い合わせ' },
  ]);
}

/**
 * 契約 schema から `components.schemas` だけを持つ OpenAPI document を作る。
 * `paths` を持たないのは責務境界の通り (path は consumer feature が渡す)。
 * drift 検査はこの出力を snapshot と突き合わせる。
 */
export function buildContractComponents(info?: { title: string; version: string }): OpenApiDocument {
  return createOpenApiDocument({
    info: info ?? { title: 'Harness Hub 共通契約', version: '0.1.0' },
    registry: createContractRegistry(),
  });
}

/**
 * drift 検査が突き合わせる正規化済みテキスト。
 * commit する snapshot と生成物の比較を「同じ 1 つの関数の出力どうし」に揃えることで、
 * 整形の違いを乖離と誤検出しないようにする。
 */
export function renderContractDocument(info?: { title: string; version: string }): string {
  return JSON.stringify(buildContractComponents(info), null, 2) + '\n';
}
