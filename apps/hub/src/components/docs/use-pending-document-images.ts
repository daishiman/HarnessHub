'use client';

import { useCallback, useEffect, useRef } from 'react';

interface PendingImage {
  readonly documentId: string;
  readonly imageId: string;
  readonly url: string;
}

interface PendingDocumentImages {
  readonly register: (image: PendingImage) => void;
  readonly settleAfterSave: (savedMarkdown: string) => Promise<void>;
}

/**
 * この browser 編集 session で upload した object だけを追跡する。
 * 保存本文に残った画像は確定、取り除かれた画像は DELETE し、未保存で画面を離れた場合も
 * keepalive DELETE を試みる。他 session の upload を list/delete しないため競合編集を壊さない。
 */
export function usePendingDocumentImages(tenantId: string, workspaceId: string): PendingDocumentImages {
  const pendingRef = useRef(new Map<string, PendingImage>());

  const deleteImage = useCallback(
    async (image: PendingImage, keepalive = false): Promise<boolean> => {
      const response = await fetch(
        `/api/v1/docs/${encodeURIComponent(image.documentId)}/images/${encodeURIComponent(image.imageId)}`,
        {
          method: 'DELETE',
          credentials: 'same-origin',
          headers: {
            'x-harness-tenant-id': tenantId,
            'x-harness-workspace-id': workspaceId,
          },
          keepalive,
        },
      );
      return response.ok;
    },
    [tenantId, workspaceId],
  );

  useEffect(
    () => () => {
      for (const image of pendingRef.current.values()) {
        void deleteImage(image, true).catch(() => undefined);
      }
    },
    [deleteImage],
  );

  const register = useCallback((image: PendingImage) => {
    pendingRef.current.set(image.imageId, image);
  }, []);

  const settleAfterSave = useCallback(
    async (savedMarkdown: string) => {
      for (const image of [...pendingRef.current.values()]) {
        if (savedMarkdown.includes(image.url)) {
          pendingRef.current.delete(image.imageId);
          continue;
        }
        if (await deleteImage(image)) pendingRef.current.delete(image.imageId);
      }
    },
    [deleteImage],
  );

  return { register, settleAfterSave };
}
