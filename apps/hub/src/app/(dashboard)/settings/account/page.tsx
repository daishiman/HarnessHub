import { ScreenHeader } from '@harness-hub/ui';
import type { Metadata } from 'next';
import { resolveDashboardScope, tenantIdFromQuery } from '../../../../lib/routing/dashboard-scope.js';
import { AccountSettings } from './account-settings.js';

export const metadata: Metadata = {
  title: 'アカウント設定 | Harness Hub',
};

interface PageProps {
  readonly searchParams: Promise<{ readonly tenant?: string }>;
}

export default async function AccountSettingsPage({ searchParams }: PageProps) {
  const [query, scope] = await Promise.all([searchParams, resolveDashboardScope()]);
  return (
    <>
      <ScreenHeader
        id="account-settings-heading"
        title="アカウント設定"
        description="プロフィール・通知・セッションなど、自分に関する設定をまとめています。"
      />
      <AccountSettings tenantId={tenantIdFromQuery(query, scope)} />
    </>
  );
}
