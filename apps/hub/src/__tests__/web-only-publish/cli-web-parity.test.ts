/**
 * S01 Web 完結公開導線が CLI と同じ経路・同じ権限・同じ文言で動くことの検査
 * (feat-web-only-publish-journey 受入 2・3・6・7)。
 *
 * この feature の危険は「Web だけ通ってしまうパッケージ」が生まれることにある。
 * 検査そのものを二重にテストしても、それは防げない —— 防げるのは
 * 「Web が CLI と違う入口を叩き始めた瞬間に赤くなる」検査だけである。
 * そこで CLI 側の呼び出し順序をソースから抽出し、Web 側は実際に fetch を観測して突き合わせる。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  formatPublishFinding,
  formatPublishFindings,
  PUBLISH_NEEDS_FIX_HEADING,
  PUBLISH_RESUBMIT_ACTION_LABEL,
  type PublishFinding,
  publishNeedsFixSummary,
} from '@harness-hub/schemas';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AUTH_NUMERIC_CONTRACT } from '../../lib/auth/config.js';
import { createPublishJourneyCheckpoint, httpPublishJourneyPort } from '../../lib/publish-journey/index.js';
import { TENANT_HEADER, WORKSPACE_HEADER } from '../../middleware-contract.js';

const hubRoot = process.cwd();
const CLI_COMMAND_SOURCE = join(hubRoot, '..', 'publisher', 'src', 'cli', 'publish-command.ts');
/**
 * ウィザードは 1 ファイルではない。結果表示は初期チャンクから外すため別ファイルへ切り出してある
 * (HarnessHub-5vlq)。「画面側が文言を独自に組み立てていない」という検査の意図は
 * **ウィザード一式**に対するものなので、分割の有無で結論が変わらないよう連結して見る。
 */
const WIZARD_SOURCES = [
  join(hubRoot, 'src', 'components', 'publish', 'PublishWizard.tsx'),
  join(hubRoot, 'src', 'components', 'publish', 'PublishWizardOutcome.tsx'),
];

function readWizardSource(): string {
  return WIZARD_SOURCES.map((path) => readFileSync(path, 'utf8')).join('\n');
}
const CATALOG_STATUS_SOURCE = join(hubRoot, 'src', 'components', 'catalog', 'CatalogPublishStatus.tsx');

const SCOPE = { tenantId: 'tenant-acme', workspaceId: 'workspace-a' } as const;
const REQUEST_ID = 'pubreq-1';

function publishRequest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: REQUEST_ID,
    project_id: 'project-1',
    channel_id: 'ch-1',
    status: 'published',
    verdict: 'green',
    findings: [],
    release_id: 'rel-1',
    content_hash: 'sha256-abc',
    requested_by: 'user-1',
    created_at: '2026-08-10T00:00:00.000Z',
    ...overrides,
  };
}

interface ObservedCall {
  readonly method: string;
  readonly url: string;
  readonly headers: Record<string, string>;
  readonly body: unknown;
}

/** 実 API の代わりに契約どおりの応答を返しつつ、叩かれた順序を記録する。 */
function stubPublishApi(response: Record<string, unknown> = publishRequest()): ObservedCall[] {
  const calls: ObservedCall[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: unknown, init: RequestInit | undefined) => {
      calls.push({
        method: init?.method ?? 'GET',
        url: String(input),
        headers: (init?.headers ?? {}) as Record<string, string>,
        body: init?.body,
      });
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }),
  );
  return calls;
}

/**
 * CLI の publish 手順を「メソッド + path」の並びとして抽出する。
 *
 * 実行ではなくソースから読むのは、CLI 実行には token・ファイル一式・wrangler が要るのに対し、
 * ここで守りたいのは**順序の一致**という静的な性質だからである。
 * 抽出が壊れれば falsy に通るのではなく赤くなる (要素が減る) 側に倒れる。
 */
