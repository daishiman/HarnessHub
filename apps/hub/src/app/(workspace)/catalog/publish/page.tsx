import { Panel, ScreenHeader } from '@harness-hub/ui';
import type { Metadata } from 'next';

import { LazyPublishWizard } from '../../../../components/publish/publish-wizard-lazy.js';
import { resolveDashboardScope, scopeFromQuery } from '../../../../lib/routing/dashboard-scope.js';

export const metadata: Metadata = {
  title: 'Skill を公開する | Harness Hub',
  description: 'CLI を使わずに、Hub の Web 画面だけで Skill を公開します。',
};

interface PageProps {
  readonly searchParams: Promise<{
    readonly tenant?: string;
    readonly workspace?: string;
    readonly project?: string;
    readonly publish?: string;
  }>;
}

/**
 * S01 公開ウィザードの route (feat-web-only-publish-journey 受入 1)。
 *
 * `(workspace)` グループに置くのは、公開が必ず特定 Workspace の中で起きるため。
 * scope の解決規則は `resolveDashboardScope` が単一の出所で、ここでは書き写さない。
 */
export default async function PublishWizardPage({ searchParams }: PageProps) {
  const [query, scope] = await Promise.all([searchParams, resolveDashboardScope()]);
  const resolved = scopeFromQuery(query, scope);

  return (
    <>
      {/* 見出しは実際に公開できるものに合わせる。いま公開できるのは Skill だけで、
          「ツール」で始めると中の面で「Skill だけです」と断る読み順になる。
          Web アプリの公開が実装されたら、見出しを「ツールを公開する」へ戻す */}
      <ScreenHeader
        id="publish-wizard-screen-heading"
        title="Skill を公開する"
        description="ZIP を投入すると、CLI から公開した場合と同じ検査を通って公開されます。"
      />
      <Panel>
        <LazyPublishWizard
          scope={resolved}
          initialProjectId={query.project ?? ''}
          initialPublishId={query.publish ?? ''}
        />
      </Panel>
    </>
  );
}
