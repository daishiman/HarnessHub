/** S01 の唯一の fetch 境界。既存 Publish API を順番どおり再利用し、途中再開だけを担う。 */
import type { PublishProject, PublishProjectChoice, PublishRequestView } from '@harness-hub/schemas';

import { TENANT_HEADER, WORKSPACE_HEADER } from '../../middleware-contract.js';
import type {
  PublishJourneyCheckpoint,
  PublishJourneyFailure,
  PublishJourneyPort,
  PublishJourneyResult,
  PublishJourneyScope,
  PublishJourneyStage,
} from './ports.js';

const API_BASE = '/api/v1';

function createIdempotencyKey(): string {
  return crypto.randomUUID();
}

export function createPublishJourneyCheckpoint(requestId: string | null = null): PublishJourneyCheckpoint {
  return {
    requestId,
    requestKey: createIdempotencyKey(),
    resetKey: createIdempotencyKey(),
    packageKey: createIdempotencyKey(),
    submitKey: createIdempotencyKey(),
  };
}

function failure(
  stage: PublishJourneyStage,
  status: number | null,
  message: string,
  checkpoint?: PublishJourneyCheckpoint,
): PublishJourneyResult<never> {
  return {
    ok: false,
    failure: { stage, status, message, ...(checkpoint === undefined ? {} : { checkpoint }) },
  };
}

function messageForStatus(stage: PublishJourneyStage, status: number): string {
  if (status === 401) return 'サインインの有効期限が切れています。もう一度サインインしてください。';
  // 2026-08-12: 導線と見出しは「ツール」から「Skill」へ寄せたが、ここは据え置く。
  // これは権限が無いことを伝える文で、何を公開しようとしたかは論点ではない
  // (Skill へ狭めると「Skill 以外なら公開できるのか」と読ませる余地が出る)。
  // Web アプリの公開が入って権限が種類ごとに分かれたら、そのときに揃える。
  if (status === 403) return 'この Workspace でツールを公開する権限がありません。管理者に確認してください。';
  if (status === 404) {
    return stage === 'status'
      ? '公開要求が見つかりません。URL と Workspace を確認してください。'
      : '現在の Workspace に対象の Project または公開要求が見つかりません。';
  }
  if (status === 409) {
    return stage === 'project'
      ? '同じ名前の Project があります。既存 Project を選ぶか、別の名前を指定してください。'
      : '公開状態が更新されています。最新状態を取得してから再試行してください。';
  }
  if (status === 413) return 'ZIP のサイズが上限を超えています。不要なファイルを除いてください。';
  if (status === 429) return '短時間に多くの要求が届いています。少し待ってから再試行してください。';
  if (status >= 500) return 'Hub 側で問題が発生しました。時間をおいて再試行してください。';
  return '要求を受け付けられませんでした。入力内容を確認してください。';
}

function scopeHeaders(scope: PublishJourneyScope): Record<string, string> | null {
  const tenantId = scope.tenantId.trim();
  const workspaceId = scope.workspaceId.trim();
  if (tenantId === '' || workspaceId === '') return null;
  return { [TENANT_HEADER]: tenantId, [WORKSPACE_HEADER]: workspaceId };
}

