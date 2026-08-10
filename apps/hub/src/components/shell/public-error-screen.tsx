/**
 * 公開画面のエラー表示。骨格 (header / main) ごと差し替える。
 *
 * root の error.tsx は route group の外 (トップ・利用規約・サインイン等) で発火する。
 * その場合 layout は root layout だけが残り、骨格を持つ層が居なくなるため、
 * ここで PublicShell ごと包む。業務画面側は route group の error.tsx が
 * 業務シェルの内側で描画されるので包まない (main の入れ子を作らない)。
 *
 * 別ファイルにしてあるのは、error.tsx が client component であり、
 * ここを静的 import すると骨格の分だけ全 route の First Load JS が増えるため。
 * error.tsx 側で lazy 読み込みできるよう、境界をファイルで切っている。
 */
import type { ReactNode } from 'react';

import { ErrorScreen } from '../error-screen.js';
import { PublicShell } from './public-shell.js';

export interface PublicErrorScreenProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}

export function PublicErrorScreen({ error, reset }: PublicErrorScreenProps): ReactNode {
  return (
    <PublicShell>
      <ErrorScreen error={error} reset={reset} />
    </PublicShell>
  );
}
