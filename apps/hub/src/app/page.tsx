// 未認証の入口 (ランディング)。ここから「どのテナントでサインインするか」を確定させ、
// `/{tenant_slug}/signin` へ橋渡しする。表示部品は必ず @harness-hub/ui から import する
// (apps/hub 内で design system を再実装しない)
import { Alert, Button, Card, PageHeader, Stack, TextInput } from '@harness-hub/ui';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { SESSION_COOKIE_NAME, systemAuthClock, verifySessionToken } from '../lib/auth/index.js';
import { ACTIVE_WORKSPACE_COOKIE_NAME } from '../lib/auth/session.js';
import { DEFAULT_POST_SIGNIN_LANDING } from '../lib/routing/post-signin-landing.js';
import {
  LAST_TENANT_COOKIE_NAME,
  readTenantSlug,
  SIGNIN_ENTRY_PATH,
  TENANT_ERROR_QUERY_PARAM,
  TENANT_QUERY_PARAM,
  tenantSigninPath,
} from '../lib/routing/signin-entry.js';
import { workspaceEntryPath } from '../lib/routing/workspace-entry.js';
import { resolveSessionScope } from '../middleware/index.js';

/**
 * 要求ごとにレンダリングする。この宣言は**意図の明示**であり、単独では分類を変えない。
 *
 * この画面が静的扱いに倒れて本番だけ 500 になっていた原因は、`cookies()` の呼び出しが
 * `AUTH_SESSION_SECRET` の有無の内側にあったこと。ビルド時 (secret 未設定) は動的 API へ到達せず
 * Next が `/` を静的ページとして事前レンダリングし、実行時は secret があるため `cookies()` を呼んで
 * 「静的なはずの経路が動的 API を使った」で DYNAMIC_SERVER_USAGE を投げていた
 * (`next dev` / `next start` では再現せず workerd 上でだけ出る)。
 *
 * 実効的に分類を決めているのは下の**無条件の `cookies()` 呼び出し**である (2026-08-08 実測:
 * この宣言だけを消しても `ƒ /` のままゲートは緑、`cookies()` を env 条件の内側へ戻すと `○ /` に
 * 倒れてゲートが落ちる)。`cookies()` を条件分岐の内側へ動かさないこと。
 * 宣言自体は「この経路は動的である」という設計意図を残すために置いている。
 */
export const dynamic = 'force-dynamic';

interface HomePageProps {
  readonly searchParams: Promise<Record<string, string | readonly string[] | undefined>>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const cookieStore = await cookies();

  const sessionSecret = process.env.AUTH_SESSION_SECRET;
  if (sessionSecret !== undefined && sessionSecret.length > 0) {
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
    if (token !== null) {
      // 署名と claims の形・期限だけを見る (edge の authorize() と同じ制約)。
      // 緊急失効の判定は route 側が担い、ここでは行わない。
      const verification = await verifySessionToken(token, sessionSecret, systemAuthClock.nowSeconds());
      // status まで揃えてから認証済みとして扱う。無効化された利用者は middleware では主体として
      // 解決されない (401) ため、ここで着地先へ送ると `/` と着地先の往復になる。
      if (verification.ok && verification.claims.status === 'active') {
        const { claims } = verification;
        const activeWorkspace = cookieStore.get(ACTIVE_WORKSPACE_COOKIE_NAME)?.value;

        // 着地先へ送ってよいかは middleware と同じ `resolveSessionScope` に決めさせる。
        // ここで判定を書き写すと、片方だけ規則が変わったとき
        // 「`/` は着地先へ送るのに middleware は 403」という行き止まりが生まれる。
        const scope = resolveSessionScope(
          {
            subject: claims.sub,
            tenantId: claims.tenant_id,
            workspaceIds: claims.workspace_ids,
            roles: [claims.role],
          },
          activeWorkspace === undefined ? null : `${ACTIVE_WORKSPACE_COOKIE_NAME}=${activeWorkspace}`,
        );

        if (scope !== null) {
          redirect(DEFAULT_POST_SIGNIN_LANDING);
        }

        // scope が決まらないのは「2 件以上の workspace に所属していて、まだ選んでいない」場合。
        // そのまま着地先へ送ると missing_tenant_scope で 403 になり、しかも cookie を書く操作が
        // 画面上に無いため利用者は自力で復帰できない。ここで選ばせて動線を閉じる。
        return <WorkspaceChoice workspaceIds={claims.workspace_ids} />;
      }
    }
  }

  const query = await searchParams;
  // 入力が slug の形を満たさなかったときだけ `/signin` がここへ差し戻す。
  // 「そのテナントが存在するか」は決してここで答えない (存在有無の総当たりを許さないため)。
  const hasInvalidTenant = query[TENANT_ERROR_QUERY_PARAM] !== undefined;
  const lastTenant = readTenantSlug(cookieStore.get(LAST_TENANT_COOKIE_NAME)?.value ?? null);

