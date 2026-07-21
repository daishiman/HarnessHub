/** API 入出力の共通エンベロープ: cursor ページング応答と RFC 9457 エラー応答の単一ソース。 */
import { z } from 'zod';

import { cursorSchema } from './primitives.js';

/** `application/problem+json` の media type。エラー応答はこの 1 種類に寄せる。 */
export const PROBLEM_JSON_MEDIA_TYPE = 'application/problem+json';

/**
 * cursor ページング応答 (backend-spec §3.5)。
 * item schema を渡して具体化する。`next_cursor` が null なら終端。
 */
export function paginatedSchema<TItem extends z.ZodType>(item: TItem) {
  return z.object({
    items: z.array(item),
    next_cursor: cursorSchema.nullable(),
  });
}

/** `paginatedSchema` が返す型。consumer 側で型注釈を書くときに使う。 */
export type Paginated<TItem> = {
  items: TItem[];
  next_cursor: string | null;
};

/**
 * フィールド単位のエラー。RFC 9457 の拡張メンバ `errors[]` に載せ、
 * クライアントは react-hook-form の `setError` へそのまま写像する (frontend-spec §2)。
 */
export const fieldErrorSchema = z.object({
  /** ドット区切りのフィールド path (例: `items.0.title`)。body 全体のエラーは空文字。 */
  field: z.string(),
  /** 機械可読なコード。zod の issue code をそのまま使う。 */
  code: z.string().min(1),
  /** 利用者向けの平易な日本語 (qa-018)。 */
  message: z.string().min(1),
});
export type FieldError = z.output<typeof fieldErrorSchema>;

/** RFC 9457 problem details。全 API のエラー応答はこの形に統一する (backend-spec §3.4)。 */
export const problemDetailsSchema = z.object({
  /** エラー種別を識別する URI 参照。既定は `about:blank`。 */
  type: z.string().min(1).default('about:blank'),
  /** 種別の短い要約。同一 `type` では変えない。 */
  title: z.string().min(1),
  /** HTTP ステータス。 */
  status: z.number().int().min(400).max(599),
  /** この発生事象の説明。平易な日本語 + 次の一手を書く (qa-018)。 */
  detail: z.string().optional(),
  /** 発生箇所の URI 参照 (通常はリクエスト path)。 */
  instance: z.string().optional(),
  /** 入力検証の失敗内訳。 */
  errors: z.array(fieldErrorSchema).optional(),
});
export type ProblemDetails = z.output<typeof problemDetailsSchema>;

/** problem details を組み立てる。`type` の既定値を都度書かないための入口。 */
/**
 * 省略可能な項目に `| undefined` を明示するのは `exactOptionalPropertyTypes: true` 前提のため。
 * ここでは「未指定」と「明示的な undefined」がどちらも「その項目なし」を意味するので、
 * 呼び出し側に conditional spread を強いず両方受け取れる形にする。
 */
export function problemDetails(input: {
  title: string;
  status: number;
  type?: string | undefined;
  detail?: string | undefined;
  instance?: string | undefined;
  errors?: FieldError[] | undefined;
}): ProblemDetails {
  return problemDetailsSchema.parse(input);
}

/**
 * zod の検証失敗を RFC 9457 の 422 応答へ写像する。
 * 「zod で検証したものは必ずこの形で返る」ことを保証するため、
 * API 層が独自にエラー整形を書かないこと。
 */
export function problemDetailsFromZodError(
  error: z.ZodError,
  options?: {
    title?: string | undefined;
    status?: number | undefined;
    type?: string | undefined;
    detail?: string | undefined;
    instance?: string | undefined;
  },
): ProblemDetails {
  return problemDetails({
    type: options?.type ?? 'about:blank',
    title: options?.title ?? '入力内容を確認してください',
    status: options?.status ?? 422,
    detail: options?.detail,
    instance: options?.instance,
    errors: error.issues.map((issue) => ({
      field: issue.path.map(String).join('.'),
      code: issue.code,
      message: issue.message,
    })),
  });
}

/**
 * 検証結果を「成功値」か「problem details」かに畳んだもの。
 * route handler が例外制御を書かずに応答を決められるようにする。
 */
export type ParseOutcome<T> = { ok: true; data: T } | { ok: false; problem: ProblemDetails };

/** schema で検証し、失敗時は RFC 9457 へ写像した結果を返す。 */
export function parseRequest<TSchema extends z.ZodType>(
  schema: TSchema,
  input: unknown,
  options?: { instance?: string },
): ParseOutcome<z.output<TSchema>> {
  const result = schema.safeParse(input);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  return { ok: false, problem: problemDetailsFromZodError(result.error, options) };
}
