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
  typescript: {
    // 型エラーは `pnpm --filter @harness-hub/hub run typecheck` で fail-closed に検査する
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
