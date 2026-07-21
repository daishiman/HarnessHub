import { beforeAll, vi } from 'vitest';

beforeAll(() => {
  if (typeof HTMLCanvasElement === 'undefined') return;
  // axe の color-contrast 検査が jsdom 未実装の canvas context を参照して出す
  // ノイズを抑える。画面結合テストは canvas 描画そのものを検証対象にしていない。
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: vi.fn(() => null),
  });
});
