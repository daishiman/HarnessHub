'use client';

/**
 * S01 公開ウィザードの**結果表示**。初期チャンクから外すために独立ファイルにしてある
 * (HarnessHub-5vlq)。
 *
 * この節が描画されるのは公開要求が生まれた後だけで、画面を開いた直後には存在しない。
 * それでも同一ファイルに置いていると、検査結果の書式化 (`formatPublishFinding` /
 * `publishNeedsFixSummary`) と 9 状態分の文言が First Load JS へ載る。
 * `/catalog/publish` は G13 予算の残余が 517 バイトしかなく、次に import を 1 本足した PR が
 * 理由なく赤くなる位置にいたため、まずここを切った。
 */
import {
  formatPublishFinding,
  PUBLISH_NEEDS_FIX_HEADING,
  PUBLISH_RESUBMIT_ACTION_LABEL,
  type PublishRequestState,
  type PublishRequestView,
  publishNeedsFixSummary,
} from '@harness-hub/schemas';
import { ActionLink, Alert, StatusChip } from '@harness-hub/ui';
import type { ReactNode } from 'react';

import { publishStatusChipValue } from '../../lib/catalog/index.js';
import type { PublishJourneyScope } from '../../lib/publish-journey/index.js';
import { publishStatusHref } from './publish-status-href.js';

function statusDescription(status: PublishRequestState): string {
  switch (status) {
    case 'draft':
      return 'ZIP の投入を再開できます。';
    case 'validating':
      return 'Hub が ZIP を検査しています。';
    case 'needs_fix':
      return '指摘を直した ZIP を選び、同じ公開要求へ再投入してください。';
    case 'ready':
      return '検査を通過し、公開の準備ができています。';
    case 'approval_pending':
      return 'Workspace 管理者の確認を待っています。';
    case 'approved':
      return '承認済みです。公開処理の開始を待っています。';
    case 'publishing':
      return '公開処理を進めています。';
    case 'failed':
      return '公開処理は完了しませんでした。ZIP を確認し、新しい公開要求でやり直してください。';
    case 'published':
      return 'Hub への公開処理が完了しました。';
  }
}

export function PublishWizardOutcome({
  scope,
  request,
}: {
  readonly scope: PublishJourneyScope;
  readonly request: PublishRequestView;
}): ReactNode {
  return (
    <section aria-labelledby="publish-wizard-result-heading">
      <h3 id="publish-wizard-result-heading">公開状態</h3>
      <p aria-live="polite">
        <StatusChip domain="publish" status={publishStatusChipValue(request.status)} />
      </p>
      <p>{statusDescription(request.status)}</p>
      <p>
        公開要求 ID: <code>{request.id}</code>
      </p>
      <ActionLink href={publishStatusHref(scope, request.id)}>この公開状態を確認する</ActionLink>

      {request.status === 'needs_fix' ? (
        <section aria-labelledby="publish-wizard-findings-heading">
          <h4 id="publish-wizard-findings-heading">{PUBLISH_NEEDS_FIX_HEADING}</h4>
          <p>{publishNeedsFixSummary(request.verdict)}</p>
          {request.findings.length === 0 ? null : (
            <ul>
              {request.findings.map((finding) => (
                <li key={`${finding.stage}-${finding.rule_id}-${finding.path ?? ''}-${finding.line ?? ''}`}>
                  {formatPublishFinding(finding)}
                </li>
              ))}
            </ul>
          )}
          <p>{PUBLISH_RESUBMIT_ACTION_LABEL}</p>
        </section>
      ) : null}

      {request.status === 'published' ? (
        <Alert
          tone="warning"
          title="導入経路はまだ利用できません"
          description="ハーネスの配布方式を決める Stage 0 technical gate (H7) が未成立です。Hub への公開記録は完了していますが、誤った導入コマンドや利用不能なリンクは表示しません。H7 成立後、この公開状態から導入案内へ接続します。"
        />
      ) : null}
    </section>
  );
}
