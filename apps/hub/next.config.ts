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
  /**
   * libSQL driver の **workerd 版実体**を trace 対象へ足す (HarnessHub-b7ng)。
   *
   * Next の file tracing は Node の解決条件で module graph を辿るので、package の exports が
   * `workerd` 条件で別ファイルを指している場合その実体は複写されない。一方 opennextjs-cloudflare の
   * esbuild は workerd 条件で解決するため、複写されなかった側を要求して
   * `Could not resolve "@libsql/isomorphic-ws"` で落ちる (両者が違う条件で同じ package を見る)。
   *
   * 対象はチェーン中で `workerd` 条件を持つ 3 package のみ (client / isomorphic-ws / isomorphic-fetch)。
   * どれも pure JS で、native binding を含む @libsql/darwin-* は意図的に外してある。
   * ここに列挙しても bundle には esbuild が到達した分しか入らない (複写 = 同梱ではない)。
   */
  outputFileTracingIncludes: {
    '**/*': [
      '../../node_modules/@libsql/client/**/*.{js,mjs,cjs,json}',
      '../../node_modules/@libsql/isomorphic-ws/**/*.{js,mjs,cjs,json}',
      '../../node_modules/@libsql/isomorphic-fetch/**/*.{js,mjs,cjs,json}',
    ],
  },
  // 共通層は ESM 流儀で `./x.js` と相対 import するが実体は .ts のため、webpack に読み替えを教える。
  // これが無いと `Module not found: Can't resolve './primitives.js'` で build が落ちる (2026-07-21 実測)。
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
    };
    /**
     * apps/hub は workerd 専用なので、DB package 内の Node 用 factory が同じ barrel から
     * re-export されていても native libSQL entry を bundle graph へ入れない。
     *
     * Linux の clean install では native entry (`libsql/index.js`) の動的 import context が
     * 依存 package の README/LICENSE まで JavaScript として拾い、Next webpack build が
     * parse error になった。exact-match alias なら `@libsql/client/web` 自体は書き換えず、
     * bare entry だけを Web 実装へ固定できる。Node CLI / DB test は Next の外なので影響しない。
     */
    config.resolve.alias = {
      ...config.resolve.alias,
      '@libsql/client$': '@libsql/client/web',
    };
    return config;
  },
  typescript: {
    // 型エラーは `pnpm --filter @harness-hub/hub run typecheck` で fail-closed に検査する
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
