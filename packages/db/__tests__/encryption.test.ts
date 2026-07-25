// DMDB-T11: 封筒暗号化 (security-spec §4.1 / T-4, T-5)。round-trip・IV 非再利用・AAD 検証・key rotation。

import { beforeEach, describe, expect, it } from 'vitest';
import type { TursoAdapter } from '../connection/turso';
import { ColumnCipher, ENCRYPTED_COLUMN_PATTERN, EncryptionError } from '../repository/crypto';
import { asCore, createLibsqlTestDb, OTHER_KEK_B64, TEST_KEK_B64 } from './support/test-db';

let adapter: TursoAdapter;
let cipher: ColumnCipher;
const REF = { table: 'users', column: 'salary', rowId: 'row-1' };

beforeEach(async () => {
  adapter = await createLibsqlTestDb();
  cipher = new ColumnCipher(asCore(adapter), TEST_KEK_B64);
});

describe('DMDB-T11 envelope encryption', () => {
  it('encrypt → decrypt round-trip が成立し、保存形式が {v}:{iv}:{ct}:{tag}', async () => {
    const stored = await cipher.encryptColumn('salary', '8000000', REF);
    expect(stored).toMatch(ENCRYPTED_COLUMN_PATTERN);
    expect(stored.startsWith('1:')).toBe(true);
    expect(stored).not.toContain('8000000');
    expect(await cipher.decryptColumn('salary', stored, REF)).toBe('8000000');
  });

  it('同一平文でも IV がレコードごとに異なる (nonce 再利用なし)', async () => {
    const stored = await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        cipher.encryptColumn('idp_secret', 'same-plain', { ...REF, rowId: `parallel-${index}` }),
      ),
    );
    expect(stored.every((value) => value.startsWith('1:'))).toBe(true);
    expect(new Set(stored.map((value) => value.split(':')[1])).size).toBe(stored.length);
    await Promise.all(
      stored.map(async (value, index) => {
        expect(await cipher.decryptColumn('idp_secret', value, { ...REF, rowId: `parallel-${index}` })).toBe(
          'same-plain',
        );
      }),
    );
  });

  it('AAD 不一致 (別 row への移植 = cut-and-paste) で復号が失敗する', async () => {
    const stored = await cipher.encryptColumn('salary', 'secret', REF);
    await expect(cipher.decryptColumn('salary', stored, { ...REF, rowId: 'row-2' })).rejects.toThrow(EncryptionError);
  });

  it('purpose が異なれば DEK も異なる (salary の暗号文を idp_secret では復号できない)', async () => {
    const stored = await cipher.encryptColumn('salary', 'secret', REF);
    await expect(cipher.decryptColumn('idp_secret', stored, REF)).rejects.toThrow(EncryptionError);
  });

  it('DEK ローテーション後も旧 version の暗号文を復号でき、新規暗号化は新 version を使う (§4.1.2)', async () => {
    const oldStored = await cipher.encryptColumn('salary', 'old-value', REF);
    expect(oldStored.startsWith('1:')).toBe(true);

    const newVersion = await cipher.rotateDek('salary');
    expect(newVersion).toBe(2);

    // 復号互換: key_version 列により旧版の復号は常に可能
    expect(await cipher.decryptColumn('salary', oldStored, REF)).toBe('old-value');

    const newStored = await cipher.encryptColumn('salary', 'new-value', REF);
    expect(newStored.startsWith('2:')).toBe(true);
    expect(await cipher.decryptColumn('salary', newStored, REF)).toBe('new-value');
  });

  it('不正な KEK では復号できない (wrap の実効性)', async () => {
    const stored = await cipher.encryptColumn('salary', 'guarded', REF);
    const wrongKek = new ColumnCipher(asCore(adapter), OTHER_KEK_B64);
    await expect(wrongKek.decryptColumn('salary', stored, REF)).rejects.toThrow(EncryptionError);
  });
});
