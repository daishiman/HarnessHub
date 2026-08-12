'use client';

/**
 * Markdown の表示と編集。sanitize 済み AST のみを描画し、生 HTML の埋め込みを一切許さない (SEC7)。
 *
 * feat: docs-cms-rich-editing でブロック構成型の編集 UI (ツールバー) とレンダリング拡張
 * (コールアウト/トグル開閉/コピー付きコードブロック/画像ライトボックス/表ラッパー) を追加した。
 * docs-cms 専用ではなく共通コンポーネントとして再利用できる形にしている。
 */
import {
  type CSSProperties,
  type ChangeEvent as ReactChangeEvent,
  type ClipboardEvent as ReactClipboardEvent,
  type DragEvent as ReactDragEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

import { colorVar, radiusVar, spaceVar } from '../internal/style.js';
import { useUi } from '../theme/UiProvider.js';
import { Button } from './Button.js';
import { Modal } from './Modal.js';
import { Tabs } from './Tabs.js';
import { Textarea } from './Textarea.js';

/**
 * sanitize 規則 (allowlist 方式)。
 * `rehype-sanitize` の既定 schema (script / style / on* 属性 / `javascript:` 等の危険な protocol を除去) に、
 * トグル開閉 (`<details>/<summary>`) とコールアウト (remark プラグインが生成する `hh-callout` 要素) の
 * 最小限のタグ/属性だけを追加で許可する。それ以外の生 HTML (iframe/form/input/on* 属性など) は
 * 引き続き確実に除去される (packages/ui/src/components/Markdown.test.tsx で固定)。
 * ここを緩める変更は security-spec のレビュー対象なので、schema を公開して差分を追えるようにしている。
 */
export const markdownSanitizeSchema = {
  ...defaultSchema,
  // rehype-raw を導入すると生 HTML が hast へ到達できるようになる。defaultSchema は
  // GFM タスクリスト用に `<input type="checkbox" disabled>` を許可しているが、
  // docs-cms ではタスクリストを使わないため、生 HTML 経由で `<input>` を混入させられる
  // 経路自体を閉じる (disabled な checkbox とはいえ、意図しない要素を通す面を増やさない)。
  tagNames: [...(defaultSchema.tagNames ?? []).filter((name) => name !== 'input'), 'details', 'summary', 'hh-callout'],
  attributes: {
    ...defaultSchema.attributes,
    details: [...(defaultSchema.attributes?.details ?? []), 'open'],
    summary: [...(defaultSchema.attributes?.summary ?? [])],
    'hh-callout': ['dataCallout'],
  },
};

/**
 * react-markdown の rehype-slug (github-slugger 相当) に極力揃えた slugify。
 * apps/hub 側の `features/docs-cms/content-analysis.ts#extractHeadingOutline` と
 * **同じ規則**にすること (閲覧画面の TOC アンカーと見出し id を一致させるため)。
 * packages/ui は apps/hub に依存できないためロジックを複製している。
 */
export function slugify(text: string): string {
  const base = text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-');
  return base.length > 0 ? base : 'section';
}

/**
 * コールアウトの種類。記事作成者が「どの種類の強調枠か」を選べるようにするための単位。
 * 追加は `CALLOUT_KIND_LIST` (このファイル内、markdownComponents より前) に 1 行足すだけでよい。
 */
export type CalloutKind = 'point' | 'attention' | 'warning' | 'note';

/** remark 記法 `[!KIND]` の KIND 部分に許可する文字列 (大文字小文字は問わない)。 */
const CALLOUT_KIND_TOKENS: Record<CalloutKind, string> = {
  point: 'POINT',
  attention: 'ATTENTION',
  warning: 'WARNING',
  note: 'NOTE',
};

const CALLOUT_KIND_PATTERN = Object.values(CALLOUT_KIND_TOKENS).join('|');

/**
 * GitHub 風 alert 構文 `> [!POINT]` / `> [!ATTENTION]` / `> [!WARNING]` / `> [!NOTE]` を検出し、
 * blockquote を `hh-callout` 要素 (data-callout="point"|"attention"|"warning"|"note") へ変換する
 * remark プラグイン。unist-util-visit を新規依存に足さず、素朴な再帰で mdast を歩く。
 *
 * 後方互換: `[!POINT]` `[!ATTENTION]` は docs-cms 導入当初からの記法で、既存記事に書かれたままの
 * 形で今後も同じ構文として認識し続ける (見た目=色は今回の変更で調整済みだが、構文自体は不変)。
 * 未知の `[!〜]` 記法 (例: 将来削除された種類の残骸) は変換せず、ただの blockquote として描画する
 * ので、記事が壊れて表示できなくなることはない。
 */
function remarkCallouts() {
  return (tree: MdastNode) => {
    walk(tree);
  };

  function walk(node: MdastNode): void {
    if (!Array.isArray(node.children)) return;
    for (const child of node.children) {
      if (child.type === 'blockquote') transformCallout(child);
      walk(child);
    }
  }

  function transformCallout(blockquote: MdastNode): void {
    const first = blockquote.children?.[0];
    if (first?.type !== 'paragraph' || !Array.isArray(first.children)) return;
    const firstText = first.children[0];
    if (firstText?.type !== 'text' || typeof firstText.value !== 'string') return;

    const match = new RegExp(`^\\[!(${CALLOUT_KIND_PATTERN})\\]\\s*`, 'i').exec(firstText.value);
    if (!match) return;

    firstText.value = firstText.value.slice(match[0].length);
    if (firstText.value.length === 0) first.children.shift();

    blockquote.data = {
      hName: 'hh-callout',
      hProperties: { dataCallout: (match[1] ?? '').toLowerCase() },
    };
  }
}

interface MdastNode {
  type: string;
  value?: string;
  data?: { hName?: string; hProperties?: Record<string, unknown> };
  children?: MdastNode[];
}

/** children (React node 群) からプレーンテキストだけを取り出す。コードブロックのコピー用。 */
function extractText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node !== null && typeof node === 'object' && 'props' in node) {
    const props = (node as { props?: { children?: ReactNode } }).props;
    return extractText(props?.children ?? null);
  }
  return '';
}

