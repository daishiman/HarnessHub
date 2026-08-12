/**
 * SPG-*: 画面の採用パターン (`docs/screen-inventory.md` の SSOT) と実装の突き合わせ。
 *
 * 守りたいのは「表だけ直されて実装が付いてこない」「実装だけ直されて表が古いまま」の
 * 片側更新。SSOT を読んで実装を推測する後続作業が、最初から誤った前提で進むのを防ぐ。
 *
 * このテストは 3 つのことを表明する。
 * 1. current の各 route で、表の記載と実装の印が食い違っていない (SPG-GATE-001)
 * 2. **何件を判定し、何件を判定していないか** (SPG-GATE-002)。
 *    「違反 0 件」と「そもそも見ていない」が同じ緑に潰れると、ゲートがあること自体が
 *    誤った安心になる。判定件数が 0 に落ちたらこのテストは落ちる。
 * 3. 人工の食い違いを食い違いと言える (SPG-LIVE-*)。判定そのものが壊れていないことの確認。
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { judgeRow, parseRouteSurfaces, readEvidence } from '../support/screen-pattern.js';

const HUB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const APP_DIR = path.join(HUB_ROOT, 'src/app');
const INVENTORY = path.resolve(HUB_ROOT, '../../docs/screen-inventory.md');

/** `page.tsx` の場所から route を復元する。`(dashboard)` のような group は URL に出ない。 */
function routeOf(pageFile: string): string {
  const relative = path.relative(APP_DIR, path.dirname(pageFile));
  const segments = relative.split(path.sep).filter((segment) => segment !== '' && !segment.startsWith('('));
  return `/${segments.join('/')}`;
}

function collectPages(dir: string): readonly string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // API route は画面ではない
      if (entry.name === 'api') continue;
      found.push(...collectPages(full));
    } else if (entry.name === 'page.tsx') {
      found.push(full);
    }
  }
  return found;
}

/**
 * page.tsx から相対 import を辿って、その画面を構成するソースを 1 本に連結する。
 *
 * 画面の中身は page.tsx ではなく、そこから呼ばれる client component 側にある
 * (一覧の本体は `document-list.tsx` など)。page.tsx だけを見ると、どの画面も
 * 「印が無い」= 判定対象外になり、ゲートが空回りする。
 */
function screenSource(pageFile: string): string {
  const seen = new Set<string>();
  const parts: string[] = [];

  const visit = (file: string): void => {
    if (seen.has(file) || !existsSync(file)) return;
    seen.add(file);
    const source = readFileSync(file, 'utf8');
    parts.push(source);
    for (const match of source.matchAll(/from '(\.[^']+)'/g)) {
      const specifier = match[1] as string;
      // TypeScript の import は `.js` で書くが、実体は `.tsx` / `.ts`
      const base = path.resolve(path.dirname(file), specifier).replace(/\.js$/, '');
      for (const candidate of [`${base}.tsx`, `${base}.ts`]) {
        if (existsSync(candidate)) {
          visit(candidate);
          break;
        }
      }
    }
  };

  visit(pageFile);
  return parts.join('\n');
}

const pagesByRoute = new Map(collectPages(APP_DIR).map((file) => [routeOf(file), file]));
const currentRows = parseRouteSurfaces(readFileSync(INVENTORY, 'utf8')).filter((row) => row.state === 'current');

