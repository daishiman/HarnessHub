/**
 * 実ブラウザ検証の実行設定 (opt-in)。
 *
 * 既定の `pnpm test` から分離しているのは、Chromium の起動が 1 回あたり数百 ms かかり、
 * 全開発者の毎回の実行を遅くするため。CI では専用 job から `pnpm test:browser` を呼ぶ。
 * 逆に「遅いから」といって既定側へ混ぜると、ブラウザ実体が無い環境で全体が落ちる。
 */
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
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
    // next/font の偽物は既定設定と同じ 1 箇所 (vitest.setup.ts) から供給する。
    // ここを外すと browser 経路だけモック無しになり、Next コンパイラ前提の import で落ちる
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/browser/**/*.browser.test.ts', 'tests/browser/**/*.browser.test.tsx'],
    // ブラウザ起動と描画待ちは既定の 5 秒に収まらない。
    testTimeout: 120_000,
    hookTimeout: 120_000,
    // 同時に何個も Chromium を起こすと計測が不安定になる (CPU 競合でレイアウトが遅れる)。
    fileParallelism: false,
  },
});
