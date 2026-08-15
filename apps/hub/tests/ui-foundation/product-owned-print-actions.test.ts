/**
 * 製品所有の印刷導線を戻さないための source 契約。
 * ブラウザ標準の印刷と印刷 stylesheet は利用可能なままなので、
 * ここで数えるのはアプリが所有する button / window.print 呼び出しだけ。
 */
import { readdirSync, readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE_ROOT = resolve(process.cwd(), 'src');

function sourceFiles(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return ['.ts', '.tsx'].includes(extname(entry.name)) ? [path] : [];
  });
}

describe('製品所有の印刷 action', () => {
  it('Button / button と window.print 呼び出しがともに 0 件', () => {
    const matches = sourceFiles(SOURCE_ROOT).flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      const windowPrint = source.match(/\bwindow\.print\s*\(/g) ?? [];
      const printButtons =
        source.match(/<(?:Button|button)\b[^>]*>[\s\S]{0,240}?印刷[\s\S]{0,240}?<\/(?:Button|button)>/g) ?? [];
      return [...windowPrint.map(() => `${file}: window.print`), ...printButtons.map(() => `${file}: 印刷ボタン`)];
    });

    expect(matches).toEqual([]);
  });
});
