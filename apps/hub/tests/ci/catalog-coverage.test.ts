/**
 * カタログの被覆検査 (HarnessHub-xaa3)。
 *
 * VRT (視覚回帰) は「カタログに載っている部品」しか守れない。部品を追加したのに
 * カタログへ載せ忘れると、その部品だけ検査の網から静かに外れ、しかも CI は緑のままになる。
 * 検査していないことが違反 0 件と同じ見た目になる、という一番たちの悪い状態なのでここで塞ぐ。
 *
 * ブラウザを使わないため、opt-in の browser job ではなく既定の test job で毎回走らせる。
 * 見落としの検出は「UI を触った PR だけ」ではなく常時効いている必要があるため。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { catalogEntries, catalogWrappers } from '../browser/catalog/entries.js';

const INDEX_PATH = resolve(process.cwd(), '../../packages/ui/src/index.ts');

/**
 * `index.ts` から「描画できる公開部品」の名前を取り出す。
 *
 * 型 export を先に捨ててから値 export を読むのは、`export type { ButtonProps }` の中身まで
 * 部品として数えると、実体の無い名前を「カタログ漏れ」と誤検出するため。
 * PascalCase に限るのは、token (`colorTokens`) や関数 (`buildThemeCss`) と部品を分ける唯一の手掛かりが
 * 命名規約だから。`AA_CONTRAST_TEXT` のような定数は `_` を含むので同じ規約で落ちる。
 */
function publicComponentNames(source: string): string[] {
  const withoutTypeExports = source
    .replace(/export\s+type\s*\{[^}]*\}[^;]*;/gs, '')
    .replace(/export\s+type[^;]*;/gs, '');
  const names = new Set<string>();
  for (const block of withoutTypeExports.matchAll(/export\s*\{([^}]*)\}/gs)) {
    for (const raw of (block[1] ?? '').split(',')) {
      const name = raw.trim();
      if (/^[A-Z][A-Za-z0-9]*$/.test(name)) names.add(name);
    }
  }
  return [...names].sort();
}

describe('コンポーネントカタログの被覆', () => {
  const source = readFileSync(INDEX_PATH, 'utf8');
  const published = publicComponentNames(source);
  const catalogued = new Set<string>([...catalogEntries.map((entry) => entry.name), ...catalogWrappers]);

  it('公開部品を 1 つ以上読み取れている (抽出そのものが壊れていないこと)', () => {
    // 抽出が 0 件に退化すると「漏れなし」と区別が付かなくなるので、下限を置く。
    expect(published.length).toBeGreaterThan(20);
    expect(published).toContain('Button');
    expect(published).toContain('DataTable');
  });

  it('公開部品がすべてカタログに載っている', () => {
    const missing = published.filter((name) => !catalogued.has(name));
    expect(
      missing,
      `カタログ未掲載の公開部品: ${missing.join(', ')} (tests/browser/catalog/entries.tsx へ追加すること)`,
    ).toEqual([]);
  });

  it('カタログに存在しない部品名が残っていない (削除された部品の見本が居座らない)', () => {
    const stale = [...catalogued].filter((name) => !published.includes(name));
    expect(stale, `公開されていないのにカタログにある名前: ${stale.join(', ')}`).toEqual([]);
  });

  it('entry 名が重複しない (同じ部品の見本が二重に並ばない)', () => {
    const names = catalogEntries.map((entry) => entry.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
