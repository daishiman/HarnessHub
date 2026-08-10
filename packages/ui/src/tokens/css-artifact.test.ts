/**
 * TOKEN-CSS-01..04: 静的 CSS 成果物 `tokens.css` のドリフト検出 (HarnessHub-2fo1)。
 *
 * 生成物を git 管理下に置く構成の唯一の弱点は「token を変えたのに再生成し忘れる」こと。
 * その状態は型検査もビルドも通ってしまい、**本番だけ古い見た目になる**という
 * 最も気づきにくい壊れ方をする。ここで実ファイルと生成関数の出力を突き合わせて塞ぐ。
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { buildBaseCss } from './base-css.js';
import { buildTokenCssArtifact, TOKEN_CSS_BANNER } from './css-artifact.js';
import { buildThemeCss } from './tokens.js';

const cssPath = join(dirname(fileURLToPath(import.meta.url)), 'tokens.css');
const committed = readFileSync(cssPath, 'utf8');

describe('tokens.css / 生成物のドリフト検出', () => {
  it('TOKEN-CSS-01: コミット済みファイルが生成関数の出力と完全一致する', () => {
    // 落ちたら `pnpm --filter @harness-hub/ui run gen:tokens-css` を実行する
    expect(committed).toBe(buildTokenCssArtifact());
  });

  it('TOKEN-CSS-02: inline 時代と同じ CSS を欠落なく含む', () => {
    // 一致検査だけだと「生成関数ごと空にした」変更を見逃す。
    // 実際に配っていた 2 層が両方入っていることを内容側からも押さえる
    expect(committed).toContain(buildThemeCss());
    expect(committed).toContain(buildBaseCss());
    expect(committed.indexOf(buildThemeCss())).toBeLessThan(committed.indexOf(buildBaseCss()));
  });

  it('TOKEN-CSS-03: 自動生成である旨のバナーを先頭に持つ', () => {
    expect(committed.startsWith(TOKEN_CSS_BANNER)).toBe(true);
  });

  it('TOKEN-CSS-04: 外部 stylesheet 化の目的である「HTML から外れる量」が実在する', () => {
    // 効果の下限を数値で固定する。ここが数百バイトまで縮んだら、
    // それは token を失ったか生成が壊れたかのどちらかで、いずれも退行
    expect(committed.length).toBeGreaterThan(6_000);
  });
});
