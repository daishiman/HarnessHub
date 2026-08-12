'use client';

/**
 * docs 画面から「Notionで開く」導線を出す共有部品。
 *
 * 登録状況の取得までこの部品の中に閉じる。呼び出し側 (`document-list.tsx` /
 * `document-edit-page.tsx`) が読み込みロジックを持たずに済み、既存ファイルへの
 * 変更を import 1 行 + 呼び出し 1 行に留められる。
 *
 * `@harness-hub/ui` の `ActionLink` は `target="_blank"` を受け付けないため
 * (新しいタブで開く必要があるこの導線には使えない)、見た目だけ合わせた
 * 専用の `<a>` をここで組み立てる。共有 UI パッケージ側は変更しない。
 */
import type { NotionIntegrationResponse } from '@harness-hub/schemas';
import { type ReactNode, useEffect, useState } from 'react';
import { canOpenNotionPage } from '../../features/notion-integration/logic.js';

export interface NotionOpenLinkProps {
  readonly tenantId: string;
  readonly workspaceId: string;
}

const LINK_STYLE = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--hh-space-2)',
  minHeight: 'var(--hh-control-height)',
  padding: '0 var(--hh-space-4)',
  borderRadius: 'var(--hh-radius-sm)',
  fontSize: 'var(--hh-font-size-md)',
  fontWeight: 'var(--hh-font-weight-bold)',
  textDecoration: 'none',
  color: 'var(--hh-color-text)',
  background: 'var(--hh-color-surface)',
  border: '1px solid var(--hh-color-border-strong)',
} as const;

const GUIDANCE_STYLE = {
  fontSize: 'var(--hh-font-size-sm)',
  color: 'var(--hh-color-text-muted)',
} as const;

/**
 * Notion連携の登録状況に応じて「Notionで開く」ボタン、または導線用の案内文を返す。
 *
 * - 未連携: 何も出さない (docs 画面に無関係な案内を常時出さない)。
 * - URL方式、または APIキー方式でも `page_url` が登録済み: 新しいタブで開くリンクを出す。
 * - APIキー方式で `page_url` 未登録: ボタンではなく、設定画面へのリンク付き案内文を出す
 *   (押しても開けないボタンを置かない)。
 */
export function NotionOpenLink({ tenantId, workspaceId }: NotionOpenLinkProps): ReactNode {
  const [integration, setIntegration] = useState<NotionIntegrationResponse | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch('/api/v1/me/notion-integration', {
          credentials: 'same-origin',
          headers: { 'x-harness-tenant-id': tenantId, 'x-harness-workspace-id': workspaceId },
        });
        if (!response.ok) return;
        const body = (await response.json()) as NotionIntegrationResponse | null;
        if (!cancelled) setIntegration(body);
      } catch {
        // 取得できなくても docs 画面自体の表示は止めない (この部品は無いなら無いで良い付随導線)
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId, workspaceId]);

  if (!loaded || integration === null) return null;

  if (canOpenNotionPage(integration.page_url)) {
    return (
      <a href={integration.page_url} target="_blank" rel="noopener noreferrer" style={LINK_STYLE}>
        Notionで開く
      </a>
    );
  }

  if (integration.mode === 'api_key') {
    const settingsHref = `/settings/notion?tenant=${encodeURIComponent(tenantId)}&workspace=${encodeURIComponent(workspaceId)}`;
    return (
      <p style={GUIDANCE_STYLE}>
        Notionページの登録が済んでいません。
        <a href={settingsHref}>Notion連携の設定</a>
        からページURLを登録すると、ここから開けるようになります。
      </p>
    );
  }

  return null;
}
