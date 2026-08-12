/**
 * ステップ「参考URL・添付」で選択/貼り付けした添付ファイルの一時保持 (依頼者追加要件 1通目 #4)。
 *
 * シートはまだ作成されていない (ID が無い) 段階なので、ファイルはウィザードの state に
 * `File` オブジェクトのまま保持し、送信 (`POST /api/v1/sheets`) が成功して初めて
 * シート ID 付きの添付アップロード API へ順番に流す。`File` は JSON 化できないため、
 * `hearing-intake-wizard-state.ts` の `form` (sessionStorage へ永続化される) とは
 * 意図的に分離したフックにしている。
 */
import { useCallback, useState } from 'react';

import { partitionAttachmentFiles } from '../../../../features/hearing-intake/attachment-validation.js';

export interface StagedAttachment {
  readonly localId: string;
  readonly file: File;
  readonly linkedItem: string;
  readonly note: string;
}

export interface StagedAttachmentsState {
  readonly attachments: readonly StagedAttachment[];
  readonly rejectionMessages: readonly string[];
  readonly addFiles: (files: readonly File[]) => void;
  readonly removeAttachment: (localId: string) => void;
  readonly setLinkedItem: (localId: string, value: string) => void;
  readonly setNote: (localId: string, value: string) => void;
  readonly clearRejections: () => void;
}

let attachmentIdCounter = 0;
/** タブごとの単調増加カウンタ。crypto.randomUUID に依存せず SSR/古いブラウザでも安定させる。 */
function nextLocalId(): string {
  attachmentIdCounter += 1;
  return `staged-attachment-${attachmentIdCounter}`;
}

export function useStagedAttachments(): StagedAttachmentsState {
  const [attachments, setAttachments] = useState<readonly StagedAttachment[]>([]);
  const [rejectionMessages, setRejectionMessages] = useState<readonly string[]>([]);

  const addFiles = useCallback((files: readonly File[]): void => {
    const { accepted, rejected } = partitionAttachmentFiles(files);
    if (accepted.length > 0) {
      setAttachments((current) => [
        ...current,
        ...accepted.map((file) => ({ localId: nextLocalId(), file, linkedItem: '', note: '' })),
      ]);
    }
    setRejectionMessages(rejected.map((entry) => entry.message));
  }, []);

  const removeAttachment = useCallback((localId: string): void => {
    setAttachments((current) => current.filter((entry) => entry.localId !== localId));
  }, []);

  const setLinkedItem = useCallback((localId: string, value: string): void => {
    setAttachments((current) =>
      current.map((entry) => (entry.localId === localId ? { ...entry, linkedItem: value } : entry)),
    );
  }, []);

  const setNote = useCallback((localId: string, value: string): void => {
    setAttachments((current) =>
      current.map((entry) => (entry.localId === localId ? { ...entry, note: value } : entry)),
    );
  }, []);

  const clearRejections = useCallback((): void => setRejectionMessages([]), []);

  return { attachments, rejectionMessages, addFiles, removeAttachment, setLinkedItem, setNote, clearRejections };
}

export interface AttachmentUploadFailure {
  readonly fileName: string;
  readonly message: string;
}

export interface AttachmentUploadSummary {
  readonly succeededCount: number;
  readonly failed: readonly AttachmentUploadFailure[];
}

/**
 * シート作成 (`POST /api/v1/sheets`) が成功した直後に呼ぶ。1件ずつ順番にアップロードし、
 * 一部が失敗してもシート作成自体は取り消さない (依頼者要件: 実装を複雑にしすぎない方式)。
 * 呼び出し側は返却値の `failed` を見て、遷移前に警告メッセージを出す。
 */
export async function uploadStagedAttachments(
  sheetId: string,
  attachments: readonly StagedAttachment[],
  tenantId: string,
  workspaceId: string,
): Promise<AttachmentUploadSummary> {
  const failed: AttachmentUploadFailure[] = [];
  let succeededCount = 0;

  for (const attachment of attachments) {
    try {
      const form = new FormData();
      form.set('title', attachment.file.name);
      if (attachment.linkedItem.trim().length > 0) form.set('linkedItem', attachment.linkedItem.trim());
      if (attachment.note.trim().length > 0) form.set('note', attachment.note.trim());
      form.set('file', attachment.file);
      const response = await fetch(`/api/v1/sheets/${sheetId}/screenshots`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'x-harness-tenant-id': tenantId, 'x-harness-workspace-id': workspaceId },
        body: form,
      });
      if (!response.ok) throw new Error('アップロードに失敗しました。');
      succeededCount += 1;
    } catch (cause) {
      failed.push({
        fileName: attachment.file.name,
        message: cause instanceof Error ? cause.message : 'アップロードに失敗しました。',
      });
    }
  }

  return { succeededCount, failed };
}
