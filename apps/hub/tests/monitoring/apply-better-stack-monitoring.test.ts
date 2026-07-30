// HF-A3-SLO-002: Better Stack 適用器の契約テスト。
//
// 実 API は叩かない。検証したいのは「本番へ二重登録しないこと」「秘密を書き戻さないこと」
// 「applied 状態へ一貫して遷移すること」で、いずれもネットワーク越しでなくても決まる。
//
// script は .mjs で tsconfig が allowJs:false のため静的 import できない。
// 変数指定子の動的 import は TS が静的解決しないので、型検査を通したまま実体を読める。

import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  type ApiNode,
  BACKUP_HEARTBEAT_URL,
  createFakeClient,
  HEARTBEAT_URL,
  HUB_ROOT,
  loadConfig,
  loadDashboard,
  payloadOf,
  seededHeartbeats,
} from './better-stack-monitoring-test-support';

const SCRIPT = path.join(HUB_ROOT, 'scripts/apply-better-stack-monitoring.mjs');

interface ApplyResult {
  config: Record<string, unknown>;
  dashboard: Record<string, unknown>;
  heartbeatUrl: string | null;
  heartbeatUrls: Record<string, string>;
  actions: { kind: string; action: string; external_id?: string; id?: string }[];
}

interface ScriptModule {
  redactSecrets(value: unknown, token?: string): string;
  unwrapOne(payload: unknown): ApiNode;
  matchExisting(kind: string, desired: Record<string, unknown>, existing: ApiNode[]): ApiNode | null;
  buildDesiredPatch(desired: Record<string, unknown>, attributes: Record<string, unknown>): Record<string, unknown>;
  createUptimeClient(options: { token: string; fetchImpl?: unknown; baseUrl?: string }): {
    request(method: string, path: string, body?: unknown): Promise<unknown>;
    listAll(path: string): Promise<ApiNode[]>;
  };
  applyMonitoring(options: { config: unknown; dashboard: unknown; client: unknown; now: Date }): Promise<ApplyResult>;
  applyBackupHeartbeat(options: { config: unknown; client: unknown }): Promise<ApplyResult>;
  MONITORS_CONFIG_PATH: string;
  SLO_DASHBOARD_PATH: string;
}

let script: ScriptModule;

beforeAll(async () => {
  script = (await import(pathToFileURL(SCRIPT).href)) as ScriptModule;
});

