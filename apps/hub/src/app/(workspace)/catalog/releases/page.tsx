import type { Metadata } from 'next';

import { CatalogReleaseHistory } from '../../../../components/catalog/CatalogReleaseHistory.js';
import { resolveDashboardScope, scopeFromQuery } from '../../../../lib/routing/dashboard-scope.js';

export const metadata: Metadata = {
  title: 'リリース履歴 | Harness Hub',
};

/**
 * S04 のうち「Release 履歴の読み取り表示」だけを担う独立ルート。
 *
 * 静的セグメント `releases` は動的セグメント `[projectId]` より優先されるため、
 * `releases` という project_id を持つツールの詳細はこの URL では開けない。
 * project_id は識別子生成規則上この語と衝突しないが、規則が変わると衝突しうる (P12 で追跡)。
 */
interface PageProps {
  readonly searchParams: Promise<{
    readonly tenant?: string;
    readonly workspace?: string;
    readonly project?: string;
  }>;
}

export default async function CatalogReleasesPage({ searchParams }: PageProps) {
  const [query, scope] = await Promise.all([searchParams, resolveDashboardScope()]);
  const projectId = query.project ?? '';

  return (
    <section aria-labelledby="catalog-releases-heading">
      <h1 id="catalog-releases-heading">リリース履歴</h1>
      {projectId === '' ? (
        <p>業務ツールを選ぶと、その公開履歴を表示します。</p>
      ) : (
        <CatalogReleaseHistory scope={scopeFromQuery(query, scope)} projectId={projectId} />
      )}
    </section>
  );
}
