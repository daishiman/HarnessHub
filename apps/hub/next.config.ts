// Next.js 設定。workspace 共通層はビルド成果物を持たない (src/index.ts 直 export) ため transpilePackages に登録する
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // docs/features/feat-hub-foundation/architecture-decision-record.md §2.4 の workspace member。
  // これらは tsc ビルドを持たず src/index.ts をそのまま公開するので Next 側でトランスパイルする。
  transpilePackages: [
    '@harness-hub/ui',
    '@harness-hub/schemas',
    '@harness-hub/inspection',
    '@harness-hub/estimation',
    '@harness-hub/db',
  ],
  // Worker bundle 3MiB (gzip 後) 予算のため、production build では source map を出力しない
  productionBrowserSourceMaps: false,
  experimental: {
    // 共通層は barrel (src/index.ts) 単一入口を契約にしているが、barrel 経由の named import は
    // 到達可能な 'use client' 部品を丸ごと client reference manifest へ載せる。
    // 実測 (2026-07-25): Alert 1 個しか使わない / が MarkdownView 依存の
    // react-markdown/micromark/rehype 一式 146.4 KB を初期チャンクで読んでいた (TBT 926ms, 予算 200ms)。
    // optimizePackageImports は build 時に barrel の named import を実体モジュールへ書き換えるため、
    // deep import 禁止という共通層の契約 (docs/shared-layers.md) を崩さずに未使用部品を落とせる。
    optimizePackageImports: ['@harness-hub/ui'],
  },
  // 共通層は ESM 流儀で `./x.js` と相対 import するが実体は .ts のため、webpack に読み替えを教える。
  // これが無いと `Module not found: Can't resolve './primitives.js'` で build が落ちる (2026-07-21 実測)。
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
    };
    return config;
  },
  typescript: {
    // 型エラーは `pnpm --filter @harness-hub/hub run typecheck` で fail-closed に検査する
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
