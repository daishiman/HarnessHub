'use client';

/** チャート共通の外枠。図と等価な「表で見る」代替を必ず用意し、色以外の手段でも読めるようにする。 */
import { useId, useState, type ReactNode } from 'react';

import { colorVar, spaceVar, surfaceStyle } from '../internal/style.js';
import { useUi } from '../theme/UiProvider.js';
import { Button } from '../components/Button.js';
import { DataTable, type DataTableColumn } from '../components/DataTable.js';

interface TableRow {
  key: string;
  cells: readonly (string | number)[];
}

export interface ChartFrameProps {
  /** 図が何を表すかの説明。表側の caption と共用する。 */
  title: string;
  /** 図の読み上げ要約。 */
  description: string;
  /** 表で見るときの列見出し。 */
  tableColumns: readonly string[];
  /** 表で見るときの行。 */
  tableRows: readonly TableRow[];
  children: ReactNode;
}

export function ChartFrame({
  title,
  description,
  tableColumns,
  tableRows,
  children,
}: ChartFrameProps): ReactNode {
  const { t } = useUi();
  const [asTable, setAsTable] = useState(false);
  const regionId = useId();

  const columns: DataTableColumn<TableRow>[] = tableColumns.map((header, index) => ({
    key: `column-${index}`,
    header,
    value: (row) => row.cells[index] ?? '',
  }));

  return (
    <figure style={{ ...surfaceStyle, margin: 0, padding: spaceVar(4) }}>
      <figcaption
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spaceVar(2),
          marginBottom: spaceVar(2),
        }}
      >
        <span style={{ fontWeight: 'var(--hh-font-weight-bold)', color: colorVar('text') }}>{title}</span>
        <Button variant="ghost" aria-expanded={asTable} aria-controls={regionId} onClick={() => setAsTable((current) => !current)}>
          {asTable ? t('chart.showAsChart') : t('chart.showAsTable')}
        </Button>
      </figcaption>

      <div id={regionId}>
        {asTable ? (
          <DataTable
            caption={title}
            hideCaption
            columns={columns}
            rows={tableRows}
            rowKey={(row) => row.key}
          />
        ) : (
          // SVG 自体は 1 つの画像として扱い、詳細は上の「表で見る」で提供する
          <div role="img" aria-label={description}>
            {children}
          </div>
        )}
      </div>
    </figure>
  );
}