function cliPublishSteps(): string[] {
  const source = readFileSync(CLI_COMMAND_SOURCE, 'utf8');
  const pattern = /client\.(postJson|putBytes)(?:<[^>]*>)?\(\s*[`'"]([^`'"]+)/g;
  const steps: string[] = [];
  for (const match of source.matchAll(pattern)) {
    const method = match[1] === 'putBytes' ? 'PUT' : 'POST';
    steps.push(`${method} ${normalizePath(match[2] ?? '')}`);
  }
  return steps;
}

/** `${created.id}` や実 ID を `{id}` に寄せて、両経路を同じ語彙で比べられるようにする。 */
function normalizePath(path: string): string {
  return path.replace(/\$\{[^}]+\}/g, '{id}').replace(REQUEST_ID, '{id}');
}

function observedSteps(calls: readonly ObservedCall[]): string[] {
  return calls.map((call) => `${call.method} ${normalizePath(call.url)}`);
}

function submitWithCheckpoint(checkpoint = createPublishJourneyCheckpoint()) {
  return httpPublishJourneyPort.submitPackage(
    SCOPE,
    { projectId: 'project-1', visibility: 'workspace', archive: new ArrayBuffer(8) },
    checkpoint,
    { resetBeforeUpload: false },
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('受入 2: Web 経路は CLI と同じ API を同じ順で叩く', () => {
  it('WOP-P-001: create -> package -> submit の並びが CLI の抽出結果と一致する', async () => {
    const calls = stubPublishApi();

    const result = await submitWithCheckpoint();

    expect(result.ok).toBe(true);
    // CLI 側は deployment 登録など publish 後の手順も持つので、先頭 3 手を比べる
    expect(observedSteps(calls)).toEqual(cliPublishSteps().slice(0, 3));
    expect(observedSteps(calls)).toEqual([
      'POST /api/v1/publish',
      'PUT /api/v1/publish/{id}/package',
      'POST /api/v1/publish/{id}/submit',
    ]);
  });

  it('WOP-P-002: Web 専用の投入口・検査入口を作っていない', async () => {
    const calls = stubPublishApi();
    await submitWithCheckpoint();

    // `/web/`・`/ui/` のような Web 専用 path が混ざれば、そこは CLI の通らない検査経路になる
    for (const call of calls) {
      expect(call.url.startsWith('/api/v1/publish')).toBe(true);
    }
  });

  it('WOP-P-003: 全ての段にテナント境界ヘッダと冪等鍵が付く', async () => {
    const calls = stubPublishApi();
    await submitWithCheckpoint();

    expect(calls).toHaveLength(3);
    const keys = new Set<string>();
    for (const call of calls) {
      expect(call.headers[TENANT_HEADER]).toBe(SCOPE.tenantId);
      expect(call.headers[WORKSPACE_HEADER]).toBe(SCOPE.workspaceId);
      const key = call.headers['idempotency-key'] ?? '';
      // 8〜255 文字 (idempotencyKeySchema) を満たし、段ごとに別の鍵であること
      expect(key.length).toBeGreaterThanOrEqual(8);
      keys.add(key);
    }
    expect(keys.size).toBe(3);
  });

  it('WOP-P-004: scope が未確定なら 1 度も送らず、選び直しを促す', async () => {
    const calls = stubPublishApi();
    const result = await httpPublishJourneyPort.submitPackage(
      { tenantId: '', workspaceId: 'workspace-a' },
      { projectId: 'project-1', visibility: 'workspace', archive: new ArrayBuffer(8) },
      createPublishJourneyCheckpoint(),
      { resetBeforeUpload: false },
    );

    expect(result.ok).toBe(false);
    expect(calls).toHaveLength(0);
    if (!result.ok) expect(result.failure.message).toContain('Workspace');
  });

  it('WOP-P-005: 途中の段が失敗したらそこで打ち切り、後続を送らない', async () => {
    const calls: ObservedCall[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: unknown, init: RequestInit | undefined) => {
        calls.push({ method: init?.method ?? 'GET', url: String(input), headers: {}, body: null });
        if (String(input).endsWith('/package')) return new Response('{}', { status: 413 });
        return new Response(JSON.stringify(publishRequest()), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }),
    );

    const result = await submitWithCheckpoint();

    expect(result.ok).toBe(false);
    // submit まで進めば「検査していないのに公開扱い」になりうる
    expect(observedSteps(calls)).toEqual(['POST /api/v1/publish', 'PUT /api/v1/publish/{id}/package']);
  });

  it('WOP-P-006: upload 通信断後は作成済み request と同じ冪等鍵から再開する', async () => {
    const calls: ObservedCall[] = [];
    let packageAttempts = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: unknown, init: RequestInit | undefined) => {
        calls.push({
          method: init?.method ?? 'GET',
          url: String(input),
          headers: (init?.headers ?? {}) as Record<string, string>,
          body: init?.body,
        });
        if (String(input).endsWith('/package')) {
          packageAttempts += 1;
          if (packageAttempts === 1) throw new TypeError('offline');
          return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
        }
        return new Response(JSON.stringify(publishRequest()), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }),
    );

    const first = await submitWithCheckpoint();
    expect(first.ok).toBe(false);
    if (first.ok || first.failure.checkpoint === undefined) throw new Error('checkpoint が返りませんでした');
    const retried = await submitWithCheckpoint(first.failure.checkpoint);

    expect(retried.ok).toBe(true);
    expect(observedSteps(calls)).toEqual([
      'POST /api/v1/publish',
      'PUT /api/v1/publish/{id}/package',
      'PUT /api/v1/publish/{id}/package',
      'POST /api/v1/publish/{id}/submit',
    ]);
    const packageCalls = calls.filter((call) => call.url.endsWith('/package'));
    expect(packageCalls[0]?.headers['idempotency-key']).toBe(packageCalls[1]?.headers['idempotency-key']);
  });

  it('WOP-P-007: package_rejected も submit して Needs Fix の正本状態へ進める', async () => {
    const calls: ObservedCall[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: unknown, init: RequestInit | undefined) => {
        calls.push({ method: init?.method ?? 'GET', url: String(input), headers: {}, body: init?.body });
        if (String(input).endsWith('/package')) {
          return new Response(JSON.stringify({ error: 'package_rejected', findings: [] }), {
            status: 422,
            headers: { 'content-type': 'application/json' },
          });
        }
        const response = String(input).endsWith('/submit')
          ? publishRequest({ status: 'needs_fix', verdict: 'red', release_id: null })
          : publishRequest({ status: 'draft', verdict: null, release_id: null });
        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }),
    );

    const result = await submitWithCheckpoint();

    expect(result.ok && result.value.request.status).toBe('needs_fix');
    expect(observedSteps(calls)).toEqual([
      'POST /api/v1/publish',
      'PUT /api/v1/publish/{id}/package',
      'POST /api/v1/publish/{id}/submit',
    ]);
  });

  it('WOP-P-008: 再投入は同じ request を cancel→package→submit で進める', async () => {
    const calls = stubPublishApi(publishRequest({ status: 'published' }));
    const checkpoint = createPublishJourneyCheckpoint(REQUEST_ID);

    const result = await httpPublishJourneyPort.submitPackage(
      SCOPE,
      { projectId: 'project-1', visibility: 'workspace', archive: new ArrayBuffer(8) },
      checkpoint,
      { resetBeforeUpload: true },
    );

    expect(result.ok).toBe(true);
    expect(observedSteps(calls)).toEqual([
      'POST /api/v1/publish/{id}/cancel',
      'PUT /api/v1/publish/{id}/package',
      'POST /api/v1/publish/{id}/submit',
    ]);
  });
});

