/**
 * skills-package の業務検査ルール (feat-publish-pipeline / ADR AD-3 のロジック側 owner)。
 *
 * `pipeline.ts` / `rules.ts` / `verdict.ts` は「ルールをどう並べ、どう畳むか」だけを持つ scaffold で、
 * **何を違反とみなすか**は consumer feature の業務判断である。その業務判断をここに置く。
 *
 * 全ルールは `InspectionRule` の契約どおり**純関数**である。
 * 乱数・時刻・ファイル I/O をこの module へ持ち込まない — 検査対象はすべて
 * 呼び出し側が読み込み済みの `InspectionTarget` として渡される。
 * (同じ package を Hub と Publisher CLI の双方が検査して同じ結論になる、が成立条件のため。)
 *
 * severity は業務判断そのものである。error は公開を止め (fail → red)、warn は止めない (warn → yellow)。
 * severity を 1 つ変えると公開可否が変わるので、変更するときは test-design.md T2-E の回帰テストも一緒に直すこと。
 */

import { definePolicyRule, defineStaticValidationRule } from './rules';
import type { InspectionFile, InspectionRule, InspectionTarget, RuleFinding } from './types';

/** package 直下の manifest。Claude plugin の `plugin.json` と同じ名前・同じ必須キーを使う。 */
export const PACKAGE_MANIFEST_PATH = 'plugin.json';

/** ルール ID の正本。pipeline へ登録する順序ではなく「存在する ID の集合」を表す。 */
export const PACKAGE_RULE_IDS = [
  'PKG-REQUIRED-MANIFEST',
  'PKG-REQUIRED-META',
  'PKG-SEMVER',
  'PKG-SKILLS-ONLY',
  'PKG-FORBIDDEN-HOOK',
  'PKG-FORBIDDEN-SCRIPT',
  'PKG-FORBIDDEN-BINARY',
  'PKG-RISKY-INSTRUCTIONS',
  'PKG-OWNER-DECLARED',
  'PKG-CATALOG-SUMMARY',
] as const;

/**
 * manifest の必須メタ。
 * 移植元 (`plugins/harness-creator/.../validate-plugin-package.py` の `PLUGIN_JSON_REQUIRED`) と
 * **同じ 3 キー**であることを挙動同値テスト (test-design T2-D) が固定する。
 */
export const PACKAGE_REQUIRED_META_KEYS = ['name', 'version', 'description'] as const;

/** skills-package の直下に置いてよいファイル。これ以外の実行資産は PKG-SKILLS-ONLY が弾く。 */
const ALLOWED_ROOT_FILES = new Set([PACKAGE_MANIFEST_PATH, 'README.md', 'LICENSE', 'LICENSE.md', 'CHANGELOG.md']);

/** skills-package が持ってよいディレクトリ。skills 以外は「実行資産の同梱」とみなす。 */
const ALLOWED_DIRECTORIES = new Set(['skills']);

/** 実行可能 script とみなす拡張子。拡張子が無くても shebang があれば script 扱いにする。 */
const SCRIPT_EXTENSIONS = new Set(['.sh', '.bash', '.zsh', '.py', '.rb', '.pl', '.ps1', '.js', '.mjs', '.cjs', '.ts']);

/** バイナリ資産とみなす拡張子。拡張子で判断がつかないものは NUL バイトの有無で判定する。 */
const BINARY_EXTENSIONS = new Set([
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.bin',
  '.wasm',
  '.zip',
  '.tar',
  '.gz',
  '.jar',
  '.class',
  '.o',
  '.a',
]);

/**
 * NUL バイト。**必ずエスケープ表記で書く**。
 * 生の制御文字をソースに埋めると git / grep がこのファイル全体をバイナリ扱いし、
 * diff も検索も効かなくなる (実際に一度そうなった)。
 */
const NUL_BYTE = '\u0000';

/** semver 2.0.0 の公式 BNF に対応する正規表現 (https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string)。 */
const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

