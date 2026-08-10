import { ActionLink, Alert, Stack } from '@harness-hub/ui';
import type { ReactNode } from 'react';

import { PUBLISH_WIZARD_HREF, PUBLISH_WIZARD_LINK_LABEL } from '../../lib/routing/publish-wizard-entry.js';

/**
 * `/device` が何のための画面かの明示 (feat-web-only-publish-journey 受入 4・5)。
 *
 * page.tsx から切り出しているのは、この案内が session 状態にも `headers()` にも依存しない
 * 純粋な表示だから。分けておくと、警告が実際に描画されるかを画面丸ごとの前提なしに検査できる。
 *
 * 出す位置は承認フォームより**前**。確認コードを持たずに着いた利用者にとって、
 * 入力欄が最初に見えることが「ここで何か入力すれば進める」という誤解の入口になる。
 * 警告を承認操作より後ろに置くと、読む前に押せてしまう。
 *
 * session 状態 (サインイン済みか、Workspace があるか) に関わらず常に出すのは、
 * 行き止まりがどの状態でも起こりうるため —— 未サインインで着いた CLI 非利用者が最も迷いやすい。
 */
export function DeviceApprovalPurposeNotice(): ReactNode {
  return (
    <Stack gap={3}>
      <Alert
        tone="warning"
        title="自分で開始していない確認コードは承認しないでください"
        description="確認コードは、あなたがPublisherまたはCLIで操作を始めたときにだけ表示されます。心当たりのないコードを承認すると、他人の端末にあなたの権限を渡すことになります。"
      />
      <Alert
        tone="info"
        title="この画面はPublisher・CLIから始めた場合だけ使います"
        description="CLIを使わずにHubのWebだけでツールを公開したい場合は、この画面ではなく公開ウィザードへ進んでください。"
        action={<ActionLink href={PUBLISH_WIZARD_HREF}>{PUBLISH_WIZARD_LINK_LABEL}</ActionLink>}
      />
    </Stack>
  );
}
