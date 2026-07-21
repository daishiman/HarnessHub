// P0 シェルのトップ画面。dashboard 等の低優先 UI は作らず、基盤が起動していることだけを示す
// 表示部品は必ず @harness-hub/ui から import する (apps/hub 内で design system を再実装しない)
import { Alert } from '@harness-hub/ui';

export default function HomePage() {
  return (
    <section aria-labelledby="status-heading">
      <h2 id="status-heading">稼働状況</h2>
      <Alert
        tone="success"
        title="Hub の実行基盤が起動しています"
        description="依存先を含む死活状態は /health で確認できます。"
        action={<a href="/health">/health を開く</a>}
      />
    </section>
  );
}