/**
 * 高リスク指示パターン。skill の指示文 (Markdown) が読み手のエージェントへ
 * 危険な行動を促していないかを見る。
 *
 * ここが warn なのは、正当な文脈 (セキュリティ手順書・注意喚起) でも同じ語が出るため。
 * error にすると誤検出で公開が止まり、検査そのものが回避される方向へ圧力がかかる。
 * **人間の確認を促す**のが目的なので warn が正しい強度になる。
 *
 * **`\b` の扱いに注意**。JS の単語境界は ASCII の `[A-Za-z0-9_]` だけを単語文字とみなすため、
 * `\b入力\b` や `\b--data\b` は前後が空白だと境界が成立せず**決して一致しない**。
 * ASCII の語だけ `\b` で囲み、日本語や記号で始まる語は空白区切りで表す。
 */
const RISKY_INSTRUCTION_PATTERNS: readonly { readonly id: string; readonly pattern: RegExp; readonly hint: string }[] =
  [
    {
      id: 'exfiltration',
      // `-d` / `--data` は先頭が非単語文字なので `\b` ではなく空白区切りで表す
      pattern: /(?:curl|wget|fetch)\s[^\n]*https?:\/\/[^\s\n]+[^\n]*(?:\s-d\b|\s--data\b|\bPOST\b|\bbody\b)/i,
      hint: '外部への送信を伴う指示',
    },
    {
      id: 'credential-request',
      pattern:
        /\b(?:api[_\s-]?key|access[_\s-]?token|password|secret|credential)\b[^\n]{0,40}(?:入力|教えて|貼り付け|\b(?:provide|paste|enter)\b)/i,
      hint: '認証情報の入力を求める指示',
    },
    {
      id: 'destructive-command',
      pattern: /\brm\s+-[a-z]*[rf][a-z]*\s+\/|\bgit\s+push\s+--force\b|\bDROP\s+(?:TABLE|DATABASE)\b/i,
      hint: '破壊的操作の教唆',
    },
    {
      id: 'guardrail-bypass',
      pattern:
        /(?:\b(?:ignore|disregard|bypass)\b|無視して|回避して)[^\n]{0,40}(?:\b(?:instructions?|rules?|guardrails?)\b|指示|規約)/i,
      hint: '既存の指示・規約を無視させる指示',
    },
  ];

/** Markdown とみなす拡張子。高リスク指示の検出対象。 */
const INSTRUCTION_EXTENSIONS = new Set(['.md', '.markdown', '.mdx']);

function extensionOf(path: string): string {
  const base = path.slice(path.lastIndexOf('/') + 1);
  const dot = base.lastIndexOf('.');
  return dot <= 0 ? '' : base.slice(dot).toLowerCase();
}

