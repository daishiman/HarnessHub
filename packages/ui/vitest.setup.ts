/** テスト間で DOM を確実に破棄し、a11y 検査が前のテストの残骸を拾わないようにする。 */
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
