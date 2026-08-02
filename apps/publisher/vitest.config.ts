/** @harness-hub/publisher の vitest 設定 — CLI だが判定ロジックは純関数なので Node 環境で実行する。 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // core/auth/deploy の index.ts は re-export のみの barrel (ロジックを持たない) なので除外する。
      // cli/index.ts は argv 解析ロジックを持つため除外しない。
      exclude: ['src/**/*.test.ts', 'src/index.ts', 'src/core/index.ts', 'src/auth/index.ts', 'src/deploy/index.ts'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
