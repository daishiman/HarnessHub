/** @harness-hub/db の vitest 設定 — 型境界の検証のみなので Node 環境で実行する。 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
