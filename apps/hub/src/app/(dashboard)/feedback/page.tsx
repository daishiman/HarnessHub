import { ActionLink, Panel, ScreenHeader } from '@harness-hub/ui';
import type { Metadata } from 'next';
import { resolveDashboardScope, scopeFromQuery } from '../../../lib/routing/dashboard-scope.js';
import { FeedbackList } from './feedback-list.js';

export const metadata: Metadata = {
  title: '改善要望フィードバック | Harness Hub',
};

interface PageProps {
  /** `q` は共通ヘッダーの検索フォームから届く (§3.0)。 */
  readonly searchParams: Promise<{
    readonly tenant?: string;
    readonly workspace?: string;
    readonly q?: string;
  }>;
}

export default async function FeedbackPage({ searchParams }: PageProps) {
  const [query, scope] = await Promise.all([searchParams, resolveDashboardScope()]);
  const { tenantId, workspaceId } = scopeFromQuery(query, scope);
  const initialQuery = query.q?.trim() ?? '';
  return (
    <>
      <ScreenHeader
        id="feedback-heading"
        title="改善要望フィードバック"
        description="使ってみて困ったこと・こうしたいことを受け付け、対応状況を追跡します。"
        sticky
        actions={
          <ActionLink href={`/feedback/new?tenant=${tenantId}&workspace=${workspaceId}`} variant="primary">
            新しく報告
          </ActionLink>
        }
      />
      <Panel flush>
        <FeedbackList tenantId={tenantId} workspaceId={workspaceId} initialQuery={initialQuery} />
      </Panel>
    </>
  );
}
