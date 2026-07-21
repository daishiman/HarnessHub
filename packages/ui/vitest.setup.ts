/** テスト間で DOM を確実に破棄し、a11y 検査が前のテストの残骸を拾わないようにする。 */
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, vi } from 'vitest';

beforeAll(() => {
  // jsdom は canvas の描画 context を実装しておらず、axe が chart 部品を走査するたびに
  // "Not implemented" を stderr へ出す。描画自体を検証しない DOM/a11y テストでは null stub で十分。
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: vi.fn(() => null),
  });
});

afterEach(() => {
  cleanup();
});
