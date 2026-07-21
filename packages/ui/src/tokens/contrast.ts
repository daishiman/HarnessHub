/** WCAG 2.2 の相対輝度・コントラスト比の計算。design token の 4.5:1 保証をここ 1 箇所で判定する。 */

/** `#rgb` / `#rrggbb` を 0-255 の RGB へ変換する。 */
export function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const normalized = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!normalized) {
    throw new Error(`色は #rgb または #rrggbb 形式で指定してください: ${hex}`);
  }

  const body = normalized[1]!;
  const full = body.length === 3 ? body.replace(/./g, (char) => char + char) : body;
  const value = Number.parseInt(full, 16);

  return { r: (value >> 16) & 0xff, g: (value >> 8) & 0xff, b: value & 0xff };
}

/** WCAG 2.2 の相対輝度 (0 = 黒, 1 = 白)。 */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHexColor(hex);
  const channel = (raw: number): number => {
    const srgb = raw / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** 2 色のコントラスト比 (1〜21)。順序は結果に影響しない。 */
export function contrastRatio(foreground: string, background: string): number {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a);
  return (lighter! + 0.05) / (darker! + 0.05);
}

/** WCAG 2.2 AA の閾値。本文 4.5:1 / 大きい文字と図形 3:1。 */
export const AA_CONTRAST_TEXT = 4.5;
export const AA_CONTRAST_LARGE_TEXT = 3;
export const AA_CONTRAST_NON_TEXT = 3;

/** AA の本文基準 (4.5:1) を満たすか。 */
export function meetsTextContrast(foreground: string, background: string): boolean {
  return contrastRatio(foreground, background) >= AA_CONTRAST_TEXT;
}
