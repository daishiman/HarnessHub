/**
 * `GET /marketplace.json` — 配布出口の marketplace document (ADR §3.1 / qa-003)。
 *
 * 読み取り専用。公開状態を変える操作はここに置かない (owner=feat-publish-pipeline)。
 *
 * **Stage 0 technical gate H7 (採用配布経路) が未確定のため、plugins は常に空で返る。**
 * 空である理由が「公開対象 0 件」なのか「経路未確定」なのかを消費側が取り違えると、
 * gate が未成立のまま配布が始まる。body の `source_status` と応答 header の両方で表明する。
 */
import type { CatalogEntry } from '@harness-hub/schemas';
import { authRuntime, requestScopedResource, withAuthz } from '../../lib/authz/index.js';
import { buildMarketplaceDocument, resolveAdoptedSourceResolver } from '../../lib/catalog/index.js';

/** 配布カタログ文書のメタ情報。Hub 全体で 1 つの配信面を表すため固定値。 */
const CATALOG_NAME = 'harness-hub-workspace';
const CATALOG_DESCRIPTION = 'Harness Hub Workspace で公開されている業務ツール (Skill / Web アプリ)';
const CATALOG_VERSION = '0.1.0';
const CATALOG_OWNER = 'Harness Hub';

/** 経路未確定の表明を header にも出す。body を読まない中継 (CDN・監視) からも観測できるようにする。 */
const SOURCE_STATUS_HEADER = 'x-catalog-source-status';

/**
 * 配信キャッシュ規約 (test-design DC-MKT-07)。
 * `stale-while-revalidate` があることで、Hub が応答しない間も直近の document が配られ続ける。
 */
// 認証済み tenant/workspace ごとに内容が変わるため shared cache へ保存させない。
// private cache の stale 応答は維持し、scope や session が変わった場合は Vary で別物として扱う。
const CACHE_CONTROL = 'private, max-age=60, stale-while-revalidate=300';
const CACHE_VARY = 'Cookie, x-harness-tenant-id, x-harness-workspace-id';

export const GET = withAuthz(
  {
    // 閲覧と同じ権限。配布 document は catalog 一覧の別表現であり、追加の権限を要求しない
    action: 'harnesses.read',
    deps: () => authRuntime().authz,
    resolveResource: async (request) => requestScopedResource(request, { type: 'harness' }),
  },
  async () => {
    const source = resolveAdoptedSourceResolver();

    // source が未確定の間は entry を読みに行かない。読んでも plugins は空になり、
    // 公開状況という機微情報へ無用に触れるだけになる (fail-closed)。
    const entries: readonly CatalogEntry[] = [];

    const document = buildMarketplaceDocument(entries, {
      name: CATALOG_NAME,
      description: CATALOG_DESCRIPTION,
      version: CATALOG_VERSION,
      ownerName: CATALOG_OWNER,
      source,
    });

    return Response.json(document, {
      status: 200,
      headers: {
        [SOURCE_STATUS_HEADER]: document.source_status,
        // Hub が落ちている間も stale を配り続けることが §6.1 縮退の実体 (acceptance 3 / DC-MKT-07)。
        // max-age を短く保つことで H7 確定後の切り替え遅延を 1 分程度に抑える。
        'cache-control': CACHE_CONTROL,
        vary: CACHE_VARY,
      },
    });
  },
);
