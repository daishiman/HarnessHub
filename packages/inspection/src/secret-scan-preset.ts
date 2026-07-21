// secret scan の既定ルール束 (純関数)。CI ゲート (G6) と publish pipeline が同一実装を共有するための正本 (qa-038【2】)。
// pipeline 骨格 (rules.ts / pipeline.ts) は中立に保ち、「どのパターンを見るか」だけをこの preset に閉じる。
// ルールの内容は P09 で実効性を実測した secret-scan-gate の定義を引き継ぎ、抑制の口だけを追加している。

import { createInspectionPipeline, inspect } from './pipeline';
import type { SecretMatchContext } from './rules';
import { defineSecretScanRule } from './rules';
import type { InspectionFile, InspectionResult, InspectionRule } from './types';

/** 行内に書くと、その行の検出を抑制するマーカー。除外を「行単位・レビュー可能」に留めるための口。 */
export const SECRET_SCAN_ALLOW_MARKER = 'secret-scan:allow';

/**
 * ベンダーが公式ドキュメントで公開しているサンプル資格情報。
 * 公開済み = 秘密ではないため検出対象から外す。**値単位**の許可であり、
 * ディレクトリやファイル単位の除外は行わない (除外しすぎるとゲートが素通りするため)。
 */
export const KNOWN_PUBLIC_EXAMPLE_SECRETS: readonly string[] = [
  // AWS 公式ドキュメントのサンプル access key id。contract test の fixture が使用している
  'AKIAIOSFODNN7EXAMPLE',
];

/** 検出パターン 1 件の定義。 */
interface SecretPattern {
  readonly id: string;
  readonly pattern: RegExp;
  /** finding メッセージに出す種別名。 */
  readonly label: string;
}

/**
 * 既定の検出パターン。
 * 接頭辞や代入文脈が明確で誤検出の少ないものだけを採る。
 * 誤検出が多いゲートは「無視する運用」を生み、結果として無効化されるため広げすぎない。
 */
const SECRET_PATTERNS: readonly SecretPattern[] = [
  {
    id: 'secret-scan/private-key-block',
    pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/,
    label: '秘密鍵ブロック',
  },
  {
    id: 'secret-scan/aws-access-key-id',
    pattern: /\bAKIA[0-9A-Z]{16}\b/,
    label: 'AWS access key id',
  },
  {
    id: 'secret-scan/github-token',
    pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/,
    label: 'GitHub token',
  },
  {
    id: 'secret-scan/slack-token',
    pattern: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/,
    label: 'Slack token',
  },
  {
    id: 'secret-scan/anthropic-api-key',
    pattern: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/,
    label: 'Anthropic API key',
  },
  {
    id: 'secret-scan/google-api-key',
    pattern: /\bAIza[0-9A-Za-z_-]{35}\b/,
    label: 'Google API key',
  },
  {
    id: 'secret-scan/cloudflare-api-token',
    // Cloudflare API token は 40 文字の base62。代入形の文脈があるものだけを対象にする
    pattern: /CLOUDFLARE_API_TOKEN\s*[:=]\s*["'][A-Za-z0-9_-]{30,}["']/,
    label: 'Cloudflare API token',
  },
  {
    id: 'secret-scan/generic-assigned-secret',
    // secret / token / password への literal 代入。${...} や process.env 参照は対象外
    pattern:
      /\b(?:api[_-]?key|secret|password|auth[_-]?token)\s*[:=]\s*["'](?!\$\{)(?!process\.env)[A-Za-z0-9/+=_-]{24,}["']/i,
    label: '代入形の API key / secret',
  },
];

/**
 * 検出を抑制すべき一致かを判定する。
 * (1) 行に抑制マーカーがある (2) 公開済みサンプル値である、のいずれか。
 */
export function isSuppressedSecretMatch(context: SecretMatchContext): boolean {
  if (context.lineText.includes(SECRET_SCAN_ALLOW_MARKER)) {
    return true;
  }
  return KNOWN_PUBLIC_EXAMPLE_SECRETS.some((example) => context.match.includes(example));
}

/**
 * 既定の secret scan ルール束を作る。
 * CI ゲートと Publisher / publish pipeline がこの同じ関数を呼ぶことで、判定の食い違いを防ぐ。
 */
export function createDefaultSecretScanRules(): readonly InspectionRule[] {
  return SECRET_PATTERNS.map((entry) =>
    defineSecretScanRule({
      id: entry.id,
      pattern: entry.pattern,
      message: (masked) => `${entry.label} らしき値を検出しました: ${masked}`,
      shouldReport: (context) => !isSuppressedSecretMatch(context),
    }),
  );
}

/**
 * 読み込み済みファイル群を検査する純関数。ファイル読み込み (I/O) は呼び出し側の責務。
 * ルール束を差し替えられるようにしてあるが、既定では上の preset を使う。
 */
export function scanFilesForSecrets(
  files: readonly InspectionFile[],
  rules: readonly InspectionRule[] = createDefaultSecretScanRules(),
): InspectionResult {
  return inspect(createInspectionPipeline(rules), {
    files,
    metadata: { scope: 'hub-monorepo' },
  });
}

/** 検査結果を終了コードへ変換する。1 件でも検出したら非ゼロ (fail-closed)。 */
export function secretScanExitCode(result: InspectionResult): number {
  return result.findings.length === 0 ? 0 : 1;
}