/**
 * コールアウトの種類ごとの色・アイコン・ラベルキー。
 * 依頼された 4 パターン (注意=赤系 / ポイント=青系 / 補足=グレー系 / 警告=黄系) にそれぞれ割り当てる。
 * `attention` の色は今回の改修で warning (黄) から danger (赤) へ変えている。変えたのは色だけで、
 * `[!ATTENTION]` という記法自体は変えていないため既存記事は書き直し不要 (remarkCallouts のコメント参照)。
 */
const calloutStyle: Record<CalloutKind, CSSProperties> = {
  point: {
    background: colorVar('primarySoft'),
    borderLeft: `4px solid ${colorVar('primary')}`,
    color: colorVar('text'),
  },
  attention: {
    background: colorVar('dangerSoft'),
    borderLeft: `4px solid ${colorVar('danger')}`,
    color: colorVar('text'),
  },
  warning: {
    background: colorVar('warningSoft'),
    borderLeft: `4px solid ${colorVar('warning')}`,
    color: colorVar('text'),
  },
  note: {
    background: colorVar('neutralSoft'),
    borderLeft: `4px solid ${colorVar('borderStrong')}`,
    color: colorVar('text'),
  },
};

const calloutIcon: Record<CalloutKind, string> = {
  point: '💡',
  attention: '⚠️',
  warning: '🚨',
  note: '📝',
};

const calloutLabelKey: Record<
  CalloutKind,
  'editor.insertPoint' | 'editor.insertAttention' | 'editor.insertWarning' | 'editor.insertNote'
> = {
  point: 'editor.insertPoint',
  attention: 'editor.insertAttention',
  warning: 'editor.insertWarning',
  note: 'editor.insertNote',
};

/** ツールバーのコールアウトメニューに出す順序。追加した種類はここへ足す。 */
const CALLOUT_KIND_LIST: readonly CalloutKind[] = ['point', 'attention', 'warning', 'note'];

/** ツールバーからコールアウトを挿入するときの、選択範囲が空の場合に入るプレースホルダー文言。 */
const CALLOUT_PLACEHOLDER: Record<CalloutKind, string> = {
  point: 'ポイント',
  attention: '注意事項',
  warning: '警告事項',
  note: '補足事項',
};

/** 未知の kind 文字列 (旧データや想定外の値) が来ても安全な既定値 (point) へ倒す。 */
function normalizeCalloutKind(value: unknown): CalloutKind {
  return value === 'attention' || value === 'warning' || value === 'note' || value === 'point' ? value : 'point';
}

