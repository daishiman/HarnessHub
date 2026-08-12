/**
 * PT5: plugin 面の構造 (desktop GUI を作らない, qa-007)。
 * 対応: docs/features/feat-publisher-plugin/test-design.md §PT5, AD-2。
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const PLUGIN_DIR = join(REPO_ROOT, 'plugins', 'harness-hub-publisher');
const DESKTOP_GUI_FRAMEWORKS = ['electron', 'tauri', '@tauri-apps/api', '@tauri-apps/cli'];

describe('PT5-A plugin manifest/slash command/skill/scripts の実体確認', () => {
  it('plugins/harness-hub-publisher/.claude-plugin/plugin.json が存在する', () => {
    expect(existsSync(join(PLUGIN_DIR, '.claude-plugin', 'plugin.json'))).toBe(true);
  });

  it('plugins/harness-hub-publisher/commands/publish.md (slash command定義) が存在する', () => {
    expect(existsSync(join(PLUGIN_DIR, 'commands', 'publish.md'))).toBe(true);
  });

  it('Docs同期commandと実行可能な薄いランチャーが存在する', () => {
    const docsSkill = join(PLUGIN_DIR, 'skills', 'run-docs-sync');
    const docsScript = join(docsSkill, 'scripts', 'run-docs-sync.sh');
    expect(existsSync(join(PLUGIN_DIR, 'commands', 'docs-sync.md'))).toBe(true);
    expect(existsSync(join(docsSkill, 'SKILL.md'))).toBe(true);
    expect(existsSync(docsScript)).toBe(true);
    expect(statSync(docsScript).mode & 0o111).not.toBe(0);
  });

  it('plugins/harness-hub-publisher/skills/run-publisher-publish/ が存在する', () => {
    const skillDir = join(PLUGIN_DIR, 'skills', 'run-publisher-publish');
    expect(existsSync(skillDir) && statSync(skillDir).isDirectory()).toBe(true);
    expect(existsSync(join(skillDir, 'SKILL.md'))).toBe(true);
    expect(existsSync(join(skillDir, 'scripts', 'run-publisher-publish.sh'))).toBe(true);
  });

  it('package.json 依存に Electron/Tauri 等の desktop GUI フレームワークが含まれない', () => {
    const publisherPackageJson = JSON.parse(readFileSync(join(REPO_ROOT, 'apps/publisher/package.json'), 'utf-8'));
    const allDeps = { ...publisherPackageJson.dependencies, ...publisherPackageJson.devDependencies };
    for (const framework of DESKTOP_GUI_FRAMEWORKS) {
      expect(Object.keys(allDeps)).not.toContain(framework);
    }
    // plugin 側は npm package を持たない (Claude Code plugin は script/skill/command のみで構成される)
    expect(existsSync(join(PLUGIN_DIR, 'package.json'))).toBe(false);
  });
});

describe('PT5-B apps/publisher への単一接続 (二重実装なし)', () => {
  const scriptSource = readFileSync(
    join(PLUGIN_DIR, 'skills', 'run-publisher-publish', 'scripts', 'run-publisher-publish.sh'),
    'utf-8',
  );

  it('plugin 側 script が apps/publisher/src/cli/ の呼び出しのみを行う', () => {
    expect(scriptSource).toMatch(/apps\/publisher\/bin\/harness-publisher\.mjs/);
    // 各解決経路はpublishサブコマンドを渡してtail-callし、他に業務処理を挟まない。
    expect(scriptSource).toMatch(/^\s*exec node .* publish "\$@"$/m);
    expect(scriptSource).toMatch(/^\s*exec harness-publisher publish "\$@"$/m);
  });

  it('外部repositoryからPublishランチャーを起動すると実CLIへ到達し、入力不足を非0で拒否する', () => {
    const temporary = mkdtempSync(join(tmpdir(), 'harness-publish-launcher-'));
    try {
      const result = spawnSync(
        'bash',
        [join(PLUGIN_DIR, 'skills', 'run-publisher-publish', 'scripts', 'run-publisher-publish.sh')],
        {
          cwd: temporary,
          encoding: 'utf8',
          env: {
            ...process.env,
            HARNESS_HUB_PUBLISHER_BIN: join(REPO_ROOT, 'apps', 'publisher', 'bin', 'harness-publisher.mjs'),
          },
        },
      );
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('--hub-url は必須です');
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
  }, 15_000);

  it('plugin 側に package 収集・Device Flow・wrangler 実行の業務ロジックが複製されていない', () => {
    // コメントで「実装しない」と言及すること自体は許容し、実際に wrangler/device flow を
    // 呼び出す・実装するコードが無いことだけを検査する (コメント行は除いて検査する)
    const codeLines = scriptSource
      .split('\n')
      .filter((line) => !line.trim().startsWith('#'))
      .join('\n');
    expect(codeLines).not.toMatch(/wrangler/i);
    expect(codeLines).not.toMatch(/device_code|device\/token|authorization_pending/i);
    expect(codeLines).not.toMatch(/add-generic-password|PasswordVault/);
  });

  it('外部repositoryからDocsランチャーを起動すると実CLIへ到達し、入力不足を非0で拒否する', () => {
    const temporary = mkdtempSync(join(tmpdir(), 'harness-docs-launcher-'));
    try {
      const result = spawnSync('bash', [join(PLUGIN_DIR, 'skills', 'run-docs-sync', 'scripts', 'run-docs-sync.sh')], {
        cwd: temporary,
        encoding: 'utf8',
        env: {
          ...process.env,
          HARNESS_HUB_PUBLISHER_BIN: join(REPO_ROOT, 'apps', 'publisher', 'bin', 'harness-publisher.mjs'),
        },
      });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('--hub-url は必須です');
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
  }, 15_000);

  it('Docs Skillは利用者cwdではなくClaude pluginのinstall先からランチャーを解決する', () => {
    const skillSource = readFileSync(join(PLUGIN_DIR, 'skills', 'run-docs-sync', 'SKILL.md'), 'utf-8');
    expect(skillSource).toContain('$CLAUDE_PLUGIN_ROOT/skills/run-docs-sync/scripts/run-docs-sync.sh');

    const temporary = mkdtempSync(join(tmpdir(), 'harness-docs-skill-route-'));
    try {
      const result = spawnSync(
        'bash',
        ['-c', 'bash "$CLAUDE_PLUGIN_ROOT/skills/run-docs-sync/scripts/run-docs-sync.sh"'],
        {
          cwd: temporary,
          encoding: 'utf8',
          env: {
            ...process.env,
            CLAUDE_PLUGIN_ROOT: PLUGIN_DIR,
            HARNESS_HUB_PUBLISHER_BIN: join(REPO_ROOT, 'apps', 'publisher', 'bin', 'harness-publisher.mjs'),
          },
        },
      );
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('--hub-url は必須です');
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
  }, 15_000);
});