describe('受入 3: 検査結果の文言と再投入導線は両経路で同一', () => {
  const FINDING: PublishFinding = {
    rule_id: 'secret-scan/aws-key',
    stage: 'secret-scan',
    severity: 'error',
    message: '認証情報らしき文字列が含まれています',
    path: 'src/config.ts',
    line: 12,
  } as PublishFinding;

  it('WOP-F-001: finding の書式は単一の関数が決める', () => {
    expect(formatPublishFinding(FINDING)).toBe(
      '[secret-scan/aws-key] 認証情報らしき文字列が含まれています (src/config.ts:12)',
    );
    expect(formatPublishFindings([FINDING])).toEqual([formatPublishFinding(FINDING)]);
  });

  it('WOP-F-002: 位置情報が欠けても壊れた括弧を出さない', () => {
    expect(formatPublishFinding({ ...FINDING, line: null })).toBe(
      '[secret-scan/aws-key] 認証情報らしき文字列が含まれています (src/config.ts)',
    );
    expect(formatPublishFinding({ ...FINDING, path: null, line: null })).toBe(
      '[secret-scan/aws-key] 認証情報らしき文字列が含まれています',
    );
  });

  it('WOP-F-003: verdict ごとの要約は次の行動 (再投入) を必ず示す', () => {
    for (const verdict of ['red', 'yellow', null] as const) {
      expect(publishNeedsFixSummary(verdict)).toContain('もう一度');
    }
    expect(publishNeedsFixSummary('red')).not.toBe(publishNeedsFixSummary('yellow'));
  });

  it('WOP-F-004: CLI と Web の両方が共通整形を使っている (どちらも独自に組み立てない)', () => {
    const cli = readFileSync(CLI_COMMAND_SOURCE, 'utf8');
    const wizard = readWizardSource();
    const catalogStatus = readFileSync(CATALOG_STATUS_SOURCE, 'utf8');

    for (const source of [cli, wizard, catalogStatus]) {
      expect(source).toMatch(/formatPublishFindings?/);
      expect(source).toContain('PUBLISH_NEEDS_FIX_HEADING');
    }
    for (const source of [cli, wizard]) {
      expect(source).toContain('publishNeedsFixSummary');
      expect(source).toContain('PUBLISH_RESUBMIT_ACTION_LABEL');
    }
    // 見出し・再投入文言そのものを画面側へ書き写していないこと
    for (const source of [wizard, catalogStatus]) {
      expect(source).not.toContain(`'${PUBLISH_NEEDS_FIX_HEADING}'`);
      expect(source).not.toContain(`'${PUBLISH_RESUBMIT_ACTION_LABEL}'`);
    }
  });
});

