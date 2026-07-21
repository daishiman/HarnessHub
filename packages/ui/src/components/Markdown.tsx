'use client';

/** Markdown の表示と編集。sanitize 済み AST のみを描画し、生 HTML の埋め込みを一切許さない (SEC7)。 */
import { type ReactNode, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

import { colorVar, spaceVar } from '../internal/style.js';
import { useUi } from '../theme/UiProvider.js';
import { Tabs } from './Tabs.js';
import { Textarea } from './Textarea.js';

/**
 * sanitize 規則 (allowlist 方式)。
 * `rehype-sanitize` の既定 schema をそのまま使う: script / style / on* 属性 /
 * `javascript:` 等の危険な protocol が除去される。
 * ここを緩める変更は security-spec のレビュー対象なので、schema を公開して差分を追えるようにしている。
 */
export const markdownSanitizeSchema = defaultSchema;

export interface MarkdownViewProps {
  /** 表示する Markdown 原文。信頼できない入力を前提とする。 */
  content: string;
}

/**
 * Markdown 描画。
 * `dangerouslySetInnerHTML` は使わず、sanitize 後の AST から React 要素を組み立てる。
 * 外部リンクには `rel="noopener noreferrer"` を必ず付ける。
 */
export function MarkdownView({ content }: MarkdownViewProps): ReactNode {
  return (
    <div data-hh-markdown="" style={{ color: colorVar('text'), lineHeight: 'var(--hh-line-height-normal)' }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, markdownSanitizeSchema]]}
        components={{
          a: ({ href, children, ...rest }) => (
            <a {...rest} href={href} rel="noopener noreferrer" target="_blank" data-hh-focusable="">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export interface MarkdownEditorProps {
  /** 入力欄のラベル。 */
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  description?: string;
  error?: string;
  rows?: number;
}

/** 編集タブとプレビュータブの 2 枚構成。プレビューは MarkdownView と同一経路なので表示差が出ない。 */
export function MarkdownEditor({
  label,
  value,
  onValueChange,
  description,
  error,
  rows = 12,
}: MarkdownEditorProps): ReactNode {
  const { t } = useUi();
  const [activeId, setActiveId] = useState('write');

  return (
    <div style={{ display: 'grid', gap: spaceVar(2) }}>
      {/* タブ群のラベルは入力欄のラベルと重ならないようにする (同名だと参照が曖昧になる) */}
      <Tabs
        label={`${label} — ${t('editor.viewSwitch')}`}
        activeId={activeId}
        onActiveIdChange={setActiveId}
        items={[
          {
            id: 'write',
            label: t('editor.write'),
            content: (
              <Textarea
                label={label}
                hideLabel
                description={description}
                error={error}
                rows={rows}
                value={value}
                onChange={(event) => onValueChange(event.target.value)}
              />
            ),
          },
          {
            id: 'preview',
            label: t('editor.preview'),
            content: <MarkdownView content={value} />,
          },
        ]}
      />
    </div>
  );
}
