/** @harness-hub/db の vitest 設定 — 境界検証 (src) と feat-domain-model-db の実装テスト (__tests__)。 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', '__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/**/*.ts',
        'backup/**/*.ts',
        'connection/**/*.ts',
        'cron/**/*.ts',
        'registry/**/*.ts',
        'repository/**/*.ts',
        'schema/**/*.ts',
        // 網羅確認用デモデータ。表と fixture が計測対象外だと、
        // 参照されなくなった宣言が残っても誰も気付かない。
        'scripts/demo-coverage/**/*.ts',
      ],
      exclude: [
        '**/*.test.ts',
        'src/index.ts',
        'src/types.ts',
        'src/drizzle.ts',
        'backup/index.ts',
        'connection/index.ts',
        'repository/index.ts',
        'repository/db.ts',
      ],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
