// 決定論 ID の導出 (ADR §3.2 R2)。
//
// 既存カラムは ULID (Crockford Base32 26 文字) を格納するため、字面はそれに揃える。
// ただし ULID 本来の先頭 48bit は生成時刻なので、そのまま使うと実行のたびに値が変わり
// 「2 回実行してもダイジェストが一致する」(T3-1/T3-5) を満たせない。
// そこで論理キーの SHA-256 先頭 128bit を、ULID と同じ符号化規則で 26 文字へ写す。

import { createHash } from 'node:crypto';

/** Crockford Base32。I/L/O/U を除く 32 文字。 */
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * 論理キーから決定論 ID を導く。
 *
 * 26 文字 × 5bit = 130bit なので、128bit を右詰めし先頭 2bit は 0 になる。
 * 結果として先頭文字は必ず `0`-`7` の範囲に収まり、ULID の上限規約とも矛盾しない。
 */
export function seedId(logicalKey: string): string {
  const digest = createHash('sha256').update(logicalKey, 'utf8').digest();
  let value = 0n;
  for (const byte of digest.subarray(0, 16)) {
    value = (value << 8n) | BigInt(byte);
  }
  let encoded = '';
  for (let shift = 125n; shift >= 0n; shift -= 5n) {
    encoded += CROCKFORD[Number((value >> shift) & 31n)];
  }
  return encoded;
}

/** R2 系列の補助。連番付きの論理キーを組み立てる (`users/bulk/0007` など)。 */
export function seriesKey(prefix: string, index: number): string {
  return `${prefix}/${String(index).padStart(4, '0')}`;
}
