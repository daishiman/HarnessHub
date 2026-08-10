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
    setupFiles: ['./vitest.setup.ts'],
    include: [
      'tests/**/*.test.ts',
      'tests/**/*.test.tsx',
      'tests/**/*.spec.ts',
      'tests/**/*.spec.tsx',
      // feature 単位のテストは published task spec が src/__tests__/<feature>/ を Write scope に指定する。
      // ここへ追加しないと収集対象外となり「テストを書いたのに実行 0 件で緑」になる (P03 指摘 R6)
      'src/__tests__/**/*.test.ts',
      'src/__tests__/**/*.test.tsx',
    ],
    // fixtures は「共通層の第 2 consumer 系統」であってテスト本体ではない
    // tests/browser は実 Chromium を起動する opt-in 経路。既定へ混ぜると全員の実行が遅くなり、
    // ブラウザ実体の無い環境で既定のテストごと落ちる (実行は vitest.browser.config.ts 側)
    exclude: ['node_modules/**', '.next/**', '.open-next/**', 'tests/fixtures/**', 'tests/browser/**'],
    // jsdom 上の axe 走査と bundle ゲートの子プロセス起動は既定の 5 秒に収まらない。
    // 時間切れを「違反 0 件」と誤読させないため広げる (packages/ui の設定と揃える)
    testTimeout: 30_000,
    hookTimeout: 30_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        // テスト本体をカバレッジ母数に入れない (自己言及で閾値が歪む)
        'src/__tests__/**',
        // OpenNext のビルド生成物 (.open-next/worker.js) への静的 import を持つ配線層。
        // ビルドしないと import 先が存在せず、単体テストでは到達できない
        'src/worker.ts',
        // route/service が使う型だけの契約ファイル (実行コードなし)
        'src/lib/auth/device-flow/contracts.ts',
        // 公開入口のバレル (re-export のみ、実行コードなし)
        'src/lib/authz/index.ts',
      ],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
