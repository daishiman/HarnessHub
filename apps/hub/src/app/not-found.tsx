// 見つからない画面。文言と導線は screen-states.tsx が唯一の実装を持つ
// 骨格 (header / main) は公開画面と同じ PublicShell から取る (root layout は骨格を持たない)

import { NotFoundScreen } from '../components/screen-states.js';
import { PublicShell } from '../components/shell/public-shell.js';

export default function NotFound() {
  return (
    <PublicShell>
      <NotFoundScreen />
    </PublicShell>
  );
}
