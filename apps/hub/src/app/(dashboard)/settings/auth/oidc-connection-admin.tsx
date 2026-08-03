'use client';

/**
 * provider-admin 向け「顧客所有 Google OAuth」管理画面
 * (issue-auth-tenancy-customer-managed-google-oidc-20260729)。
 *
 * ## この画面が守っている 3 つのこと
 *
 * 1. **Google 設定を代行しているように見せない** (苦戦箇所 1)。
 *    OAuth client の作成・削除は Google Cloud Console 側の手作業で、Hub が出せるのは
 *    「Console へ貼る callback URL」だけ。手順の見出しをそう書き分けている。
 *
 * 2. **client secret を画面へ戻さない** (受入条件 2)。
 *    平文 secret は入力欄の state にしか存在せず、送信が成功したらその場で空へ戻す。
 *    URL・localStorage・エラー文言のいずれにも載せない (fetch の body だけを通る)。
 *    サーバ応答に secret を書ける場所は型として存在しない (`packages/schemas` 側で保証)。
 *
 * 3. **Hub 側の状態と Google 側の状態を取り違えさせない** (苦戦箇所 3)。
 *    rotation 中は「Hub は新旧どちらを使っているか」を明示し、Google 側の旧 secret 失効は
 *    Hub からは確認できない手作業だと画面に書く。
 */

import type {
  OidcAdminError,
  OidcConnectionListResponse,
  OidcConnectionMutationResponse,
  OidcConnectionSetup,
  OidcConnectionSummary,
  OidcConnectionTestFailure,
  OidcConnectionTestResponse,
} from '@harness-hub/schemas';
import { Alert, Button, TextInput } from '@harness-hub/ui';
import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from 'react';

import { ConnectionCard, SetupPanel } from './oidc-connection-panels.js';

export { ConnectionCard, SetupPanel } from './oidc-connection-panels.js';

const ENDPOINT = '/api/v1/admin/oidc-connections';

interface OidcConnectionAdminProps {
  readonly tenantId: string;
}

/**
 * 業務エラーの表示文言。
 *
 * server の enum をそのまま出さないのは、運用者が読むのは「次に何をすればよいか」だから。
 * 対応表をここに 1 枚だけ置き、各操作の catch 節で文言を組み立てない
 * (組み立てると入力値を混ぜる実装がいつか書かれる)。
 */
const ERROR_MESSAGES: Readonly<Record<OidcAdminError['error'], string>> = {
  connection_not_found: '対象の接続が見つかりません。別のテナントの接続を開いていないか確認してください。',
  not_customer_managed: 'この接続は共有方式です。顧客所有方式の操作はできません。',
  state_conflict: '表示中の状態から変化しています。再読み込みしてからやり直してください。',
  invalid_transition: '今の状態では実行できない操作です。手順 (登録 → テスト → 有効化) を確認してください。',
  rotation_not_staged: '新しい secret が登録されていません。先に rotation を開始してください。',
  invalid_request: '入力内容が条件を満たしていません。client ID と secret を確認してください。',
};

/** 接続テストの失敗理由。原因の所在 (Google 側 / Hub 設定 / 入力値) が分かる書き方にする。 */
const TEST_FAILURE_MESSAGES: Readonly<Record<OidcConnectionTestFailure, string>> = {
  discovery_unreachable: 'Google の discovery document を取得できませんでした。ネットワークを確認してください。',
  issuer_mismatch: 'discovery document の issuer が一致しません。Hub 側の設定を確認してください。',
  invalid_client: 'client ID と client secret の組を Google が拒否しました。Console の値と照合してください。',
  unexpected_response: 'Google から想定外の応答が返りました。時間をおいて再実行してください。',
};

const isAdminError = (body: unknown): body is OidcAdminError => {
  if (typeof body !== 'object' || body === null || !('error' in body) || typeof body.error !== 'string') {
    return false;
  }
  return Object.hasOwn(ERROR_MESSAGES, body.error);
};

