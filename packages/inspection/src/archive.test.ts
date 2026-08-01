import { describe, expect, it } from 'vitest';
import { ARCHIVE_LIMITS, inspectArchiveHeader } from './archive';
import { buildZipFixture } from './archive-fixture';

/** findings から ruleId だけを取り出す (メッセージ文言に結合しないため)。 */
function ruleIdsOf(report: ReturnType<typeof inspectArchiveHeader>): string[] {
  return report.findings.map((finding) => finding.ruleId);
}

/** EOCD (末尾 22 バイト) の任意フィールドを書き換える。壊れた ZIP を作るため。 */
function patchEocd(zip: Uint8Array, offsetInEocd: number, value: number, bytes: 2 | 4): Uint8Array {
  const copy = new Uint8Array(zip);
  const view = new DataView(copy.buffer);
  const eocd = copy.byteLength - 22;
  if (bytes === 2) view.setUint16(eocd + offsetInEocd, value, true);
  else view.setUint32(eocd + offsetInEocd, value, true);
  return copy;
}

describe('inspectArchiveHeader', () => {
  it('正常な ZIP を受理し、目録の内容をそのまま返す', () => {
    const zip = buildZipFixture([
      { path: 'harness.json', content: '{"name":"demo"}' },
      { path: 'src/', content: '' },
      { path: 'src/main.ts', content: 'export const x = 1;' },
    ]);

    const report = inspectArchiveHeader(zip);

    expect(report.ok).toBe(true);
    expect(report.findings).toEqual([]);
    expect(report.entries.map((entry) => entry.path)).toEqual(['harness.json', 'src/', 'src/main.ts']);
    // 末尾 '/' はディレクトリ。展開側がファイルとして書き出さないための印
    expect(report.entries[1]?.isDirectory).toBe(true);
    expect(report.entries[0]?.isDirectory).toBe(false);
    expect(report.entries[0]?.uncompressedSize).toBe(15);
    expect(report.entries[0]?.compressionMethod).toBe(0);
  });

  it('ZIP として解析できないバイト列を ARCHIVE-FORMAT で拒否する', () => {
    const report = inspectArchiveHeader(new TextEncoder().encode('this is not a zip file at all'));

    expect(report.ok).toBe(false);
    expect(ruleIdsOf(report)).toEqual(['ARCHIVE-FORMAT']);
    expect(report.entries).toEqual([]);
  });

  it('22 バイト未満の入力でも例外を投げずに拒否する', () => {
    const report = inspectArchiveHeader(new Uint8Array(3));

    expect(report.ok).toBe(false);
    expect(ruleIdsOf(report)).toEqual(['ARCHIVE-FORMAT']);
  });

  it('圧縮サイズ上限を超えた入力は目録を読まずに拒否する', () => {
    const oversized = new Uint8Array(ARCHIVE_LIMITS.maxCompressedBytes + 1);

    const report = inspectArchiveHeader(oversized);

    expect(report.ok).toBe(false);
    expect(ruleIdsOf(report)).toEqual(['ARCHIVE-MAX-COMPRESSED']);
    // 「読みに行かない」ことが要件。entries が空であることがその証拠
    expect(report.entries).toEqual([]);
  });

  it('エントリ数上限を超えた目録は走査せずに拒否する', () => {
    const zip = buildZipFixture([{ path: 'a.txt', content: 'a' }]);
    // 実体は 1 件だが、目録が 1001 件だと主張している状態を作る
    const forged = patchEocd(zip, 10, ARCHIVE_LIMITS.maxEntries + 1, 2);

    const report = inspectArchiveHeader(forged);

    expect(report.ok).toBe(false);
    expect(ruleIdsOf(report)).toEqual(['ARCHIVE-MAX-ENTRIES']);
    expect(report.entries).toEqual([]);
  });

  it('central directory の位置が嘘のときは途中で打ち切る', () => {
    const zip = buildZipFixture([{ path: 'a.txt', content: 'a' }]);
    const forged = patchEocd(zip, 16, 0, 4);

    const report = inspectArchiveHeader(forged);

    expect(report.ok).toBe(false);
    expect(ruleIdsOf(report)).toEqual(['ARCHIVE-FORMAT']);
  });

  it('パス長 255 を超えるエントリを拒否する', () => {
    const longPath = `${'a'.repeat(ARCHIVE_LIMITS.maxPathLength)}.txt`;
    const report = inspectArchiveHeader(buildZipFixture([{ path: longPath, content: 'x' }]));

    expect(report.ok).toBe(false);
    expect(ruleIdsOf(report)).toContain('ARCHIVE-PATH-LENGTH');
    expect(report.findings[0]?.location?.path).toBe(longPath);
  });

  it('ディレクトリ階層 10 を超えるエントリを拒否する', () => {
    const deep = `${Array.from({ length: ARCHIVE_LIMITS.maxDirectoryDepth }, (_, i) => `d${i}`).join('/')}/f.txt`;
    const report = inspectArchiveHeader(buildZipFixture([{ path: deep, content: 'x' }]));

    expect(report.ok).toBe(false);
    expect(ruleIdsOf(report)).toContain('ARCHIVE-PATH-DEPTH');
  });

  it('ちょうど階層 10 は受理する (境界を off-by-one で塞がない)', () => {
    const exact = `${Array.from({ length: ARCHIVE_LIMITS.maxDirectoryDepth - 1 }, (_, i) => `d${i}`).join('/')}/f.txt`;
    const report = inspectArchiveHeader(buildZipFixture([{ path: exact, content: 'x' }]));

    expect(report.ok).toBe(true);
  });

  it.each([
    ['単純な親参照', '../evil.txt'],
    ['打ち消しを挟んだ親参照', 'a/../../evil.txt'],
    ['絶対パス', '/etc/passwd'],
    ['Windows のドライブ指定', 'C:evil.txt'],
    ['バックスラッシュ区切りの親参照', '..\\evil.txt'],
    ['NUL 埋め込み', `ok.txt${String.fromCharCode(0)}.js`],
  ])('zip slip を拒否する: %s', (_label, path) => {
    const report = inspectArchiveHeader(buildZipFixture([{ path, content: 'x' }]));

    expect(report.ok).toBe(false);
    expect(ruleIdsOf(report)).toContain('ARCHIVE-PATH-TRAVERSAL');
  });

  it('深さが元に戻る親参照も拒否する (通過した事実は消えない)', () => {
    // a/../../b/c は最終的に深さ 1 に戻るが、途中で起点の外へ出ている
    const report = inspectArchiveHeader(buildZipFixture([{ path: 'a/../../b/c.txt', content: 'x' }]));

    expect(ruleIdsOf(report)).toContain('ARCHIVE-PATH-TRAVERSAL');
  });

  it('打ち消しが起点の外へ出ない親参照は受理する', () => {
    const report = inspectArchiveHeader(buildZipFixture([{ path: 'a/b/../c.txt', content: 'x' }]));

    expect(report.ok).toBe(true);
  });

  it('シンボリックリンクを拒否する', () => {
    // 0o120777 = S_IFLNK | 0777。展開先の外を指すリンクは展開後に効く攻撃になる
    const report = inspectArchiveHeader(
      buildZipFixture([{ path: 'link', content: '/etc/passwd', unixMode: 0o120777 }]),
    );

    expect(report.ok).toBe(false);
    expect(ruleIdsOf(report)).toContain('ARCHIVE-ENTRY-TYPE');
    expect(report.entries[0]?.isSymlink).toBe(true);
  });

  it('通常ファイルを symlink と誤判定しない', () => {
    const report = inspectArchiveHeader(buildZipFixture([{ path: 'a.txt', content: 'x', unixMode: 0o100644 }]));

    expect(report.entries[0]?.isSymlink).toBe(false);
    expect(report.ok).toBe(true);
  });

  it('展開後サイズの申告が上限を超えていれば拒否する', () => {
    const report = inspectArchiveHeader(
      buildZipFixture([
        { path: 'bomb.bin', content: 'x', declaredUncompressedSize: ARCHIVE_LIMITS.maxUncompressedBytes + 1 },
      ]),
    );

    expect(report.ok).toBe(false);
    expect(ruleIdsOf(report)).toContain('ARCHIVE-MAX-UNCOMPRESSED');
  });

  it('圧縮比が上限を超えていれば拒否する', () => {
    // 圧縮後 100 バイト / 展開後 20000 バイト = 200:1。展開後の絶対値は上限内なので
    // 「比」の判定だけが効いていることを確かめられる
    const report = inspectArchiveHeader(
      buildZipFixture([{ path: 'bomb.bin', content: 'x'.repeat(100), declaredUncompressedSize: 20_000 }]),
    );

    expect(ruleIdsOf(report)).toEqual(['ARCHIVE-MAX-RATIO']);
  });

  it('圧縮後 0 バイトのときは圧縮比を評価しない (0 除算で無限大にしない)', () => {
    const report = inspectArchiveHeader(buildZipFixture([{ path: 'empty/', content: '' }]));

    expect(report.ok).toBe(true);
    expect(ruleIdsOf(report)).toEqual([]);
  });

  it('複数の違反をまとめて返す (最初の 1 件で打ち切らない)', () => {
    const report = inspectArchiveHeader(
      buildZipFixture([
        { path: '../escape.txt', content: 'x' },
        { path: 'link', content: 'x', unixMode: 0o120777 },
      ]),
    );

    expect(report.ok).toBe(false);
    expect(ruleIdsOf(report)).toEqual(['ARCHIVE-PATH-TRAVERSAL', 'ARCHIVE-ENTRY-TYPE']);
  });

  it('findings は静的検証ステージの error として出る', () => {
    const report = inspectArchiveHeader(buildZipFixture([{ path: '../escape.txt', content: 'x' }]));

    expect(report.findings[0]?.stage).toBe('static-validation');
    expect(report.findings[0]?.severity).toBe('error');
  });
});
