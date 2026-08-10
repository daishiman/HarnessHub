// HF-A4-CONTRACT-001: @harness-hub/ui を 2 系統の consumer が public API 経由で参照し、同一実装を指すことを検証

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Button } from '@harness-hub/ui';
import { describe, expect, it } from 'vitest';
import * as consumerA from '../fixtures/consumer-a/uses-ui';
import { APP_ROOT, APP_SRC, boundaryBypassImports, CONSUMER_A, deepImports, publicApiImports } from './source-scan.js';

const PACKAGE_NAME = '@harness-hub/ui';

describe('contract: @harness-hub/ui', () => {
  it('consumer 系統 1 (apps/hub 本体) が public API 経由で参照している', () => {
    expect(publicApiImports(APP_SRC, PACKAGE_NAME).length).toBeGreaterThan(0);
    expect(deepImports(APP_SRC, PACKAGE_NAME)).toEqual([]);
  });

  /**
   * 上のテストは `exports` に載ったサブパス (tokens.css) を通す (HarnessHub-2fo1)。
   * その緩和が「サブパスなら何でも通す」に退化していないことを、実在しない deep import で確かめる。
   * ここが無いと、`@harness-hub/ui/src/...` のような本物の迂回まで緑になる。
   */
  it('exports に無いサブパスは deep import として検出し続ける', () => {
    const fixture = join(APP_ROOT, 'tests/fixtures/deep-import-probe');
    mkdirSync(fixture, { recursive: true });
    const probe = join(fixture, 'uses-ui-internal.ts');
    // 重複検出ゲートの走査対象でもあるので、共通層と同名の export をここに書かない
    writeFileSync(probe, `import '${PACKAGE_NAME}/src/components/Button.js';\n`, 'utf8');
    try {
      expect(deepImports(fixture, PACKAGE_NAME).map((record) => record.specifier)).toEqual([
        `${PACKAGE_NAME}/src/components/Button.js`,
      ]);
      // 公開済みサブパスの方は同じ走査でも違反にならない
      writeFileSync(probe, `import '${PACKAGE_NAME}/tokens.css';\n`, 'utf8');
      expect(deepImports(fixture, PACKAGE_NAME)).toEqual([]);
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  it('consumer 系統 2 (consumer-a fixture) が public API 経由で参照している', () => {
    expect(publicApiImports(CONSUMER_A, PACKAGE_NAME).length).toBeGreaterThan(0);
    expect(deepImports(CONSUMER_A, PACKAGE_NAME)).toEqual([]);
  });

  it('相対 path で packages/ を直接参照している箇所が無い', () => {
    expect(boundaryBypassImports(APP_SRC)).toEqual([]);
    expect(boundaryBypassImports(CONSUMER_A)).toEqual([]);
  });

  it('2 系統が同一の実装 (同一コンポーネント) を指している', () => {
    expect(consumerA.boundButton).toBe(Button);
  });
});
