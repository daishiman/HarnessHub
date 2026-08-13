'use client';

import type { DocumentListItem } from '@harness-hub/schemas';
import { Button, LiveStatus, Panel, Stack, Textarea, TextInput } from '@harness-hub/ui';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { extractApiErrorMessage } from '../../../features/docs-cms/api-error.js';
import { parseTagsInput, tagsToInputValue } from '../../../features/docs-cms/tags.js';

interface EditDraft {
  readonly category: string;
  readonly tags: string;
  readonly thumbnailUrl: string;
  readonly excerpt: string;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function toDraft(doc: DocumentListItem): EditDraft {
  return {
    category: doc.category ?? '',
    tags: tagsToInputValue(doc.tags),
    thumbnailUrl: doc.thumbnail_url ?? '',
    excerpt: doc.excerpt ?? '',
  };
}

export interface DocumentEditPanelProps {
  readonly doc: DocumentListItem;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly onSaved: (updated: DocumentListItem) => void;
  readonly onClose: () => void;
}

/** 一覧で選択されたときだけ読み込む分類・要約の編集フォーム。 */
export function DocumentEditPanel({ doc, tenantId, workspaceId, onSaved, onClose }: DocumentEditPanelProps): ReactNode {
  const [draft, setDraft] = useState<EditDraft>(() => toDraft(doc));
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const committedRef = useRef<EditDraft>(toDraft(doc));

  useEffect(() => {
    const next = toDraft(doc);
    committedRef.current = next;
    setDraft(next);
  }, [doc]);

  const commitIfChanged = useCallback(
    async (patch: Partial<EditDraft>) => {
      const next = { ...draft, ...patch };
      const committed = committedRef.current;
      const body: Record<string, unknown> = {};
      if (next.category !== committed.category)
        body.category = next.category.trim() === '' ? null : next.category.trim();
      if (next.tags !== committed.tags) {
        body.tags = parseTagsInput(next.tags);
      }
      if (next.thumbnailUrl !== committed.thumbnailUrl) {
        body.thumbnail_url = next.thumbnailUrl.trim() === '' ? null : next.thumbnailUrl.trim();
      }
      if (next.excerpt !== committed.excerpt) body.excerpt = next.excerpt.trim() === '' ? null : next.excerpt.trim();
      if (Object.keys(body).length === 0) return;

      setSaveState('saving');
      try {
        const response = await fetch(`/api/v1/docs/${doc.id}`, {
          method: 'PATCH',
          credentials: 'same-origin',
          headers: {
            'content-type': 'application/json',
            'x-harness-tenant-id': tenantId,
            'x-harness-workspace-id': workspaceId,
          },
          body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error(await extractApiErrorMessage(response, '保存できませんでした。'));
        const updated = (await response.json()) as DocumentListItem;
        committedRef.current = toDraft(updated);
        onSaved(updated);
        setErrorMessage('');
        setSaveState('saved');
        setTimeout(() => setSaveState((current) => (current === 'saved' ? 'idle' : current)), 2000);
      } catch (cause) {
        setErrorMessage(cause instanceof Error ? cause.message : '保存できませんでした。');
        setSaveState('error');
      }
    },
    [draft, doc.id, tenantId, workspaceId, onSaved],
  );

  return (
    // 面の装飾 (背景・輪郭・角丸・内側の余白) は Panel に任せる。ここで書き起こすと
    // 一覧に並ぶ他のカードと角丸が 2px ずれ、同じ層のものに見えなくなる。
    <div data-hh-doc-edit-panel="" style={{ marginTop: 'var(--hh-space-3)' }}>
      <Panel
        title={`『${doc.title}』を編集`}
        headingLevel={3}
        actions={
          <Button type="button" variant="ghost" onClick={onClose}>
            閉じる
          </Button>
        }
      >
        <Stack gap={3}>
          <TextInput
            label="カテゴリ"
            value={draft.category}
            onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
            onBlur={() => void commitIfChanged({})}
          />
          <TextInput
            label="タグ (カンマ区切り)"
            value={draft.tags}
            onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))}
            onBlur={() => void commitIfChanged({})}
          />
          <TextInput
            label="サムネイル画像 URL"
            description="空欄で保存すると、本文の最初の画像から自動生成へ戻します。"
            value={draft.thumbnailUrl}
            onChange={(event) => setDraft((current) => ({ ...current, thumbnailUrl: event.target.value }))}
            onBlur={() => void commitIfChanged({})}
          />
          <Textarea
            label="要約"
            description="空欄で保存すると、本文からの自動要約へ戻します。"
            rows={3}
            value={draft.excerpt}
            onChange={(event) => setDraft((current) => ({ ...current, excerpt: event.target.value }))}
            onBlur={() => void commitIfChanged({})}
          />
          <LiveStatus visible>
            {saveState === 'saving'
              ? '保存しています…'
              : saveState === 'saved'
                ? '保存しました'
                : saveState === 'error'
                  ? errorMessage
                  : ''}
          </LiveStatus>
        </Stack>
      </Panel>
    </div>
  );
}
