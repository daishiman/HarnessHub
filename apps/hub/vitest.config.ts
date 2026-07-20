// apps/hub のテスト実行設定。既定は node 環境で、a11y のみ各ファイルの docblock で jsdom に切り替える
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // tsconfig の jsx: "preserve" は esbuild が扱えないため、テスト実行時だけ automatic に固定する
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx', 'tests/**/*.spec.ts', 'tests/**/*.spec.tsx'],
    // fixtures は「共通層の第 2 consumer 系統」であってテスト本体ではない
    exclude: ['node_modules/**', '.next/**', '.open-next/**', 'tests/fixtures/**'],
    // jsdom 上の axe 走査と bundle ゲートの子プロセス起動は既定の 5 秒に収まらない。
    // 時間切れを「違反 0 件」と誤読させないため広げる (packages/ui の設定と揃える)
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
