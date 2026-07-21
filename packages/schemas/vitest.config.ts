/** @harness-hub/schemas の vitest 設定 — 純粋な型・検証ロジックのみなので Node 環境で実行する。 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
});
