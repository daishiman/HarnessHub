// ULID 生成 (qa-032: 全 PK は ULID 文字列。時系列ソート可・衝突なし)。
// Workers/Node 双方で動く Web Crypto のみに依存し、外部パッケージを持ち込まない (bundle 予算 A2)。

const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford Base32
const TIME_LEN = 10;
const RANDOM_LEN = 16;

let lastTime = -1;
let lastRandom: Uint8Array = new Uint8Array(10);

function encodeTime(time: number): string {
  let value = time;
  const chars = new Array<string>(TIME_LEN);
  for (let i = TIME_LEN - 1; i >= 0; i -= 1) {
    chars[i] = ENCODING[value % 32] as string;
    value = Math.floor(value / 32);
  }
  return chars.join('');
}

function encodeRandom(bytes: Uint8Array): string {
  // 80bit を 5bit × 16 文字へ。bytes は 10 byte。
  let bits = 0;
  let bitCount = 0;
  let out = '';
  for (const byte of bytes) {
    bits = (bits << 8) | byte;
    bitCount += 8;
    while (bitCount >= 5) {
      out += ENCODING[(bits >>> (bitCount - 5)) & 31];
      bitCount -= 5;
    }
  }
  return out.slice(0, RANDOM_LEN);
}

/** 同一ミリ秒内は乱数部を +1 する monotonic 実装 (時系列ソート可を単一プロセス内で保証)。 */
export function newUlid(now: number = Date.now()): string {
  if (now === lastTime) {
    // 80bit big-endian increment
    const next = new Uint8Array(lastRandom);
    for (let i = next.length - 1; i >= 0; i -= 1) {
      const v = ((next[i] as number) + 1) & 0xff;
      next[i] = v;
      if (v !== 0) break;
    }
    lastRandom = next;
  } else {
    lastTime = now;
    lastRandom = crypto.getRandomValues(new Uint8Array(10));
  }
  return encodeTime(now) + encodeRandom(lastRandom);
}

export const ULID_PATTERN = /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{26}$/;

export function isUlid(value: unknown): value is string {
  return typeof value === 'string' && ULID_PATTERN.test(value);
}
