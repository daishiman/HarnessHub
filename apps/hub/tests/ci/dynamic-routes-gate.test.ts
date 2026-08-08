/**
 * 動的必須 route の静的化検査ゲート (scripts/check-dynamic-routes.mjs) の挙動固定。
 *
 * ゲート自体が壊れていると「検査したつもりで 0 件」になり、2026-08-08 と同じ本番 500 を
 * また素通りさせる。よって「違反を実際に検出できること」を合成 manifest で確かめる。
 */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// @ts-expect-error -- 検査 script は .mjs で型定義を持たない
import { findStaticViolations, readPrerenderedRoutes } from '../../scripts/check-dynamic-routes.mjs';

function buildDirWith(routes: Record<string, unknown>): string {
  return buildDirWithManifest({ version: 4, routes });
}

/** routes の形そのものを崩した manifest を置く (fail-closed 検査用)。 */
function buildDirWithManifest(manifest: unknown): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'hh-prerender-'));
  writeFileSync(path.join(dir, 'prerender-manifest.json'), JSON.stringify(manifest), 'utf8');
  return dir;
}

describe('動的必須 route の静的化検査', () => {
  // 2026-08-08 の変異テスト実測に対応する形。cookies() を env 条件の内側へ戻した版を
  // 実際にビルドすると `/` が `○` (静的) に分類され、prerender-manifest の routes に `"/"` が載り、
  // `node scripts/check-dynamic-routes.mjs` は exit 1 になった。その manifest 形をここで固定する。
  it('`/` が事前レンダリングされていたら違反として検出する', () => {
    const routes = readPrerenderedRoutes(buildDirWith({ '/': {}, '/legal': {} }));
    const violations = findStaticViolations(routes);
    expect(violations.map((entry: { route: string }) => entry.route)).toEqual(['/']);
  });

  // 修正版の実測。現物ビルドで静的化されるのは `/_not-found` と `/legal` の 2 件だけで、
  // `/` は `ƒ` (動的) となり manifest に載らない = 通過する。ここが緑でなければゲートが過検出している。
  it('`/` が無ければ違反なし (静的な `/legal` は対象外)', () => {
    const routes = readPrerenderedRoutes(buildDirWith({ '/legal': {}, '/_not-found': {} }));
    expect(findStaticViolations(routes)).toEqual([]);
  });

  it('manifest が無いビルドは null を返し、検査済みと取り違えない', () => {
    expect(readPrerenderedRoutes(mkdtempSync(path.join(tmpdir(), 'hh-empty-')))).toBeNull();
  });

  // manifest は読めたが routes が期待した形でない場合。ここを空集合に落とすと「0 件検査して全件通過」
  // になり、Next のビルド成果物の形が変わった日からゲートだけが静かに死ぬ。検査不能は必ず落とす。
  describe('routes が期待した形でない manifest は fail-closed で落ちる', () => {
    const brokenManifests: ReadonlyArray<readonly [string, unknown]> = [
      ['routes キーが欠落', { version: 4 }],
      ['routes が配列', { version: 4, routes: ['/'] }],
      ['routes が文字列', { version: 4, routes: '/' }],
      ['routes が null', { version: 4, routes: null }],
    ];

    for (const [label, manifest] of brokenManifests) {
      it(label, () => {
        expect(() => readPrerenderedRoutes(buildDirWithManifest(manifest))).toThrowError(/routes/);
      });
    }
  });
});