function Callout({ kind, children }: { kind: CalloutKind; children: ReactNode }): ReactNode {
  const { t } = useUi();
  const icon = calloutIcon[kind];
  const label = t(calloutLabelKey[kind]);
  return (
    <div
      role="note"
      aria-label={label}
      data-hh-callout={kind}
      style={{
        display: 'flex',
        gap: spaceVar(2),
        padding: spaceVar(3),
        borderRadius: radiusVar('md'),
        margin: `${spaceVar(2)} 0`,
        ...calloutStyle[kind],
      }}
    >
      <span aria-hidden="true">{icon}</span>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

/** タグ/バッジ用の小さな共通の角丸ピル。 */
export type BadgeTone = 'neutral' | 'primary' | 'info' | 'warning';

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  style?: CSSProperties;
}

const badgeToneStyle: Record<BadgeTone, CSSProperties> = {
  neutral: {
    background: colorVar('surfaceMuted'),
    color: colorVar('textMuted'),
    border: `1px solid ${colorVar('border')}`,
  },
  primary: {
    background: colorVar('primarySoft'),
    color: colorVar('primary'),
    border: `1px solid ${colorVar('primarySoft')}`,
  },
  info: { background: colorVar('infoSoft'), color: colorVar('infoCyan'), border: `1px solid ${colorVar('infoSoft')}` },
  warning: {
    background: colorVar('warningSoft'),
    color: colorVar('warning'),
    border: `1px solid ${colorVar('warningSoft')}`,
  },
};

export function Badge({ children, tone = 'neutral', style }: BadgeProps): ReactNode {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: spaceVar(1),
        padding: `2px ${spaceVar(2)}`,
        borderRadius: radiusVar('full'),
        fontSize: 'var(--hh-font-size-sm)',
        lineHeight: 'var(--hh-line-height-tight)',
        whiteSpace: 'nowrap',
        ...badgeToneStyle[tone],
        ...style,
      }}
    >
      {children}
    </span>
  );
}

function CodeBlock({ children }: { children?: ReactNode }): ReactNode {
  const { t } = useUi();
  const [copied, setCopied] = useState(false);
  const text = extractText(children);

  const handleCopy = useCallback(() => {
    void navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => undefined);
  }, [text]);

  return (
    <div style={{ position: 'relative', margin: `${spaceVar(2)} 0` }}>
      <button
        type="button"
        data-hh-focusable=""
        onClick={handleCopy}
        style={{
          position: 'absolute',
          top: spaceVar(2),
          right: spaceVar(2),
          padding: `2px ${spaceVar(2)}`,
          borderRadius: radiusVar('sm'),
          border: `1px solid ${colorVar('borderStrong')}`,
          background: colorVar('surface'),
          color: colorVar('text'),
          fontSize: 'var(--hh-font-size-sm)',
          cursor: 'pointer',
        }}
      >
        {copied ? t('editor.copyCodeDone') : t('editor.copyCode')}
      </button>
      <pre
        style={{
          margin: 0,
          padding: spaceVar(3),
          borderRadius: radiusVar('md'),
          background: colorVar('surfaceMuted'),
          overflowX: 'auto',
        }}
      >
        {children}
      </pre>
    </div>
  );
}

function LightboxImage({ src, alt }: { src?: string | undefined; alt?: string | undefined }): ReactNode {
  const { t } = useUi();
  const [open, setOpen] = useState(false);
  if (src === undefined) return null;

  return (
    <figure style={{ margin: `${spaceVar(2)} 0` }}>
      <button
        type="button"
        data-hh-focusable=""
        onClick={() => setOpen(true)}
        aria-label={`${t('editor.imageExpand')}: ${alt ?? ''}`}
        style={{ display: 'block', border: 'none', background: 'transparent', padding: 0, cursor: 'zoom-in' }}
      >
        <img
          src={src}
          alt={alt ?? ''}
          style={{
            maxWidth: '100%',
            borderRadius: radiusVar('md'),
            border: `1px solid ${colorVar('border')}`,
          }}
        />
      </button>
      {alt !== undefined && alt.length > 0 ? (
        <figcaption
          style={{ color: colorVar('textMuted'), fontSize: 'var(--hh-font-size-sm)', marginTop: spaceVar(1) }}
        >
          {alt}
        </figcaption>
      ) : null}
      {open ? (
        <Modal
          open={open}
          title={alt && alt.length > 0 ? alt : t('editor.imageExpand')}
          size="lg"
          onClose={() => setOpen(false)}
        >
          <img src={src} alt={alt ?? ''} style={{ maxWidth: '100%', display: 'block' }} />
        </Modal>
      ) : null}
    </figure>
  );
}