async function parsePublishRequest(payload: unknown): Promise<PublishRequestView | null> {
  const { publishRequestSchema } = await import('@harness-hub/schemas');
  const parsed = publishRequestSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

async function parseProject(payload: unknown): Promise<PublishProject | null> {
  const { publishProjectSchema } = await import('@harness-hub/schemas');
  const parsed = publishProjectSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

async function parseProjectList(payload: unknown): Promise<readonly PublishProjectChoice[] | null> {
  const { publishProjectListSchema } = await import('@harness-hub/schemas');
  const parsed = publishProjectListSchema.safeParse(payload);
  return parsed.success ? parsed.data.items : null;
}

interface JourneyRequestInit {
  readonly method: string;
  readonly headers: Record<string, string>;
  readonly body?: BodyInit | undefined;
  readonly signal?: AbortSignal | undefined;
}

async function send(path: string, init: JourneyRequestInit): Promise<Response | null> {
  const requestInit: RequestInit = {
    method: init.method,
    credentials: 'same-origin',
    headers: init.headers,
    ...(init.body === undefined ? {} : { body: init.body }),
  };
  if (init.signal !== undefined) requestInit.signal = init.signal;
  try {
    return await fetch(`${API_BASE}${path}`, requestInit);
  } catch {
    return null;
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function errorCode(payload: unknown): string | null {
  if (payload === null || typeof payload !== 'object') return null;
  const value = (payload as { error?: unknown }).error;
  return typeof value === 'string' ? value : null;
}

const OFFLINE_MESSAGE = 'Hub に接続できませんでした。通信状況を確認して再試行してください。';
const MALFORMED_MESSAGE = 'Hub の応答を解釈できませんでした。時間をおいて再試行してください。';

export const httpPublishJourneyPort: PublishJourneyPort = {
  async listProjects(scope, signal) {
    const headers = scopeHeaders(scope);
    if (headers === null) return failure('project', null, 'Workspace を選び直してください。');
    const response = await send('/projects', { method: 'GET', headers, signal });
    if (response === null) return failure('project', null, OFFLINE_MESSAGE);
    if (!response.ok) return failure('project', response.status, messageForStatus('project', response.status));
    const projects = await parseProjectList(await readJson(response));
    return projects === null ? failure('project', response.status, MALFORMED_MESSAGE) : { ok: true, value: projects };
  },

  async createProject(scope, input, signal) {
    const headers = scopeHeaders(scope);
    if (headers === null) return failure('project', null, 'Workspace を選び直してください。');

    const response = await send('/projects', {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json', 'idempotency-key': input.idempotencyKey },
      body: JSON.stringify({ name: input.name, description: input.description }),
      signal,
    });
    if (response === null) return failure('project', null, OFFLINE_MESSAGE);
    if (!response.ok) return failure('project', response.status, messageForStatus('project', response.status));
    const project = await parseProject(await readJson(response));
    return project === null ? failure('project', response.status, MALFORMED_MESSAGE) : { ok: true, value: project };
  },

  async submitPackage(scope, input, originalCheckpoint, options, signal) {
    const headers = scopeHeaders(scope);
    if (headers === null) return failure('request', null, 'Workspace を選び直してください。', originalCheckpoint);

    let checkpoint = originalCheckpoint;
    if (checkpoint.requestId === null) {
      const created = await send('/publish', {
        method: 'POST',
        headers: { ...headers, 'content-type': 'application/json', 'idempotency-key': checkpoint.requestKey },
        body: JSON.stringify({ project_id: input.projectId, target: 'skill', visibility: input.visibility }),
        signal,
      });
      if (created === null) return failure('request', null, OFFLINE_MESSAGE, checkpoint);
      if (!created.ok)
        return failure('request', created.status, messageForStatus('request', created.status), checkpoint);
      const createdView = await parsePublishRequest(await readJson(created));
      if (createdView === null) return failure('request', created.status, MALFORMED_MESSAGE, checkpoint);
      checkpoint = { ...checkpoint, requestId: createdView.id };
    }

    const requestId = checkpoint.requestId;
    if (requestId === null) return failure('request', null, MALFORMED_MESSAGE, checkpoint);

    if (options.resetBeforeUpload) {
      const reset = await send(`/publish/${encodeURIComponent(requestId)}/cancel`, {
        method: 'POST',
        headers: { ...headers, 'content-type': 'application/json', 'idempotency-key': checkpoint.resetKey },
        body: '{}',
        signal,
      });
      if (reset === null) return failure('reset', null, OFFLINE_MESSAGE, checkpoint);
      if (!reset.ok) return failure('reset', reset.status, messageForStatus('reset', reset.status), checkpoint);
    }

    const uploaded = await send(`/publish/${encodeURIComponent(requestId)}/package`, {
      method: 'PUT',
      headers: { ...headers, 'content-type': 'application/zip', 'idempotency-key': checkpoint.packageKey },
      body: input.archive,
      signal,
    });
    if (uploaded === null) return failure('package', null, OFFLINE_MESSAGE, checkpoint);
    if (!uploaded.ok) {
      const payload = await readJson(uploaded);
      // package_rejected でも request には verdict/findings が保存済み。submit して正本状態機械の
      // draft → validating → needs_fix を通し、利用者が同じ request を再投入できる状態へ進める。
      if (uploaded.status !== 422 || errorCode(payload) !== 'package_rejected') {
        return failure('package', uploaded.status, messageForStatus('package', uploaded.status), checkpoint);
      }
    }

    const submitted = await send(`/publish/${encodeURIComponent(requestId)}/submit`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json', 'idempotency-key': checkpoint.submitKey },
      body: '{}',
      signal,
    });
    if (submitted === null) return failure('submit', null, OFFLINE_MESSAGE, checkpoint);
    if (!submitted.ok) {
      // 応答喪失と台帳記録の境界で 409 になっても、server 側が既に draft を抜けていれば成功として回収する。
      if (submitted.status === 409) {
        const recovered = await this.getRequest(scope, requestId, signal);
        if (recovered.ok && recovered.value.status !== 'draft') {
          return { ok: true, value: { request: recovered.value, checkpoint } };
        }
      }
      return failure('submit', submitted.status, messageForStatus('submit', submitted.status), checkpoint);
    }

    const submittedView = await parsePublishRequest(await readJson(submitted));
    if (submittedView === null) return failure('submit', submitted.status, MALFORMED_MESSAGE, checkpoint);
    return { ok: true, value: { request: submittedView, checkpoint } };
  },

  async getRequest(scope, requestId, signal) {
    const headers = scopeHeaders(scope);
    if (headers === null) return failure('status', null, 'Workspace を選び直してください。');
    const response = await send(`/publish/${encodeURIComponent(requestId)}`, { method: 'GET', headers, signal });
    if (response === null) return failure('status', null, OFFLINE_MESSAGE);
    if (!response.ok) return failure('status', response.status, messageForStatus('status', response.status));
    const request = await parsePublishRequest(await readJson(response));
    return request === null ? failure('status', response.status, MALFORMED_MESSAGE) : { ok: true, value: request };
  },
};

export type { PublishJourneyFailure };
