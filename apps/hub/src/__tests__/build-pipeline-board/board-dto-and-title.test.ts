/**
 * BPB-DTO-* / BPB-SVC-*: wire 変換・リスク算出・見出し解決・cursor ページングの単体契約
 * (SYS-BUILD-PIPELINE-BOARD-P05)。
 *
 * route 実行テスト (stage-transition-admin-audit.test.ts) は「実 DB 越しに正しい応答が返るか」を見る。
 * こちらは、実 DB では作りにくい境界値 (停滞日数の閾値・接続元が消えている Build・
 * ページ境界ちょうどの件数) を直接突く。
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BuildRow, RepositoryContext } from '@harness-hub/db';
import { describe, expect, it } from 'vitest';

import {
  computeBuildRisk,
  fallbackBuildTitle,
  normalizeBuildTitle,
  toBoardColumns,
  toBuildListItem,
} from '../../features/build-pipeline-board/dto.js';
import { InvalidBuildCursorError } from '../../features/build-pipeline-board/errors.js';
import { createDbSourceTitlePort } from '../../features/build-pipeline-board/runtime.js';
import { createBuildPipelineBoardService } from '../../features/build-pipeline-board/service.js';

const NOW = 1_700_000_000_000;
const DAY = 24 * 60 * 60 * 1_000;

const CONTEXT = { tenantId: 'tenant-a', workspaceId: 'ws-a1', actorId: 'user-1' } as unknown as RepositoryContext;

function buildRow(overrides: Partial<BuildRow> = {}): BuildRow {
  return {
    id: 'build-01',
    tenantId: 'tenant-a',
    workspaceId: 'ws-a1',
    type: 'improvement',
    stage: 'design',
    sheetId: null,
    feedbackId: null,
    publishRequestId: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  } as BuildRow;
}

describe('BPB-DTO: リスク算出', () => {
  it('BPB-DTO-001: 停滞 7 日未満は none、7 日以上は warn、14 日以上は blocked', () => {
    expect(computeBuildRisk('design', NOW - 6 * DAY, NOW)).toBe('none');
    expect(computeBuildRisk('design', NOW - 7 * DAY, NOW)).toBe('warn');
    expect(computeBuildRisk('design', NOW - 14 * DAY, NOW)).toBe('blocked');
  });

  it('BPB-DTO-002: 終端工程 publish に留まっているのは滞留ではないので常に none', () => {
    expect(computeBuildRisk('publish', NOW - 100 * DAY, NOW)).toBe('none');
  });
});

describe('BPB-DTO: 見出しの正規化', () => {
  it('BPB-DTO-003: 接続元の題名が空なら識別子を名前に見せない既定値へ落ちる', () => {
    const row = buildRow();
    expect(normalizeBuildTitle('   ', row)).toBe(fallbackBuildTitle(row));
    expect(fallbackBuildTitle(row)).toContain('改善要望');
    expect(fallbackBuildTitle(row)).not.toContain(row.id);
  });

  it('BPB-DTO-004: 200 文字を超える題名は丸められ、改行は 1 行へ寄せられる', () => {
    const row = buildRow();
    expect(normalizeBuildTitle('あ\nい', row)).toBe('あ い');
    expect(normalizeBuildTitle('x'.repeat(500), row)).toHaveLength(200);
  });

  it('BPB-DTO-005: wire へ tenant_id を出さない (D4)', () => {
    expect(toBuildListItem(buildRow(), '題名', NOW)).not.toHaveProperty('tenant_id');
  });
});

describe('BPB-DTO: ボード列', () => {
  it('BPB-DTO-006: 空の工程も列として残り、常に 7 列になる', () => {
    const columns = toBoardColumns([toBuildListItem(buildRow(), '題名', NOW)]);
    expect(columns).toHaveLength(7);
    expect(columns.map((column) => column.stage)[0]).toBe('hearing');
    expect(columns.find((column) => column.stage === 'design')?.cards).toHaveLength(1);
  });
});

/** listBoard / listStageEvents だけを持つ最小の repository スタブ (遷移は route テスト側で実 DB を使う)。 */
function stubRepository(rows: readonly BuildRow[]) {
  return {
    listBoard: async () => [{ stage: 'design' as const, builds: rows }],
    listStageEvents: async () => [],
    listRecentTouchedBuilds: async () => rows,
    transitionStage: async () => {
      throw new Error('この test では遷移を呼ばない');
    },
  };
}

