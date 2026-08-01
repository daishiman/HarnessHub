/**
 * 検査の入口 `inspectPackageArchive` (test-design.md T8 / security-spec-request-controls.md §6.3)。
 *
 * ここで確かめたいのは判定内容そのものではなく**順序**である:
 * 目録で落ちたものは展開されないこと、そして目録を通ったものは
 * 申告値ではなく**展開後の実バイト数**で測り直されること。
 * 順序が崩れると、上限値がいくら正しくても zip bomb は通る。
 */

import { ARCHIVE_LIMITS } from '@harness-hub/inspection';
import { describe, expect, it } from 'vitest';

import { inspectPackageArchive } from '@/lib/publish/package-inspection';

import { buildTestZip, buildValidPackage, VALID_MANIFEST } from './support/zip';

function ruleIdsOf(result: { readonly findings: readonly { readonly rule_id: string }[] }): string[] {
  return [...new Set(result.findings.map((finding) => finding.rule_id))].sort();
}

describe('正常系', () => {
  it('検査に通るパッケージは green で、展開結果を返す', async () => {
    const outcome = await inspectPackageArchive(await buildValidPackage());

    expect(outcome.verdict).toBe('green');
    expect(outcome.findings).toEqual([]);
    expect(outcome.files?.map((file) => file.path)).toEqual(['plugin.json', 'skills/demo/SKILL.md']);
  });

  it('無圧縮 (stored) のエントリも読める', async () => {
    // Publisher CLI が deflate を使う保証は無い。片方しか読めないと
    // 「手元では通るのに Hub で壊れる」が起きる
    const zip = await buildTestZip([
      { path: 'plugin.json', content: VALID_MANIFEST, method: 'stored' },
      { path: 'skills/demo/SKILL.md', content: '# demo\n', method: 'stored' },
    ]);
    const outcome = await inspectPackageArchive(zip);

    expect(outcome.verdict).toBe('green');
    expect(outcome.files?.[0]?.content).toBe(VALID_MANIFEST);
  });

  it('展開した内容に対して内容ルールが当たる', async () => {
    // 展開が「読めた」だけで終わっていないことの確認。
    // hooks/ は同梱禁止なので、展開結果が渡っていれば必ず findings が出る
    const outcome = await inspectPackageArchive(
      await buildValidPackage([{ path: 'hooks/on-start.sh', content: 'echo hi\n' }]),
    );

    expect(ruleIdsOf(outcome)).toContain('PKG-FORBIDDEN-HOOK');
    expect(outcome.verdict).not.toBe('green');
  });
});

describe('目録で落ちたものは展開しない (T8-A)', () => {
  it('ZIP として読めなければ red、files は null', async () => {
    const outcome = await inspectPackageArchive(new TextEncoder().encode('これは ZIP ではない'));

    expect(outcome.verdict).toBe('red');
    expect(ruleIdsOf(outcome)).toEqual(['ARCHIVE-FORMAT']);
    // 空配列 (展開したが 0 件) ではなく null。「展開に到達しなかった」を型で区別する
    expect(outcome.files).toBeNull();
  });

  it('zip slip を含むアーカイブは展開せず red', async () => {
    const zip = await buildTestZip([
      { path: 'plugin.json', content: VALID_MANIFEST },
      { path: '../../etc/passwd', content: 'x' },
    ]);
    const outcome = await inspectPackageArchive(zip);

    expect(ruleIdsOf(outcome)).toEqual(['ARCHIVE-PATH-TRAVERSAL']);
    expect(outcome.files).toBeNull();
  });

  it('symlink を含むアーカイブは展開せず red', async () => {
    const zip = await buildTestZip([
      { path: 'plugin.json', content: VALID_MANIFEST },
      { path: 'link', content: '/etc/passwd', unixMode: 0o120777 },
    ]);
    const outcome = await inspectPackageArchive(zip);

    expect(ruleIdsOf(outcome)).toEqual(['ARCHIVE-ENTRY-TYPE']);
    expect(outcome.files).toBeNull();
  });

  it('目録違反のときは内容ルールの findings が混ざらない', async () => {
    // 「展開してからついでに header も見る」実装になっていれば、
    // hooks/ の指摘が同時に出てしまう。出ないことが順序の証拠になる
    const zip = await buildTestZip([
      { path: 'plugin.json', content: VALID_MANIFEST },
      { path: 'hooks/on-start.sh', content: 'echo hi\n' },
      { path: '/absolute/path', content: 'x' },
    ]);
    const outcome = await inspectPackageArchive(zip);

    expect(ruleIdsOf(outcome)).toEqual(['ARCHIVE-PATH-TRAVERSAL']);
  });
});