/** 1 始まりの行番号。`content.slice(0, index)` の改行数え上げで求める (正規表現の位置と一致させるため)。 */
function lineOf(content: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (content.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

type ManifestResult =
  | { readonly ok: true; readonly value: Record<string, unknown> }
  | { readonly ok: false; readonly reason: 'missing' | 'invalid-json' };

/**
 * manifest を読む。
 *
 * 解析できないときに例外を投げず結果型で返すのは、**後続ルールが「報告済みの失敗」を
 * 二重に報告しないため**。manifest が壊れているときに 4 つのルールが 4 件の指摘を出すと、
 * 利用者は 4 つの別問題があると読んでしまう。
 */
function readManifest(target: InspectionTarget): ManifestResult {
  const file = target.files.find((candidate) => candidate.path === PACKAGE_MANIFEST_PATH);
  if (file === undefined) return { ok: false, reason: 'missing' };
  try {
    const parsed: unknown = JSON.parse(file.content);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, reason: 'invalid-json' };
    }
    return { ok: true, value: parsed as Record<string, unknown> };
  } catch {
    return { ok: false, reason: 'invalid-json' };
  }
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** manifest が読めないときは空配列。呼び出し側が「PKG-REQUIRED-MANIFEST に任せる」意図を 1 行で表す。 */
function withManifest(
  target: InspectionTarget,
  evaluate: (manifest: Record<string, unknown>) => readonly RuleFinding[],
): readonly RuleFinding[] {
  const manifest = readManifest(target);
  return manifest.ok ? evaluate(manifest.value) : [];
}

const requiredManifestRule = defineStaticValidationRule({
  id: 'PKG-REQUIRED-MANIFEST',
  evaluate: (target) => {
    const manifest = readManifest(target);
    if (manifest.ok) return [];
    return [
      {
        message:
          manifest.reason === 'missing'
            ? `package 直下に ${PACKAGE_MANIFEST_PATH} がありません`
            : `${PACKAGE_MANIFEST_PATH} が JSON オブジェクトとして解析できません`,
        location: { path: PACKAGE_MANIFEST_PATH },
      },
    ];
  },
});

const requiredMetaRule = defineStaticValidationRule({
  id: 'PKG-REQUIRED-META',
  evaluate: (target) =>
    withManifest(target, (manifest) =>
      PACKAGE_REQUIRED_META_KEYS.filter((key) => !nonEmptyString(manifest[key])).map((key) => ({
        message: `${PACKAGE_MANIFEST_PATH} の必須メタ ${key} が未設定です`,
        location: { path: PACKAGE_MANIFEST_PATH },
      })),
    ),
});

const semverRule = defineStaticValidationRule({
  id: 'PKG-SEMVER',
  evaluate: (target) =>
    withManifest(target, (manifest) => {
      const version = manifest.version;
      // version 自体の欠落は PKG-REQUIRED-META の担当。ここは「あるが形式が違う」だけを見る
      if (!nonEmptyString(version)) return [];
      if (SEMVER_PATTERN.test(version)) return [];
      return [
        {
          message: `version が semver 形式ではありません (指定値: ${version})`,
          location: { path: PACKAGE_MANIFEST_PATH },
        },
      ];
    }),
});

const skillsOnlyRule = defineStaticValidationRule({
  id: 'PKG-SKILLS-ONLY',
  evaluate: (target) =>
    target.files
      .filter((file) => {
        const slash = file.path.indexOf('/');
        if (slash < 0) return !ALLOWED_ROOT_FILES.has(file.path);
        return !ALLOWED_DIRECTORIES.has(file.path.slice(0, slash));
      })
      .map((file) => ({
        message: `skills-package に skills/ 以外の資産が含まれています: ${file.path}`,
        location: { path: file.path },
      })),
});

const forbiddenHookRule = definePolicyRule({
  id: 'PKG-FORBIDDEN-HOOK',
  evaluate: (target) => {
    const findings: RuleFinding[] = [];
    for (const file of target.files) {
      // hooks/ 配下のファイル実体と、settings 断片の hooks 登録の両方を見る。
      // 片方だけだと「実体はあるが未登録」「登録はあるが実体は別 package」の抜けが残る
      if (file.path === 'hooks' || file.path.startsWith('hooks/')) {
        findings.push({ message: `hook ファイルは同梱できません: ${file.path}`, location: { path: file.path } });
        continue;
      }
      if (file.path.startsWith('settings/') && file.path.endsWith('.json') && /"hooks"\s*:/.test(file.content)) {
        findings.push({
          message: `settings に hooks 定義が含まれています: ${file.path}`,
          location: { path: file.path },
        });
      }
    }
    const manifest = readManifest(target);
    if (manifest.ok && manifest.value.hooks !== undefined) {
      findings.push({
        message: `${PACKAGE_MANIFEST_PATH} に hooks 定義が含まれています`,
        location: { path: PACKAGE_MANIFEST_PATH },
      });
    }
    return findings;
  },
});

function isScript(file: InspectionFile): boolean {
  return SCRIPT_EXTENSIONS.has(extensionOf(file.path)) || file.content.startsWith('#!');
}

const forbiddenScriptRule = definePolicyRule({
  id: 'PKG-FORBIDDEN-SCRIPT',
  evaluate: (target) =>
    target.files.filter(isScript).map((file) => ({
      message: `実行可能 script は同梱できません: ${file.path}`,
      location: { path: file.path },
    })),
});

const forbiddenBinaryRule = definePolicyRule({
  id: 'PKG-FORBIDDEN-BINARY',
  evaluate: (target) =>
    target.files
      // NUL バイトを見るのは、拡張子を変えただけで通過するのを防ぐため
      // (検査を回避したい側は必ず拡張子から変える)。
      .filter((file) => BINARY_EXTENSIONS.has(extensionOf(file.path)) || file.content.includes(NUL_BYTE))
      .map((file) => ({
        message: `バイナリ資産は同梱できません: ${file.path}`,
        location: { path: file.path },
      })),
});

const riskyInstructionsRule = definePolicyRule({
  id: 'PKG-RISKY-INSTRUCTIONS',
  severity: 'warn',
  evaluate: (target) => {
    const findings: RuleFinding[] = [];
    for (const file of target.files) {
      if (!INSTRUCTION_EXTENSIONS.has(extensionOf(file.path))) continue;
      for (const rule of RISKY_INSTRUCTION_PATTERNS) {
        const match = rule.pattern.exec(file.content);
        // 1 ファイル 1 パターンにつき先頭 1 件だけ報告する。全件出すと同じ注意書きが並び、
        // 「人間に確認させる」という warn の目的が埋もれる
        if (match === null) continue;
        findings.push({
          message: `高リスク指示の可能性 (${rule.hint}): 人間の確認が必要です`,
          location: { path: file.path, line: lineOf(file.content, match.index) },
        });
      }
    }
    return findings;
  },
});

const ownerDeclaredRule = defineStaticValidationRule({
  id: 'PKG-OWNER-DECLARED',
  evaluate: (target) =>
    withManifest(target, (manifest) => {
      const findings: RuleFinding[] = [];
      if (!nonEmptyString(manifest.owner)) {
        findings.push({
          message: `${PACKAGE_MANIFEST_PATH} に owner の宣言がありません`,
          location: { path: PACKAGE_MANIFEST_PATH },
        });
      }
      // visibility の**値域**は検査しない。値域の正本は @harness-hub/schemas の zod であり、
      // ここに 'private' / 'workspace' を書くと値域が 2 箇所になる
      if (!nonEmptyString(manifest.visibility)) {
        findings.push({
          message: `${PACKAGE_MANIFEST_PATH} に公開範囲 (visibility) の宣言がありません`,
          location: { path: PACKAGE_MANIFEST_PATH },
        });
      }
      return findings;
    }),
});

const catalogSummaryRule = defineStaticValidationRule({
  id: 'PKG-CATALOG-SUMMARY',
  severity: 'warn',
  evaluate: (target) =>
    withManifest(target, (manifest) =>
      nonEmptyString(manifest.summary)
        ? []
        : [
            {
              message: `Catalog 表示用の summary がありません (description が代用されます)`,
              location: { path: PACKAGE_MANIFEST_PATH },
            },
          ],
    ),
});

/**
 * skills-package 検査ルール一式。
 *
 * 配列を毎回作り直すのは、`createInspectionPipeline` が受け取った配列を凍結して
 * 自分の順序へ並べ替えるため。module 定数を共有すると、呼び出し側が
 * 「同じ配列を 2 つの pipeline へ渡した」ときに凍結済み配列を再利用してしまう。
 */
export function createPackageInspectionRules(): readonly InspectionRule[] {
  return [
    requiredManifestRule,
    requiredMetaRule,
    semverRule,
    skillsOnlyRule,
    forbiddenHookRule,
    forbiddenScriptRule,
    forbiddenBinaryRule,
    riskyInstructionsRule,
    ownerDeclaredRule,
    catalogSummaryRule,
  ];
}
