/** @harness-hub/ui の vitest 設定 — DOM 部品と axe 検査のため jsdom 環境で実行する。 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // jsdom 上の操作再現と axe 走査は既定の 5 秒に収まらないことがあるため広げる
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
