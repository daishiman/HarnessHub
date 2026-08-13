/**
 * 本文フォント (frontend-spec §2.1: Noto Sans JP / next/font self-host / display swap)。
 *
 * `next/font/google` はビルド時にフォントを取得して自前配信に切り替えるため、
 * 実行時に Google のサーバへ取りに行かない (第三者への通信が発生しない = 情報漏えい面でも有利)。
 *
 * `display: 'swap'` にしているのは、フォント取得中に文字が見えなくなる状態 (FOIT) を避けるため。
 * 先に代替フォントで表示し、届いたら差し替える。
 *
 * `preload: false` は Noto Sans JP の事情による。日本語の字形は数 MB あり、
 * next/font は日本語 subset を切り出せないので、全ページで先読みすると
 * First Load の予算 (120KiB) を軽く超える。実際に使う画面で遅れて読み込ませる。
 */
import { IBM_Plex_Sans, JetBrains_Mono, Noto_Sans_JP } from 'next/font/google';

export const notoSansJp = Noto_Sans_JP({
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
  preload: false,
  // design token の --hh-font-family から参照するための CSS 変数名
  variable: '--font-noto-sans-jp',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
});

/**
 * UI 英数字用 (HarnessHub 配色仕様書 v2 §3)。`fontFamily` トークンで Noto Sans JP より
 * 手前に置き、ラテン文字は Plex、日本語グリフは Noto Sans JP へ字形単位でフォールバックさせる
 * (lang 分岐を持たずに 1 つの font-family 宣言で両方を賄う一般的な手法)。
 */
export const ibmPlexSans = IBM_Plex_Sans({
  weight: ['400', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  preload: false,
  variable: '--font-ibm-plex-sans',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
});

/** Harness ID・タグ・ログ表示用の等幅フォント。 */
export const jetBrainsMono = JetBrains_Mono({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  display: 'swap',
  preload: false,
  variable: '--font-jetbrains-mono',
  fallback: ['ui-monospace', 'SFMono-Regular', 'SF Mono', 'Menlo', 'monospace'],
});
