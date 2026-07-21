// drizzle-orm への唯一の接点。型のみを取り込み、接続・クエリ実行のコードはこの package に置かない。

import type { SQL } from 'drizzle-orm';

/**
 * repository に渡す絞り込み条件。
 * drizzle の式オブジェクトをそのまま受けるが、生成は consumer 側 (schema を持つ feature) の責務。
 */
export type QueryFilter = SQL<unknown>;

/**
 * drizzle スキーマ束の置き場。
 * **この package はテーブル定義を一切持たない** (実体は feat-domain-model-db)。
 * ここでは「スキーマという型引数を受け取る」ことだけを表明する。
 */
export type DrizzleSchema = Readonly<Record<string, unknown>>;
