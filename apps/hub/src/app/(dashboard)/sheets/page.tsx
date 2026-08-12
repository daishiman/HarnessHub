import { ActionLink, Panel, ScreenHeader } from '@harness-hub/ui';
import type { Metadata } from 'next';
import { resolveDashboardScope, scopeFromQuery } from '../../../lib/routing/dashboard-scope.js';
import { HearingSheetListLazy } from './hearing-sheet-list-lazy.js';

export const metadata: Metadata = {
  title: 'ヒアリングシート一覧 | Harness Hub',
};

interface PageProps {
  /** `q` は共通ヘッダーの検索フォームから届く (§3.0)。 */
  readonly searchParams: Promise<{
    readonly tenant?: string;
    readonly workspace?: string;
    readonly q?: string;
  }>;
}

export default async function HearingSheetsPage({ searchParams }: PageProps) {
  const [query, scope] = await Promise.all([searchParams, resolveDashboardScope()]);
  const { tenantId, workspaceId } = scopeFromQuery(query, scope);
  const initialQuery = query.q?.trim() ?? '';

  return (
    <>
      <ScreenHeader
        id="hearing-sheets-heading"
        title="ヒアリングシート"
        description="業務のヒアリング内容と、そこから生成された仕様の状態を一覧します。"
        sticky
        actions={
          <ActionLink href={`/sheets/new?tenant=${tenantId}&workspace=${workspaceId}`} variant="primary">
            新しく作成
          </ActionLink>
        }
      />
      <Panel flush>
        <HearingSheetListLazy tenantId={tenantId} workspaceId={workspaceId} initialQuery={initialQuery} />
      </Panel>
    </>
  );
}
