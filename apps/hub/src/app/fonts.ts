/**
 * UI フォント (frontend-spec §2.1 / Harness Studio デザインシステム §3)。
 *
 * 2 系統に分ける。
 *   - IBM Plex Sans … UI の英数字。本文 400 / 見出し 600-700 / ボタン 700。
 *   - JetBrains Mono … Harness ID・タグ・ログ・ステータスバッジ。等幅にして桁を揃える。
 * どちらも SIL Open Font License 1.1 (商用可・クレジット不要)。ライセンス本文は
 * `src/assets/fonts/LICENSE-*.txt` に実体ごと同梱している。
 *
 * **日本語は Web フォントを読み込まない。** 本文・見出しの和文はヒラギノ角ゴ / 游ゴシック
 * (システムフォント) が受け持つ。日本語字形は数 MB あり、subset を切り出せないため、
 * 読み込めば First Load の予算 (120KiB) を軽く超える。旧構成 (Noto Sans JP) はこの理由で
 * `preload: false` にせざるを得ず、結果として「あとから字が入れ替わる」体験になっていた。
 * 欧文だけを Plex に寄せる構成なら subset が小さく、先読みしても予算内に収まる。
 *
 * ## なぜ `next/font/google` ではなく `next/font/local` なのか (2026-08-14)
 *
 * `next/font/google` は実行時に Google へ取りに行かない代わりに **ビルド時に取りに行く**。
 * ネットワーク依存を消したのではなく、リクエスト時からビルド時へ移しただけだった。
 * その結果 `fonts.gstatic.com` の一時的失敗が `next build` を落とし、hub-ci の
 * `wrangler deploy` job ごと停止した (本番へ出せない状態が外部都合で発生する構造)。
 *
 * いまはフォント実体を repository に同梱し、ここから直接読む。これにより
 * **フォントの build 時取得経路**は Google Fonts の可用性から独立した。build 全体の
 * network independence を保証するものではない。実体の取得・更新・同一性検証は
 * `scripts/vendor-fonts.mjs` が担う (`--update` で再取得 / `--check` で台帳照合)。
 * `next/font/google` へ戻す変更は `scripts/check-google-font-build-fetch.mjs` が拒否する。
 *
 * 同梱物は subset ごとに 1 ファイルの**可変フォント** (variable font = 1 ファイルで太さを
 * 連続的に表現する形式) なので、weight は範囲で宣言する。従来の 400/500/600/700 は
 * `400 700` の範囲に含まれるため、見え方は変わらない。
 *
 * `display: 'swap'` は、フォント取得中に文字が見えなくなる状態 (FOIT) を避けるため。
 */
import localFont from 'next/font/local';

/*
 * `unicode-range` は Google Fonts の `latin` subset と同じ収録範囲を書く。同梱ファイルは latin しか
 * 含まないので、これを宣言しないと和文にも欧文フォントが当たり、グリフ探索の空振りが増える。
 *
 * 値の正本は `src/assets/fonts/fonts.manifest.json` の `unicode_range` である。ここで定数へ括り出して
 * 参照したいところだが、next/font のローダは「オプションは書き下したリテラルであること」を要求し、
 * 変数参照は `Font loader values must be explicitly written literals.` で build を落とす
 * (ビルド時に静的解析だけで値を確定させる必要があるため)。よって 2 箇所へ直書きし、
 * 台帳との一致は `tests/ui-foundation/vendored-fonts.test.ts` が守る。
 */

export const ibmPlexSans = localFont({
  src: [{ path: '../assets/fonts/ibm-plex-sans-latin.woff2', weight: '400 700', style: 'normal' }],
  display: 'swap',
  // design token の --hh-font-family から参照するための CSS 変数名
  variable: '--font-ibm-plex-sans',
  // 和文はここへ落ちる。デザインシステム §3「日本語本文・見出しはシステムフォント」の実体
  fallback: ['Hiragino Kaku Gothic ProN', 'Yu Gothic', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
    },
  ],
});

export const jetBrainsMono = localFont({
  src: [{ path: '../assets/fonts/jetbrains-mono-latin.woff2', weight: '400 600', style: 'normal' }],
  display: 'swap',
  variable: '--font-jetbrains-mono',
  fallback: ['ui-monospace', 'SFMono-Regular', 'SF Mono', 'Menlo', 'monospace'],
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
    },
  ],
});
