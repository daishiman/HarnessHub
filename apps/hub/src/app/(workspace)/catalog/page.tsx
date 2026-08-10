import type { PublishTarget } from '@harness-hub/schemas';
import { ActionLink, Panel, ScreenHeader } from '@harness-hub/ui';
import type { Metadata } from 'next';

import { CatalogList } from '../../../components/catalog/CatalogList.js';
import { resolveDashboardScope, scopeFromQuery } from '../../../lib/routing/dashboard-scope.js';
import { PUBLISH_WIZARD_HREF, PUBLISH_WIZARD_LINK_LABEL } from '../../../lib/routing/publish-wizard-entry.js';

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
  const resolved = scopeFromQuery(query, scope);
  return (
    <>
      <ScreenHeader
        id="catalog-heading"
        title="業務ツール"
        description="Workspace で公開されている Skill と Web アプリを探して導入できます。"
        actions={
          <>
            {/* CLI を持たない利用者の主導線 (受入 1)。一覧から公開へ入れるようにする */}
            <ActionLink href={`${PUBLISH_WIZARD_HREF}?tenant=${resolved.tenantId}&workspace=${resolved.workspaceId}`}>
              {PUBLISH_WIZARD_LINK_LABEL}
            </ActionLink>
            <ActionLink href={`/catalog/releases?tenant=${resolved.tenantId}&workspace=${resolved.workspaceId}`}>
              リリース履歴
            </ActionLink>
          </>
        }
      />
      <Panel flush>
        <CatalogList scope={resolved} initialTarget={toTarget(query.target)} initialQuery={query.q ?? ''} />
      </Panel>
    </>
  );
}