describe('SPG: 画面の採用パターンと実装', () => {
  it('SPG-GATE-000: SSOT 表を読めていて、current の行がある', () => {
    // 表の位置や書式が変わったとき、0 行を静かに全部緑にしないための足場
    expect(currentRows.length).toBeGreaterThan(10);
  });

  it('SPG-GATE-001: current の各 route で、表の記載と実装が食い違わない', () => {
    const mismatches = currentRows
      .map((row) => {
        const pageFile = pagesByRoute.get(row.route);
        // 表に current と書いてあるのに route が無いのは、それ自体が食い違い
        if (pageFile === undefined) {
          return {
            surfaceId: row.surfaceId,
            route: row.route,
            verdict: 'mismatch' as const,
            reason: 'route が実装に無い',
          };
        }
        return judgeRow(row, readEvidence(screenSource(pageFile)));
      })
      .filter((judgement) => judgement.verdict === 'mismatch')
      .map((judgement) => `${judgement.surfaceId} (${judgement.route}): ${judgement.reason}`);

    expect(mismatches).toStrictEqual([]);
  });

  it('SPG-GATE-002: 判定した件数と、判定していない件数の両方を表明する', () => {
    const judgements = currentRows.map((row) => {
      const pageFile = pagesByRoute.get(row.route);
      return pageFile === undefined
        ? { verdict: 'mismatch' as const }
        : judgeRow(row, readEvidence(screenSource(pageFile)));
    });
    const judged = judgements.filter((judgement) => judgement.verdict !== 'not-judgeable').length;
    const skipped = judgements.filter((judgement) => judgement.verdict === 'not-judgeable').length;

    // 判定件数が 0 でも SPG-GATE-001 は緑になる。それを緑と呼ばないための下限
    expect(judged).toBeGreaterThanOrEqual(10);
    // 判定対象外 (form / content / settings-sections など) は必ず残る。
    // 0 になったら語彙の判定規則が実態からずれた合図なので、数を見て気付けるようにする
    expect(skipped).toBeGreaterThan(0);
    expect(judged + skipped).toBe(currentRows.length);
  });
});

/**
 * ゲート自身の検出力。
 *
 * 実装を壊して赤を見る代わりに、合成した表と合成したソースを判定へ通す。
 * 実物を壊す形にすると、確認のたびに 26 画面の実装へ手を入れることになる。
 */
describe('SPG-LIVE: 判定が食い違いを食い違いと言う', () => {
  const row = (wide: string, narrow: string) => ({
    state: 'current',
    surfaceId: 'SYNTH',
    route: '/synthetic',
    wide,
    middle: wide,
    narrow,
  });

  it('SPG-LIVE-001: 狭い画面をカードにすると書いてあるのに畳んでいない実装は落ちる', () => {
    const carded = readEvidence('<DataTable narrowAs="card-collection" />');
    const notCarded = readEvidence('<DataTable />');

    expect(judgeRow(row('table', 'card-collection'), carded).verdict).toBe('ok');
    expect(judgeRow(row('table', 'card-collection'), notCarded).verdict).toBe('mismatch');
  });

  it('SPG-LIVE-002: 逆向き (表のままと書いてあるのにカードへ畳む) も落ちる', () => {
    // 片側だけ見る判定になっていないかの確認。表の記載を変えたのに実装が付いてこない、の逆
    expect(judgeRow(row('table', 'table'), readEvidence('<DataTable />')).verdict).toBe('ok');
    expect(judgeRow(row('table', 'table'), readEvidence('<DataTable narrowAs="card-collection" />')).verdict).toBe(
      'mismatch',
    );
  });

  it('SPG-LIVE-003: 合成された語彙は両方の軸を見る (片方だけ満たしても緑にしない)', () => {
    const tableOnly = readEvidence('<DataTable narrowAs="card-collection" />');
    const both = readEvidence('<BarChart /><DataTable narrowAs="card-collection" />');

    expect(judgeRow(row('chart+table', 'chart+card-collection'), both).verdict).toBe('ok');
    expect(judgeRow(row('chart+table', 'chart+card-collection'), tableOnly).verdict).toBe('mismatch');
  });

  it('SPG-LIVE-004: 印を持たない語彙は「緑」ではなく「判定していない」と言う', () => {
    // ここが `ok` に潰れると、SPG-GATE-002 の件数が水増しされて未検査が見えなくなる
    expect(judgeRow(row('form', 'form'), readEvidence('')).verdict).toBe('not-judgeable');
    expect(judgeRow(row('settings-sections', 'settings-sections'), readEvidence('')).verdict).toBe('not-judgeable');
  });

  it('SPG-LIVE-005: 表を読み取れなくなったら例外にする (0 行を緑と読まない)', () => {
    expect(() => parseRouteSurfaces('# 表の無い文書')).toThrow(/marker/);
  });
});
