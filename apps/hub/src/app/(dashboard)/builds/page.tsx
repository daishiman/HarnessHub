/**
 * S13 パイプラインボード画面 (SYS-BUILD-PIPELINE-BOARD-P05 / docs/frontend-spec.md S13)。
 *
 * server component は「どの tenant/workspace を見るか」を決めるところまでで薄く保ち、
 * 取得と操作は同ディレクトリの client component (`build-board.tsx`) が持つ。
 */
import { BUILD_STAGE_ORDER } from '@harness-hub/schemas';
import { Panel, ScreenHeader } from '@harness-hub/ui';
import type { Metadata } from 'next';

import { resolveDashboardScope, scopeFromQuery } from '../../../lib/routing/dashboard-scope.js';
import { BuildBoard } from './build-board.js';

export const metadata: Metadata = {
  title: '構築パイプライン | Harness Hub',
};

interface PageProps {
  readonly searchParams: Promise<{ readonly tenant?: string; readonly workspace?: string }>;
}

export default async function BuildsPage({ searchParams }: PageProps) {
  const [query, scope] = await Promise.all([searchParams, resolveDashboardScope()]);
  const { tenantId, workspaceId } = scopeFromQuery(query, scope);
  return (
    <>
      <ScreenHeader
        id="builds-heading"
        title="構築パイプライン"
        description="ヒアリングから公開までの 7 工程で、各ハーネスの構築進捗を追跡します。工程の移動は管理者のみ行えます。"
      />
      {/* Panel の見出し (h2) を省くと、ページ見出し h1 の次が StageBoard の列見出し h3 になり
          見出し階層が飛ぶ (axe: heading-order)。面の見出しを置いて h1 → h2 → h3 を保つ。 */}
      <Panel title="工程ボード" flush>
        {/* 工程の並びは server から配る。client が @harness-hub/schemas を値 import すると
            zod が初期 chunk へ載り、`/builds` の First Load JS 予算 (120 KiB) を超えるため。 */}
        <BuildBoard tenantId={tenantId} workspaceId={workspaceId} stageOrder={BUILD_STAGE_ORDER} />
      </Panel>
    </>
  );
}