describe('HF-A3-SLO-002: Better Stack 適用器', () => {
  describe('秘密の伏字化', () => {
    it('heartbeat URL と API token を出力から消す', () => {
      const text = `url=${HEARTBEAT_URL} token=tok_abc123`;
      const redacted = script.redactSecrets(text, 'tok_abc123');
      expect(redacted).not.toContain('secretsecretsecret');
      expect(redacted).not.toContain('tok_abc123');
      expect(redacted).toContain('[REDACTED_HEARTBEAT_URL]');
      expect(redacted).toContain('[REDACTED_TOKEN]');
    });

    it('token 未指定でも heartbeat URL は伏せる', () => {
      expect(script.redactSecrets(HEARTBEAT_URL)).toBe('[REDACTED_HEARTBEAT_URL]');
    });
  });

  describe('API 応答の取り出し', () => {
    it('data で包まれていても素でも id を取れる', () => {
      expect(script.unwrapOne({ data: { id: '1', attributes: {} } }).id).toBe('1');
      expect(script.unwrapOne({ id: '2', attributes: {} }).id).toBe('2');
    });

    it('id の無い応答を成功として扱わない', () => {
      expect(() => script.unwrapOne({ data: {} })).toThrow();
    });
  });

  describe('client', () => {
    it('token が空なら client を作らせない', () => {
      expect(() => script.createUptimeClient({ token: '' })).toThrow(/BETTER_STACK_API_TOKEN/);
    });

    // fetch へ非 ASCII を渡すと "character at index 7 has a value of 23455" のように
    // **token の文字コードを含む**例外が出る。秘密の断片がログへ落ちる経路なので手前で塞ぐ。
    it.each([
      ['全角が混ざった token (プレースホルダの貼り忘れ)', '実際のトークン'],
      ['改行が混ざった token (コピペ事故)', 'tok\n'],
      ['空白が混ざった token', 'tok en'],
    ])('%s は文字コードを漏らさずに落とす', (_name, badToken) => {
      let thrown: unknown;
      try {
        script.createUptimeClient({ token: badToken });
      } catch (error) {
        thrown = error;
      }
      const message = (thrown as Error | undefined)?.message ?? '';
      expect(message).toMatch(/BETTER_STACK_API_TOKEN/);
      // token 本体も、その文字コードを示す数値も出さないこと
      expect(message).not.toContain(badToken);
      expect(message).not.toMatch(/\bvalue of \d+\b|\bindex \d+\b/);
    });

    it('pagination を最後まで辿る (1 ページ目だけ見て重複を作らない)', async () => {
      const pages = [
        { data: [{ id: '1', attributes: {} }], pagination: { next: 'https://api.test/api/v2/monitors?page=2' } },
        { data: [{ id: '2', attributes: {} }], pagination: { next: null } },
      ];
      let call = 0;
      const fetchImpl = async () => {
        const body = pages[call] ?? pages[pages.length - 1];
        call += 1;
        return { ok: true, status: 200, text: async () => JSON.stringify(body) };
      };
      const client = script.createUptimeClient({ token: 'tok', fetchImpl, baseUrl: 'https://api.test' });
      await expect(client.listAll('/api/v2/monitors')).resolves.toHaveLength(2);
    });

    it('非 2xx は伏字化した例外にする (422 は送信値を echo し返しうる)', async () => {
      const fetchImpl = async () => ({
        ok: false,
        status: 422,
        text: async () => `{"errors":["bad ${HEARTBEAT_URL}"]}`,
      });
      const client = script.createUptimeClient({ token: 'tok_leak', fetchImpl, baseUrl: 'https://api.test' });
      await expect(client.request('POST', '/api/v2/monitors', {})).rejects.toThrow(/422/);
      await expect(client.request('POST', '/api/v2/monitors', {})).rejects.not.toThrow(/secretsecretsecret/);
    });
  });

  describe('冪等な同定 (matchExisting)', () => {
    const config = loadConfig();

    it('同じ URL の monitor が既にあれば再利用対象として見つける', () => {
      const desired = (config.monitor as { request: { payload: Record<string, unknown> } }).request.payload;
      const existing = [
        { id: '9', attributes: { url: 'https://other.example.com/health', monitor_type: 'expected_status_code' } },
        { id: '7', attributes: { ...desired } },
      ];
      expect(script.matchExisting('monitor', desired, existing)?.id).toBe('7');
    });

    it('無関係な資源しか無ければ null を返す', () => {
      const desired = (config.monitor as { request: { payload: Record<string, unknown> } }).request.payload;
      const existing = [{ id: '9', attributes: { url: 'https://other.example.com/health' } }];
      expect(script.matchExisting('monitor', desired, existing)).toBeNull();
    });

    it('heartbeat は name で、status page は subdomain で同定する', () => {
      const heartbeat = (config.heartbeat as { request: { payload: Record<string, unknown> } }).request.payload;
      const statusPage = (config.status_page as { request: { payload: Record<string, unknown> } }).request.payload;
      expect(script.matchExisting('heartbeat', heartbeat, [{ id: '3', attributes: { ...heartbeat } }])?.id).toBe('3');
      expect(script.matchExisting('status_page', statusPage, [{ id: '4', attributes: { ...statusPage } }])?.id).toBe(
        '4',
      );
    });

    it('候補が 2 件以上なら黙って 1 件選ばず落とす', () => {
      const desired = (config.monitor as { request: { payload: Record<string, unknown> } }).request.payload;
      const existing = [
        { id: '7', attributes: { ...desired } },
        { id: '8', attributes: { ...desired } },
      ];
      expect(() => script.matchExisting('monitor', desired, existing)).toThrow();
    });
  });

  describe('正本との差分', () => {
    it('paused monitor は paused:false のみを更新対象にする', () => {
      const desired = {
        url: 'https://example.com/health',
        monitor_type: 'expected_status_code',
        http_method: 'get',
        paused: false,
      };
      const attributes = {
        ...desired,
        http_method: 'GET',
        paused: undefined,
        paused_at: '2026-07-27T00:00:00.000Z',
        status: 'paused',
      };

      expect(script.buildDesiredPatch(desired, attributes)).toStrictEqual({ paused: false });
    });

    it('status=up / paused_at=null は paused:false と同値に扱う', () => {
      expect(script.buildDesiredPatch({ paused: false }, { status: 'up', paused_at: null })).toStrictEqual({});
    });
  });

  describe('適用', () => {
    const now = new Date('2026-08-01T00:00:00.000Z');

    it('新規適用で 5 資源を作り、採番結果を書き戻す', async () => {
      const client = createFakeClient();
      const result = await script.applyMonitoring({ config: loadConfig(), dashboard: loadDashboard(), client, now });

      expect(result.config.application_state).toBe('applied');
      expect(result.config.applied_at).toBe('2026-08-01T00:00:00.000Z');
      const monitor = result.config.monitor as { external_id: string };
      const heartbeat = result.config.heartbeat as { external_id: string };
      const backupHeartbeat = result.config.backup_heartbeat as {
        external_id: string;
        provisioning_state: string;
      };
      const statusPage = result.config.status_page as {
        external_id: string;
        resource_external_ids: Record<string, string>;
      };
      for (const id of [
        monitor.external_id,
        heartbeat.external_id,
        backupHeartbeat.external_id,
        statusPage.external_id,
        statusPage.resource_external_ids['hub-health'],
      ]) {
        expect(typeof id).toBe('string');
        expect(id).not.toBe('');
      }
      expect(backupHeartbeat.provisioning_state).toBe('applied');
      expect(result.actions.map((a) => a.action)).toStrictEqual([
        'created',
        'created',
        'created',
        'created',
        'created',
      ]);
    });

    it('観測開始を適用時刻に合わせ、初回月次判定を +30 日に置く', async () => {
      const client = createFakeClient();
      const result = await script.applyMonitoring({ config: loadConfig(), dashboard: loadDashboard(), client, now });
      expect(result.dashboard.verdict).toMatchObject({
        status: 'collecting',
        observation_started_at: '2026-08-01T00:00:00.000Z',
        first_monthly_verdict_due_at: '2026-08-31T00:00:00.000Z',
      });
    });

    it('heartbeat URL を設定ファイルへ書き戻さない', async () => {
      const client = createFakeClient();
      const result = await script.applyMonitoring({ config: loadConfig(), dashboard: loadDashboard(), client, now });
      expect(result.heartbeatUrl).toBe(HEARTBEAT_URL);
      expect(result.heartbeatUrls).toMatchObject({
        CRON_HEARTBEAT_URL: HEARTBEAT_URL,
        BACKUP_HEARTBEAT_URL,
      });
      expect(JSON.stringify(result.config)).not.toContain('secretsecretsecret');
      expect(JSON.stringify(result.dashboard)).not.toContain('secretsecretsecret');
      expect(JSON.stringify(result.actions)).not.toContain('secretsecretsecret');
    });

    it('再実行しても本番へ重複を作らない (POST を 1 度も出さない)', async () => {
      const config = loadConfig();
      const dashboard = {
        ...loadDashboard(),
        verdict: {
          status: 'collecting',
          observation_started_at: config.applied_at,
          first_monthly_verdict_due_at: '2026-08-26T20:46:37.686Z',
          blocker: null,
        },
      };
      const client = createFakeClient({
        monitors: [{ id: '11', attributes: { ...payloadOf(config, 'monitor') } }],
        heartbeats: seededHeartbeats(config),
        statusPages: [{ id: '33', attributes: { ...payloadOf(config, 'status_page') } }],
        resources: [{ id: '44', attributes: { resource_id: '11', resource_type: 'Monitor' } }],
      });

      const result = await script.applyMonitoring({ config, dashboard, client, now });

      expect(client.calls.filter((c) => c.method === 'POST')).toStrictEqual([]);
      expect(result.actions.map((a) => a.action)).toStrictEqual(['reused', 'reused', 'reused', 'reused', 'reused']);
      expect((result.config.monitor as { external_id: string }).external_id).toBe('11');
      // 再実行で 30 日の起点を now へ動かすと、月次判定が永遠に先送りされる。
      expect(result.config.applied_at).toBe(config.applied_at);
      expect(result.dashboard.verdict).toStrictEqual(dashboard.verdict);
      // 既存 heartbeat からも URL を回収できないと、secret 再投入の経路が消える
      expect(result.heartbeatUrl).toBe(HEARTBEAT_URL);
      expect(result.heartbeatUrls.BACKUP_HEARTBEAT_URL).toBe(BACKUP_HEARTBEAT_URL);
    });

    it('既存 monitor が paused なら PATCH で正本の paused:false へ戻す', async () => {
      const config = loadConfig();
      const monitorPayload = payloadOf(config, 'monitor');
      const client = createFakeClient({
        monitors: [
          {
            id: '11',
            attributes: {
              ...monitorPayload,
              paused: undefined,
              paused_at: '2026-07-27T00:00:00.000Z',
              status: 'paused',
            },
          },
        ],
        heartbeats: seededHeartbeats(config),
        statusPages: [{ id: '33', attributes: { ...payloadOf(config, 'status_page') } }],
        resources: [{ id: '44', attributes: { resource_id: '11', resource_type: 'Monitor' } }],
      });

      const result = await script.applyMonitoring({ config, dashboard: loadDashboard(), client, now });

      expect(client.requestBodies).toContainEqual({
        method: 'PATCH',
        path: '/api/v2/monitors/11',
        body: { paused: false },
      });
      expect(result.actions[0]).toMatchObject({ kind: 'monitor', action: 'updated' });
      // monitor の履歴が止まっていたため、再開時刻を新しい 30 日観測の起点にする
      expect(result.config.applied_at).toBe('2026-08-01T00:00:00.000Z');
    });

    it('applied 設定でも monitor を作り直した場合は観測開始をリセットする', async () => {
      const result = await script.applyMonitoring({
        config: loadConfig(),
        dashboard: loadDashboard(),
        client: createFakeClient(),
        now,
      });

      expect(result.actions[0]).toMatchObject({ kind: 'monitor', action: 'created' });
      expect(result.config.applied_at).toBe('2026-08-01T00:00:00.000Z');
      expect(result.dashboard.verdict).toMatchObject({
        observation_started_at: '2026-08-01T00:00:00.000Z',
        first_monthly_verdict_due_at: '2026-08-31T00:00:00.000Z',
      });
    });

    it('monitor と status page が既存でも関連付けだけは補う', async () => {
      const config = loadConfig();
      const client = createFakeClient({
        monitors: [{ id: '11', attributes: { ...payloadOf(config, 'monitor') } }],
        heartbeats: seededHeartbeats(config),
        statusPages: [{ id: '33', attributes: { ...payloadOf(config, 'status_page') } }],
      });

      const result = await script.applyMonitoring({ config, dashboard: loadDashboard(), client, now });
      const posts = client.calls.filter((c) => c.method === 'POST');
      expect(posts).toStrictEqual([{ method: 'POST', path: '/api/v2/status-pages/33/resources' }]);
      expect(result.actions.at(-1)).toMatchObject({ kind: 'status_page_resource', action: 'created' });
    });

    it('backup 限定適用は他の監視資源と SLO dashboard に触れない', async () => {
      const config = loadConfig();
      const client = createFakeClient({
        monitors: [
          {
            id: '11',
            attributes: {
              ...payloadOf(config, 'monitor'),
              paused: undefined,
              paused_at: '2026-07-27T00:00:00.000Z',
              status: 'paused',
            },
          },
        ],
        heartbeats: [{ id: '22', attributes: { ...payloadOf(config, 'heartbeat'), url: HEARTBEAT_URL } }],
      });

      const result = await script.applyBackupHeartbeat({ config, client });

      expect(client.calls).toStrictEqual([
        { method: 'GET', path: '/api/v2/heartbeats' },
        { method: 'POST', path: '/api/v2/heartbeats' },
      ]);
      expect(result.dashboard).toBeNull();
      expect(result.config).toMatchObject({
        ...config,
        backup_heartbeat: {
          ...(config.backup_heartbeat as Record<string, unknown>),
          external_id: '1001',
          provisioning_state: 'applied',
        },
      });
      expect(result.heartbeatUrls).toStrictEqual({ BACKUP_HEARTBEAT_URL });
      expect(result.actions).toStrictEqual([
        {
          kind: 'heartbeat',
          local_id: 'hub-backup-daily',
          action: 'created',
          external_id: '1001',
        },
      ]);
      expect(client.calls.some((call) => call.path.startsWith('/api/v2/monitors'))).toBe(false);
      expect(client.calls.some((call) => call.path.startsWith('/api/v2/status-pages'))).toBe(false);
    });

    it('backup 限定適用を再実行しても重複を作らない', async () => {
      const config = loadConfig();
      const client = createFakeClient({ heartbeats: seededHeartbeats(config) });

      const result = await script.applyBackupHeartbeat({ config, client });

      expect(client.calls).toStrictEqual([{ method: 'GET', path: '/api/v2/heartbeats' }]);
      expect(result.actions[0]).toMatchObject({ action: 'reused', external_id: '23' });
      expect(result.heartbeatUrls.BACKUP_HEARTBEAT_URL).toBe(BACKUP_HEARTBEAT_URL);
    });
  });
});
