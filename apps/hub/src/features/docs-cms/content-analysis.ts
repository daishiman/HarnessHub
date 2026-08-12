/**
 * Markdown 本文からの純粋関数による自動解析 (feat: docs-cms-rich-editing)。
 *
 * ここに副作用 (fetch/DB/日時) を持ち込まない。作成/更新 API から呼ばれ、
 * リクエストに thumbnail_url/excerpt が明示されなかった場合の自動算出、
 * および asset_summary の常時算出に使う。
 */

import { documentImageUrlSchema } from '@harness-hub/schemas';

const HEADING_RE = /^(#{1,2})\s+(.+?)\s*$/;
const IMAGE_RE = /!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/;
const IMAGE_RE_G = /!\[[^\]]*\]\([^)\s]+(?:\s+"[^"]*")?\)/g;
const TABLE_ROW_RE = /^\s*\|.*\|\s*$/;
const CODE_FENCE_RE = /^\s*(```|~~~)/;
const ALL_HEADING_RE = /^(#{1,6})\s+(.+?)\s*$/;

/** 見出し行 (H1/H2) のうち最初のものをタイトル候補として返す。無ければ null。 */
export function extractTitleCandidate(markdown: string): string | null {
  for (const line of markdown.split('\n')) {
    const match = HEADING_RE.exec(line);
    if (match) return stripInlineMarkdown(match[2] ?? '').trim() || null;
  }
  return null;
}

/** 本文中で最初に登場し、Docs wire契約で安全に表示できる画像URL。無ければnull。 */
export function extractFirstImageUrl(markdown: string): string | null {
  const match = IMAGE_RE.exec(markdown);
  const candidate = match?.[1];
  if (candidate === undefined) return null;
  const parsed = documentImageUrlSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

export interface DerivedDocumentField {
  readonly value: string | null;
  readonly source: 'auto' | 'manual';
}

/** 作成時は文字列だけを手動値とし、未指定/null は本文由来の自動値へ揃える。 */
export function resolveInitialDerivedField(
  requested: string | null | undefined,
  derive: () => string | null,
): DerivedDocumentField {
  return requested == null ? { value: derive(), source: 'auto' } : { value: requested, source: 'manual' };
}

/**
 * 更新時の派生欄を解決する。
 * - 未指定 + 既存 manual: 本文が変わっても保持
 * - 未指定 + 既存 auto: 本文変更時だけ再計算
 * - 文字列: manual へ変更
 * - 明示 null: auto へ戻して現在本文から再計算
 */
export function resolveUpdatedDerivedField(input: {
  readonly requested: string | null | undefined;
  readonly currentSource: 'auto' | 'manual';
  readonly bodyChanged: boolean;
  readonly derive: () => string | null;
}): DerivedDocumentField | null {
  if (input.requested === null) return { value: input.derive(), source: 'auto' };
  if (input.requested !== undefined) return { value: input.requested, source: 'manual' };
  if (!input.bodyChanged || input.currentSource === 'manual') return null;
  return { value: input.derive(), source: 'auto' };
}

/** インライン Markdown 装飾 (強調/リンク/コード/画像) を剥がしてプレーンテキストへ落とす。 */
function stripInlineMarkdown(text: string): string {
  return text
    .replace(IMAGE_RE_G, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]{1,3}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 見出し/画像/コードブロック/表/生 HTML/コールアウトを除いた最初の「本文らしい段落」を
 * プレーンテキストとして取り出し、maxLength 文字で切り詰める。切り詰めた場合は末尾に「…」を付ける。
 */
export function extractExcerpt(markdown: string, maxLength = 120): string {
  const lines = markdown.split('\n');
  let inCodeFence = false;
  const paragraphLines: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine;
    if (CODE_FENCE_RE.test(line)) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;

    const trimmed = line.trim();
    if (trimmed.length === 0) {
      if (paragraphLines.length > 0) break; // 段落の終わり
      continue;
    }
    if (ALL_HEADING_RE.test(trimmed)) continue;
    if (TABLE_ROW_RE.test(trimmed)) continue;
    if (/^\|?\s*-{2,}\s*\|/.test(trimmed)) continue; // table 区切り行
    if (/^<\/?[a-zA-Z][^>]*>/.test(trimmed)) continue; // 生 HTML 行 (details/summary 等)
    if (/^>\s*\[!(POINT|ATTENTION)\]/i.test(trimmed)) continue; // コールアウト先頭行
    if (/^>/.test(trimmed)) {
      paragraphLines.push(trimmed.replace(/^>\s?/, ''));
      continue;
    }
    if (/^!\[/.test(trimmed) && IMAGE_RE.test(trimmed) && trimmed.replace(IMAGE_RE_G, '').trim().length === 0) {
      continue; // 画像のみの行
    }

    paragraphLines.push(trimmed);
  }

  const plain = stripInlineMarkdown(paragraphLines.join(' '));
  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength)}…`;
}

/**
 * react-markdown の rehype-slug (github-slugger 相当) に極力揃えた slugify。
 * 完全一致は保証しないため、`packages/ui/src/components/Markdown.tsx` の見出しレンダラー側にも
 * 同じ手順 (このアルゴリズムと同じ重複解決規則) を複製させ、生成規則を一致させる (このファイルが正)。
 *
 * packages/ui (共通層) は apps/hub のこのファイルへ依存できない (層の向きが逆になる) ため、
 * 実装を共有せず複製する形を採っている。そのため意図的な重複であり、モジュール内限定に留めて
 * 公開 API 名の重複検出 (duplicate-detector, owner package: packages/ui) には掛からないようにする。
 */
function slugify(text: string): string {
  const base = text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-');
  return base.length > 0 ? base : 'section';
}

export interface HeadingOutlineEntry {
  readonly level: number;
  readonly text: string;
  readonly slug: string;
}

/** 見出し階層をパースし、閲覧画面の TOC 用に一意な slug を採番する。 */
export function extractHeadingOutline(markdown: string): HeadingOutlineEntry[] {
  const entries: HeadingOutlineEntry[] = [];
  const seen = new Map<string, number>();
  let inCodeFence = false;

  for (const rawLine of markdown.split('\n')) {
    if (CODE_FENCE_RE.test(rawLine)) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;

    const match = ALL_HEADING_RE.exec(rawLine);
    if (!match) continue;
    const level = (match[1] ?? '').length;
    const text = stripInlineMarkdown(match[2] ?? '');
    if (text.length === 0) continue;

    const base = slugify(text);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    const slug = count === 0 ? base : `${base}-${count}`;
    entries.push({ level, text, slug });
  }
  return entries;
}

export interface AssetSummary {
  readonly imageCount: number;
  readonly hasTable: boolean;
  readonly hasCode: boolean;
}

/** 本文中の画像枚数・表の有無・コードブロックの有無を数える。 */
export function summarizeAssets(markdown: string): AssetSummary {
  const imageCount = markdown.match(IMAGE_RE_G)?.length ?? 0;

  let hasCode = false;
  let hasTable = false;
  let sawTableRow = false;

  for (const rawLine of markdown.split('\n')) {
    if (CODE_FENCE_RE.test(rawLine)) {
      hasCode = true;
      continue;
    }
    const trimmed = rawLine.trim();
    if (TABLE_ROW_RE.test(trimmed)) {
      if (sawTableRow) hasTable = true;
      sawTableRow = true;
    } else {
      sawTableRow = false;
    }
  }

  return { imageCount, hasTable, hasCode };
}
