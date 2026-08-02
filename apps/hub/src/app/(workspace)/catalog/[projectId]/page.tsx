import type { Metadata } from 'next';

import { CatalogDetail } from '../../../../components/catalog/CatalogDetail.js';

export const metadata: Metadata = {
  title: '業務ツール詳細 | Harness Hub',
};

interface PageProps {
  readonly params: Promise<{ readonly projectId: string }>;
  readonly searchParams: Promise<{
    readonly tenant?: string;
    readonly workspace?: string;
    /** 進行中の公開要求。指定された場合だけ公開状態タブを出す。 */
    readonly publish?: string;
  }>;
}

export default async function CatalogDetailPage({ params, searchParams }: PageProps) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  return (
    <CatalogDetail
      scope={{ tenantId: query.tenant ?? '', workspaceId: query.workspace ?? '' }}
      projectId={projectId}
      publishId={query.publish ?? null}
    />
  );
}