/**
 * 画像の横並び配置。
 *
 * 記法は「新しい構文を覚えなくてよい」ことを優先し、独自の `:::` コンテナ構文は導入していない。
 * Markdown の素の挙動として、画像だけの行を空行を挟まずに連続して書くと 1 つの段落
 * (画像ノード + 改行の空白テキストノードの並び) になる。この段落を検出し、
 * 画像 1 枚だけの段落は従来どおり単独表示 (p タグの特殊処理、下の p ハンドラ参照)、
 * 画像が複数ある段落はこの ImageGroup で横並びのレスポンシブな行として描画する。
 *
 * レスポンシブ対応: flex-wrap で画面幅に応じて自動的に折り返す。
 * 各画像の flex-basis を 240px にしているため、幅が足りない画面 (スマートフォンなど) では
 * 自然に縦積みへ戻り、崩れない。メディアクエリを個別に足す必要はない。
 */
function ImageGroup({ children }: { children?: ReactNode }): ReactNode {
  const items = (Array.isArray(children) ? children : [children]).filter(
    (child) => !(typeof child === 'string' && child.trim().length === 0),
  );
  return (
    <div
      data-hh-image-group=""
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: spaceVar(2),
        margin: `${spaceVar(2)} 0`,
      }}
    >
      {items.map((child, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: 画像グループは並び替え/挿入操作を持たない静的表示なので index で十分
        <div key={index} style={{ flex: '1 1 240px', minWidth: 0 }}>
          {child}
        </div>
      ))}
    </div>
  );
}

function TableWrapper({ children }: { children?: ReactNode }): ReactNode {
  return (
    <div style={{ overflowX: 'auto', margin: `${spaceVar(2)} 0` }}>
      <table
        style={{
          borderCollapse: 'collapse',
          width: '100%',
          borderRadius: radiusVar('md'),
          overflow: 'hidden',
          border: `1px solid ${colorVar('border')}`,
        }}
      >
        {children}
      </table>
    </div>
  );
}

