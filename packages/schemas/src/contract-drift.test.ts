/** OpenAPI / zod drift 検査 (CI G8)。zod を変えて snapshot を更新し忘れたら fail する。 */
import { describe, expect, it } from 'vitest';

import {
  buildContractComponents,
  contractSchemaNames,
  createContractRegistry,
} from './contract-registry.js';

describe('契約登録簿', () => {
  it('宣言した契約名がすべて登録されている', () => {
    const registry = createContractRegistry();
    for (const name of contractSchemaNames) {
      expect(registry.get(name), `${name} が登録簿にない`).toBeDefined();
    }
  });

  it('登録簿に宣言外の契約が紛れていない', () => {
    const registered = createContractRegistry()
      .list()
      .map((entry) => entry.name);
    expect(registered).toEqual([...contractSchemaNames]);
  });

  it('paths を持たない (path 定義は consumer feature の責務)', () => {
    expect(buildContractComponents().paths).toEqual({});
  });
});

describe('OpenAPI drift', () => {
  /**
   * 生成物をファイル snapshot として commit し、zod 側の変更が
   * 公開契約に与える影響をレビュー可能にする。
   * 差分が出たら `pnpm --filter @harness-hub/schemas run openapi:update` で更新する。
   * CI (`CI=true`) では vitest が snapshot を自動更新しないため、drift はそのまま fail になる。
   */
  it('生成した OpenAPI components が commit 済み snapshot と一致する', async () => {
    const document = buildContractComponents();
    await expect(JSON.stringify(document, null, 2) + '\n').toMatchFileSnapshot(
      '../openapi/components.json',
    );
  });
});
