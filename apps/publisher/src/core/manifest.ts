/**
 * package manifest (plugin.json) の補完 (AD-1 core/)。
 *
 * 必須メタ (name/version/description) が欠けている場合は補完せずエラーとして返す —
 * 実在しない値で埋めると、その後の inspection-client/ の判定 (PKG-REQUIRED-META) が
 * 「補完済みの偽メタ」を検査することになり、公開されるパッケージの身元が誤って通ってしまう。
 * 安全に推測できる既定値 (visibility='private'、summary=description 代用) だけを埋める。
 *
 * semver 判定は独自の正規表現を実装しない。packages/inspection の PKG-SEMVER と
 * 「たまたま同じ」ではなく「必ず同じ」判定にするため、実際に PKG-SEMVER ルールへ
 * 最小 fixture を通して結果を借りる (AD-3: 判定ロジックの owner は 1 箇所)。
 */
import {
  createPackageInspectionRules,
  type InspectionFile,
  PACKAGE_MANIFEST_PATH,
  runInspection,
} from '@harness-hub/inspection';
import { type PublisherPackageManifest, publisherPackageManifestSchema } from '@harness-hub/schemas';

const REQUIRED_FIELDS = ['name', 'version', 'description'] as const;

export interface CompletedManifest {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly owner: string | null;
  readonly visibility: 'private' | 'workspace';
  readonly summary: string;
}

export type ManifestCompletionResult =
  | { readonly ok: true; readonly manifest: CompletedManifest }
  | { readonly ok: false; readonly missingFields: readonly string[] };

function findManifestFile(files: readonly InspectionFile[]): InspectionFile | undefined {
  return files.find((file) => file.path === PACKAGE_MANIFEST_PATH);
}

function parseRawManifest(file: InspectionFile | undefined): PublisherPackageManifest {
  if (file === undefined) return {};
  try {
    return publisherPackageManifestSchema.parse(JSON.parse(file.content));
  } catch {
    // 壊れた JSON は PKG-REQUIRED-MANIFEST 側が「解析できない manifest」として報告する (AD-3、二重報告を避ける)。
    return {};
  }
}

/**
 * version の semver 判定を PKG-SEMVER ルールへ委譲する。
 * name/description に固定のダミー値を渡すのは、判定対象が version だけになるようにし、
 * PKG-REQUIRED-META (name/description 欠落) の findings が紛れ込まないようにするため。
 */
function isValidSemver(version: string): boolean {
  const probe: InspectionFile = {
    path: PACKAGE_MANIFEST_PATH,
    content: JSON.stringify({ name: 'probe', description: 'probe', version }),
  };
  const result = runInspection(createPackageInspectionRules(), { files: [probe], metadata: {} });
  return !result.findings.some((finding) => finding.ruleId === 'PKG-SEMVER');
}

export function completePackageManifest(files: readonly InspectionFile[]): ManifestCompletionResult {
  const raw = parseRawManifest(findManifestFile(files));
  const missingFields: string[] = REQUIRED_FIELDS.filter((field) => !raw[field]);
  if (raw.version !== undefined && !isValidSemver(raw.version)) {
    missingFields.push('version (semver 形式ではありません)');
  }
  if (missingFields.length > 0) return { ok: false, missingFields };

  return {
    ok: true,
    manifest: {
      // 上の missingFields チェックで存在確認済みなので non-null で扱ってよい
      name: raw.name as string,
      version: raw.version as string,
      description: raw.description as string,
      owner: raw.owner ?? null,
      visibility: raw.visibility ?? 'private',
      summary: raw.summary ?? (raw.description as string),
    },
  };
}
