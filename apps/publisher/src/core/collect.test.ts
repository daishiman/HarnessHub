import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { collectPackageFiles } from './collect.js';

let packageDir: string;

afterEach(() => {
  if (packageDir !== undefined) rmSync(packageDir, { recursive: true, force: true });
});

function write(relativePath: string, content: string): void {
  const fullPath = join(packageDir, relativePath);
  mkdirSync(join(fullPath, '..'), { recursive: true });
  writeFileSync(fullPath, content, 'utf-8');
}

describe('collectPackageFiles', () => {
  it('package ディレクトリを再帰的に集め、path をソート済みの POSIX 相対 path で返す', () => {
    packageDir = mkdtempSync(join(tmpdir(), 'publisher-collect-'));
    write('plugin.json', '{"name":"demo"}');
    write('skills/foo/SKILL.md', '# foo');
    write('README.md', '# demo');

    const files = collectPackageFiles(packageDir);

    expect(files.map((file) => file.path)).toEqual(['README.md', 'plugin.json', 'skills/foo/SKILL.md']);
    expect(files.find((file) => file.path === 'plugin.json')?.content).toBe('{"name":"demo"}');
  });

  it('.git / node_modules 配下は除外する', () => {
    packageDir = mkdtempSync(join(tmpdir(), 'publisher-collect-'));
    write('plugin.json', '{}');
    write('.git/HEAD', 'ref: refs/heads/main');
    write('node_modules/pkg/index.js', 'module.exports = {};');

    const files = collectPackageFiles(packageDir);

    expect(files.map((file) => file.path)).toEqual(['plugin.json']);
  });

  it('日本語を含む多バイト文字を utf-8 のまま保持する', () => {
    packageDir = mkdtempSync(join(tmpdir(), 'publisher-collect-'));
    write('skills/foo/SKILL.md', 'この skill は日本語の指示文を含みます');

    const files = collectPackageFiles(packageDir);

    expect(files[0]?.content).toBe('この skill は日本語の指示文を含みます');
  });
});
