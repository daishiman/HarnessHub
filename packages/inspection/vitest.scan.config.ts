/** secret scan ゲート専用の vitest 設定。通常の `pnpm test` (src/**\/*.test.ts) とは対象を分ける。 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['scan/**/*.scan.ts'],
    // ゲートとして 1 度だけ走らせる。監視実行はしない。
    watch: false,
  },
});
