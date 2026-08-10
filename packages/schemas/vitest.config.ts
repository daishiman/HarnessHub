/** @harness-hub/schemas の vitest 設定 — 純粋な型・検証ロジックのみなので Node 環境で実行する。 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // feature 別 contract schema (`<feature>/contracts.ts`) のテストも検出する。
    // `src/**` だけだと feature dir に書いたテストが 1 度も実行されない「死んだテスト」になり、
    // 契約を守っているつもりで実は誰も検証していない状態になる。
    include: ['src/**/*.test.ts', '*/*.test.ts'],
    coverage: {
      provider: 'v8',
      // カバレッジ計測対象は共通層 (`src/`) のまま据え置く。feature dir を一括で対象へ入れると
      // 既存の未テスト feature まで閾値判定に巻き込まれ、無関係な赤で門が壊れるため。
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
