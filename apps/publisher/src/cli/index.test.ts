import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { main, normalizeHubOrigin, parseArgs, requireOption, resolveDocsFile } from './index.js';

describe('normalizeHubOrigin', () => {
  it('HTTPS URLをoriginへ固定し、HTTPやcredential入りURLを拒否する', () => {
    expect(normalizeHubOrigin('https://hub.example.com/some/path')).toBe('https://hub.example.com');
    expect(() => normalizeHubOrigin('http://hub.example.com')).toThrow('HTTPS');
    expect(() => normalizeHubOrigin('https://user:pass@hub.example.com')).toThrow('credential');
  });
});

describe('parseArgs', () => {
  it('subcommand と `--key value` 形式の option を読み取る', () => {
    const result = parseArgs(['publish', '--package-dir', './pkg', '--project-id', 'proj_1']);

    expect(result.subcommand).toBe('publish');
    expect(result.options.get('package-dir')).toBe('./pkg');
    expect(result.options.get('project-id')).toBe('proj_1');
  });

  it('argv が空なら subcommand は空文字になる', () => {
    expect(parseArgs([]).subcommand).toBe('');
  });

  it('`--key` の直後に値が無ければエラーを投げる', () => {
    expect(() => parseArgs(['publish', '--package-dir'])).toThrow('--package-dir には値が必要です');
  });

  it('`--key` の直後が次の `--option` ならエラーを投げる (値の省略とみなす)', () => {
    expect(() => parseArgs(['publish', '--package-dir', '--project-id', 'proj_1'])).toThrow(
      '--package-dir には値が必要です',
    );
  });

  it('`--` で始まらないトークンは無視する', () => {
    const result = parseArgs(['publish', 'noise', '--project-id', 'proj_1']);
    expect(result.options.get('project-id')).toBe('proj_1');
  });
});

describe('requireOption', () => {
  it('値があればそのまま返す', () => {
    const options = new Map([['project-id', 'proj_1']]);
    expect(requireOption(options, 'project-id')).toBe('proj_1');
  });

  it('値が無ければエラーを投げる', () => {
    expect(() => requireOption(new Map(), 'project-id')).toThrow('--project-id は必須です');
  });
});

describe('resolveDocsFile', () => {
  it('repository外を指すsymlink経由のMarkdown読取りを拒否する', async () => {
    const temporary = await mkdtemp(path.join(os.tmpdir(), 'harness-publisher-docs-'));
    try {
      const repository = path.join(temporary, 'repository');
      const outside = path.join(temporary, 'outside.md');
      await mkdir(repository);
      await writeFile(outside, '# outside', 'utf8');
      await symlink(outside, path.join(repository, 'linked.md'));

      await expect(resolveDocsFile(repository, 'linked.md')).rejects.toThrow('--root 配下');
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  });
});

describe('main のバリデーション早期リターン', () => {
  it('未知の subcommand はエラーを表示して 1 を返す', async () => {
    const exitCode = await main(['deploy']);
    expect(exitCode).toBe(1);
  });

  it('subcommand 無しもエラーを表示して 1 を返す', async () => {
    const exitCode = await main([]);
    expect(exitCode).toBe(1);
  });

  it('--hub-url が無ければ dispatch 前に例外で終了する', async () => {
    await expect(main(['publish', '--tenant-slug', 'acme', '--origin', 'https://cli.example.com'])).rejects.toThrow(
      '--hub-url は必須です',
    );
  });

  it('--tenant-slug が無ければ dispatch 前に例外で終了する', async () => {
    await expect(
      main(['publish', '--hub-url', 'https://hub.example.com', '--origin', 'https://cli.example.com']),
    ).rejects.toThrow('--tenant-slug は必須です');
  });

  it('--origin が無ければ dispatch 前に例外で終了する', async () => {
    await expect(main(['feedback', '--hub-url', 'https://hub.example.com', '--tenant-slug', 'acme'])).rejects.toThrow(
      '--origin は必須です',
    );
  });
});
