/** @harness-hub/db の vitest 設定 — 境界検証 (src) と feat-domain-model-db の実装テスト (__tests__)。 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', '__tests__/**/*.test.ts'],
  },
});
