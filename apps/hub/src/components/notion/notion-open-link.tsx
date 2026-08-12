'use client';

import type { NotionIntegrationResponse } from '@harness-hub/schemas';
/**
 * docs 画面から「Notionで開く」導線を出す共有部品。
 *
 * 登録状況の取得までこの部品の中に閉じる。呼び出し側 (`document-list.tsx` /
 * `document-edit-page.tsx`) が読み込みロジックを持たずに済み、既存ファイルへの
 * 変更を import 1 行 + 呼び出し 1 行に留められる。
 *
 * 外部導線の見た目と安全な別タブ契約は共有 `ActionLink` に一元化する。
 */
import { ActionLink } from '@harness-hub/ui';
import { type ReactNode, useEffect, useState } from 'react';
import { canOpenNotionPage } from '../../features/notion-integration/logic.js';

export interface NotionOpenLinkProps {
  readonly tenantId: string;
  readonly workspaceId: string;
}

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
      <ActionLink href={integration.page_url} openInNewTab>
        Notionで開く
      </ActionLink>
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