describe('展開時の実測 (T8-B)', () => {
  it('目録が小さいサイズを申告していても、展開後の実バイト数で上限を判定する', async () => {
    // これが SEC7 の核心。目録の値だけを信じると
    // 「1 KB です」と申告した 50 MiB 超の爆弾がそのまま通る
    const huge = 'a'.repeat(ARCHIVE_LIMITS.maxUncompressedBytes + 1024);
    const zip = await buildTestZip([
      { path: 'plugin.json', content: VALID_MANIFEST },
      { path: 'big.txt', content: huge, declaredUncompressedSize: 1024 },
    ]);

    // 前提: 目録検査は通る (通らなければ実測の出番が無く、テストの意味が変わる)
    expect(zip.byteLength).toBeLessThanOrEqual(ARCHIVE_LIMITS.maxCompressedBytes);

    const outcome = await inspectPackageArchive(zip);

    expect(ruleIdsOf(outcome)).toEqual(['ARCHIVE-MAX-UNCOMPRESSED']);
    expect(outcome.verdict).toBe('red');
    expect(outcome.files).toBeNull();
  }, 30_000);
});

describe('展開できない中身 (T8-C / T8-D)', () => {
  it('未対応の圧縮方式は例外ではなく findings で返す', async () => {
    // method 12 = bzip2。読めないこと自体は利用者の落ち度なので、
    // 500 ではなく「このパッケージは受け取れない」として理由を返す
    const zip = await buildTestZip([
      { path: 'plugin.json', content: VALID_MANIFEST },
      { path: 'odd.bin', content: 'x', method: 12 },
    ]);
    const outcome = await inspectPackageArchive(zip);

    expect(ruleIdsOf(outcome)).toEqual(['ARCHIVE-ENTRY-TYPE']);
    expect(outcome.findings[0]?.message).toContain('method=12');
    expect(outcome.files).toBeNull();
  });

  it('deflate と名乗るのに展開できないストリームも findings で返す', async () => {
    // method 8 と申告しつつ中身は非圧縮のまま置く = 壊れた deflate ストリーム
    const zip = await buildTestZip([
      { path: 'plugin.json', content: VALID_MANIFEST },
      { path: 'broken.txt', content: 'これは deflate ではない', method: 8 },
    ]);
    const outcome = await inspectPackageArchive(zip);

    expect(ruleIdsOf(outcome)).toEqual(['ARCHIVE-FORMAT']);
    expect(outcome.verdict).toBe('red');
  });

  it('展開に失敗したときは内容ルールを走らせない', async () => {
    // 一部だけ展開できた状態で内容ルールを当てると
    // 「必須ファイルが無い」という誤った指摘が出る
    const zip = await buildTestZip([
      { path: 'plugin.json', content: VALID_MANIFEST },
      { path: 'broken.txt', content: '壊れている', method: 8 },
    ]);
    const outcome = await inspectPackageArchive(zip);

    expect(ruleIdsOf(outcome)).not.toContain('PKG-REQUIRED-MANIFEST');
  });
});

describe('展開対象の選別', () => {
  it('ディレクトリエントリは展開結果に含めない', async () => {
    const zip = await buildTestZip([
      { path: 'skills/', content: '' },
      { path: 'plugin.json', content: VALID_MANIFEST },
      { path: 'skills/demo/SKILL.md', content: '# demo\n' },
    ]);
    const outcome = await inspectPackageArchive(zip);

    expect(outcome.files?.map((file) => file.path)).toEqual(['plugin.json', 'skills/demo/SKILL.md']);
  });
});

describe('findings の形', () => {
  it('header 由来の findings も応答契約の形 (path / line が必ず在る) で返る', async () => {
    const zip = await buildTestZip([{ path: '../evil', content: 'x' }]);
    const outcome = await inspectPackageArchive(zip);

    expect(outcome.findings[0]).toEqual({
      rule_id: 'ARCHIVE-PATH-TRAVERSAL',
      stage: 'static-validation',
      severity: 'error',
      message: expect.any(String),
      path: '../evil',
      line: null,
    });
  });
});
