import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SHORT_FORM_SOURCES = [
  'src/app/(workspace)/catalog/publish/page.tsx',
  'src/app/(dashboard)/feedback/new/page.tsx',
  'src/app/(dashboard)/docs/new/page.tsx',
  'src/app/(dashboard)/sheets/new/page.tsx',
  'src/app/(dashboard)/settings/account/page.tsx',
  'src/app/(dashboard)/settings/auth/page.tsx',
  'src/app/(dashboard)/settings/coefficients/page.tsx',
] as const;

const LONG_CONTENT_SOURCES = [
  'src/components/catalog/CatalogDetail.tsx',
  'src/app/(dashboard)/feedback/[id]/feedback-detail.tsx',
  'src/app/(dashboard)/docs/[id]/page.tsx',
  'src/app/(dashboard)/sheets/[id]/hearing-sheet-detail.tsx',
] as const;

const readSource = (path: string): string => readFileSync(resolve(process.cwd(), path), 'utf8');

function screenHeaderTags(source: string): readonly string[] {
  return [...source.matchAll(/<ScreenHeader[\s\S]*?\/>/g)].map((match) => match[0]);
}

describe('SCREENHEADER: 内容の長さに合わせた sticky 方針', () => {
  it.each(SHORT_FORM_SOURCES)('%s の短い作成・設定フォームは見出しを固定しない', (path) => {
    const headers = screenHeaderTags(readSource(path));
    expect(headers.length).toBeGreaterThan(0);
    expect(headers.every((header) => !/\bsticky\b/.test(header))).toBe(true);
  });

  it.each(LONG_CONTENT_SOURCES)('%s の長い詳細は見出しを固定する', (path) => {
    const headers = screenHeaderTags(readSource(path));
    expect(headers.length).toBeGreaterThan(0);
    expect(headers.every((header) => /\bsticky\b/.test(header))).toBe(true);
  });
});
