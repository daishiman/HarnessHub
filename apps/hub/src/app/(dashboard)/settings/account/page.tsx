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
    <section aria-labelledby="account-settings-heading">
      <h1 id="account-settings-heading">アカウント設定</h1>
      <AccountSettings tenantId={tenantIdFromQuery(query, scope)} />
    </section>
  );
}
