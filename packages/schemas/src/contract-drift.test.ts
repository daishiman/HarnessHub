/**
 * OpenAPI / zod drift 検査 (CI G8) の本体。
 * zod を単一ソース (qa-009) として OpenAPI を生成し、commit 済み snapshot と突き合わせる。
 * 一致すれば exit 0、乖離すれば非ゼロ (fail-closed)。
 *
 * このゲート自体が「常に一致」と言うだけの空ゲートになっていないことは、
 * contract-drift-gate.test.ts が乖離を仕込んで非ゼロ終了を実測して担保する。
 */
import { describe, expect, it } from 'vitest';

import {
  buildContractComponents,
  contractSchemaNames,
  createContractRegistry,
  renderContractDocument,
} from './contract-registry.js';

/**
 * 突き合わせ先の snapshot。既定は commit 済みの正本。
 * ゲートの実効性検証だけが、書き換えた複製を指すためにこの環境変数を使う。
 */
const snapshotPath = process.env['HH_OPENAPI_SNAPSHOT'] ?? '../openapi/components.json';

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
   * 生成物をファイル snapshot として commit し、zod 側の変更が公開契約へ与える影響を
   * レビュー可能にする。差分が出たら `pnpm --filter @harness-hub/schemas run openapi:update`。
   * CI (`CI=true`) では vitest が snapshot を自動更新しないため、乖離はそのまま fail になる。
   */
  it('生成した OpenAPI components が commit 済み snapshot と一致する', async () => {
    await expect(renderContractDocument()).toMatchFileSnapshot(snapshotPath);
  });
});
