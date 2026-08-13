'use client';

import type { HearingScreenshot } from '@harness-hub/schemas';
import { Alert, Button, Panel, Stack, TextInput, Tile } from '@harness-hub/ui';
import dynamic from 'next/dynamic';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';

import { DateTimeText } from '../../../components/format/date-time-text.js';
import { ATTACHMENT_ACCEPTED_FILE_EXTENSIONS, validateAttachmentFile } from '../attachment-validation.js';

const ConfirmDialog = dynamic(() => import('@harness-hub/ui').then((module) => module.ConfirmDialog));

export interface HearingSharePanelProps {
  readonly id: string;
  readonly tenantId: string;
  readonly workspaceId: string;
}

const tenantHeaders = (tenantId: string, workspaceId: string) => ({
  'x-harness-tenant-id': tenantId,
  'x-harness-workspace-id': workspaceId,
});

/** 認証済み利用者が、シートに安全な添付ファイル (画像・動画・CSV・Excel) を添付・削除するパネル。 */
export function ScreenshotsPanel({ id: sheetId, tenantId, workspaceId }: HearingSharePanelProps): ReactNode {
  const [items, setItems] = useState<readonly HearingScreenshot[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [linkedItem, setLinkedItem] = useState('');
  const [note, setNote] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<HearingScreenshot | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/sheets/${sheetId}/screenshots`, {
        credentials: 'same-origin',
        headers: tenantHeaders(tenantId, workspaceId),
      });
      if (!response.ok) throw new Error('添付ファイル一覧を取得できませんでした。');
      const body = (await response.json()) as { items: readonly HearingScreenshot[] };
      setItems(body.items);
      setLoadError(null);
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : '添付ファイル一覧を取得できませんでした。');
    }
  }, [sheetId, tenantId, workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const upload = async (): Promise<void> => {
    if (file === null) return;
    const rejection = validateAttachmentFile(file);
    if (rejection !== null) {
      setOperationError(rejection);
      return;
    }
    setUploading(true);
    setOperationError(null);
    try {
      const form = new FormData();
      form.set('title', file.name);
      if (linkedItem.trim().length > 0) form.set('linkedItem', linkedItem.trim());
      if (note.trim().length > 0) form.set('note', note.trim());
      form.set('file', file);
      const response = await fetch(`/api/v1/sheets/${sheetId}/screenshots`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: tenantHeaders(tenantId, workspaceId),
        body: form,
      });
      if (!response.ok) throw new Error('添付ファイルをアップロードできませんでした。');
      setFile(null);
      setLinkedItem('');
      setNote('');
      if (fileInputRef.current !== null) fileInputRef.current.value = '';
      await load();
    } catch (cause) {
      setOperationError(cause instanceof Error ? cause.message : '添付ファイルをアップロードできませんでした。');
    } finally {
      setUploading(false);
    }
  };

  const remove = async (target: HearingScreenshot): Promise<void> => {
    setDeleteTarget(null);
    setOperationError(null);
    try {
      const response = await fetch(`/api/v1/sheets/${sheetId}/screenshots/${target.id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: tenantHeaders(tenantId, workspaceId),
      });
      if (!response.ok) throw new Error('添付ファイルを削除できませんでした。');
      await load();
    } catch (cause) {
      setOperationError(cause instanceof Error ? cause.message : '添付ファイルを削除できませんでした。');
    }
  };

  const download = async (item: HearingScreenshot): Promise<void> => {
    setDownloadingId(item.id);
    setOperationError(null);
    try {
      const response = await fetch(`/api/v1/sheets/${sheetId}/screenshots/${item.id}`, {
        credentials: 'same-origin',
        headers: tenantHeaders(tenantId, workspaceId),
      });
      if (!response.ok) throw new Error('添付ファイルをダウンロードできませんでした。');
      const objectUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = item.title;
      anchor.hidden = true;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    } catch (cause) {
      setOperationError(cause instanceof Error ? cause.message : '添付ファイルをダウンロードできませんでした。');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <Panel
      title="添付ファイル"
      description="画像 (PNG/JPEG/WebP)・動画 (MP4/MOV)・CSV・Excel (XLSX/XLS) を添付できます (1ファイル25MBまで)。紐づけ項目を添えると、あとで見返しやすくなります。"
    >
      <Stack gap={3}>
        {loadError === null ? null : <Alert tone="danger" title="読み込みエラー" description={loadError} />}
        {operationError === null ? null : <Alert tone="danger" title="操作エラー" description={operationError} />}

        <div style={{ alignItems: 'flex-end', display: 'flex', flexWrap: 'wrap', gap: 'var(--hh-space-3)' }}>
          <TextInput
            ref={fileInputRef}
            label="ファイル"
            type="file"
            accept={ATTACHMENT_ACCEPTED_FILE_EXTENSIONS}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <TextInput
            label="紐づけ項目（任意）"
            description="例: 参考URL A の画面"
            value={linkedItem}
            onChange={(event) => setLinkedItem(event.target.value)}
          />
          <TextInput label="メモ（任意）" value={note} onChange={(event) => setNote(event.target.value)} />
          <Button type="button" onClick={() => void upload()} disabled={file === null || uploading}>
            {uploading ? 'アップロード中…' : 'アップロード'}
          </Button>
        </div>

        {items.length === 0 ? (
          <p>まだ添付ファイルはありません。</p>
        ) : (
          <ul style={{ display: 'grid', gap: 'var(--hh-space-2)', listStyle: 'none', margin: 0, padding: 0 }}>
            {items.map((item) => (
              <Tile
                as="li"
                key={item.id}
                style={{
                  alignItems: 'center',
                  display: 'flex',
                  gap: 'var(--hh-space-3)',
                  justifyContent: 'space-between',
                }}
              >
                <span>
                  <strong>{item.title}</strong>
                  {item.linked_item !== null ? <span> — {item.linked_item}</span> : null}
                  {item.note !== null ? <span>（{item.note}）</span> : null}
                  <br />
                  <DateTimeText value={item.created_at} />
                </span>
                <span style={{ display: 'flex', gap: 'var(--hh-space-2)' }}>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={downloadingId === item.id}
                    onClick={() => void download(item)}
                  >
                    {downloadingId === item.id ? '取得中…' : 'ダウンロード'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setDeleteTarget(item)}>
                    削除
                  </Button>
                </span>
              </Tile>
            ))}
          </ul>
        )}

        <ConfirmDialog
          open={deleteTarget !== null}
          title="添付ファイルを削除しますか？"
          description="添付ファイルは完全に削除され、元には戻せません。"
          reversible={false}
          confirmLabel="削除する"
          cancelLabel="やめる"
          onConfirm={() => {
            if (deleteTarget !== null) void remove(deleteTarget);
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      </Stack>
    </Panel>
  );
}
