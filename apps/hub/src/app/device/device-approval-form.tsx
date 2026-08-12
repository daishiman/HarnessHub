'use client';

import { Alert, Button, Panel, ScreenHeader, Select, Stack, TextInput } from '@harness-hub/ui';
import { type FormEvent, type ReactNode, useState } from 'react';

import { TENANT_HEADER, WORKSPACE_HEADER } from '../../middleware-contract.js';
import { isValidUserCodeInput, normalizeUserCodeInput } from './device-approval-code.js';

export type DeviceApprovalError =
  | 'invalid_code'
  | 'unauthenticated'
  | 'denied'
  | 'not_found'
  | 'already_used'
  | 'expired'
  | 'unavailable';

export type DeviceApprovalResult =
  | { readonly ok: true; readonly deviceLabel: string | null }
  | { readonly ok: false; readonly error: DeviceApprovalError };

export interface DeviceApprovalRequest {
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly userCode: string;
}

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export async function submitDeviceApproval(
  input: DeviceApprovalRequest,
  fetcher: Fetcher = fetch,
): Promise<DeviceApprovalResult> {
  const userCode = normalizeUserCodeInput(input.userCode);
  if (!isValidUserCodeInput(userCode)) return { ok: false, error: 'invalid_code' };

  try {
    const response = await fetcher('/api/v1/device/approve', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'content-type': 'application/json',
        [TENANT_HEADER]: input.tenantId,
        [WORKSPACE_HEADER]: input.workspaceId,
      },
      body: JSON.stringify({ user_code: userCode, workspace_id: input.workspaceId }),
    });

    if (!response.ok) return { ok: false, error: errorForStatus(response.status) };

    const body = (await readJson(response)) as { approved?: unknown; device_label?: unknown } | null;
    if (body?.approved !== true) return { ok: false, error: 'unavailable' };

    return {
      ok: true,
      deviceLabel: typeof body.device_label === 'string' && body.device_label.length > 0 ? body.device_label : null,
    };
  } catch {
    return { ok: false, error: 'unavailable' };
  }
}

export interface DeviceApprovalFormProps {
  readonly tenantId: string;
  readonly workspaceIds: readonly string[];
  /** session に含まれる表示専用の名前。選択値と API 送信値は常に workspace ID のまま。 */
  readonly workspaceNames?: Readonly<Record<string, string>> | undefined;
  readonly initialUserCode?: string;
}

export function DeviceApprovalForm({
  tenantId,
  workspaceIds,
  workspaceNames = {},
  initialUserCode = '',
}: DeviceApprovalFormProps): ReactNode {
  const [userCode, setUserCode] = useState(initialUserCode);
  const [workspaceId, setWorkspaceId] = useState(workspaceIds[0] ?? '');
  const [result, setResult] = useState<DeviceApprovalResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting || workspaceId.length === 0) return;

    setSubmitting(true);
    setResult(null);
    const next = await submitDeviceApproval({ tenantId, workspaceId, userCode });
    setResult(next);
    if (next.ok) setUserCode('');
    setSubmitting(false);
  }

  return (
    <section aria-labelledby="device-approval-heading">
      <Stack gap={4}>
        <ScreenHeader
          id="device-approval-heading"
          title="端末を承認する"
          description="Publisher または CLI に表示された 8 文字の確認コードを入力してください。"
        />
        <Panel>
          <form onSubmit={onSubmit}>
            <Stack gap={3}>
              <TextInput
                label="確認コード"
                description="英数字8文字です。空白やハイフンは取り除いて送信します。"
                value={userCode}
                onChange={(event) => setUserCode(event.currentTarget.value)}
                autoComplete="one-time-code"
                autoCapitalize="characters"
                spellCheck={false}
                inputMode="text"
                maxLength={11}
                required
              />
              <Select
                label="承認するWorkspace"
                description="この端末が操作するWorkspaceを選びます。"
                options={workspaceIds.map((id) => ({
                  value: id,
                  label: workspaceNames[id] ?? `Workspace ID: ${id}`,
                }))}
                value={workspaceId}
                onChange={(event) => setWorkspaceId(event.currentTarget.value)}
                required
              />
              <div>
                <Button type="submit" variant="primary" loading={submitting} disabled={workspaceId.length === 0}>
                  この端末を承認する
                </Button>
              </div>
            </Stack>
          </form>
        </Panel>
        {result === null ? null : <DeviceApprovalNotice result={result} />}
      </Stack>
    </section>
  );
}

function DeviceApprovalNotice({ result }: { readonly result: DeviceApprovalResult }): ReactNode {
  if (result.ok) {
    return (
      <Alert
        tone="success"
        title="端末を承認しました"
        description={
          result.deviceLabel === null
            ? 'PublisherまたはCLIへ戻ると、自動的に接続が続行されます。'
            : `${result.deviceLabel}の接続を承認しました。PublisherまたはCLIへ戻ってください。`
        }
      />
    );
  }

  const message = ERROR_MESSAGES[result.error];
  return <Alert tone={message.tone} live="assertive" title={message.title} description={message.description} />;
}

const ERROR_MESSAGES: Readonly<
  Record<
    DeviceApprovalError,
    { readonly tone: 'danger' | 'warning'; readonly title: string; readonly description: string }
  >
> = {
  invalid_code: {
    tone: 'warning',
    title: '確認コードの形式が正しくありません',
    description: 'PublisherまたはCLIに表示された英数字8文字を確認してください。',
  },
  unauthenticated: {
    tone: 'warning',
    title: 'サインインが必要です',
    description: 'テナントのサインイン画面からログインし直してから、もう一度お試しください。',
  },
  denied: {
    tone: 'danger',
    title: 'この端末を承認できません',
    description: '権限または試行回数を確認し、PublisherまたはCLIで最初からやり直してください。',
  },
  not_found: {
    tone: 'warning',
    title: '確認コードが見つかりません',
    description: '入力内容を確認するか、PublisherまたはCLIで新しいコードを発行してください。',
  },
  already_used: {
    tone: 'warning',
    title: 'この確認コードは使用済みです',
    description: 'PublisherまたはCLIで新しいコードを発行してください。',
  },
  expired: {
    tone: 'warning',
    title: '確認コードの有効期限が切れています',
    description: 'PublisherまたはCLIで新しいコードを発行してください。',
  },
  unavailable: {
    tone: 'danger',
    title: '端末を承認できませんでした',
    description: '通信状態を確認し、時間をおいてもう一度お試しください。',
  },
};

function errorForStatus(status: number): DeviceApprovalError {
  if (status === 400) return 'invalid_code';
  if (status === 401) return 'unauthenticated';
  if (status === 403) return 'denied';
  if (status === 404) return 'not_found';
  if (status === 409) return 'already_used';
  if (status === 410) return 'expired';
  return 'unavailable';
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
