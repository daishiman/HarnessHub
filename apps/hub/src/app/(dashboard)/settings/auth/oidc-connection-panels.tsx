'use client';

import type { OidcConnectionSetup, OidcConnectionSummary } from '@harness-hub/schemas';
import { Button, DefinitionList, Panel, Stack, StatusChip, TagRow, TextInput } from '@harness-hub/ui';
import { type ReactNode, useState } from 'react';

import { formatDateTime } from '../../../../lib/format/datetime.js';

/** Google Cloud Console へ手で登録する値を表示する。 */
export function SetupPanel({ setup }: { readonly setup: OidcConnectionSetup | null }): ReactNode {
  if (setup === null) return null;
  return (
    <section id="oidc-setup-heading" aria-label="1. Google Cloud Console 側で行う手作業">
      <Panel
        title="1. Google Cloud Console 側で行う手作業"
        description="OAuth client の作成・変更・削除は Google Cloud Console でのみ行えます。Hub は下の値を提示するだけで、Google 側の設定は代行しません。"
      >
        {/* 貼り付ける値の一覧。1 つの対象の属性を並べる箇所なので定義リストにする (§5-1 の写し方) */}
        <DefinitionList
          label="Google Cloud Console へ登録する値"
          items={[
            {
              term: '承認済みのリダイレクト URI',
              description: <CopyableValue label="顧客所有方式の callback URL" value={setup.customer_callback_url} />,
            },
            { term: 'OAuth 同意画面で有効化する scope', description: setup.required_google_scopes.join(', ') },
            {
              term: '参考: 共有方式へ切り替えた場合の callback URL',
              description: <CopyableValue label="共有方式の callback URL" value={setup.shared_callback_url} />,
            },
          ]}
        />
      </Panel>
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
  /**
   * 操作の結果表示。カードの中には離れた 2 つのボタン群があるので、押した側にだけ返す。
   * カード 1 枚にまとめて出すと、狭い画面では結果が画面外で告知されることになる。
   */
  readonly actionResult?: ReactNode | undefined;
  readonly rotationResult?: ReactNode | undefined;
}

/** 接続 1 件。状態・識別子・時刻だけを表示し、secret 本体は表示しない。 */
export function ConnectionCard(props: ConnectionCardProps): ReactNode {
  const { connection, busy } = props;
  const rotating = connection.rotation.staged;
  const stagedClientId = connection.rotation.pending_client_id;

  return (
    <article aria-label={`接続 ${connection.client_id}`}>
      <Stack gap={3}>
        <TagRow label="この接続の状態">
          <StatusChip domain="idpCredential" status={connection.credential_status} />
          <span>
            {connection.resolvable ? 'この接続でログインが解決されます' : 'この接続はログインに使われていません'}
          </span>
        </TagRow>
        <DefinitionList
          label={`接続 ${connection.client_id} の情報`}
          columns={2}
          items={[
            { term: 'client ID', description: <code>{connection.client_id}</code> },
            { term: 'client secret の末尾', description: connection.client_secret_last4 ?? '未登録' },
            { term: '最後に接続テストした日時', description: formatTimestamp(connection.last_tested_at) },
            { term: '最後に更新した日時', description: formatTimestamp(connection.updated_at) },
          ]}
        />

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
        {props.actionResult}

        <section aria-label={`接続 ${connection.client_id} の secret ローテーション`}>
          <h3 style={{ fontSize: 'var(--hh-font-size-md)' }}>secret の入れ替え</h3>
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
              {props.rotationResult}
              <p>
                切り替えたあとに Google Cloud Console で旧 secret を失効させてください。失効の完了は Hub
                からは確認できません。
              </p>
            </>
          ) : (
            <Stack gap={3}>
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
              {props.rotationResult}
            </Stack>
          )}
        </section>
      </Stack>
    </article>
  );
}

function formatTimestamp(iso: string | null): string {
  return iso === null ? '未実施' : formatDateTime(iso);
}
