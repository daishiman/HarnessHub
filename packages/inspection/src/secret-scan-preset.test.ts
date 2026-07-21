// secret scan preset の単体テスト。「検出できること」を必ず併せて検証する (test-design §5 の fail-closed 規約)。
// このファイル自身が G6 の走査対象に含まれるため、検出パターンに一致する文字列を
// ソース上に連続した形で置かない (分割して連結する)。ファイル単位の除外はしない方針のため。

import { describe, expect, it } from 'vitest';

import {
  KNOWN_PUBLIC_EXAMPLE_SECRETS,
  SECRET_SCAN_ALLOW_MARKER,
  createDefaultSecretScanRules,
  isSuppressedSecretMatch,
  scanFilesForSecrets,
  secretScanExitCode,
} from './secret-scan-preset';
import type { InspectionFile } from './types';

/** ダミー secret。実キー形式が連続して現れないよう、必ず連結で組み立てる。 */
const DUMMY = {
  aws: `AKIA${'QWERTYUIOPASDFGH'}`,
  github: `ghp_${'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8'}`,
  slack: `xoxb-${'123456789012'}-${'abcdefghijklmnop'}`,
  anthropic: `sk-ant-${'api03'}${'0123456789abcdefghij'}`,
  google: `AIza${'0123456789abcdefghijklmnopqrstuvwxy'}`,
  privateKey: `-----BEGIN RSA ${'PRIVATE'} KEY-----`,
  cloudflare: `CLOUDFLARE_API_TOKEN = "${'abcdefghijklmnopqrstuvwxyz0123456789'}"`,
  assigned: `const apiKey = "${'abcdefghijklmnopqrstuvwxyz012345'}";`,
} as const;

function file(content: string, path = 'src/app.ts'): InspectionFile {
  return { path, content };
}

describe('検出できること (ゲートが素通りしない証明)', () => {
  it.each([
    ['秘密鍵ブロック', DUMMY.privateKey, 'secret-scan/private-key-block'],
    ['AWS access key id', `const id = "${DUMMY.aws}";`, 'secret-scan/aws-access-key-id'],
    ['GitHub token', `token: ${DUMMY.github}`, 'secret-scan/github-token'],
    ['Slack token', `const t = "${DUMMY.slack}";`, 'secret-scan/slack-token'],
    ['Anthropic API key', `const k = "${DUMMY.anthropic}";`, 'secret-scan/anthropic-api-key'],
    ['Google API key', `const k = "${DUMMY.google}";`, 'secret-scan/google-api-key'],
    ['Cloudflare API token', DUMMY.cloudflare, 'secret-scan/cloudflare-api-token'],
    ['代入形の API key', DUMMY.assigned, 'secret-scan/generic-assigned-secret'],
  ])('%s を検出し、非ゼロ終了コードになる', (_label, content, expectedRuleId) => {
    const result = scanFilesForSecrets([file(content)]);

    expect(result.verdict).toBe('fail');
    expect(result.findings.map((finding) => finding.ruleId)).toContain(expectedRuleId);
    expect(secretScanExitCode(result)).toBe(1);
  });

  it('検出値そのものは finding に残さない (結果自体が漏洩経路にならない)', () => {
    const result = scanFilesForSecrets([file(`const key = "${DUMMY.aws}";`)]);
    expect(result.findings[0]?.message).not.toContain(DUMMY.aws);
    expect(result.findings[0]?.location).toStrictEqual({ path: 'src/app.ts', line: 1, column: 14 });
  });
});

describe('検出 0 件のとき', () => {
  it('pass かつ終了コード 0', () => {
    const result = scanFilesForSecrets([file('const greeting = "hello";')]);
    expect(result.verdict).toBe('pass');
    expect(result.findings).toStrictEqual([]);
    expect(secretScanExitCode(result)).toBe(0);
  });

  it('環境変数参照は検出しない (誤検出でゲートを無効化させないため)', () => {
    const result = scanFilesForSecrets([
      file('const token = process.env.CLOUDFLARE_API_TOKEN;\nconst k = `${secretRef}`;'),
      file('const apiKey = process.env.API_KEY;'),
    ]);
    expect(result.findings).toStrictEqual([]);
  });

  it('よくある非 secret 文字列を誤検出しない', () => {
    const result = scanFilesForSecrets([
      file('const id = "AKIA-not-a-key";'),
      file('const sha = "e3b0c44298fc1c149afbf4c8996fb924";'),
      file('const path = "sk-directory/name";'),
    ]);
    expect(result.findings).toStrictEqual([]);
  });
});

describe('抑制の口', () => {
  it('行に抑制マーカーがあれば検出しない', () => {
    const result = scanFilesForSecrets([
      file(`const key = "${DUMMY.aws}"; // ${SECRET_SCAN_ALLOW_MARKER} テスト用ダミー`),
    ]);
    expect(result.findings).toStrictEqual([]);
    expect(secretScanExitCode(result)).toBe(0);
  });

  it('抑制は行単位であり、同じファイルの別行は検出し続ける', () => {
    const result = scanFilesForSecrets([
      file(
        [
          `const allowed = "${DUMMY.aws}"; // ${SECRET_SCAN_ALLOW_MARKER}`,
          `const leaked = "${DUMMY.aws}";`,
        ].join('\n'),
      ),
    ]);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.location?.line).toBe(2);
  });

  it('公開済みサンプル値は検出しないが、同形式の別値は検出する', () => {
    const publicExample = KNOWN_PUBLIC_EXAMPLE_SECRETS[0] ?? '';
    expect(scanFilesForSecrets([file(`const k = "${publicExample}";`)]).findings).toStrictEqual([]);
    expect(scanFilesForSecrets([file(`const k = "${DUMMY.aws}";`)]).findings).toHaveLength(1);
  });

  it('isSuppressedSecretMatch は行文言と値の両方で判定する', () => {
    expect(
      isSuppressedSecretMatch({
        match: DUMMY.aws,
        path: 'a.ts',
        line: 1,
        lineText: `x = "${DUMMY.aws}" // ${SECRET_SCAN_ALLOW_MARKER}`,
      }),
    ).toBe(true);
    expect(isSuppressedSecretMatch({ match: DUMMY.aws, path: 'a.ts', line: 1, lineText: 'x' })).toBe(
      false,
    );
  });
});

describe('決定性', () => {
  it('同一入力・同一ルール束なら常に同一結果', () => {
    const files = [file(`const a = "${DUMMY.aws}";`, 'b.ts'), file('const b = 1;', 'a.ts')];
    expect(scanFilesForSecrets(files)).toStrictEqual(scanFilesForSecrets(files));
  });

  it('createDefaultSecretScanRules は毎回同じルール ID 束を返す', () => {
    const first = createDefaultSecretScanRules().map((rule) => rule.id);
    const second = createDefaultSecretScanRules().map((rule) => rule.id);
    expect(second).toStrictEqual(first);
    expect(first).toContain('secret-scan/aws-access-key-id');
  });
});