function markdownComponents(): Components {
  // 見出しテキストが文書内で重複したとき、同じ id を複数の見出しへ付けない。
  // TOC 側 (apps/hub の extractHeadingOutline) も同じ採番規則 (2 個目以降は `-1` `-2` ... を付与) を使うため、
  // ここで一致させておかないと TOC のリンクが同名の別見出しへ飛んでしまう。
  // MarkdownView は呼び出しごとに markdownComponents() を作り直すので、
  // この Map は 1 回分の描画 (= 1 文書) の外へ漏れない。
  const headingSlugCounts = new Map<string, number>();
  const nextHeadingId = (text: string): string => {
    const base = slugify(text);
    const count = headingSlugCounts.get(base) ?? 0;
    headingSlugCounts.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  };

  return {
    a: ({ href, children, ...rest }) => (
      <a {...rest} href={href} rel="noopener noreferrer" target="_blank" data-hh-focusable="">
        {children}
      </a>
    ),
    h1: ({ children, ...rest }) => (
      <h1 {...rest} id={nextHeadingId(extractText(children))}>
        {children}
      </h1>
    ),
    h2: ({ children, ...rest }) => (
      <h2 {...rest} id={nextHeadingId(extractText(children))}>
        {children}
      </h2>
    ),
    h3: ({ children, ...rest }) => (
      <h3 {...rest} id={nextHeadingId(extractText(children))}>
        {children}
      </h3>
    ),
    h4: ({ children, ...rest }) => (
      <h4 {...rest} id={nextHeadingId(extractText(children))}>
        {children}
      </h4>
    ),
    h5: ({ children, ...rest }) => (
      <h5 {...rest} id={nextHeadingId(extractText(children))}>
        {children}
      </h5>
    ),
    h6: ({ children, ...rest }) => (
      <h6 {...rest} id={nextHeadingId(extractText(children))}>
        {children}
      </h6>
    ),
    img: ({ src, alt }) => <LightboxImage src={typeof src === 'string' ? src : undefined} alt={alt} />,
    pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
    table: ({ children }) => <TableWrapper>{children}</TableWrapper>,
    // 画像だけの段落 (`![alt](src)` だけの行、または空行を挟まず連続する複数行) は
    // remark-rehype が <p> で包むが、LightboxImage は <figure>/ボタン/Modal
    // (dialog/h2 等のブロック要素) を持つため、そのまま <p> の子にすると HTML として
    // 不正なネスト (p > figure, p > div など) になり Next.js の hydration エラーを引き起こす。
    // 画像だけの段落は <p> をやめて素通しする。
    // 画像が複数 (空行なしで連続する `![alt](src)` の並び) あれば、横並び表示の ImageGroup へ回す
    // (「画像グループ挿入」記法。詳細は ImageGroup のコメント参照)。
    p: ({ node, children, ...rest }) => {
      const nonWhitespaceChildren = (node?.children ?? []).filter(
        (child) => !(child.type === 'text' && (child as { value?: string }).value?.trim() === ''),
      );
      const isAllImages =
        nonWhitespaceChildren.length > 0 &&
        nonWhitespaceChildren.every((child) => child.type === 'element' && child.tagName === 'img');
      if (isAllImages && nonWhitespaceChildren.length === 1) {
        return <>{children}</>;
      }
      if (isAllImages && nonWhitespaceChildren.length > 1) {
        return <ImageGroup>{children}</ImageGroup>;
      }
      return <p {...rest}>{children}</p>;
    },
    // react-markdown の Components 型はカスタムタグ名 (hh-callout) を静的に型付けできないため any 経由で追加する
    ...({
      'hh-callout': ({ node, children }: { node?: { properties?: Record<string, unknown> }; children?: ReactNode }) => {
        const kind = normalizeCalloutKind(node?.properties?.dataCallout);
        return <Callout kind={kind}>{children}</Callout>;
      },
      // biome-ignore lint/suspicious/noExplicitAny: react-markdown の Components 型はカスタムタグ名を型付けできない
    } as any),
  };
}

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
        remarkPlugins={[remarkGfm, remarkCallouts]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, markdownSanitizeSchema]]}
        components={markdownComponents()}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// --- MarkdownEditor --------------------------------------------------------

export interface MarkdownImageUploadResult {
  /** 挿入する Markdown 画像記法の URL。 */
  readonly url: string;
}

export interface MarkdownEditorProps {
  /** 入力欄のラベル。 */
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  description?: string;
  error?: string;
  rows?: number;
  /**
   * 画像アップロード処理。渡すとツールバーの画像ボタン/ドラッグ&ドロップ/クリップボード貼り付けが有効になる。
   * 呼び出し側 (docs-cms) が「まだドキュメント未作成なら暗黙にドラフト作成する」等の合成を担う。
   */
  onImageUpload?: (file: File) => Promise<MarkdownImageUploadResult>;
}

interface InsertRange {
  readonly start: number;
  readonly end: number;
}

function insertAtSelection(
  value: string,
  selection: InsertRange,
  before: string,
  after: string,
  placeholder: string,
): { readonly next: string; readonly cursor: number } {
  const selected = value.slice(selection.start, selection.end) || placeholder;
  const next = value.slice(0, selection.start) + before + selected + after + value.slice(selection.end);
  const cursor = selection.start + before.length + selected.length;
  return { next, cursor };
}