export function OidcConnectionAdmin({ tenantId }: OidcConnectionAdminProps): ReactNode {
  const [setup, setSetup] = useState<OidcConnectionSetup | null>(null);
  const [items, setItems] = useState<readonly OidcConnectionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [workspaceDomains, setWorkspaceDomains] = useState('');
  const [rotationSecrets, setRotationSecrets] = useState<Readonly<Record<string, string>>>({});

  /** テナント申告 header。認可は server 側で判定するので、ここは「どのテナントの話か」の申告だけ。 */
  const scopeHeaders = useCallback((): HeadersInit => ({ 'x-harness-tenant-id': tenantId }), [tenantId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(ENDPOINT, { credentials: 'same-origin', headers: scopeHeaders() });
      const body: unknown = await response.json();
      if (!response.ok) {
        setError(isAdminError(body) ? ERROR_MESSAGES[body.error] : '接続一覧を取得できませんでした。');
        return;
      }
      const list = body as OidcConnectionListResponse;
      setSetup(list.setup);
      setItems(list.items);
      setError(null);
    } catch {
      // 例外オブジェクトを表示へ流さない。fetch の失敗理由に入力値が混ざる経路を残さない
      setError('接続一覧を取得できませんでした。');
    } finally {
      setLoading(false);
    }
  }, [scopeHeaders]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * 状態を変える操作の共通経路。
   *
   * 応答本文を表示に使うのは「成功したか」と「列挙されたエラー」だけ。ここを 1 本にしてあるので、
   * 個別の操作から生の応答を画面へ流す実装が入り込む余地が無い。
   */
  const mutate = useCallback(
    async (
      path: string,
      init: { readonly method: 'POST' | 'DELETE'; readonly body?: unknown },
      onSuccess: (body: unknown) => string,
    ): Promise<boolean> => {
      setBusy(true);
      setNotice(null);
      try {
        const response = await fetch(`${ENDPOINT}${path}`, {
          method: init.method,
          credentials: 'same-origin',
          headers:
            init.body === undefined
              ? scopeHeaders()
              : { ...Object.fromEntries(new Headers(scopeHeaders())), 'content-type': 'application/json' },
          ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
        });
        const body: unknown = await response.json();
        if (!response.ok) {
          setError(isAdminError(body) ? ERROR_MESSAGES[body.error] : '操作に失敗しました。');
          return false;
        }
        setError(null);
        setNotice(onSuccess(body));
        await load();
        return true;
      } catch {
        setError('操作に失敗しました。');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [load, scopeHeaders],
  );

  const register = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const succeeded = await mutate(
      '',
      {
        method: 'POST',
        body: {
          client_id: clientId,
          client_secret: clientSecret,
          allowed_workspace_domains: parseWorkspaceDomainInput(workspaceDomains),
        },
      },
      (body) => {
        const { connection } = body as OidcConnectionMutationResponse;
        // 1 テナントの Google 接続は 1 件までなので、既に接続があると新規作成ではなく
        // 「載せ替えの staging」になる。どちらが起きたかを応答から読んで文言を変える —
        // 一律に「登録しました」と出すと、既存接続を持つテナントで
        // 「もう新しい client でログインできる」と誤解される
        if (connection.rotation.staged) {
          return `新しい client を登録しました (secret 末尾 ${connection.rotation.pending_client_secret_last4 ?? '----'})。現在のログインは今までの設定のまま続いています。接続テストに合格させてから切り替えてください。`;
        }
        return `接続を登録しました (secret 末尾 ${connection.client_secret_last4 ?? '----'})。接続テストに合格するまで認証には使われません。`;
      },
    );
    // 成功・失敗にかかわらず平文を state から消す。失敗時に残すと、再送のたびに
    // 「画面のどこかに secret が居続ける時間」が伸びる
    setClientSecret('');
    if (succeeded) {
      setClientId('');
      setWorkspaceDomains('');
    }
  };

  const runTest = async (id: string, target: 'current' | 'pending'): Promise<void> => {
    await mutate(`/${id}/test`, { method: 'POST', body: { target } }, (body) => {
      const result = body as OidcConnectionTestResponse;
      if (result.passed) {
        return target === 'pending'
          ? '新しい secret のテストに合格しました。有効化すると切り替わります。'
          : 'テストに合格しました。';
      }
      return `テストに不合格でした: ${result.failure_reason === null ? '' : TEST_FAILURE_MESSAGES[result.failure_reason]}`;
    });
  };

  const stageRotation = async (id: string): Promise<void> => {
    const secret = rotationSecrets[id] ?? '';
    await mutate(
      `/${id}/rotation`,
      { method: 'POST', body: { client_secret: secret } },
      () => '新しい secret を登録しました。現在のログインは今までの secret で継続しています。',
    );
    setRotationSecrets((current) => ({ ...current, [id]: '' }));
  };

  return (
    <>
      {error === null ? null : <Alert tone="danger" title="エラー" description={error} />}
      {notice === null ? null : <Alert tone="success" title="実行しました" description={notice} />}

      <SetupPanel setup={setup} />

      <section aria-labelledby="oidc-register-heading">
        <h2 id="oidc-register-heading">2. Google Cloud で作成した値を登録する</h2>
        <p>
          Console で発行した client ID と client secret を入力します。
          <strong>secret は保存後に再表示できません</strong>
          (Hub が保持するのは暗号化した値と末尾 4 文字だけです)。
        </p>
        <p>
          すでに接続がある場合、この登録は<strong>すぐには切り替わりません</strong>。 下の「3.
          接続の状態」で接続テストに合格させ、有効化した時点で切り替わります。
          それまでは今までの設定でログインできます。
        </p>
        <form aria-label="Google OAuth client の登録" onSubmit={register}>
          <TextInput
            label="client ID"
            required
            autoComplete="off"
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
          />
          <TextInput
            label="client secret"
            required
            // マスク入力。ブラウザの保存候補にも載せない
            type="password"
            autoComplete="new-password"
            description="入力値は暗号化して保存され、この画面へ再表示されることはありません。"
            value={clientSecret}
            onChange={(event) => setClientSecret(event.target.value)}
          />
          <TextInput
            label="許可する Google Workspace ドメイン (任意)"
            autoComplete="off"
            description="複数ある場合はカンマ区切りで入力します。空欄ならドメイン制限を行いません。"
            placeholder="example.com, subsidiary.example.com"
            value={workspaceDomains}
            onChange={(event) => setWorkspaceDomains(event.target.value)}
          />
          <Button type="submit" variant="primary" loading={busy} disabled={busy}>
            登録する
          </Button>
        </form>
      </section>

      <section aria-labelledby="oidc-connections-heading">
        <h2 id="oidc-connections-heading">3. 接続の状態</h2>
        {loading ? (
          <p aria-live="polite">読み込み中です。</p>
        ) : items.length === 0 ? (
          <p>登録済みの接続はまだありません。</p>
        ) : (
          <ul aria-label="OIDC 接続一覧">
            {items.map((connection) => (
              <li key={connection.id}>
                <ConnectionCard
                  connection={connection}
                  busy={busy}
                  rotationSecret={rotationSecrets[connection.id] ?? ''}
                  onRotationSecretChange={(value) =>
                    setRotationSecrets((current) => ({ ...current, [connection.id]: value }))
                  }
                  onTest={(target) => void runTest(connection.id, target)}
                  onStageRotation={() => void stageRotation(connection.id)}
                  onDiscardRotation={() =>
                    void mutate(
                      `/${connection.id}/rotation`,
                      { method: 'DELETE' },
                      () => 'rotation を取り消しました。現行の secret のままです。',
                    )
                  }
                  onActivate={() =>
                    void mutate(
                      `/${connection.id}/activate`,
                      { method: 'POST' },
                      () => '有効化しました。以降のログインはこの接続で解決されます。',
                    )
                  }
                  onDisable={() =>
                    void mutate(
                      `/${connection.id}/disable`,
                      { method: 'POST' },
                      () => '無効化しました。Google Cloud Console 側でも client を失効させてください。',
                    )
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

/** カンマまたは改行区切りを小文字化・重複排除して API 入力へ変換する。 */
export function parseWorkspaceDomainInput(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[,\n]/)
        .map((domain) => domain.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}
