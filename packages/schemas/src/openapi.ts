/** OpenAPI 生成の責務境界: schema の登録簿と document 組立だけを持ち、path 定義は consumer feature に委ねる。 */
import { z } from 'zod';

/**
 * 責務境界の宣言:
 * - 本 package が持つ = 「どの zod schema が API 契約として公開されるか」の登録簿と、
 *   その registry から OpenAPI document の `components.schemas` を組み立てる処理。
 * - 本 package が持たない = 個々のエンドポイント (`paths`) の定義。
 *   path は業務ドメインごとに変わるため、各 consumer feature が `paths` を渡す。
 * この線引きにより、契約の型は単一ソース (qa-009) のまま、業務知識は各 feature に残る。
 */

/** 登録簿の 1 件。`name` が `components.schemas` のキーになる。 */
export interface SchemaRegistration {
  name: string;
  schema: z.ZodType;
  description?: string;
}

/** zod schema を OpenAPI 用の JSON Schema へ変換する関数の口。 */
export type SchemaConverter = (schema: z.ZodType) => Record<string, unknown>;

/** API 契約として公開する schema の登録簿。 */
export interface SchemaRegistry {
  /** 登録する。同名の二重登録は契約の散逸そのものなので例外にする。 */
  register(registration: SchemaRegistration): void;
  get(name: string): SchemaRegistration | undefined;
  /** 登録順を保った一覧。 */
  list(): SchemaRegistration[];
}

export function createSchemaRegistry(initial: readonly SchemaRegistration[] = []): SchemaRegistry {
  const entries = new Map<string, SchemaRegistration>();

  const registry: SchemaRegistry = {
    register(registration) {
      if (entries.has(registration.name)) {
        throw new Error(`schema "${registration.name}" は既に登録されています (契約名は一意である必要があります)`);
      }
      entries.set(registration.name, registration);
    },
    get(name) {
      return entries.get(name);
    },
    list() {
      return [...entries.values()];
    },
  };

  for (const registration of initial) {
    registry.register(registration);
  }
  return registry;
}

/**
 * 既定の変換器。zod v4 標準の `toJSONSchema` を OpenAPI 3.0 向けに使う。
 * 独自の変換器を書かないことで、zod の型定義と OpenAPI 出力がずれないようにする。
 */
export const defaultSchemaConverter: SchemaConverter = (schema) =>
  z.toJSONSchema(schema, {
    target: 'openapi-3.0',
    io: 'output',
    // brand や refine のように JSON Schema へ写せない制約は、型ではなく実行時検証で担保する。
    unrepresentable: 'any',
  }) as Record<string, unknown>;

/** OpenAPI document の最小形。`paths` は consumer が組み立てて渡す。 */
export interface OpenApiDocument {
  openapi: string;
  info: { title: string; version: string; description?: string };
  paths: Record<string, unknown>;
  components: { schemas: Record<string, unknown> };
}

/**
 * 登録簿から OpenAPI document を組み立てる。
 * `paths` を引数で受け取ることが、上記の責務境界の実体。
 */
export function createOpenApiDocument(input: {
  info: { title: string; version: string; description?: string };
  registry: SchemaRegistry;
  paths?: Record<string, unknown>;
  converter?: SchemaConverter;
}): OpenApiDocument {
  const convert = input.converter ?? defaultSchemaConverter;
  const schemas: Record<string, unknown> = {};

  for (const registration of input.registry.list()) {
    const converted = convert(registration.schema);
    schemas[registration.name] = registration.description
      ? { description: registration.description, ...converted }
      : converted;
  }

  return {
    openapi: '3.0.3',
    info: input.info,
    paths: input.paths ?? {},
    components: { schemas },
  };
}
