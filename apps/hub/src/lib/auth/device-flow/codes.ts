/**
 * device_code / user_code の生成。
 * 乱数源を注入可能にしてあるのは、生成値の**形** (文字集合・長さ) をテストで検査するため。
 * 値そのものを固定する必要はない。
 */

import { USER_CODE_ALPHABET, USER_CODE_LENGTH } from '@harness-hub/schemas';

import { base64UrlEncode } from '../jwt.js';

/** 乱数バイト列の生成。既定は CSPRNG。 */
export type RandomBytes = (byteLength: number) => Uint8Array;

export const systemRandomBytes: RandomBytes = (byteLength) => crypto.getRandomValues(new Uint8Array(byteLength));

/**
 * user_code を作る。
 *
 * 文字集合が 32 種ちょうど (2^5) なので `byte & 31` で偏りなく写像できる。
 * 集合サイズが 2 のべき乗でない場合に剰余を使うと、先頭の文字が出やすくなる (modulo bias)。
 */
export function generateUserCode(randomBytes: RandomBytes = systemRandomBytes): string {
  const bytes = randomBytes(USER_CODE_LENGTH);
  let code = '';
  for (let index = 0; index < USER_CODE_LENGTH; index += 1) {
    // noUncheckedIndexedAccess 下では undefined を潰しておく必要がある
    const byte = bytes[index] ?? 0;
    code += USER_CODE_ALPHABET[byte & 31] ?? USER_CODE_ALPHABET[0];
  }
  return code;
}

/**
 * device_code / refresh token の実体。256bit の不透明値。
 * 意味を持たせない (利用者 ID 等を埋め込まない) ため、値からテナントを推測されない。
 */
export function generateOpaqueToken(randomBytes: RandomBytes = systemRandomBytes): string {
  return base64UrlEncode(randomBytes(32));
}
