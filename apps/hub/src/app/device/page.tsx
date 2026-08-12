import { Alert, ScreenHeader, Stack } from '@harness-hub/ui';
import type { Metadata } from 'next';
import { headers } from 'next/headers';

import { PublicShell } from '../../components/shell/public-shell.js';
import { authRuntime } from '../../lib/authz/index.js';
import { normalizeUserCodeInput } from './device-approval-code.js';
import { DeviceApprovalForm } from './device-approval-form.js';
import { DeviceApprovalPurposeNotice } from './device-approval-purpose-notice.js';
import { resolveDeviceApprovalSession } from './device-approval-session.js';

export const metadata: Metadata = {
  title: '端末の承認 | Harness Hub',
  description: 'PublisherまたはCLIのDevice Flow確認コードを承認します。',
};

interface DeviceApprovalPageProps {
  readonly searchParams: Promise<{ readonly user_code?: string | readonly string[] }>;
}

export default async function DeviceApprovalPage(props: DeviceApprovalPageProps) {
  // 画面骨格はここで 1 度だけ包む。本体は状態ごとに早期 return するため関数を分けている
  return (
    <PublicShell>
      <Stack gap={4}>
        <DeviceApprovalPurposeNotice />
        {await renderDeviceApprovalBody(props)}
      </Stack>
    </PublicShell>
  );
}

async function renderDeviceApprovalBody({ searchParams }: DeviceApprovalPageProps) {
  const requestHeaders = await headers();
  const session = await resolveSession(requestHeaders.get('cookie'));

  if (session.status === 'unavailable') {
    return (
      <BlockedBody
        tone="danger"
        title="認証設定を利用できません"
        description="管理者が認証設定を確認するまで、端末を承認できません。"
      />
    );
  }

  if (session.status === 'unauthenticated') {
    return (
      <BlockedBody
        tone="warning"
        title="サインインが必要です"
        description="テナントのサインイン画面からログインしてから、このページをもう一度開いてください。"
      />
    );
  }

  if (session.workspaceIds.length === 0) {
    return (
      <BlockedBody
        tone="warning"
        title="承認できるWorkspaceがありません"
        description="Workspaceへの所属を管理者に確認してください。"
      />
    );
  }

  const query = await searchParams;
  const rawUserCode = Array.isArray(query.user_code) ? (query.user_code[0] ?? '') : (query.user_code ?? '');

  return (
    <DeviceApprovalForm
      tenantId={session.tenantId}
      workspaceIds={session.workspaceIds}
      workspaceNames={session.workspaceNames}
      initialUserCode={normalizeUserCodeInput(rawUserCode)}
    />
  );
}

/**
 * 承認へ進めないときの本文。
 *
 * 見出しを添えるのは、承認フォームを出せない 3 つの状態 (認証設定が無い / 未サインイン /
 * Workspace 未所属) で `<h1>` ごと消えていたため。他の画面はどの状態でも画面名が上に残るのに、
 * この画面だけ「いま何の画面を見ているのか」が失われていた。
 */
function BlockedBody({
  tone,
  title,
  description,
}: {
  readonly tone: 'danger' | 'warning';
  readonly title: string;
  readonly description: string;
}) {
  return (
    <Stack gap={4}>
      <ScreenHeader
        title="端末を承認する"
        description="Publisher または CLI に表示された確認コードを承認する画面です。"
      />
      <Alert tone={tone} title={title} description={description} />
    </Stack>
  );
}

async function resolveSession(cookieHeader: string | null) {
  try {
    const runtime = authRuntime();
    return await resolveDeviceApprovalSession(cookieHeader, {
      sessionSecret: runtime.authz.sessionSecret,
      nowSeconds: runtime.ports.clock.nowSeconds(),
      isRevoked: (tenantId, userId, issuedAtSeconds) =>
        runtime.authz.revocation.isRevoked(tenantId, userId, issuedAtSeconds),
    });
  } catch {
    return { status: 'unavailable' } as const;
  }
}
