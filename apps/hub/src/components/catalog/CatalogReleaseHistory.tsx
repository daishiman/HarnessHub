'use client';

/**
 * S04 リリース履歴 (screen-inventory S04 の閲覧部分)。
 *
 * 昇格・切り戻しの**操作は置かない** (DC-SCOPE-03)。本 feature の責務は閲覧であり、
 * 状態を変える導線を混ぜると「見るつもりで押した」事故が起きる。
 */
import type { ReleaseView } from '@harness-hub/schemas';
import { DataTable, DegradedBanner, IdBadge, ListState, StatusChip } from '@harness-hub/ui';
import { useEffect, useState } from 'react';
import type { CatalogFailure, CatalogPort, CatalogScope } from '../../lib/catalog/index.js';
import { catalogCapabilities, httpCatalogPort } from '../../lib/catalog/index.js';
import { formatDateTime } from '../../lib/format/datetime.js';

export interface CatalogReleaseHistoryProps {
  scope: CatalogScope;
  projectId: string;
  port?: CatalogPort;
  /** 現在の stable。行に印を付けるために使う。null なら未公開。 */
  stableReleaseId?: string | null | undefined;
}

export function CatalogReleaseHistory({
  scope,
  projectId,
  port = httpCatalogPort,
  stableReleaseId = null,
}: CatalogReleaseHistoryProps) {
  const releaseListKey = `${scope.tenantId}\u0000${scope.workspaceId}\u0000${projectId}`;
  const [releases, setReleases] = useState<readonly ReleaseView[]>([]);
  const [loadedReleaseListKey, setLoadedReleaseListKey] = useState<string>(releaseListKey);
  const [loading, setLoading] = useState<boolean>(true);
  const [failure, setFailure] = useState<CatalogFailure | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      const result = await port.listReleases(scope, projectId, controller.signal);
      if (controller.signal.aborted) return;
      if (result.ok) {
        setReleases(result.value.items);
        setLoadedReleaseListKey(releaseListKey);
        setFailure(null);
      } else {
        setFailure(result.failure);
      }
      setLoading(false);
    })();
    return () => controller.abort();
  }, [port, scope, projectId, releaseListKey]);

  const capabilities = failure === null ? null : catalogCapabilities(failure.kind);
  const visibleReleases = loadedReleaseListKey === releaseListKey ? releases : [];

  return (
    <div>
      {failure !== null && capabilities?.canBrowse === true ? <DegradedBanner description={failure.message} /> : null}

      {/* 取得失敗と「まだ 1 件も無い」を混ぜない。閲覧すらできない失敗のときは件数の話をしない */}
      <ListState
        error={failure !== null && capabilities?.canBrowse === false ? failure.message : null}
        loading={loading}
        isEmpty={visibleReleases.length === 0}
        emptyTitle="まだ公開された版はありません"
        emptyDescription="最初の公開が終わるとここに履歴が並びます。"
      >
        <DataTable<ReleaseView>
          caption="リリース履歴"
          loading={loading}
          rows={visibleReleases}
          rowKey={(row) => row.id}
          stickyHeader
          // 狭い画面では 5 列が横へはみ出す。履歴は「いつ・どの版が・どうなったか」を
          // 1 件ずつ読む使い方が主なので、カードに組み替えても失うものが無い
          narrowAs="card-collection"
          columns={[
            {
              key: 'version',
              header: '版',
              sortable: true,
              value: (row) => row.version,
              render: (row) => (row.id === stableReleaseId ? `${row.version}（現在の版）` : row.version),
            },
            {
              key: 'status',
              header: '状態',
              value: (row) => row.status,
              render: (row) => <StatusChip domain="release" status={row.status} />,
              salience: 'lead',
            },
            {
              key: 'created_at',
              header: '公開した日時',
              sortable: true,
              // 並べ替えは ISO のまま比較し、表示だけ全画面共通の書式にそろえる
              value: (row) => row.created_at,
              render: (row) => formatDateTime(row.created_at),
              salience: 'context',
            },
            // package_hash は照合と貼り付けに使う値なので、名前と同じ見え方にしない。
            // 省略は IdBadge (CSS) に任せ、全文は DOM に残してコピーできるようにする
            {
              key: 'package_hash',
              header: '内容の指紋',
              value: (row) => row.package_hash,
              render: (row) => <IdBadge value={row.package_hash} label="内容の指紋" />,
            },
          ]}
        />
      </ListState>
    </div>
  );
}
