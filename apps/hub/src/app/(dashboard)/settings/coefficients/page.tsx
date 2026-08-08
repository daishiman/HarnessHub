/**
 * テナント設定の「見積係数」画面 (AD-4)。
 *
 * settings/auth と同じ理由で、server component 側では認可判定をしない。
 * `coefficients.change` は workspace-admin 以上のみ許可されるが、判定は
 * `withAuthz` 側に閉じ、画面は API の応答 (403) をそのまま扱う。
 */

import { Panel, ScreenHeader } from '@harness-hub/ui';
import type { Metadata } from 'next';

import { resolveDashboardScope, tenantIdFromQuery } from '../../../../lib/routing/dashboard-scope.js';
import { CoefficientsSettings } from './coefficients-settings.js';

export const metadata: Metadata = {
  title: '見積係数設定 | Harness Hub',
};

interface PageProps {
  readonly searchParams: Promise<{ readonly tenant?: string }>;
}

export default async function CoefficientsSettingsPage({ searchParams }: PageProps) {
  const [query, scope] = await Promise.all([searchParams, resolveDashboardScope()]);
  const tenantId = tenantIdFromQuery(query, scope);

  return (
    <>
      <ScreenHeader
        id="coefficients-settings-heading"
        title="見積係数設定"
        description="ヒアリングシートの工数見積りに使う、テナント共通の係数を設定します。"
        breadcrumbs={[{ href: '/settings/account', label: '設定' }, { label: '見積係数設定' }]}
        breadcrumbsLabel="現在地"
      />
      {tenantId === '' ? (
        <Panel>
          <p style={{ margin: 0 }}>
            テナントを特定できませんでした。ログインし直すか、URL に <code>?tenant=</code>{' '}
            を付けてアクセスしてください。
          </p>
        </Panel>
      ) : (
        <CoefficientsSettings tenantId={tenantId} />
      )}
    </>
  );
}
