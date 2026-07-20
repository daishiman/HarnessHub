/** テスト専用の描画補助。部品は UiProvider 配下でしか動かないため、包む手順を 1 箇所にまとめる。 */
import { render, type RenderResult } from '@testing-library/react';
import type { ReactNode } from 'react';

import { ToastProvider } from './components/Toast.js';
import { UiProvider, type UiPreferences } from './theme/UiProvider.js';

export function renderWithUi(
  node: ReactNode,
  preferences?: Partial<UiPreferences>,
): RenderResult {
  return render(
    <UiProvider defaultPreferences={preferences}>
      <ToastProvider>{node}</ToastProvider>
    </UiProvider>,
  );
}
