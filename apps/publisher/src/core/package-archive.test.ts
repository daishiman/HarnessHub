import { inspectArchiveHeader } from '@harness-hub/inspection';
import { describe, expect, it } from 'vitest';

import { buildPackageArchive } from './package-archive.js';

describe('buildPackageArchive', () => {
  it('inspectArchiveHeader (packages/inspection) が読める central directory を持つ ZIP を組み立てる', () => {
    const files = [
      { path: 'plugin.json', content: '{"name":"demo","version":"1.0.0","description":"d"}' },
      { path: 'skills/foo/SKILL.md', content: '# foo' },
    ];

    const bytes = buildPackageArchive(files);
    const report = inspectArchiveHeader(bytes);

    expect(report.ok).toBe(true);
    expect(report.findings).toEqual([]);
    expect(report.entries.map((entry) => entry.path)).toEqual(['plugin.json', 'skills/foo/SKILL.md']);
    expect(report.entries.map((entry) => entry.uncompressedSize)).toEqual(
      files.map((file) => new TextEncoder().encode(file.content).byteLength),
    );
    expect(report.entries.every((entry) => !entry.isSymlink && !entry.isDirectory)).toBe(true);
  });

  it('日本語 (多バイト文字) を含む内容でも byte 長を正しく central directory へ反映する', () => {
    const content = 'この skill は日本語の指示文を含みます';
    const bytes = buildPackageArchive([{ path: 'README.md', content }]);

    const report = inspectArchiveHeader(bytes);

    expect(report.ok).toBe(true);
    expect(report.entries[0]?.uncompressedSize).toBe(new TextEncoder().encode(content).byteLength);
  });

  it('空の file 一覧からも解析可能な (EOCD のみの) ZIP を組み立てる', () => {
    const bytes = buildPackageArchive([]);
    const report = inspectArchiveHeader(bytes);

    expect(report.ok).toBe(true);
    expect(report.entries).toEqual([]);
  });
});
