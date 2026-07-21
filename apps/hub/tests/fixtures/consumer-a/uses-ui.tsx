// 第 2 consumer 系統による @harness-hub/ui の利用。design system をここで再実装しない
import { Button } from '@harness-hub/ui';

export const boundButton = Button;

/** consumer としての実利用: 共通 Button をそのまま使った画面片 */
export function ConsumerAPanel() {
  return (
    <section aria-labelledby="consumer-a-heading">
      <h2 id="consumer-a-heading">consumer-a</h2>
      <Button>送信</Button>
    </section>
  );
}
