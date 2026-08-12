import { ScreenHeader } from '@harness-hub/ui';
import type { Metadata } from 'next';
import { resolveDashboardScope, scopeFromQuery } from '../../../../lib/routing/dashboard-scope.js';
import { NotionSettings } from './notion-settings.js';

export const metadata: Metadata = {
  title: 'Notion連携 | Harness Hub',
};

interface PageProps {
  readonly searchParams: Promise<{ readonly tenant?: string; readonly workspace?: string }>;
}

export default async function NotionSettingsPage({ searchParams }: PageProps) {
  const [query, scope] = await Promise.all([searchParams, resolveDashboardScope()]);
  // Notion 連携は workspace 単位の設定 (`tenant-data` と同様) なので、tenant に加えて
  // workspace も解決する (アカウント設定と違い workspaceId が API に必須)。
  const { tenantId, workspaceId } = scopeFromQuery(query, scope);
  return (
    <>
      <ScreenHeader
        id="notion-settings-heading"
        title="Notion連携"
        description="Notionのページやワークスペースをこのワークスペースに紐づけ、ドキュメント画面から開けるようにします。"
      />
      <NotionSettings tenantId={tenantId} workspaceId={workspaceId} />
    </>
  );
}