describe('受入 6: Web 公開経路は共通の認可境界だけを通る', () => {
  it('WOP-A-001: Web は公開・再投入とも既存 Publish API だけを使用する', async () => {
    const calls = stubPublishApi();

    await submitWithCheckpoint(createPublishJourneyCheckpoint(REQUEST_ID));

    expect(observedSteps(calls)).toEqual(['PUT /api/v1/publish/{id}/package', 'POST /api/v1/publish/{id}/submit']);
    // session/token の許可差は単一認可層の matrix テストで検証する。この feature 側に
    // 独自の権限表を複製しないこと自体が、経路ごとの判定漂流を防ぐ境界になる。
    expect(calls.every((call) => call.url.startsWith('/api/v1/publish'))).toBe(true);
  });

  it('WOP-A-002: 承認・却下は Web 経路に混ぜていない (公開者が自分で承認できない)', () => {
    // ウィザードは検査つき公開だけを担う。承認系 action を呼んでいないことを源で固定する
    const wizard = readWizardSource();
    expect(wizard).not.toContain('/approve');
    expect(wizard).not.toContain('/reject');
    expect(wizard).not.toContain('publish.approve');
    expect(wizard).not.toContain('publish.reject');
  });
});

describe('受入 7: Device 確認コードの制約は S01 追加後も変わらない', () => {
  it('WOP-D-001: 8 文字 / TTL 10 分 / 5 回失敗で打切り / poll 間隔の数値契約', () => {
    expect(AUTH_NUMERIC_CONTRACT.userCodeLength).toBe(8);
    expect(AUTH_NUMERIC_CONTRACT.userCodeMaxAttempts).toBe(5);
    expect(AUTH_NUMERIC_CONTRACT.deviceCodeTtlSeconds).toBe(600);
    expect(AUTH_NUMERIC_CONTRACT.devicePollIntervalSeconds).toBe(5);
    expect(AUTH_NUMERIC_CONTRACT.devicePollMaxIntervalSeconds).toBe(60);
  });

  it('WOP-D-002: /device は案内を足しただけで、承認フォームと session 判定を保っている', () => {
    const page = readFileSync(join(hubRoot, 'src', 'app', 'device', 'page.tsx'), 'utf8');
    expect(page).toContain('DeviceApprovalForm');
    expect(page).toContain('resolveDeviceApprovalSession');
    expect(page).toContain('normalizeUserCodeInput');
    // 案内は承認フォーム本体より前に描画される (受入 5)
    expect(page.indexOf('DeviceApprovalPurposeNotice')).toBeLessThan(page.indexOf('renderDeviceApprovalBody'));
  });
});
