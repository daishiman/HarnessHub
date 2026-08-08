import type { Metadata } from 'next';
import { resolveDashboardScope, scopeFromQuery } from '../../../../lib/routing/dashboard-scope.js';
import { HearingIntakeWizard } from './hearing-intake-wizard.js';

export const metadata: Metadata = {
  title: 'ヒアリングシート作成 | Harness Hub',
};

interface PageProps {
  readonly searchParams: Promise<{ readonly tenant?: string; readonly workspace?: string }>;
}

export default async function HearingIntakePage({ searchParams }: PageProps) {
  const [query, scope] = await Promise.all([searchParams, resolveDashboardScope()]);
  const { tenantId, workspaceId } = scopeFromQuery(query, scope);
  return (
    <section aria-labelledby="hearing-intake-heading">
      <h1 id="hearing-intake-heading">業務の困りごとを登録</h1>
      <p>4 つのステップで入力すると、受付番号を発行してシート生成を開始します。</p>
      <HearingIntakeWizard tenantId={tenantId} workspaceId={workspaceId} />
    </section>
  );
}
