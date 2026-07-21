/** OpenAPI 生成の責務境界 (登録簿 + document 組立) の単体テスト。 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  createOpenApiDocument,
  createSchemaRegistry,
  defaultSchemaConverter,
  healthResponseSchema,
  type SchemaRegistry,
} from './index.js';

describe('createSchemaRegistry', () => {
  it('登録した schema を名前で引ける', () => {
    const registry = createSchemaRegistry();
    registry.register({ name: 'HealthResponse', schema: healthResponseSchema });

    expect(registry.get('HealthResponse')?.schema).toBe(healthResponseSchema);
  });

  it('未登録の名前は undefined を返す', () => {
    expect(createSchemaRegistry().get('Unknown')).toBeUndefined();
  });

  it('登録順を保った一覧を返す', () => {
    const registry = createSchemaRegistry([
      { name: 'A', schema: z.string() },
      { name: 'B', schema: z.number() },
    ]);

    expect(registry.list().map((entry) => entry.name)).toEqual(['A', 'B']);
  });

  it('同名の二重登録は契約の散逸なので例外にする', () => {
    const registry = createSchemaRegistry([{ name: 'A', schema: z.string() }]);

    expect(() => registry.register({ name: 'A', schema: z.number() })).toThrow(/既に登録/);
  });
});

describe('defaultSchemaConverter', () => {
  it('zod の object を JSON Schema へ変換する', () => {
    const converted = defaultSchemaConverter(z.object({ id: z.string() }));

    expect(converted['type']).toBe('object');
    expect(converted['properties']).toMatchObject({ id: { type: 'string' } });
  });

  it('brand や refine を含む契約 schema も変換できる', () => {
    const converted = defaultSchemaConverter(healthResponseSchema);
    const properties = converted['properties'] as Record<string, unknown>;

    expect(Object.keys(properties).sort()).toEqual(['checkedAt', 'dependencies', 'status', 'version']);
  });
});

describe('createOpenApiDocument', () => {
  const registry: SchemaRegistry = createSchemaRegistry([
    { name: 'HealthResponse', schema: healthResponseSchema, description: '死活応答' },
  ]);
  const info = { title: 'Harness Hub API', version: '0.1.0' };

  it('registry の内容を components.schemas へ展開する', () => {
    const document = createOpenApiDocument({ info, registry });

    expect(document.openapi).toBe('3.0.3');
    expect(document.info).toEqual(info);
    expect(Object.keys(document.components.schemas)).toEqual(['HealthResponse']);
  });

  it('description を持つ登録は変換結果へ併記する', () => {
    const document = createOpenApiDocument({ info, registry });
    const schema = document.components.schemas['HealthResponse'] as Record<string, unknown>;

    expect(schema['description']).toBe('死活応答');
  });

  it('paths は consumer が渡す責務境界であり、既定は空', () => {
    expect(createOpenApiDocument({ info, registry }).paths).toEqual({});

    const paths = { '/health': { get: { responses: { '200': {} } } } };
    expect(createOpenApiDocument({ info, registry, paths }).paths).toEqual(paths);
  });

  it('変換器を差し替えられる', () => {
    const document = createOpenApiDocument({
      info,
      registry,
      converter: () => ({ $ref: '#/stub' }),
    });

    expect(document.components.schemas['HealthResponse']).toEqual({
      description: '死活応答',
      $ref: '#/stub',
    });
  });
});
