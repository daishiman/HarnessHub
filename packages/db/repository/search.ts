/**
 * 一覧の絞り込みで使う「語を含む」検索条件の正本。
 *
 * 各 repository が `like(column, '%' + 入力 + '%')` を書き起こすと、次の 2 つが
 * 画面ごとにずれる。どちらも結果が静かに間違うだけで、例外にはならない。
 *
 * 1. **ワイルドカードの取りこぼし。** SQLite の LIKE では `%` が任意長、`_` が任意
 *    1 文字として働く。利用者が入力した `50%` をそのまま挟むと `%50%%` になり、
 *    「50 で始まる何か」ではなく **全件**が一致する。`_` も同様に、`AI_job` が
 *    `AIxjob` に当たる。入力は検索語であって書式ではないので、ここで無効化する。
 * 2. **検索対象の並べ方。** 複数列を見るとき or の組み立てを各所で書くと、列を
 *    足したときに 1 か所だけ漏れる。
 *
 * ESCAPE 句を伴う LIKE は drizzle の `like()` では表現できないため `sql` で組む。
 * 値は常にプレースホルダとして渡すので、文字列連結による SQL 注入は起こらない。
 */
import { type AnyColumn, type SQL, sql } from 'drizzle-orm';

/** LIKE のパターンとして特別扱いされる文字。エスケープ文字自身を先に含める。 */
const LIKE_METACHARACTERS = /[\\%_]/g;

/**
 * 利用者の入力を LIKE パターンの「ただの文字」に落とす。
 *
 * 前後の `%` はこの関数の外では付けない。付け外しを呼び出し側に委ねると
 * 「前方一致のつもりが部分一致だった」が画面ごとに生まれる。
 */
export function toContainsPattern(term: string): string {
  return `%${term.replace(LIKE_METACHARACTERS, (character) => `\\${character}`)}%`;
}

/** 1 列に対する「語を含む」条件。 */
export function containsTerm(column: AnyColumn, term: string): SQL {
  return sql`${column} LIKE ${toContainsPattern(term)} ESCAPE '\\'`;
}

/**
 * 複数列のいずれかが語を含む条件。列を 1 つも渡さなければ `undefined` を返す。
 *
 * `undefined` を返すのは「条件なし」であって「何も一致しない」ではない。
 * 呼び出し側は predicates へ push しないことで条件を落とす。
 */
export function containsTermInAny(term: string, columns: readonly AnyColumn[]): SQL | undefined {
  if (columns.length === 0) return undefined;
  const conditions = columns.map((column) => containsTerm(column, term));
  return conditions.reduce((left, right) => sql`(${left} OR ${right})`);
}