describe('BPB-SVC: 一覧の cursor ページング', () => {
  const rows = ['build-01', 'build-02', 'build-03'].map((id) => buildRow({ id }));

  it('BPB-SVC-001: limit までを新しい順で返し、続きがあれば next_cursor に末尾 id を入れる', async () => {
    const service = createBuildPipelineBoardService(stubRepository(rows), { now: () => NOW });
    const page = await service.listBuilds({
      context: CONTEXT,
      workspaceId: 'ws-a1',
      query: { limit: 2 },
    });

    expect(page.items.map((item) => item.id)).toEqual(['build-03', 'build-02']);
    expect(page.next_cursor).toBe('build-02');
  });

  it('BPB-SVC-002: cursor を渡すと続きから返り、最後のページでは next_cursor が null になる', async () => {
    const service = createBuildPipelineBoardService(stubRepository(rows), { now: () => NOW });
    const page = await service.listBuilds({
      context: CONTEXT,
      workspaceId: 'ws-a1',
      query: { limit: 2, cursor: 'build-02' },
    });

    expect(page.items.map((item) => item.id)).toEqual(['build-01']);
    expect(page.next_cursor).toBeNull();
  });

  it('BPB-SVC-003: 現在の絞り込みに存在しない cursor は先頭へ戻さず domain error にする', async () => {
    const service = createBuildPipelineBoardService(stubRepository(rows), { now: () => NOW });

    await expect(
      service.listBuilds({
        context: CONTEXT,
        workspaceId: 'ws-a1',
        query: { limit: 2, cursor: 'missing-build' },
      }),
    ).rejects.toBeInstanceOf(InvalidBuildCursorError);
  });

  it('BPB-SVC-004: 見つからない Build の詳細は null (route が 404 へ写す)', async () => {
    const service = createBuildPipelineBoardService(stubRepository(rows), { now: () => NOW });
    const detail = await service.getBuild({
      context: CONTEXT,
      workspaceId: 'ws-a1',
      id: 'missing',
      canManage: true,
    });
    expect(detail).toBeNull();
  });

  it('BPB-SVC-005: 接続元の題名が引ければ見出しに使う (sheet 優先 / feedback は FR コード付き)', async () => {
    const titles = createDbSourceTitlePort(
      { findSheet: async () => ({ title: '経費精算ハーネス' }) as never },
      { findFeedback: async () => ({ code: 'FR-0001', body: '一覧が遅い' }) as never },
    );
    const service = createBuildPipelineBoardService(
      stubRepository([buildRow({ id: 'b1', sheetId: 'sheet-1' }), buildRow({ id: 'b2', feedbackId: 'fb-1' })]),
      { titles, now: () => NOW },
    );

    const page = await service.listBuilds({ context: CONTEXT, workspaceId: 'ws-a1', query: { limit: 10 } });
    expect(page.items.map((item) => item.title)).toEqual(['FR-0001 一覧が遅い', '経費精算ハーネス']);
  });

  it('BPB-SVC-006: 接続元の取得が失敗しても既定の見出しへ落ちる (ボード全体を落とさない)', async () => {
    const titles = createDbSourceTitlePort(
      {
        findSheet: async () => {
          throw new Error('sheet 取得に失敗');
        },
      },
      {
        findFeedback: async () => {
          throw new Error('feedback 取得に失敗');
        },
      },
    );
    const service = createBuildPipelineBoardService(stubRepository([buildRow({ sheetId: 'sheet-1' })]), {
      titles,
      now: () => NOW,
    });

    const page = await service.listBuilds({ context: CONTEXT, workspaceId: 'ws-a1', query: { limit: 10 } });
    expect(page.items[0]?.title).toBe(fallbackBuildTitle(buildRow({ sheetId: 'sheet-1' })));
  });

  it('BPB-SVC-007: 要対応件数は recentLimit で欠けず、最近項目だけを上限内へ絞る', async () => {
    const rows = [
      buildRow({ id: 'blocked-1', updatedAt: NOW - 20 * DAY }),
      buildRow({ id: 'blocked-2', updatedAt: NOW - 15 * DAY }),
      buildRow({ id: 'healthy', updatedAt: NOW }),
    ];
    const repository = {
      ...stubRepository(rows),
      listRecentTouchedBuilds: async (_context: RepositoryContext, filter: { readonly limit?: number | undefined }) =>
        filter.limit === undefined ? rows : rows.slice(0, filter.limit),
    };
    const service = createBuildPipelineBoardService(repository, { now: () => NOW });

    const summary = await service.getActionableSummary({
      context: CONTEXT,
      workspaceId: 'ws-a1',
      actorUserId: 'user-1',
      recentLimit: 1,
    });

    expect(summary.actionableCount).toBe(2);
    expect(summary.recentItems.map((item) => item.id)).toEqual(['blocked-1']);
  });
});

describe('BPB-BUNDLE: client component の初期チャンク規律', () => {
  /**
   * `/builds` の First Load JS は一度 131.6 KiB まで膨らみ、`check:client-bundle` の
   * 予算 120 KiB を破った。原因は client component が `@harness-hub/schemas` を
   * **値**として import し、zod と全 contract schema を初期チャンクへ引き込んだこと。
   *
   * バンドル計測は build が要るため CI の後段でしか鳴らない。壊れた瞬間に赤くなるよう、
   * 「値 import をしない」という原因側の契約をここで固定する。
   */
  it('BPB-BUNDLE-001: build-board.tsx は @harness-hub/schemas を型としてのみ参照する', () => {
    const source = readFileSync(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../app/(dashboard)/builds/build-board.tsx'),
      'utf8',
    );
    const schemaImports = source.match(/^import[^;]*from '@harness-hub\/schemas';$/gm) ?? [];

    expect(schemaImports).not.toHaveLength(0);
    expect(schemaImports.filter((line) => !line.startsWith('import type '))).toStrictEqual([]);
  });

  it('BPB-BUNDLE-002: 列組みの実装 (board-columns.ts) は zod へ依存しない', () => {
    const source = readFileSync(
      path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        '../../features/build-pipeline-board/board-columns.ts',
      ),
      'utf8',
    );
    const valueImports = (source.match(/^import(?! type )[^;]*;$/gm) ?? []).join('\n');

    expect(valueImports).toBe('');
  });
});
