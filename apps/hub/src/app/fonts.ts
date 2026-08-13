/**
 * UI フォント (frontend-spec §2.1 / Harness Studio デザインシステム §3)。
 *
 * 2 系統に分ける。
 *   - IBM Plex Sans … UI の英数字。本文 400 / 見出し 600-700 / ボタン 700。
 *   - JetBrains Mono … Harness ID・タグ・ログ・ステータスバッジ。等幅にして桁を揃える。
 * どちらも SIL Open Font License 1.1 (商用可・クレジット不要)。
 *
 * **日本語は Web フォントを読み込まない。** 本文・見出しの和文はヒラギノ角ゴ / 游ゴシック
 * (システムフォント) が受け持つ。日本語字形は数 MB あり、next/font は subset を切り出せないため、
 * 読み込めば First Load の予算 (120KiB) を軽く超える。旧構成 (Noto Sans JP) はこの理由で
 * `preload: false` にせざるを得ず、結果として「あとから字が入れ替わる」体験になっていた。
 * 欧文だけを Plex に寄せる構成なら subset が小さく、先読みしても予算内に収まる。
 *
 * `next/font/google` はビルド時にフォントを取得して自前配信に切り替えるため、
 * 実行時に Google のサーバへ取りに行かない (第三者への通信が発生しない = 情報漏えい面でも有利)。
 * `display: 'swap'` は、フォント取得中に文字が見えなくなる状態 (FOIT) を避けるため。
 */
import { IBM_Plex_Sans, JetBrains_Mono } from 'next/font/google';

export const ibmPlexSans = IBM_Plex_Sans({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  // design token の --hh-font-family から参照するための CSS 変数名
  variable: '--font-ibm-plex-sans',
  // 和文はここへ落ちる。デザインシステム §3「日本語本文・見出しはシステムフォント」の実体
  fallback: ['Hiragino Kaku Gothic ProN', 'Yu Gothic', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
});

export const jetBrainsMono = JetBrains_Mono({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
  fallback: ['ui-monospace', 'SFMono-Regular', 'SF Mono', 'Menlo', 'monospace'],
});