/** 見出し・太字・画像・表・コード・トグル・コールアウトをワンクリック挿入できるツールバー付きエディタ。 */
export function MarkdownEditor({
  label,
  value,
  onValueChange,
  description,
  error,
  rows = 12,
  onImageUpload,
}: MarkdownEditorProps): ReactNode {
  const { t } = useUi();
  const [activeId, setActiveId] = useState('write');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [calloutMenuOpen, setCalloutMenuOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const calloutMenuRef = useRef<HTMLDivElement>(null);
  const toolbarId = useId();

  useEffect(() => {
    if (!calloutMenuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (calloutMenuRef.current?.contains(event.target as Node)) return;
      setCalloutMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCalloutMenuOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [calloutMenuOpen]);

  const applyInsert = useCallback(
    (before: string, after: string, placeholder: string) => {
      const el = textareaRef.current;
      const selection: InsertRange = el
        ? { start: el.selectionStart, end: el.selectionEnd }
        : { start: value.length, end: value.length };
      const { next, cursor } = insertAtSelection(value, selection, before, after, placeholder);
      onValueChange(next);
      requestAnimationFrame(() => {
        el?.focus();
        el?.setSelectionRange(cursor, cursor);
      });
    },
    [value, onValueChange],
  );

  const insertCallout = useCallback(
    (kind: CalloutKind) => {
      applyInsert(`\n> [!${CALLOUT_KIND_TOKENS[kind]}]\n> `, '\n', CALLOUT_PLACEHOLDER[kind]);
      setCalloutMenuOpen(false);
    },
    [applyInsert],
  );

  const insertImageMarkdown = useCallback(
    (url: string, alt: string) => {
      const el = textareaRef.current;
      const position = el ? el.selectionStart : value.length;
      const snippet = `![${alt}](${url})`;
      const next = value.slice(0, position) + snippet + value.slice(position);
      onValueChange(next);
      const cursor = position + snippet.length;
      requestAnimationFrame(() => {
        el?.focus();
        el?.setSelectionRange(cursor, cursor);
      });
    },
    [value, onValueChange],
  );

  const uploadFile = useCallback(
    async (file: File) => {
      if (onImageUpload === undefined) return;
      setUploadError(null);
      setUploading(true);
      try {
        const result = await onImageUpload(file);
        insertImageMarkdown(result.url, file.name.replace(/\.[^.]+$/, ''));
      } catch {
        setUploadError(t('editor.imageUploadFailed'));
      } finally {
        setUploading(false);
      }
    },
    [onImageUpload, insertImageMarkdown, t],
  );

  /**
   * 複数ファイルを順番にアップロードし、空行を挟まず連続した Markdown 画像記法として
   * 1 回でまとめて挿入する (横並び表示になる記法。ImageGroup のコメント参照)。
   * 1 枚ずつ `insertImageMarkdown` を呼ぶと、直前の挿入がまだ state に反映されないうちに
   * 次の挿入が古い `value` を読んでしまい、後勝ちで前の画像が消えることがあるため、
   * 全件アップロードを待ってから 1 回で挿入する。
   */
  const uploadGroupFiles = useCallback(
    async (files: readonly File[]) => {
      if (onImageUpload === undefined || files.length === 0) return;
      setUploadError(null);
      setUploading(true);
      try {
        const snippets: string[] = [];
        for (const file of files) {
          const result = await onImageUpload(file);
          snippets.push(`![${file.name.replace(/\.[^.]+$/, '')}](${result.url})`);
        }
        const el = textareaRef.current;
        const position = el ? el.selectionStart : value.length;
        const snippet = snippets.join('\n');
        const next = value.slice(0, position) + snippet + value.slice(position);
        onValueChange(next);
        const cursor = position + snippet.length;
        requestAnimationFrame(() => {
          el?.focus();
          el?.setSelectionRange(cursor, cursor);
        });
      } catch {
        setUploadError(t('editor.imageUploadFailed'));
      } finally {
        setUploading(false);
      }
    },
    [onImageUpload, value, onValueChange, t],
  );

  const handleDrop = useCallback(
    (event: ReactDragEvent<HTMLDivElement>) => {
      if (onImageUpload === undefined) return;
      event.preventDefault();
      setDragOver(false);
      const file = [...event.dataTransfer.files].find((f) => f.type.startsWith('image/'));
      if (file) void uploadFile(file);
    },
    [onImageUpload, uploadFile],
  );

  const handlePaste = useCallback(
    (event: ReactClipboardEvent<HTMLTextAreaElement>) => {
      if (onImageUpload === undefined) return;
      const file = [...event.clipboardData.items]
        .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
        .map((item) => item.getAsFile())
        .find((f): f is File => f !== null);
      if (file) {
        event.preventDefault();
        void uploadFile(file);
      }
    },
    [onImageUpload, uploadFile],
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFilePick = useCallback(
    (event: ReactChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (file) void uploadFile(file);
    },
    [uploadFile],
  );

  const groupFileInputRef = useRef<HTMLInputElement>(null);
  const handleGroupFilePick = useCallback(
    (event: ReactChangeEvent<HTMLInputElement>) => {
      const files = [...(event.target.files ?? [])];
      event.target.value = '';
      if (files.length > 0) void uploadGroupFiles(files);
    },
    [uploadGroupFiles],
  );

  return (
    <div style={{ display: 'grid', gap: spaceVar(2) }}>
      <div
        id={toolbarId}
        role="toolbar"
        aria-label={t('editor.toolbar')}
        style={{ display: 'flex', flexWrap: 'wrap', gap: spaceVar(1) }}
      >
        <Button type="button" variant="ghost" onClick={() => applyInsert('## ', '', t('editor.insertHeading'))}>
          {t('editor.insertHeading')}
        </Button>
        <Button type="button" variant="ghost" onClick={() => applyInsert('**', '**', t('editor.insertBold'))}>
          {t('editor.insertBold')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={onImageUpload === undefined || uploading}
          loading={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {t('editor.insertImage')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={onImageUpload === undefined || uploading}
          loading={uploading}
          onClick={() => groupFileInputRef.current?.click()}
        >
          {t('editor.insertImageGroup')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => applyInsert('\n| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 値1 | 値2 | 値3 |\n', '', '')}
        >
          {t('editor.insertTable')}
        </Button>
        <Button type="button" variant="ghost" onClick={() => applyInsert('\n```\n', '\n```\n', 'code')}>
          {t('editor.insertCode')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => applyInsert('\n<details>\n<summary>見出し</summary>\n\n', '\n\n</details>\n', '本文')}
        >
          {t('editor.insertToggle')}
        </Button>
        <div ref={calloutMenuRef} style={{ position: 'relative' }}>
          <Button
            type="button"
            variant="ghost"
            aria-haspopup="menu"
            aria-expanded={calloutMenuOpen}
            onClick={() => setCalloutMenuOpen((open) => !open)}
          >
            {t('editor.insertCallout')}
          </Button>
          {calloutMenuOpen ? (
            <div
              role="menu"
              aria-label={t('editor.calloutMenu')}
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                zIndex: 1,
                marginTop: spaceVar(1),
                minWidth: 160,
                display: 'grid',
                padding: spaceVar(1),
                borderRadius: radiusVar('md'),
                border: `1px solid ${colorVar('border')}`,
                background: colorVar('surface'),
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
              }}
            >
              {CALLOUT_KIND_LIST.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  role="menuitem"
                  data-hh-focusable=""
                  onClick={() => insertCallout(kind)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spaceVar(2),
                    padding: `${spaceVar(1)} ${spaceVar(2)}`,
                    border: 'none',
                    borderRadius: radiusVar('sm'),
                    background: 'transparent',
                    color: colorVar('text'),
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <span aria-hidden="true">{calloutIcon[kind]}</span>
                  {t(calloutLabelKey[kind])}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {onImageUpload === undefined ? null : (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              style={{ display: 'none' }}
              onChange={handleFilePick}
            />
            <input
              ref={groupFileInputRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,image/gif"
              style={{ display: 'none' }}
              onChange={handleGroupFilePick}
            />
          </>
        )}
      </div>
      {uploading ? (
        <p role="status" style={{ color: colorVar('textMuted'), fontSize: 'var(--hh-font-size-sm)' }}>
          {t('editor.imageUploading')}
        </p>
      ) : null}
      {uploadError !== null ? (
        <p role="alert" style={{ color: colorVar('danger'), fontSize: 'var(--hh-font-size-sm)' }}>
          {uploadError}
        </p>
      ) : null}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: ドラッグ&ドロップの受け皿。
          実体の操作可能要素は中の Tabs/Textarea/ボタン (いずれも role/tabIndex を持つ) が担い、
          この div はキーボード操作の代替経路 (画像ボタン/貼り付け) が既にあるため装飾的なドロップ枠でよい。 */}
      <div
        onDragOver={(event) => {
          if (onImageUpload === undefined) return;
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          borderRadius: radiusVar('md'),
          outline: dragOver ? `2px dashed ${colorVar('primary')}` : 'none',
          outlineOffset: 2,
        }}
      >
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
                  ref={textareaRef}
                  label={label}
                  hideLabel
                  description={description}
                  error={error}
                  rows={rows}
                  value={value}
                  onChange={(event) => onValueChange(event.target.value)}
                  onPaste={handlePaste}
                  aria-describedby={toolbarId}
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
    </div>
  );
}
