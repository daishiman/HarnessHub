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
import { Alert, Button, CardGrid, EmptyState, LiveStatus, Panel, Stack, TextInput } from '@harness-hub/ui';
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

/**
 * 操作の起点。結果表示をこの単位で出し分ける。
 * `register` は登録フォーム、接続カードは 1 枚の中でもボタン群が 2 か所に分かれるため
 * `<接続 id>:actions` (テスト・有効化・無効化) と `<接続 id>:rotation` (secret 入れ替え) に分ける。
 */
type ActionScope = string;

interface ActionResult {
  readonly scope: ActionScope;
  readonly tone: 'success' | 'danger';
  readonly message: string;
}

/** 面の中に置く操作結果。見出しは成否で言い分けて、色だけに頼らせない。 */
function ActionResultAlert({
  result,
  scope,
}: {
  readonly result: ActionResult | null;
  readonly scope: ActionScope;
}): ReactNode {
  if (result === null || result.scope !== scope) return null;
  return (
    <Alert
      tone={result.tone}
      title={result.tone === 'success' ? '実行しました' : '操作できませんでした'}
      description={result.message}
    />
  );
}

export function OidcConnectionAdmin({ tenantId }: OidcConnectionAdminProps): ReactNode {
  const [setup, setSetup] = useState<OidcConnectionSetup | null>(null);
  const [items, setItems] = useState<readonly OidcConnectionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  // 「一覧を読み込めなかった」と「操作に失敗した」を 1 つの state で持たない。
  // 混ぜると、有効化を 1 回失敗しただけで接続一覧まで読めなくなったように見える。
  const [loadError, setLoadError] = useState<string | null>(null);
  // 操作の結果は、その操作を起こした面の中に返す。この画面は「登録フォーム」と
  // 「接続カード」の 2 か所から操作でき、画面上端にまとめると
  // どちらの結果なのかが読み手側にしか分からなくなる。
  const [actionResult, setActionResult] = useState<ActionResult | null>(null);
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
        setLoadError(isAdminError(body) ? ERROR_MESSAGES[body.error] : '接続一覧を取得できませんでした。');
        return;
      }
      const list = body as OidcConnectionListResponse;
      setSetup(list.setup);
      setItems(list.items);
      setLoadError(null);
    } catch {
      // 例外オブジェクトを表示へ流さない。fetch の失敗理由に入力値が混ざる経路を残さない
      setLoadError('接続一覧を取得できませんでした。');
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
      scope: ActionScope,
      path: string,
      init: { readonly method: 'POST' | 'DELETE'; readonly body?: unknown },
      onSuccess: (body: unknown) => string,
    ): Promise<boolean> => {
      setBusy(true);
      setActionResult(null);
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
          setActionResult({
            scope,
            tone: 'danger',
            message: isAdminError(body) ? ERROR_MESSAGES[body.error] : '操作に失敗しました。',
          });
          return false;
        }
        setActionResult({ scope, tone: 'success', message: onSuccess(body) });
        await load();
        return true;
      } catch {
        setActionResult({ scope, tone: 'danger', message: '操作に失敗しました。' });
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
      'register',
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
    // 「新しい secret のテスト」は入れ替えの面から押すので、結果もそちらへ返す
    const scope = `${id}:${target === 'pending' ? 'rotation' : 'actions'}`;
    await mutate(scope, `/${id}/test`, { method: 'POST', body: { target } }, (body) => {
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
      `${id}:rotation`,
      `/${id}/rotation`,
      { method: 'POST', body: { client_secret: secret } },
      () => '新しい secret を登録しました。現在のログインは今までの secret で継続しています。',
    );
    setRotationSecrets((current) => ({ ...current, [id]: '' }));
  };

  return (
    <Stack gap={4}>
      <SetupPanel setup={setup} />

      {/* 見出しは Panel が出す。id はページ内リンクの飛び先として section に残す */}
      <section id="oidc-register-heading" aria-label="2. Google Cloud で作成した値を登録する">
        <Panel title="2. Google Cloud で作成した値を登録する">
          <Stack gap={3}>
            <p style={{ margin: 0 }}>
              Console で発行した client ID と client secret を入力します。
              <strong>secret は保存後に再表示できません</strong>
              (Hub が保持するのは暗号化した値と末尾 4 文字だけです)。
            </p>
            <p style={{ margin: 0 }}>
              すでに接続がある場合、この登録は<strong>すぐには切り替わりません</strong>。 下の「3.
              接続の状態」で接続テストに合格させ、有効化した時点で切り替わります。
              それまでは今までの設定でログインできます。
            </p>
            <form aria-label="Google OAuth client の登録" onSubmit={register}>
              <Stack gap={3}>
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
                {/* 登録の結果は押したボタンの隣に出す。画面上端の帯に出すと、
                    入力欄を見ている利用者の視野の外で結果が告知されることになる */}
                <ActionResultAlert result={actionResult} scope="register" />
                <div>
                  <Button type="submit" variant="primary" loading={busy} disabled={busy}>
                    登録する
                  </Button>
                </div>
              </Stack>
            </form>
          </Stack>
        </Panel>
      </section>

      <section id="oidc-connections-heading" aria-label="3. 接続の状態">
        <Panel title="3. 接続の状態" description="登録済みの接続ごとに、テスト・有効化・無効化ができます。">
          <LiveStatus>{loading ? '接続の状態を読み込んでいます。' : `${items.length} 件の接続を表示中`}</LiveStatus>
          {loading ? (
            <p style={{ margin: 0 }}>読み込み中です。</p>
          ) : loadError !== null ? (
            // 取得できていないことを「0 件」と出さない。無いのか読めていないのかで次の行動が変わる
            <Stack gap={3}>
              <p role="alert" style={{ margin: 0 }}>
                {loadError}
              </p>
              <div>
                <Button type="button" variant="secondary" onClick={() => void load()}>
                  読み込み直す
                </Button>
              </div>
            </Stack>
          ) : items.length === 0 ? (
            <EmptyState
              title="登録済みの接続はまだありません"
              description="上の「2. Google Cloud で作成した値を登録する」から、最初の接続を登録してください。"
            />
          ) : (
            <CardGrid
              as="ul"
              columns="wide"
              aria-label="OIDC 接続一覧"
              style={{ listStyle: 'none', margin: 0, padding: 0 }}
            >
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
                        `${connection.id}:rotation`,
                        `/${connection.id}/rotation`,
                        { method: 'DELETE' },
                        () => 'rotation を取り消しました。現行の secret のままです。',
                      )
                    }
                    onActivate={() =>
                      void mutate(
                        `${connection.id}:actions`,
                        `/${connection.id}/activate`,
                        { method: 'POST' },
                        () => '有効化しました。以降のログインはこの接続で解決されます。',
                      )
                    }
                    onDisable={() =>
                      void mutate(
                        `${connection.id}:actions`,
                        `/${connection.id}/disable`,
                        { method: 'POST' },
                        () => '無効化しました。Google Cloud Console 側でも client を失効させてください。',
                      )
                    }
                    actionResult={<ActionResultAlert result={actionResult} scope={`${connection.id}:actions`} />}
                    rotationResult={<ActionResultAlert result={actionResult} scope={`${connection.id}:rotation`} />}
                  />
                </li>
              ))}
            </CardGrid>
          )}
        </Panel>
      </section>
    </Stack>
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
