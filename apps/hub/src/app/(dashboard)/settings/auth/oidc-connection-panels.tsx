'use client';

import type { OidcConnectionSetup, OidcConnectionSummary } from '@harness-hub/schemas';
import { Button, StatusChip, TextInput } from '@harness-hub/ui';
import { type ReactNode, useState } from 'react';

/** Google Cloud Console へ手で登録する値を表示する。 */
export function SetupPanel({ setup }: { readonly setup: OidcConnectionSetup | null }): ReactNode {
  if (setup === null) return null;
  return (
    <section aria-labelledby="oidc-setup-heading">
      <h2 id="oidc-setup-heading">1. Google Cloud Console 側で行う手作業</h2>
      <p>
        OAuth client の作成・変更・削除は Google Cloud Console でのみ行えます。Hub は下の値を提示するだけで、 Google
        側の設定は代行しません。
      </p>
      <dl>
        <dt>承認済みのリダイレクト URI</dt>
        <dd>
          <CopyableValue label="顧客所有方式の callback URL" value={setup.customer_callback_url} />
        </dd>
        <dt>OAuth 同意画面で有効化する scope</dt>
        <dd>{setup.required_google_scopes.join(', ')}</dd>
        <dt>参考: 共有方式へ切り替えた場合の callback URL</dt>
        <dd>
          <CopyableValue label="共有方式の callback URL" value={setup.shared_callback_url} />
        </dd>
      </dl>
    </section>
  );
}

/** コピー失敗を未処理 Promise にせず、成功時だけ通知する。 */
function CopyableValue({ label, value }: { readonly label: string; readonly value: string }): ReactNode {
  const [copied, setCopied] = useState(false);
  return (
    <span>
      <code>{value}</code>{' '}
      <Button
        type="button"
        aria-label={`${label}をコピー`}
        onClick={() => {
          void navigator.clipboard.writeText(value).then(
            () => setCopied(true),
            () => setCopied(false),
          );
        }}
      >
        コピー
      </Button>
      <span aria-live="polite">{copied ? ' コピーしました' : ''}</span>
    </span>
  );
}

export interface ConnectionCardProps {
  readonly connection: OidcConnectionSummary;
  readonly busy: boolean;
  readonly rotationSecret: string;
  readonly onRotationSecretChange: (value: string) => void;
  readonly onTest: (target: 'current' | 'pending') => void;
  readonly onStageRotation: () => void;
  readonly onDiscardRotation: () => void;
  readonly onActivate: () => void;
  readonly onDisable: () => void;
}

/** 接続 1 件。状態・識別子・時刻だけを表示し、secret 本体は表示しない。 */
export function ConnectionCard(props: ConnectionCardProps): ReactNode {
  const { connection, busy } = props;
  const rotating = connection.rotation.staged;
  const stagedClientId = connection.rotation.pending_client_id;

  return (
    <article aria-label={`接続 ${connection.client_id}`}>
      <p>
        <StatusChip domain="idpCredential" status={connection.credential_status} />{' '}
        {connection.resolvable ? 'この接続でログインが解決されます' : 'この接続はログインに使われていません'}
      </p>
      <dl>
        <dt>client ID</dt>
        <dd>
          <code>{connection.client_id}</code>
        </dd>
        <dt>client secret 末尾</dt>
        <dd>{connection.client_secret_last4 ?? '—'}</dd>
        <dt>最終テスト</dt>
        <dd>{formatTimestamp(connection.last_tested_at)}</dd>
        <dt>更新</dt>
        <dd>{formatTimestamp(connection.updated_at)}</dd>
      </dl>

      <p>
        <Button
          type="button"
          loading={busy}
          disabled={busy || connection.credential_status === 'disabled'}
          onClick={() => props.onTest('current')}
        >
          現行 secret を接続テスト
        </Button>{' '}
        <Button
          type="button"
          variant="primary"
          loading={busy}
          disabled={
            busy ||
            (rotating ? connection.rotation.pending_tested_at === null : connection.credential_status !== 'tested')
          }
          onClick={props.onActivate}
        >
          {rotating
            ? stagedClientId === null
              ? '新しい secret へ切り替える'
              : '新しい client へ切り替える'
            : '有効化する'}
        </Button>{' '}
        <Button
          type="button"
          variant="danger"
          loading={busy}
          disabled={busy || connection.credential_status === 'disabled'}
          onClick={props.onDisable}
        >
          無効化する
        </Button>
      </p>

      <section aria-label={`接続 ${connection.client_id} の secret ローテーション`}>
        <h3>secret のローテーション</h3>
        {rotating ? (
          <>
            <p>
              新しい secret (末尾 {connection.rotation.pending_client_secret_last4 ?? '----'}) を登録済みです。
              {stagedClientId === null ? null : (
                <>
                  {' '}
                  client ID も <code>{stagedClientId}</code> へ差し替わります。
                </>
              )}
              {connection.rotation.pending_tested_at === null
                ? ' まだテストしていません。'
                : ` ${formatTimestamp(connection.rotation.pending_tested_at)} にテストへ合格しました。`}
              <strong>現在のログインは今までの設定で継続しています。</strong>
            </p>
            <p>
              <Button type="button" loading={busy} disabled={busy} onClick={() => props.onTest('pending')}>
                新しい secret をテスト
              </Button>{' '}
              <Button type="button" variant="danger" loading={busy} disabled={busy} onClick={props.onDiscardRotation}>
                ローテーションを取り消す
              </Button>
            </p>
            <p>
              切り替えたあとに Google Cloud Console で旧 secret を失効させてください。失効の完了は Hub
              からは確認できません。
            </p>
          </>
        ) : (
          <>
            <TextInput
              label="新しい client secret"
              type="password"
              autoComplete="new-password"
              description="登録しても切り替わりません。テストに合格してから有効化で切り替えます。"
              value={props.rotationSecret}
              onChange={(event) => props.onRotationSecretChange(event.target.value)}
            />
            <Button
              type="button"
              loading={busy}
              disabled={busy || props.rotationSecret.length === 0 || connection.credential_status === 'disabled'}
              onClick={props.onStageRotation}
            >
              新しい secret を登録する
            </Button>
          </>
        )}
      </section>
    </article>
  );
}

function formatTimestamp(iso: string | null): string {
  return iso === null ? '未実施' : new Date(iso).toLocaleString('ja-JP');
}
