// secret scan の既定ルール束 (純関数)。CI ゲートと publish pipeline が同一実装を共有するための正本 (qa-038【2】)。
// pipeline 骨格 (rules.ts / pipeline.ts) は中立に保ち、「どのパターンを見るか」だけをこの preset に閉じる。

import { createInspectionPipeline, inspect } from './pipeline';
import { defineSecretScanRule } from './rules';
import type { SecretMatchContext } from './rules';
import type { InspectionFile, InspectionResult, InspectionRule } from './types';

/** 行内に書くと、その行の検出を抑制するマーカー。除外を「行単位・レビュー可能」に留めるための口。 */
export const SECRET_SCAN_ALLOW_MARKER = 'secret-scan:allow';

/**
 * ベンダーが公式ドキュメントで公開しているサンプル資格情報。
 * 公開済み = 秘密ではないため検出対象から外す。**値単位**の許可であり、
 * ディレクトリやファイル単位の除外は行わない (除外しすぎるとゲートが素通りするため)。
 */
export const KNOWN_PUBLIC_EXAMPLE_SECRETS: readonly string[] = [
  // AWS 公式ドキュメントのサンプル access key id / secret access key
  'AKIAIOSFODNN7EXAMPLE',
  'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
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
 * 接頭辞が明確で誤検出が少ないものだけを採る (汎用的な「password=」等は誤検出が多く、
 * ゲートを無視する習慣を生むため入れない)。
 */
const SECRET_PATTERNS: readonly SecretPattern[] = [
  { id: 'secret/aws-access-key-id', pattern: /\bAKIA[0-9A-Z]{16}\b/, label: 'AWS access key id' },
  {
    id: 'secret/private-key-block',
    pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/,
    label: '秘密鍵ブロック',
  },
  { id: 'secret/github-token', pattern: /\bgh[pousr]_[A-Za-z0-9]{36}\b/, label: 'GitHub token' },
  { id: 'secret/slack-token', pattern: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/, label: 'Slack token' },
  {
    id: 'secret/anthropic-api-key',
    pattern: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/,
    label: 'Anthropic API key',
  },
  { id: 'secret/openai-api-key', pattern: /\bsk-[A-Za-z0-9]{32,}\b/, label: 'OpenAI 形式 API key' },
  { id: 'secret/google-api-key', pattern: /\bAIza[0-9A-Za-z_-]{35}\b/, label: 'Google API key' },
];

/**
 * 検出を抑制すべき一致かを判定する。
 * (1) 行に抑制マーカーがある (2) 公開済みサンプル値である、のいずれか。
 */
export function isSuppressedSecretMatch(context: SecretMatchContext): boolean {
  if (context.lineText.includes(SECRET_SCAN_ALLOW_MARKER)) {
    return true;
  }
  return KNOWN_PUBLIC_EXAMPLE_SECRETS.includes(context.match);
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
  return inspect(createInspectionPipeline(rules), { files, metadata: {} });
}

/** 検査結果を終了コードへ変換する。1 件でも検出したら非ゼロ (fail-closed)。 */
export function secretScanExitCode(result: InspectionResult): number {
  return result.findings.length === 0 ? 0 : 1;
}
