import type { PublishTarget } from '@harness-hub/schemas';
import type { Metadata } from 'next';

import { CatalogList } from '../../../components/catalog/CatalogList.js';
import { resolveDashboardScope, scopeFromQuery } from '../../../lib/routing/dashboard-scope.js';

export const metadata: Metadata = {
  title: '業務ツール一覧 | Harness Hub',
};

interface PageProps {
  readonly searchParams: Promise<{
    readonly tenant?: string;
    readonly workspace?: string;
    readonly target?: string;
    readonly q?: string;
  }>;
}

/** 絞り込み条件は URL に持たせる。共有・戻る操作で同じ結果に戻れるようにするため。 */
function toTarget(value: string | undefined): PublishTarget | undefined {
  return value === 'skill' || value === 'web_app' ? value : undefined;
}

export default async function CatalogPage({ searchParams }: PageProps) {
  const [query, scope] = await Promise.all([searchParams, resolveDashboardScope()]);
  return (
    <section aria-labelledby="catalog-heading">
      <h1 id="catalog-heading">業務ツール</h1>
      <p>Workspace で公開されている Skill と Web アプリを探して導入できます。</p>
      <CatalogList
        scope={scopeFromQuery(query, scope)}
        initialTarget={toTarget(query.target)}
        initialQuery={query.q ?? ''}
      />
    </section>
  );
}