  return (
    <Stack gap={5}>
      <PageHeader
        title="サインイン"
        description="ご契約のテナント ID を入力すると、そのテナントのサインイン画面へ移動します。"
      />

      {hasInvalidTenant ? (
        <Alert
          tone="danger"
          title="テナント ID の形式が正しくありません"
          description="半角の小文字英数字とハイフンだけが使えます (例: harness-hub)。もう一度入力してください。"
        />
      ) : null}

      {lastTenant === null ? null : (
        <Card
          title="前回のテナント"
          description="この端末で最後に選んだテナントです。違う場合は下のフォームから入力してください。"
        >
          <a href={tenantSigninPath(lastTenant)}>{lastTenant} のサインイン画面へ進む</a>
        </Card>
      )}

      {/*
        JavaScript を使わない GET フォームにしている。遷移先が `/{slug}/signin` という
        path であるため form の action だけでは組み立てられず、`/signin` が受けて 303 で送り出す。
        client 側で router.push する形にすると、この入口が client JS の読み込み完了まで機能しない。

        差し戻し時の `defaultValue` は空にする。前回値を残すと「自分が打っていない値が入ったまま
        『形式が正しくありません』と言われる」状態になり、どこを直せばよいか分からなくなる。
      */}
      <Card title="テナント ID を入力">
        <form method="get" action={SIGNIN_ENTRY_PATH}>
          <Stack gap={4}>
            <TextInput
              label="テナント ID"
              name={TENANT_QUERY_PARAM}
              description="サインイン画面の URL に含まれる識別子です (例: harness-hub)。分からない場合は管理者にお問い合わせください。"
              required
              autoComplete="organization"
              spellCheck={false}
              defaultValue={hasInvalidTenant ? '' : (lastTenant ?? '')}
            />
            <div>
              <Button type="submit" variant="primary">
                サインイン画面へ進む
              </Button>
            </div>
          </Stack>
        </form>
      </Card>

      <Alert
        tone="info"
        title="Hub の実行基盤は起動しています"
        description="依存先を含む死活状態は /health で確認できます。"
        action={<a href="/health">/health を開く</a>}
      />
    </Stack>
  );
}

/**
 * 所属 workspace が複数あり、まだどれで作業するか決まっていないときの `/`。
 *
 * 表示は session claims が持つ workspace ID をそのまま出す。表示名を引くには DB へ行く必要があるが、
 * `/` は未認証でも到達できる公開経路であり「業務データを一切含めない」(middleware/authz.ts の
 * PUBLIC_PATH_PREFIXES) という前提を崩したくない。ここで出しているのは利用者自身の session に
 * 焼かれた値だけで、新たな読取は発生しない。
 */
function WorkspaceChoice({ workspaceIds }: { readonly workspaceIds: readonly string[] }) {
  // 所属 0 件でも scope は決まらない。選択肢が空のカードだけを出すと、なぜ進めないのか
  // 分からないまま行き止まりになるため、状態を名指しして次の行動を示す。
  if (workspaceIds.length === 0) {
    return (
      <Stack gap={5}>
        <PageHeader title="作業できる Workspace がありません" />
        <Alert
          tone="warning"
          title="Workspace に追加されていません"
          description="サインインはできていますが、この利用者はどの Workspace にも所属していません。テナントの管理者へ Workspace への追加を依頼してください。"
        />
      </Stack>
    );
  }

  return (
    <Stack gap={5}>
      <PageHeader
        title="Workspace を選択"
        description="複数の Workspace に所属しています。作業する Workspace を選ぶと業務画面へ移動します。"
      />

      <Card
        title="所属している Workspace"
        description="選んだ Workspace はこの端末に記憶され、次回以降はそのまま業務画面へ移動します。"
      >
        {/*
          JavaScript を使わないリンクにしている (サインイン直後のこの画面が client JS の
          読み込み完了まで機能しない状態を作らない)。選択の受理と cookie の書き込みは
          `/signin/workspace` が担い、所属外の ID は route 側で必ず弾く。
        */}
        <Stack gap={3} as="ul" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {workspaceIds.map((workspaceId) => (
            <li key={workspaceId}>
              <a href={workspaceEntryPath(workspaceId)}>{workspaceId} で作業する</a>
            </li>
          ))}
        </Stack>
      </Card>

      <Alert
        tone="info"
        title="別のテナントでサインインし直す場合"
        description="いまのサインインを続けない場合は、テナントのサインイン画面からやり直してください。"
      />
    </Stack>
  );
}
