// 読込中の見え方は screen-states.tsx が唯一の実装を持つ (画面ごとに別物にしないため)
import { LoadingScreen } from '../components/screen-states.js';

export default function Loading() {
  return <LoadingScreen />;
}
