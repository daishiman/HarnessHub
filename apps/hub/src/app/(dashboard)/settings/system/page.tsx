/**
 * システム画面 (provider-admin 向け)。
 *
 * settings/coefficients と同じく server component 側では認可判定をしない。
 * `appearance.usage_read` は provider-admin 限定だが、判定は `withAuthz` に閉じ、
 * 画面は API の応答 (403) をそのまま扱う。導線 (サイドバー) 側は
 * `sessionActionVisible` で deny-by-default に隠す。
 */

import { Panel, ScreenHeader } from '@harness-hub/ui';
import type { Metadata } from 'next';

import { resolveDashboardScope, tenantIdFromQuery } from '../../../../lib/routing/dashboard-scope.js';
import { AppearanceUsagePanel } from './appearance-usage.js';

export const metadata: Metadata = {
  title: 'システム | Harness Hub',
};

interface PageProps {
  readonly searchParams: Promise<{ readonly tenant?: string }>;
}

export default async function SystemPage({ searchParams }: PageProps) {
  const [query, scope] = await Promise.all([searchParams, resolveDashboardScope()]);
  const tenantId = tenantIdFromQuery(query, scope);

  return (
    <>
      <ScreenHeader
        id="system-heading"
        title="システム"
        description="利用状況など、プロダクト全体の運用に関わる情報を確認します。"
        breadcrumbs={[{ href: '/settings/account', label: '設定' }, { label: 'システム' }]}
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
        <AppearanceUsagePanel tenantId={tenantId} />
      )}
    </>
  );
}
