'use client';

import { Alert, Button, Stack, TextInput } from '@harness-hub/ui';
import { type ChangeEvent, type ClipboardEvent, type ReactNode, useCallback, useRef } from 'react';

import { ATTACHMENT_ACCEPTED_FILE_EXTENSIONS } from '../../../../features/hearing-intake/attachment-validation.js';
import type { StagedAttachmentsState } from './hearing-intake-wizard-attachments.js';

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * 新規作成ウィザード用の添付ファイル・ステージングUI。
 * シート未作成 (ID無し) の段階なので、ここではアップロードせず `File` を state に貯めるだけで、
 * 実際のアップロードは送信成功後 (`uploadStagedAttachments`) にまとめて行う。
 */
export function AttachmentStagingPanel({ state }: { readonly state: StagedAttachmentsState }): ReactNode {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const files = Array.from(event.target.files ?? []);
      if (files.length > 0) state.addFiles(files);
      if (fileInputRef.current !== null) fileInputRef.current.value = '';
    },
    [state],
  );

  // クリップボードから画像を貼り付けられるようにする (依頼者要件: 画像貼り付け機能)。
  // フォーカスがこの領域に無いと paste イベントを受け取れないため、tabIndex を付けた専用領域にする。
  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLButtonElement>): void => {
      const items = event.clipboardData?.items;
      if (items === undefined || items === null) return;
      const imageFiles: File[] = [];
      for (const item of Array.from(items)) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file !== null) imageFiles.push(file);
        }
      }
      if (imageFiles.length > 0) {
        event.preventDefault();
        state.addFiles(imageFiles);
      }
    },
    [state],
  );

  return (
    <Stack gap={3}>
      <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
        <legend style={{ fontSize: 'var(--hh-font-size-md)', marginBottom: 'var(--hh-space-2)', padding: 0 }}>
          添付ファイル（画像・動画・CSV・Excel、最大25MB / 1ファイル）
        </legend>
        <Stack gap={2}>
          <TextInput
            ref={fileInputRef}
            label="ファイルを選択"
            type="file"
            accept={ATTACHMENT_ACCEPTED_FILE_EXTENSIONS}
            multiple
            onChange={handleFileInputChange}
          />
          {/*
            ペースト専用領域。クリック操作の意味を持たないが、button要素はネイティブに
            フォーカス可能・aria-label対応なため、非対話要素へ tabIndex を付ける a11y 警告を避けられる。
          */}
          <button
            type="button"
            aria-label="ここにフォーカスしてスクリーンショットなどの画像を貼り付けできます"
            onPaste={handlePaste}
            style={{
              background: 'none',
              border: '1px dashed var(--hh-color-border)',
              borderRadius: 'var(--hh-radius-sm)',
              color: 'var(--hh-color-text-muted)',
              cursor: 'text',
              padding: 'var(--hh-space-3)',
              textAlign: 'center',
              width: '100%',
            }}
          >
            ここをクリックしてフォーカスしてから、画像を貼り付け（Ctrl+V / Cmd+V）できます
          </button>
          {state.rejectionMessages.length === 0 ? null : (
            <Alert
              tone="danger"
              title="追加できなかったファイルがあります"
              description={state.rejectionMessages.join('\n')}
            />
          )}
        </Stack>
      </fieldset>

      {state.attachments.length === 0 ? (
        <p>まだ添付ファイルは追加されていません。</p>
      ) : (
        <ul style={{ display: 'grid', gap: 'var(--hh-space-2)', listStyle: 'none', margin: 0, padding: 0 }}>
          {state.attachments.map((attachment) => (
            <li
              key={attachment.localId}
              style={{
                border: '1px solid var(--hh-color-border)',
                borderRadius: 'var(--hh-radius-sm)',
                padding: 'var(--hh-space-3)',
              }}
            >
              <Stack gap={2}>
                <strong>
                  {attachment.file.name}（{formatFileSize(attachment.file.size)}）
                </strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--hh-space-2)' }}>
                  <TextInput
                    label="紐づけ項目（任意）"
                    description="例: 参考URL A の画面"
                    value={attachment.linkedItem}
                    onChange={(event) => state.setLinkedItem(attachment.localId, event.target.value)}
                  />
                  <TextInput
                    label="メモ（任意）"
                    value={attachment.note}
                    onChange={(event) => state.setNote(attachment.localId, event.target.value)}
                  />
                </div>
                <div>
                  <Button type="button" variant="secondary" onClick={() => state.removeAttachment(attachment.localId)}>
                    削除
                  </Button>
                </div>
              </Stack>
            </li>
          ))}
        </ul>
      )}

      <Alert
        tone="info"
        title="添付ファイルについて"
        description="ここで追加したファイルは、送信ボタンを押した後にシートへ自動でアップロードされます。一部が失敗した場合は完了画面で失敗したファイル名をお知らせします。"
      />
    </Stack>
  );
}
