// 読込中の見え方は screen-states.tsx が唯一の実装を持つ (画面ごとに別物にしないため)
// 骨格 (header / main) は公開画面と同じ PublicShell から取る (root layout は骨格を持たない)

import { LoadingScreen } from '../components/screen-states.js';
import { PublicShell } from '../components/shell/public-shell.js';

export default function Loading() {
  return (
    <PublicShell>
      <LoadingScreen />
    </PublicShell>
  );
}
